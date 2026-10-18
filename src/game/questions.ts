// Question bank: Course 6 units 1–12 (placeholder B1 items until the real syllabus arrives).
// Only the host imports this module (it is in the lazy host chunk), so phones never download answers.
import type { Question } from './types';
import { shuffle } from './rules';

const files = import.meta.glob<{ default: Question[] }>('../content/questions/course-*/unit-*.json', { eager: true });

export const BANK: readonly Question[] = Object.values(files).flatMap(m => m.default);

export const unitsWithQuestions = (course: number) =>
  [...new Set(BANK.filter(q => q.course === course).map(q => q.unit))].sort((a, b) => a - b);

/**
 * Draws questions from the chosen units without repeating any in the same game (design §3.3).
 * When the pool runs out (very long games with many retries) it starts over with a new shuffle.
 */
export class QuestionDeck {
  private pool: Question[] = [];
  private readonly source: Question[];

  constructor(course: number, units: readonly number[], private readonly random: () => number = Math.random, bank: readonly Question[] = BANK) {
    const wanted = new Set(units);
    this.source = bank.filter(q => q.course === course && wanted.has(q.unit));
    if (this.source.length === 0) throw new Error('No questions for the selected units');
  }

  next(): Question {
    if (this.pool.length === 0) this.pool = shuffle(this.source, this.random);
    return this.pool.pop()!;
  }

  get size() {
    return this.source.length;
  }
}
