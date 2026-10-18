// Runs the battle on the teacher's screen (design §7: the host decides every round).
// The right answer only lives here, in memory; the database gets the public question and the result.
import { serverTimestamp } from 'firebase/database';
import { currentUid, serverNow } from '../lib/firebase';
import { updateRoom, watchAnswers, watchConnection, watchPresence, watchRoom } from '../data/room';
import { QuestionDeck } from '../game/questions';
import { hostOwnsRoom } from '../game/ownership';
import { decideRound, extendedDeadline, roundCountable } from '../game/round';
import { DIFFICULTY, initialState, newGameId, nextStop, reshuffleDifferent, roundKey, shuffleOptions } from '../game/rules';
import type { BattleState, GameConfig, Player, PublicQuestion, Question } from '../game/types';

export const TIMING = {
  walkMs: 3600,
  strikeMs: 4200, // reveal on a sword strike before the next question
  shieldMs: 4600, // reveal + "retry in 3"
  defeatedMs: 5200, // enemy defeated -> walk to the next stop
  graceMs: 2000, // after the deadline, before counting: >= the 1.5 s the database rules accept answers for (+ clock skew)
  allAnsweredMs: 700, // everybody answered -> close early
  nobodyMs: 2500, // nobody could answer -> ask the same question again after this pause
  syncTimeoutMs: 2500, // max wait for the server to confirm the end-of-round sync write
  syncRepeatTimeoutMs: 10_000, // same, on a question already repeated for the network (it is counted either way)
  retryMs: 1500, // pause before retrying a failed write
  lateMs: 2000, // a question that reached the database later than this gets its full time again (once, no re-ask)
  troubleAfter: 3, // rejected writes in a row before the teacher sees a warning
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), ms)));
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export interface HostStats {
  questions: number;
  correct: number; // sum of correct answers over all rounds
  possible: number; // sum of eligible players over all rounds
  bestCombo: number;
  byUnit: Record<number, { correct: number; possible: number }>;
}

interface Round {
  question: Question;
  options: string[];
  answer: number;
  attempt: number;
  key: string;
  startedAt: number;
  endsAt: number;
  eligible: Set<string>;
  finished: boolean;
  latest: Record<string, number>; // live snapshot of the answers (complete once the end-of-round sync is confirmed)
  repeatedForNetwork: boolean; // already asked again once because a round could not be counted (network)
  stopAnswers: () => void;
}

export class GameController {
  private readonly deck: QuestionDeck;
  private state: BattleState;
  private round: Round | null = null;
  private online = new Set<string>();
  private players: Record<string, Player> = {};
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private unsubs: Array<() => void> = [];
  private disposed = false;
  private gameId = '';
  private connected = true;
  private rejected = 0;
  readonly stats: HostStats = { questions: 0, correct: 0, possible: 0, bestCombo: 0, byUnit: {} };

  constructor(
    private readonly code: string,
    private readonly config: GameConfig,
    private readonly onStats: (s: HostStats) => void = () => {},
    private readonly onTrouble: (trouble: boolean) => void = () => {},
  ) {
    this.deck = new QuestionDeck(config.course, config.units);
    this.state = initialState(config.difficulty);
    this.unsubs.push(
      watchPresence(code, online => (this.online = online)),
      watchConnection(connected => (this.connected = connected)),
      watchRoom(code, room => {
        // the room vanished or changed hands (e.g. a new room from a second tab): stop writing into it
        if (!hostOwnsRoom(room, currentUid())) return this.dispose();
        this.players = room.players ?? {};
      }),
    );
  }

  start() {
    this.gameId = newGameId(serverNow());
    this.state = initialState(this.config.difficulty);
    // a new game restarts the room's 24 h clock (PLAY AGAIN reuses the room)
    void this.write({ status: 'walking', state: this.state, question: null, reveal: null, createdAt: serverTimestamp() });
    this.later(TIMING.walkMs, () => this.ask(false));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.round?.stopAnswers();
    for (const u of this.unsubs) u();
  }

  private later(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(t);
  }

  /** Offline, a write just waits in the SDK's queue (the banner for that comes from useConnectionLost); this only sees rejections. */
  private write(patch: Record<string, unknown>) {
    return updateRoom(this.code, patch).then(() => {
      if (this.rejected >= TIMING.troubleAfter && !this.disposed) this.onTrouble(false);
      this.rejected = 0;
      return true;
    }, err => {
      console.error('Could not update the room', err);
      this.rejected += 1;
      if (this.rejected === TIMING.troubleAfter && !this.disposed) this.onTrouble(true);
      return false;
    });
  }

  /** Who counts for this question: connected players who joined before it started. */
  private eligibleAt(startedAt: number) {
    return new Set(Object.entries(this.players)
      .filter(([uid, p]) => this.online.has(uid) && p.joinedAt < startedAt)
      .map(([uid]) => uid));
  }

  /**
   * `repeat`: same question with options reshuffled (after a miss); `again`: same question, same attempt (nobody could
   * answer); `forNetwork`: the "again" is because the round could not be counted (see roundCountable).
   */
  private ask(repeat: boolean, again = false, forNetwork = false) {
    const prev = this.round;
    let question: Question;
    let shuffled: { options: string[]; answer: number };
    let attempt = 0;
    if (again && prev) {
      question = prev.question;
      shuffled = { options: prev.options, answer: prev.answer };
      attempt = prev.attempt;
    } else if (repeat && prev) {
      question = prev.question;
      shuffled = reshuffleDifferent(prev.options, prev.answer);
      attempt = prev.attempt + 1;
    } else {
      question = this.deck.next();
      shuffled = shuffleOptions(question.options, question.answer);
    }
    this.state = { ...this.state, questionNumber: this.state.questionNumber + 1 };
    const startedAt = serverNow();
    const endsAt = startedAt + DIFFICULTY[this.config.difficulty].seconds * 1000;
    const key = roundKey(this.gameId, this.state.stop, this.state.questionNumber, attempt);
    const eligible = this.eligibleAt(startedAt);

    const round: Round = {
      question, ...shuffled, attempt, key, startedAt, endsAt, eligible, finished: false, latest: {},
      repeatedForNetwork: forNetwork, stopAnswers: () => {},
    };
    let closing = false;
    round.stopAnswers = watchAnswers(this.code, key, answers => {
      round.latest = answers;
      const answered = Object.keys(answers).filter(uid => eligible.has(uid)).length;
      if (!closing && eligible.size > 0 && answered >= eligible.size) {
        closing = true;
        this.later(TIMING.allAnsweredMs, () => void this.finish(round));
      }
    });
    this.round = round;

    const publicQuestion: PublicQuestion = {
      key, text: question.question, options: shuffled.options, unit: question.unit, attempt, startedAt, endsAt, eligible: eligible.size,
    };
    void this.publish(round, { status: 'question', question: publicQuestion, reveal: null, state: this.state });
  }

  /** The timer only starts once the question is really on everybody's screen; a failed write is retried. */
  private async publish(round: Round, patch: Record<string, unknown>) {
    const ok = await this.write(patch);
    if (this.disposed || round !== this.round) return;
    if (!ok) {
      round.stopAnswers();
      this.state = { ...this.state, questionNumber: this.state.questionNumber - 1 };
      this.later(TIMING.retryMs, () => this.ask(false, true));
      return;
    }
    // offline the write only waits in a queue: if the question landed late, give it its full time again
    const extended = extendedDeadline(round, serverNow(), TIMING.lateMs);
    if (extended !== null) {
      round.endsAt = extended;
      void this.write({ 'question/endsAt': extended });
    }
    this.later(round.endsAt - serverNow() + TIMING.graceMs, () => void this.finish(round));
  }

  private async finish(round: Round) {
    if (round.finished || round !== this.round) return;
    round.finished = true;

    // sync barrier: once the server confirms this (idempotent) write, the live listener has every answer that reached
    // the server before it. A cached read would not prove that (with a listener on the path, get() answers from cache).
    // (offline there is nothing to wait for; on a repeat for the network, a slow link gets more time)
    const wait = round.repeatedForNetwork ? TIMING.syncRepeatTimeoutMs : TIMING.syncTimeoutMs;
    const synced = this.connected && await withTimeout(updateRoom(this.code, { 'question/endsAt': round.endsAt }), wait).then(() => true, () => false);
    round.stopAnswers();
    if (this.disposed || round !== this.round) return;
    // a network problem on the teacher's laptop must not cost the class a life
    if (!roundCountable({ synced, connected: this.connected, repeatedForNetwork: round.repeatedForNetwork })) {
      this.later(TIMING.nobodyMs, () => this.ask(false, true, true));
      return;
    }
    const answers = round.latest;

    const decision = decideRound({ key: round.key, answer: round.answer, attempt: round.attempt, eligible: round.eligible, answers, players: this.players, state: this.state });
    if (decision.kind === 'nobody') {
      // nobody could answer (e.g. the Wi-Fi dropped): no penalty, same question again
      this.later(TIMING.nobodyMs, () => this.ask(false, true));
      return;
    }
    const { result, reveal } = decision;
    this.state = result.state;
    this.track(round, decision.correct);
    await this.write({ status: 'reveal', reveal, state: this.state });
    if (this.disposed) return;

    if (result.outcome === 'strike') {
      if (result.won) return this.later(TIMING.defeatedMs, () => void this.write({ status: 'won' }));
      if (result.enemyDefeated) {
        return this.later(TIMING.defeatedMs, () => {
          this.state = nextStop(this.state, this.config.difficulty);
          void this.write({ status: 'walking', state: this.state, question: null, reveal: null });
          this.later(TIMING.walkMs, () => this.ask(false));
        });
      }
      return this.later(TIMING.strikeMs, () => this.ask(false));
    }
    if (result.lost) return this.later(TIMING.shieldMs, () => void this.write({ status: 'lost' }));
    this.later(TIMING.shieldMs, () => this.ask(true));
  }

  private track(round: Round, correct: number) {
    const s = this.stats;
    s.questions += 1;
    s.correct += correct;
    s.possible += round.eligible.size;
    s.bestCombo = Math.max(s.bestCombo, this.state.combo);
    const u = (s.byUnit[round.question.unit] ??= { correct: 0, possible: 0 });
    u.correct += correct;
    u.possible += round.eligible.size;
    this.onStats({ ...s, byUnit: { ...s.byUnit } });
  }
}

/** Unit with the lowest accuracy (for "To review: Unit 8"). */
export function toughestUnit(stats: HostStats): number | null {
  let worst: number | null = null;
  let worstRate = Infinity;
  for (const [unit, { correct, possible }] of Object.entries(stats.byUnit)) {
    if (!possible) continue;
    const rate = correct / possible;
    if (rate < worstRate) {
      worstRate = rate;
      worst = Number(unit);
    }
  }
  return worst;
}
