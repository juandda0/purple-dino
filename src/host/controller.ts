// Runs the battle on the teacher's screen (design §7: the host decides every round).
// The right answer only lives here, in memory; the database gets the public question and the result.
import { serverNow } from '../lib/firebase';
import { readAnswers, updateRoom, watchAnswers, watchPresence, watchRoom } from '../data/room';
import { QuestionDeck } from '../game/questions';
import {
  DIFFICULTY, initialState, isMajority, nextStop, reshuffleDifferent, resolveRound, roundKey, shuffleOptions, tally,
} from '../game/rules';
import type { BattleState, GameConfig, Player, PublicQuestion, Question, Reveal } from '../game/types';

export const TIMING = {
  walkMs: 3600,
  strikeMs: 4200, // reveal on a sword strike before the next question
  shieldMs: 4600, // reveal + "retry in 3"
  defeatedMs: 5200, // enemy defeated -> walk to the next stop
  graceMs: 400, // after the deadline, before counting (lets in-flight answers land)
  allAnsweredMs: 700, // everybody answered -> close early
};

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
  readonly stats: HostStats = { questions: 0, correct: 0, possible: 0, bestCombo: 0, byUnit: {} };

  constructor(private readonly code: string, private readonly config: GameConfig, private readonly onStats: (s: HostStats) => void = () => {}) {
    this.deck = new QuestionDeck(config.course, config.units);
    this.state = initialState(config.difficulty);
    this.unsubs.push(
      watchPresence(code, online => (this.online = online)),
      watchRoom(code, room => (this.players = room?.players ?? {})),
    );
  }

  start() {
    this.state = initialState(this.config.difficulty);
    void this.write({ status: 'walking', state: this.state, question: null, reveal: null });
    this.later(TIMING.walkMs, () => this.ask(false));
  }

  dispose() {
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

  private write(patch: Record<string, unknown>) {
    return updateRoom(this.code, patch).catch(err => console.error('Could not update the room', err));
  }

  /** Who counts for this question: connected players who joined before it started. */
  private eligibleAt(startedAt: number) {
    return new Set(Object.entries(this.players)
      .filter(([uid, p]) => this.online.has(uid) && p.joinedAt < startedAt)
      .map(([uid]) => uid));
  }

  private ask(repeat: boolean) {
    const prev = this.round;
    let question: Question;
    let shuffled: { options: string[]; answer: number };
    let attempt = 0;
    if (repeat && prev) {
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
    const key = roundKey(this.state.stop, this.state.questionNumber, attempt);
    const eligible = this.eligibleAt(startedAt);

    const round: Round = {
      question, ...shuffled, attempt, key, startedAt, endsAt, eligible, finished: false,
      stopAnswers: watchAnswers(this.code, key, answers => {
        const answered = Object.keys(answers).filter(uid => eligible.has(uid)).length;
        if (eligible.size > 0 && answered >= eligible.size) this.later(TIMING.allAnsweredMs, () => void this.finish(round));
      }),
    };
    this.round = round;

    const publicQuestion: PublicQuestion = { key, text: question.question, options: shuffled.options, unit: question.unit, attempt, startedAt, endsAt };
    void this.write({ status: 'question', question: publicQuestion, reveal: null, state: this.state });
    this.later(endsAt - serverNow() + TIMING.graceMs, () => void this.finish(round));
  }

  private async finish(round: Round) {
    if (round.finished || round !== this.round) return;
    round.finished = true;
    round.stopAnswers();

    const answers = await readAnswers(this.code, round.key).catch(() => ({}));
    const t = tally(answers, round.eligible, round.answer);
    const majority = isMajority(t.correct, round.eligible.size);
    const result = resolveRound(this.state, majority ? 'strike' : 'shield', round.attempt === 0);
    this.state = result.state;
    this.track(round, t.correct);

    const reveal: Reveal = {
      key: round.key,
      outcome: result.outcome,
      percent: round.eligible.size ? Math.round((t.correct / round.eligible.size) * 100) : 0,
      votes: t.votes,
      answered: t.answered,
      eligible: round.eligible.size,
    };
    if (result.outcome === 'strike') {
      // the right answer is only revealed when the majority got it (design §3.3)
      reveal.correct = round.answer;
      const names = Object.entries(answers)
        .filter(([uid, opt]) => round.eligible.has(uid) && opt === round.answer)
        .map(([uid]) => this.players[uid]?.name)
        .filter((n): n is string => Boolean(n));
      reveal.strikers = names.slice(0, 2);
      reveal.moreStrikers = Math.max(0, names.length - 2);
    }
    await this.write({ status: 'reveal', reveal, state: this.state });

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
