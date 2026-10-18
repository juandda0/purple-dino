import { describe, expect, it } from 'vitest';
import { BANK, QuestionDeck, unitsWithQuestions } from './questions';

describe('question bank', () => {
  it('has the 12 units of Course 6 with ~20 questions each', () => {
    expect(unitsWithQuestions(6)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(BANK.filter(q => q.course === 6).length).toBeGreaterThanOrEqual(240);
  });
  it('every question is well formed: 4 distinct options, one valid answer, unique id', () => {
    const ids = new Set<string>();
    for (const q of BANK) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3).toBe(true);
      expect(['grammar', 'vocabulary', 'expressions']).toContain(q.skill);
      expect(q.question.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('QuestionDeck', () => {
  it('never repeats a question until the selected units run out', () => {
    const deck = new QuestionDeck(6, [7, 8, 9]);
    const seen = new Set<string>();
    for (let i = 0; i < deck.size; i++) {
      const q = deck.next();
      expect([7, 8, 9]).toContain(q.unit);
      expect(seen.has(q.id)).toBe(false);
      seen.add(q.id);
    }
  });
  it('a Hard game with 3 units has enough questions without repeating', () => {
    expect(new QuestionDeck(6, [7, 8, 9]).size).toBeGreaterThanOrEqual(16);
  });
  it('rejects an empty selection', () => {
    expect(() => new QuestionDeck(6, [])).toThrow();
  });
});
