import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY, initialState, isMajority, nextStop, questionsToWin, reshuffleDifferent, resolveRound, shieldFor,
  shuffleOptions, tally, isLastChance, roundKey, newGameId, STREAK_FOR_SHIELD,
} from './rules';
import type { BattleState } from './types';

// tiny deterministic PRNG for repeatable shuffles
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('difficulty table (design §4)', () => {
  it('questions to win without misses: 6 / 11 / 16', () => {
    expect(questionsToWin('easy')).toBe(6);
    expect(questionsToWin('medium')).toBe(11);
    expect(questionsToWin('hard')).toBe(16);
  });
  it('lives and time per question', () => {
    expect([DIFFICULTY.easy.lives, DIFFICULTY.medium.lives, DIFFICULTY.hard.lives]).toEqual([5, 3, 2]);
    expect([DIFFICULTY.easy.seconds, DIFFICULTY.medium.seconds, DIFFICULTY.hard.seconds]).toEqual([30, 20, 15]);
  });
});

describe('shield states (design §3.4)', () => {
  it('medium: intact -> cracked -> gone', () => {
    expect([3, 2, 1].map(l => shieldFor('medium', l))).toEqual(['full', 'cracked', 'gone']);
  });
  it('easy uses all five states, hard only intact -> gone', () => {
    expect([5, 4, 3, 2, 1].map(l => shieldFor('easy', l))).toEqual(['full', 'scratched', 'cracked', 'split', 'gone']);
    expect([2, 1].map(l => shieldFor('hard', l))).toEqual(['full', 'gone']);
  });
  it('without shield it is the last chance', () => {
    expect(isLastChance(1)).toBe(true);
    expect(isLastChance(2)).toBe(false);
  });
});

describe('majority rule (design §3.3)', () => {
  it('needs strictly more than half of the connected players', () => {
    expect(isMajority(8, 15)).toBe(true);
    expect(isMajority(7, 14)).toBe(false); // exactly 50% is not a majority
    expect(isMajority(0, 0)).toBe(false); // nobody connected
  });
  it('players who did not answer count as wrong', () => {
    const eligible = new Set(['a', 'b', 'c', 'd', 'e']);
    const t = tally({ a: 1, b: 1 }, eligible, 1);
    expect(t.correct).toBe(2);
    expect(isMajority(t.correct, eligible.size)).toBe(false);
  });
  it('ignores late joiners and invalid values', () => {
    const t = tally({ a: 2, late: 2, b: 7, c: 0 }, new Set(['a', 'b', 'c']), 2);
    expect(t).toEqual({ votes: [1, 0, 1, 0], correct: 1, answered: 2 });
  });
});

describe('rounds', () => {
  it('a strike removes one hit and builds the combo only on first attempts', () => {
    const s = initialState('medium');
    const r1 = resolveRound(s, 'strike', true, 3);
    expect(r1.state.enemyHp).toBe(1);
    expect(r1.state.combo).toBe(1);
    const r2 = resolveRound(r1.state, 'strike', false, 3);
    expect(r2.outcome === 'strike' && r2.enemyDefeated).toBe(true);
    expect(r2.state.combo).toBe(0);
  });
  it('a miss costs one life; the miss without shield loses (medium = 3 misses)', () => {
    let s = initialState('medium');
    const results = [1, 2, 3].map(() => {
      const r = resolveRound(s, 'shield', true, 3);
      s = r.state;
      return r.outcome === 'shield' && r.lost;
    });
    expect(results).toEqual([false, false, true]);
  });
  it('beating the boss wins the game', () => {
    let s = initialState('easy');
    for (let stop = 0; stop < 4; stop++) s = nextStop(resolveRound(s, 'strike', true, 5).state, 'easy');
    expect(s.stop).toBe(4);
    expect(s.enemyMaxHp).toBe(DIFFICULTY.easy.bossHp);
    let r = resolveRound(s, 'strike', true, 5);
    expect(r.outcome === 'strike' && r.won).toBe(false);
    r = resolveRound(r.state, 'strike', true, 5);
    expect(r.outcome === 'strike' && r.won).toBe(true);
  });
});

describe('streak shield', () => {
  const strikes = (s: BattleState, n: number, maxLives = 3) => {
    const ups: boolean[] = [];
    for (let i = 0; i < n; i++) {
      const r = resolveRound({ ...s, enemyHp: 9 }, 'strike', true, maxLives);
      if (r.outcome !== 'strike') throw new Error('expected a strike');
      ups.push(r.shieldUp);
      s = r.state;
    }
    return { s, ups };
  };
  it(`every ${STREAK_FOR_SHIELD} first-try strikes in a row repair one hit of a damaged shield`, () => {
    const { s, ups } = strikes({ ...initialState('medium'), lives: 1 }, 6);
    expect(ups).toEqual([false, false, true, false, false, true]);
    expect(s.lives).toBe(3);
    expect(s.combo).toBe(6);
  });
  it('never goes above the difficulty lives', () => {
    const { s, ups } = strikes(initialState('medium'), 3);
    expect(ups).toEqual([false, false, false]);
    expect(s.lives).toBe(3);
  });
  it('a strike on a retry breaks the streak, so it does not count toward the shield', () => {
    let s = { ...initialState('medium'), lives: 2, combo: 2, enemyHp: 9 };
    const r = resolveRound(s, 'strike', false, 3);
    expect(r.outcome === 'strike' && r.shieldUp).toBe(false);
    s = r.state;
    expect(s.lives).toBe(2);
    expect(s.combo).toBe(0);
  });
});

describe('option shuffling', () => {
  const opts = ['have', 'had', 'will have', 'having'];
  it('keeps track of the right answer', () => {
    for (let seed = 1; seed < 50; seed++) {
      const { options, answer } = shuffleOptions(opts, 1, seeded(seed));
      expect(options[answer]).toBe('had');
      expect([...options].sort()).toEqual([...opts].sort());
    }
  });
  it('a repeated question never shows the same order', () => {
    for (let seed = 1; seed < 50; seed++) {
      const { options, answer } = reshuffleDifferent(opts, 1, seeded(seed));
      expect(options).not.toEqual(opts);
      expect(options[answer]).toBe('had');
    }
  });
});

describe('round keys', () => {
  it('differ between two games in the same room (PLAY AGAIN never reuses an answers bucket)', () => {
    const a = roundKey(newGameId(1_700_000_000_000), 0, 1, 0);
    const b = roundKey(newGameId(1_700_000_090_000), 0, 1, 0);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-z]{4,12}-s[0-9]+q[0-9]+a[0-9]+$/); // same pattern as database.rules.json
  });
});
