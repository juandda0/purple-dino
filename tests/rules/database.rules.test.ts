// Security rules = the access model (docs/modelo-de-acceso.md). Runs on the RTDB emulator: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { get, ref, remove, serverTimestamp, set, update } from 'firebase/database';

let env: RulesTestEnvironment;
const CODE = '4827';
const DAY = 86_400_000;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-purple-dino',
    database: { rules: readFileSync('database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearDatabase());

const db = (uid: string | null) => (uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database());

const room = (over: Record<string, unknown> = {}) => ({
  hostUid: 'teacher',
  createdAt: Date.now(),
  status: 'lobby',
  config: { course: 6, units: [7, 8, 9], difficulty: 'medium' },
  ...over,
});

/** Seeds data bypassing the rules. */
const seed = (path: string, value: unknown) => env.withSecurityRulesDisabled(c => set(ref(c.database(), path), value));

const player = (joinedAt = Date.now() - 60_000) => ({ name: 'Ana', avatar: 'sena', ready: false, joinedAt });

async function seedQuestion(over: Record<string, unknown> = {}) {
  const now = Date.now();
  await seed(`rooms/${CODE}`, room({
    status: 'question',
    question: { key: 'kx9a2b-s0q1a0', text: 'If I ___ more time…', options: ['have', 'had', 'will have', 'having'], unit: 7, attempt: 0, startedAt: now - 5_000, endsAt: now + 15_000, eligible: 1, ...over },
    players: { ana: player(), late: player(now - 1_000) },
  }));
}

describe('rooms: the teacher owns her room', () => {
  it('anyone signed in can create a free code as its host', async () => {
    await assertSucceeds(set(ref(db('teacher'), `rooms/${CODE}`), { ...room(), createdAt: serverTimestamp() }));
  });
  it('nobody signed out can create or read rooms', async () => {
    await assertFails(set(ref(db(null), `rooms/${CODE}`), room()));
    await seed(`rooms/${CODE}`, room());
    await assertFails(get(ref(db(null), `rooms/${CODE}`)));
  });
  it('cannot create a room in someone else\'s name', async () => {
    await assertFails(set(ref(db('mallory'), `rooms/${CODE}`), { ...room(), createdAt: serverTimestamp() }));
  });
  it('cannot take over a code that is in use', async () => {
    await seed(`rooms/${CODE}`, room());
    await assertFails(set(ref(db('mallory'), `rooms/${CODE}`), { ...room({ hostUid: 'mallory' }), createdAt: serverTimestamp() }));
  });
  it('can reuse a code abandoned for more than 24 h', async () => {
    await seed(`rooms/${CODE}`, room({ createdAt: Date.now() - DAY - 60_000 }));
    await assertSucceeds(set(ref(db('teacher2'), `rooms/${CODE}`), { ...room({ hostUid: 'teacher2' }), createdAt: serverTimestamp() }));
  });
  it('a student cannot change the game state, question or result', async () => {
    await seed(`rooms/${CODE}`, room());
    await assertFails(update(ref(db('ana'), `rooms/${CODE}`), { status: 'won' }));
    await assertFails(set(ref(db('ana'), `rooms/${CODE}/state/lives`), 99));
  });
  it('the host drives the game but can never publish the answer', async () => {
    await seedQuestion();
    await assertSucceeds(update(ref(db('teacher'), `rooms/${CODE}`), { status: 'reveal' }));
    await assertFails(set(ref(db('teacher'), `rooms/${CODE}/question/answer`), 1));
  });
  it('a reveal only carries the right answer and the votes on a sword strike (R3/R4)', async () => {
    await seedQuestion();
    const reveal = { key: 'kx9a2b-s0q1a0', percent: 30, answered: 2, eligible: 3 };
    await assertFails(set(ref(db('teacher'), `rooms/${CODE}/reveal`), { ...reveal, outcome: 'shield', correct: 1 }));
    await assertFails(set(ref(db('teacher'), `rooms/${CODE}/reveal`), { ...reveal, outcome: 'shield', votes: [1, 1, 0, 0] }));
    await assertSucceeds(set(ref(db('teacher'), `rooms/${CODE}/reveal`), { ...reveal, outcome: 'shield' }));
    await assertSucceeds(set(ref(db('teacher'), `rooms/${CODE}/reveal`), { ...reveal, outcome: 'strike', correct: 1, votes: [0, 2, 0, 0] }));
  });
  it('only the host deletes the room; anyone may clean up an abandoned one', async () => {
    await seed(`rooms/${CODE}`, room());
    await assertFails(remove(ref(db('ana'), `rooms/${CODE}`)));
    await assertSucceeds(remove(ref(db('teacher'), `rooms/${CODE}`)));
    await seed(`rooms/${CODE}`, room({ createdAt: Date.now() - DAY - 1 }));
    await assertSucceeds(remove(ref(db('someone'), `rooms/${CODE}`)));
  });
  it('rooms can never be listed (codes and names stay private)', async () => {
    await seed(`rooms/${CODE}`, room());
    await assertFails(get(ref(db('mallory'), 'rooms')));
  });
});

describe('players: each student only writes about themself', () => {
  beforeEach(() => seed(`rooms/${CODE}`, room()));

  it('joins with a first name and a dino', async () => {
    await assertSucceeds(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), joinedAt: serverTimestamp() }));
  });
  it('can join a battle already in progress (counts from the next question)', async () => {
    await seed(`rooms/${CODE}/status`, 'question');
    await assertSucceeds(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), joinedAt: serverTimestamp() }));
  });
  it('cannot join a finished game or a room that does not exist', async () => {
    await assertFails(set(ref(db('ana'), `rooms/9999/players/ana`), { ...player(), joinedAt: serverTimestamp() }));
    await seed(`rooms/${CODE}/status`, 'won');
    await assertFails(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), joinedAt: serverTimestamp() }));
  });
  it('cannot write another student, a fake join time, extra fields or a huge name', async () => {
    await assertFails(set(ref(db('ana'), `rooms/${CODE}/players/luis`), { ...player(), joinedAt: serverTimestamp() }));
    await assertFails(set(ref(db('ana'), `rooms/${CODE}/players/ana`), player(Date.now() - DAY)));
    await assertFails(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), joinedAt: serverTimestamp(), role: 'host' }));
    await assertFails(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), name: 'x'.repeat(40), joinedAt: serverTimestamp() }));
  });
  it('can toggle ready but not move their join time', async () => {
    const t = Date.now() - 60_000;
    await seed(`rooms/${CODE}/players/ana`, player(t));
    await assertSucceeds(update(ref(db('ana'), `rooms/${CODE}/players/ana`), { ready: true }));
    await assertFails(update(ref(db('ana'), `rooms/${CODE}/players/ana`), { joinedAt: t - 10_000 }));
  });
});

describe('answers: one locked answer per student, never visible to classmates', () => {
  it('answers once while the question is open', async () => {
    await seedQuestion();
    await assertSucceeds(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/ana`), 1));
    await assertFails(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/ana`), 2)); // locked in
  });
  it('cannot answer for someone else, an old round, an invalid option or after time', async () => {
    await seedQuestion();
    await assertFails(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/luis`), 1));
    await assertFails(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q0a0/ana`), 1));
    await assertFails(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/ana`), 7));
    await env.clearDatabase();
    await seedQuestion({ startedAt: Date.now() - 30_000, endsAt: Date.now() - 5_000 });
    await assertFails(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/ana`), 1));
  });
  it('an answer for the same round of a previous game in this room is rejected', async () => {
    await seedQuestion();
    await assertFails(set(ref(db('ana'), `answers/${CODE}/old000-s0q1a0/ana`), 1));
  });
  it('a student who joined after the question started waits for the next one', async () => {
    await seedQuestion();
    await assertFails(set(ref(db('late'), `answers/${CODE}/kx9a2b-s0q1a0/late`), 1));
  });
  it('cannot answer outside the question phase', async () => {
    await seedQuestion();
    await seed(`rooms/${CODE}/status`, 'reveal');
    await assertFails(set(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/ana`), 1));
  });
  it('only the host reads all answers; a student reads only their own', async () => {
    await seedQuestion();
    await seed(`answers/${CODE}/kx9a2b-s0q1a0`, { ana: 1, luis: 2 });
    await assertSucceeds(get(ref(db('teacher'), `answers/${CODE}`)));
    await assertFails(get(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0`)));
    await assertFails(get(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/luis`)));
    await assertSucceeds(get(ref(db('ana'), `answers/${CODE}/kx9a2b-s0q1a0/ana`)));
  });
  it('only the host clears answers, or anyone once the room is gone', async () => {
    await seedQuestion();
    await seed(`answers/${CODE}/kx9a2b-s0q1a0`, { ana: 1 });
    await assertFails(remove(ref(db('ana'), `answers/${CODE}`)));
    await assertSucceeds(remove(ref(db('teacher'), `answers/${CODE}`)));
  });
});

describe('presence', () => {
  it('a joined student marks themself online; only the host sees who is online', async () => {
    await seed(`rooms/${CODE}`, room({ players: { ana: player() } }));
    await assertSucceeds(set(ref(db('ana'), `presence/${CODE}/ana`), true));
    await assertFails(set(ref(db('ana'), `presence/${CODE}/luis`), true));
    await assertFails(set(ref(db('luis'), `presence/${CODE}/luis`), true)); // not a player of this room
    await assertSucceeds(get(ref(db('teacher'), `presence/${CODE}`)));
    await assertFails(get(ref(db('ana'), `presence/${CODE}`)));
  });
});
