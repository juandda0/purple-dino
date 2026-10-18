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
 * Answers to count at the end of a round: the final server read, topped up with the live snapshot (or the snapshot
 * alone if the read failed). Offline nothing can be trusted, not even a read that "succeeded": the SDK then answers
 * from its local cache. So offline the round cannot be counted (null) and is treated like "nobody could answer":
 * no life lost, same question again.
 */
export function answersToCount(fetched: Record<string, number> | null, latest: Record<string, number>, connected: boolean): Record<string, number> | null {
  if (!connected) return null;
  return { ...latest, ...(fetched ?? {}) };
}
