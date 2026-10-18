import { describe, expect, it } from 'vitest';
import { decideRound, type RoundInput } from './round';
import { initialState } from './rules';
import type { Player } from './types';

const player = (name: string): Player => ({ name, avatar: 'sena', ready: true, joinedAt: 1 });
const players = { a: player('Ana'), b: player('Luis'), c: player('Sofia'), d: player('Mateo') };
const base = (over: Partial<RoundInput> = {}): RoundInput => ({
  key: 'g1-s0q1a0', answer: 1, attempt: 0, eligible: new Set(['a', 'b', 'c', 'd']), answers: {}, players, state: initialState('medium'), ...over,
});

describe('decideRound', () => {
  it('majority right -> sword strike with the right answer, votes and who struck', () => {
    const d = decideRound(base({ answers: { a: 1, b: 1, c: 1, d: 0 } }));
    expect(d.kind).toBe('resolved');
    if (d.kind !== 'resolved') return;
    expect(d.reveal).toMatchObject({ outcome: 'strike', correct: 1, votes: [1, 3, 0, 0], percent: 75, answered: 4, eligible: 4 });
    expect(d.reveal.strikers).toEqual(['Ana', 'Luis']);
    expect(d.reveal.moreStrikers).toBe(1);
    expect(d.result.state.enemyHp).toBe(1);
  });

  it('a miss never publishes the right answer nor the vote split (R3/R4)', () => {
    const d = decideRound(base({ answers: { a: 1, b: 0, c: 2 } }));
    if (d.kind !== 'resolved') throw new Error('expected a result');
    expect(d.reveal.outcome).toBe('shield');
    expect(d.reveal.correct).toBeUndefined();
    expect(d.reveal.votes).toBeUndefined();
    expect(d.reveal.strikers).toBeUndefined();
    expect(d.reveal.percent).toBe(25);
    expect(d.result.state.lives).toBe(2);
  });

  it('exactly half is a miss; not answering counts as wrong (R1)', () => {
    const d = decideRound(base({ answers: { a: 1, b: 1 } }));
    expect(d.kind === 'resolved' && d.reveal.outcome).toBe('shield');
  });

  it('answers from players who were not eligible are ignored (R2)', () => {
    const d = decideRound(base({ eligible: new Set(['a', 'b']), answers: { a: 0, late1: 1, late2: 1, late3: 1 } }));
    expect(d.kind === 'resolved' && d.reveal.outcome).toBe('shield');
  });

  it('nobody connected -> no penalty, the question is asked again (business decision 2026-10-18)', () => {
    expect(decideRound(base({ eligible: new Set() }))).toEqual({ kind: 'nobody' });
  });

  it('a strike on a retry does not build the combo', () => {
    const d = decideRound(base({ attempt: 1, answers: { a: 1, b: 1, c: 1 } }));
    expect(d.kind === 'resolved' && d.result.state.combo).toBe(0);
  });
});
