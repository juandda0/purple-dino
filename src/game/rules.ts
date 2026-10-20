// Game rules from GAME_DESIGN.md §3–4, as pure functions (unit tested in rules.test.ts).
import type { BattleState, Difficulty, Outcome } from './types';

export interface DifficultySettings {
  lives: number; // misses that end the game; the last one is played without shield
  enemyHp: number;
  bossHp: number;
  seconds: number;
  /** Shield sprite shown for each remaining-lives value, from full lives down to 1 (index = lives - livesLeft). */
  shieldStates: ShieldSprite[];
}

export type ShieldSprite = 'full' | 'scratched' | 'cracked' | 'split' | 'gone';

export const DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: { lives: 5, enemyHp: 1, bossHp: 2, seconds: 30, shieldStates: ['full', 'scratched', 'cracked', 'split', 'gone'] },
  medium: { lives: 3, enemyHp: 2, bossHp: 3, seconds: 20, shieldStates: ['full', 'cracked', 'gone'] },
  hard: { lives: 2, enemyHp: 3, bossHp: 4, seconds: 15, shieldStates: ['full', 'gone'] },
};

export const STOP_COUNT = 5;
export const BOSS_STOP = STOP_COUNT - 1;

export const enemyHpFor = (difficulty: Difficulty, stop: number) =>
  stop === BOSS_STOP ? DIFFICULTY[difficulty].bossHp : DIFFICULTY[difficulty].enemyHp;

/** Questions needed to win without misses (design table: 6 / 11 / 16). */
export const questionsToWin = (difficulty: Difficulty) =>
  DIFFICULTY[difficulty].enemyHp * (STOP_COUNT - 1) + DIFFICULTY[difficulty].bossHp;

export const shieldFor = (difficulty: Difficulty, livesLeft: number): ShieldSprite => {
  const { lives, shieldStates } = DIFFICULTY[difficulty];
  return shieldStates[Math.min(shieldStates.length - 1, Math.max(0, lives - livesLeft))] ?? 'gone';
};

/** Last chance = the shield is gone and one more miss loses. */
export const isLastChance = (livesLeft: number) => livesLeft === 1;

/** Every this many first-try strikes in a row (combo x3, x6…) the shield gets one hit back, if it had lost any. */
export const STREAK_FOR_SHIELD = 3;

export const initialState = (difficulty: Difficulty): BattleState => ({
  stop: 0,
  enemyHp: enemyHpFor(difficulty, 0),
  enemyMaxHp: enemyHpFor(difficulty, 0),
  lives: DIFFICULTY[difficulty].lives,
  combo: 0,
  questionNumber: 0,
});

/** Majority rule: strictly more than 50% of the eligible players answered correctly; no answer = wrong. */
export const isMajority = (correct: number, eligible: number) => eligible > 0 && correct * 2 > eligible;

export interface Tally {
  votes: number[];
  correct: number;
  answered: number;
}

/** Counts the answers of eligible players only (late joiners count from the next question). */
export function tally(answers: Record<string, number>, eligible: ReadonlySet<string>, answer: number): Tally {
  const votes = [0, 0, 0, 0];
  let correct = 0;
  let answered = 0;
  for (const [uid, option] of Object.entries(answers)) {
    if (!eligible.has(uid) || !Number.isInteger(option) || option < 0 || option > 3) continue;
    votes[option]! += 1;
    answered += 1;
    if (option === answer) correct += 1;
  }
  return { votes, correct, answered };
}

export type RoundResult =
  | { outcome: 'strike'; state: BattleState; enemyDefeated: boolean; won: boolean; shieldUp: boolean }
  | { outcome: 'shield'; state: BattleState; lost: boolean };

/** Applies a round outcome to the battle state. `maxLives`: the difficulty's lives, the cap for the streak reward. */
export function resolveRound(state: BattleState, outcome: Outcome, firstAttempt: boolean, maxLives: number): RoundResult {
  if (outcome === 'strike') {
    const enemyHp = state.enemyHp - 1;
    const combo = firstAttempt ? state.combo + 1 : 0;
    const enemyDefeated = enemyHp <= 0;
    const won = enemyDefeated && state.stop === BOSS_STOP;
    const shieldUp = combo > 0 && combo % STREAK_FOR_SHIELD === 0 && state.lives < maxLives;
    const lives = shieldUp ? state.lives + 1 : state.lives;
    return { outcome, enemyDefeated, won, shieldUp, state: { ...state, enemyHp: Math.max(0, enemyHp), combo, lives } };
  }
  const lives = state.lives - 1;
  return { outcome, lost: lives <= 0, state: { ...state, lives: Math.max(0, lives), combo: 0 } };
}

/** Moves to the next stop after an enemy is defeated. */
export function nextStop(state: BattleState, difficulty: Difficulty): BattleState {
  const stop = Math.min(BOSS_STOP, state.stop + 1);
  const hp = enemyHpFor(difficulty, stop);
  return { ...state, stop, enemyHp: hp, enemyMaxHp: hp };
}

/** Fisher–Yates shuffle with an injectable random source (tests pass a seeded one). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Shuffles the 4 options and returns where the right answer ended up. */
export function shuffleOptions(options: readonly string[], answer: number, random: () => number = Math.random) {
  const order = shuffle([0, 1, 2, 3], random);
  return { options: order.map(i => options[i]!), answer: order.indexOf(answer) };
}

/** Same question again after a miss: options must come in a different order (design §3.3). */
export function reshuffleDifferent(options: readonly string[], answer: number, random: () => number = Math.random) {
  for (let i = 0; i < 20; i++) {
    const next = shuffleOptions(options, answer, random);
    if (next.options.some((o, k) => o !== options[k])) return next;
  }
  // deterministic fallback: rotate by one
  return { options: [...options.slice(1), options[0]!], answer: (answer + 3) % 4 };
}

/** Round key = answers bucket. Includes the game id so a "PLAY AGAIN" in the same room never reuses keys. */
export const roundKey = (game: string, stop: number, questionNumber: number, attempt: number) => `${game}-s${stop}q${questionNumber}a${attempt}`;

/** Short id for one game (base36 server time). */
export const newGameId = (now: number) => Math.floor(now).toString(36);
