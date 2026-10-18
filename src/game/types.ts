// Shared game types. Everything written to the Realtime Database is described here.

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Skill = 'grammar' | 'vocabulary' | 'expressions';

/** A question as stored in the bank (bundled only in the host chunk; phones never get `answer`). */
export interface Question {
  id: string;
  course: number;
  unit: number;
  skill: Skill;
  question: string;
  options: [string, string, string, string];
  answer: number;
}

export type RoomStatus = 'lobby' | 'walking' | 'question' | 'reveal' | 'won' | 'lost';

export type Outcome = 'strike' | 'shield';

export interface GameConfig {
  course: number;
  units: number[];
  difficulty: Difficulty;
}

/** Public battle progress (rooms/{code}/state). */
export interface BattleState {
  stop: number; // 0..4
  enemyHp: number;
  enemyMaxHp: number;
  lives: number; // misses left before game over (see rules.ts)
  combo: number;
  questionNumber: number; // questions asked so far (attempts included)
}

/** The question shown to everybody (rooms/{code}/question) — never contains the answer. */
export interface PublicQuestion {
  key: string; // round key, also the answers/{code}/{key} bucket
  text: string;
  options: string[];
  unit: number;
  attempt: number; // 0 = first try, 1+ = repeated after a miss
  startedAt: number; // server ms
  endsAt: number; // server ms
}

/** Result of a round (rooms/{code}/reveal). `correct` only exists when the majority got it right. */
export interface Reveal {
  key: string;
  outcome: Outcome;
  percent: number; // 0..100
  votes: number[]; // per option
  correct?: number;
  answered: number;
  eligible: number;
  strikers?: string[]; // first names of those who got it right (strike only, max 2) …
  moreStrikers?: number; // … plus how many more
}

export interface Player {
  name: string;
  avatar: string;
  ready: boolean;
  joinedAt: number;
}

export interface Room {
  hostUid: string;
  createdAt: number;
  status: RoomStatus;
  config: GameConfig;
  state?: BattleState;
  question?: PublicQuestion | null;
  reveal?: Reveal | null;
  players?: Record<string, Player>;
}
