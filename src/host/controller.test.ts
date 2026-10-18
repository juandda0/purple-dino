// GameController wiring for Lote 11 (late question, rounds that cannot be counted, room that vanishes), with the
// database layer faked: every write is recorded and resolves after `fake.writeDelay` ms (or never).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig, Player, PublicQuestion } from '../game/types';

type Patch = Record<string, unknown>;
const fake = vi.hoisted(() => ({
  writeDelay: 0 as number | 'never',
  writes: [] as Patch[],
  room: null as ((room: unknown) => void) | null,
  presence: null as ((online: Set<string>) => void) | null,
  connection: null as ((connected: boolean) => void) | null,
  answers: new Map<string, (a: Record<string, number>) => void>(),
}));

vi.mock('firebase/database', () => ({ serverTimestamp: () => ({ '.sv': 'timestamp' }) }));
vi.mock('../lib/firebase', () => ({ serverNow: () => Date.now(), currentUid: () => 'teacher' }));
vi.mock('../data/room', () => ({
  updateRoom: (_code: string, patch: Patch) => {
    fake.writes.push(patch);
    const delay = fake.writeDelay;
    return delay === 'never' ? new Promise<void>(() => {}) : new Promise<void>(resolve => setTimeout(resolve, delay));
  },
  watchRoom: (_code: string, cb: (room: unknown) => void) => ((fake.room = cb), () => (fake.room = null)),
  watchPresence: (_code: string, cb: (online: Set<string>) => void) => ((fake.presence = cb), () => (fake.presence = null)),
  watchConnection: (cb: (connected: boolean) => void) => ((fake.connection = cb), () => (fake.connection = null)),
  watchAnswers: (_code: string, key: string, cb: (a: Record<string, number>) => void) => (fake.answers.set(key, cb), () => fake.answers.delete(key)),
}));

const { GameController, TIMING } = await import('./controller');

const config: GameConfig = { course: 6, units: [1], difficulty: 'medium' }; // 20 s per question
const SECONDS = 20_000;
const player = (name: string): Player => ({ name, avatar: 'sena', ready: true, joinedAt: 1 });
const players = { a: player('Ana'), b: player('Luis'), c: player('Sofia') };
const room = { hostUid: 'teacher', createdAt: 1, status: 'lobby', config, players };

const questions = () => fake.writes.filter(w => w.status === 'question').map(w => w.question as PublicQuestion);
const reveals = () => fake.writes.filter(w => w.status === 'reveal');

let game: InstanceType<typeof GameController>;

/** New game, everybody connected, until the first question is on the database. */
async function startGame() {
  game = new GameController('1234', config);
  fake.room!(room);
  fake.presence!(new Set(Object.keys(players)));
  fake.connection!(true);
  game.start();
  await vi.advanceTimersByTimeAsync(TIMING.walkMs);
}

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  fake.writeDelay = 0;
  fake.writes.length = 0;
  fake.answers.clear();
});
afterEach(() => {
  game.dispose();
  vi.useRealTimers();
});

describe('GameController (Lote 11)', () => {
  it('11.1 a question that reaches the database late gets its full time again: same key, no re-ask', async () => {
    fake.writeDelay = 3000; // slow laptop: the question lands 3 s after it was asked
    await startGame();
    await vi.advanceTimersByTimeAsync(3000);
    const [q] = questions();
    expect(fake.writes).toContainEqual({ 'question/endsAt': q!.startedAt + 3000 + SECONDS });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(questions()).toHaveLength(1); // still the same question, not asked again
  });

  it('11.1 a question on time keeps its deadline', async () => {
    await startGame();
    expect(fake.writes.some(w => 'question/endsAt' in w)).toBe(false);
  });

  it('11.3 nothing gets through at the end (half-open link): no life lost, same question once; then it is counted', async () => {
    await startGame();
    const [first] = questions();
    fake.writeDelay = 'never'; // the end-of-round sync write is never confirmed
    await vi.advanceTimersByTimeAsync(SECONDS + TIMING.graceMs + TIMING.syncTimeoutMs);
    fake.writeDelay = 0;
    await vi.advanceTimersByTimeAsync(TIMING.nobodyMs);
    expect(reveals()).toHaveLength(0);
    const again = questions().at(-1)!;
    expect(again).toMatchObject({ text: first!.text, options: first!.options, attempt: first!.attempt });
    expect(again.key).not.toBe(first!.key);

    // the repeat cannot be synced either: on a slow but "connected" network it is counted with what arrived
    fake.writeDelay = 'never';
    await vi.advanceTimersByTimeAsync(SECONDS + TIMING.graceMs + TIMING.syncTimeoutMs);
    expect(reveals()).toHaveLength(1);
    expect(reveals()[0]!.reveal).toMatchObject({ outcome: 'shield', answered: 0 });
  });

  it('11.3 offline at the end: never counted, not even on the repeat', async () => {
    await startGame();
    fake.connection!(false);
    fake.writeDelay = 'never';
    for (let i = 0; i < 2; i++) {
      await vi.advanceTimersByTimeAsync(SECONDS + TIMING.graceMs + TIMING.syncTimeoutMs);
      fake.writeDelay = 0;
      await vi.advanceTimersByTimeAsync(TIMING.nobodyMs);
      fake.writeDelay = 'never';
    }
    expect(reveals()).toHaveLength(0);
    expect(questions()).toHaveLength(3);
  });

  it('11.3 synced at the end: the answers are counted', async () => {
    await startGame();
    const q = questions()[0]!;
    fake.answers.get(q.key)!({ a: 0, b: 1 });
    await vi.advanceTimersByTimeAsync(SECONDS + TIMING.graceMs + 10); // + the sync write's round trip
    expect(reveals()).toHaveLength(1);
    expect(reveals()[0]!.reveal).toMatchObject({ answered: 2, eligible: 3 });
  });

  it.each([
    ['deleted', null],
    ['a partial local copy without config', { status: 'question' }],
    ['taken over by another teacher', { ...room, hostUid: 'other' }],
  ])('11.4 room %s: the controller stops writing', async (_case, next) => {
    await startGame();
    fake.room!(next);
    const count = fake.writes.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fake.writes).toHaveLength(count);
  });
});
