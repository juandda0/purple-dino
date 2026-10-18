// Deciding a round (pure, unit tested in round.test.ts). The controller only feeds it data and writes the result.
import { isMajority, resolveRound, tally, type RoundResult } from './rules';
import type { BattleState, Player, Reveal } from './types';

export interface RoundInput {
  key: string;
  answer: number; // index of the right option, known only by the host
  attempt: number;
  eligible: ReadonlySet<string>; // connected players who joined before the question started
  answers: Record<string, number>;
  players: Record<string, Player>;
  state: BattleState;
}

export type RoundDecision =
  /** Nobody could answer (e.g. the classroom Wi-Fi dropped): no penalty, the same question is asked again. */
  | { kind: 'nobody' }
  | { kind: 'resolved'; result: RoundResult; reveal: Reveal; correct: number };

export function decideRound({ key, answer, attempt, eligible, answers, players, state }: RoundInput): RoundDecision {
  if (eligible.size === 0) return { kind: 'nobody' };
  const t = tally(answers, eligible, answer);
  const result = resolveRound(state, isMajority(t.correct, eligible.size) ? 'strike' : 'shield', attempt === 0);
  const reveal: Reveal = {
    key,
    outcome: result.outcome,
    percent: Math.round((t.correct / eligible.size) * 100),
    answered: t.answered,
    eligible: eligible.size,
  };
  if (result.outcome === 'strike') {
    // the right answer and the vote split are only shown when the majority got it (design §3.3, R3/R4):
    // on a miss, votes + percent would let anyone work out the right option before the retry
    reveal.correct = answer;
    reveal.votes = t.votes;
    const names = Object.entries(answers)
      .filter(([uid, opt]) => eligible.has(uid) && opt === answer)
      .map(([uid]) => players[uid]?.name)
      .filter((n): n is string => Boolean(n));
    reveal.strikers = names.slice(0, 2);
    reveal.moreStrikers = Math.max(0, names.length - 2);
  }
  return { kind: 'resolved', result, reveal, correct: t.correct };
}

/**
 * A question that reached the database late (slow or offline teacher laptop) gets its full time again, counted from
 * when it really landed. Returns the new deadline, or null when it landed on time. It only ever extends the same
 * question once: asking again instead would loop forever on a slow network.
 */
export function extendedDeadline(q: { startedAt: number; endsAt: number }, landedAt: number, lateMs: number): number | null {
  if (landedAt - q.startedAt <= lateMs) return null;
  return landedAt + (q.endsAt - q.startedAt);
}

/**
 * Can the answers seen so far be trusted at the end of a round? `synced`: a write confirmed by the server after the
 * deadline (it is delivered after every earlier event on this connection, so the live listener already has every
 * answer that reached the server). Offline, or with a link that looks connected but gets nothing through (captive
 * portal, school uplink down), the round is treated as "nobody could answer": no life lost, same question again.
 * Only once per question though when still "connected": on a slow but working network the repeat is counted with
 * what arrived, or the class would never move on.
 */
export function roundCountable({ synced, connected, repeatedForNetwork }: { synced: boolean; connected: boolean; repeatedForNetwork: boolean }): boolean {
  if (!connected) return false;
  return synced || repeatedForNetwork;
}

/**
 * Who counts at the end of a round (R2 + R11): the players eligible when the question started, minus whoever
 * disconnected during the question without answering (an answer already sent always counts).
 */
export function countedAtEnd(eligible: ReadonlySet<string>, answers: Record<string, number>, online: ReadonlySet<string>): Set<string> {
  return new Set([...eligible].filter(uid => uid in answers || online.has(uid)));
}

/** Everybody who still counts has answered: the round can close early. */
export function everyoneAnswered(eligible: ReadonlySet<string>, answers: Record<string, number>, online: ReadonlySet<string>): boolean {
  const counted = countedAtEnd(eligible, answers, online);
  return counted.size > 0 && [...counted].every(uid => uid in answers);
}
