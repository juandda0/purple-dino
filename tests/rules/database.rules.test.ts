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
    // its own database namespace: clearDatabase() must never wipe the rooms of a running `npm run dev:emu` (Lote 11.5)
    projectId: 'demo-purple-dino-rules',
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

/** Creating a room = the room + the host's one-room index, in one multi-path write (like createRoom()). */
const createAs = (uid: string, code: string, over: Record<string, unknown> = {}) =>
  update(ref(db(uid)), { [`rooms/${code}`]: { ...room({ hostUid: uid, ...over }), createdAt: serverTimestamp() }, [`hostRooms/${uid}`]: code });

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
    await assertSucceeds(createAs('teacher', CODE));
  });
  it('nobody signed out can create or read rooms', async () => {
    await assertFails(set(ref(db(null), `rooms/${CODE}`), room()));
    await seed(`rooms/${CODE}`, room());
    await assertFails(get(ref(db(null), `rooms/${CODE}`)));
  });
  it('cannot create a room in someone else\'s name', async () => {
    await assertFails(set(ref(db('mallory'), `rooms/${CODE}`), { ...room(), createdAt: serverTimestamp() }));
    await assertFails(update(ref(db('mallory')), { [`rooms/${CODE}`]: { ...room(), createdAt: serverTimestamp() }, 'hostRooms/mallory': CODE }));
  });
  it('cannot take over a code that is in use', async () => {
    await seed(`rooms/${CODE}`, room());
    await assertFails(createAs('mallory', CODE));
  });
  it('can reuse a code abandoned for more than 24 h', async () => {
    await seed(`rooms/${CODE}`, room({ createdAt: Date.now() - DAY - 60_000 }));
    await assertSucceeds(createAs('teacher2', CODE));
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

describe('one room per teacher; abandoned rooms (lote 4)', () => {
  it('a teacher cannot open a second room while the first one exists', async () => {
    await assertSucceeds(createAs('teacher', '1111'));
    await assertFails(createAs('teacher', '2222'));
    await assertSucceeds(remove(ref(db('teacher'), 'rooms/1111')));
    await assertSucceeds(createAs('teacher', '2222'));
  });
  it('the index cannot be dropped to open a second room while the first one exists (adversarial review)', async () => {
    await assertSucceeds(createAs('teacher', '1111'));
    await assertFails(remove(ref(db('teacher'), 'hostRooms/teacher')));
    await assertFails(createAs('teacher', '2222'));
    // the normal way out: delete the room first, then the index (what deleteRoom() does)
    await assertSucceeds(remove(ref(db('teacher'), 'rooms/1111')));
    await assertSucceeds(remove(ref(db('teacher'), 'hostRooms/teacher')));
  });
  it('a room cannot be created without the index, nor the index point to a room that is not yours', async () => {
    await assertFails(set(ref(db('teacher'), `rooms/${CODE}`), { ...room(), createdAt: serverTimestamp() }));
    await seed(`rooms/${CODE}`, room({ hostUid: 'other' }));
    await assertFails(set(ref(db('teacher'), 'hostRooms/teacher'), CODE));
    await assertFails(set(ref(db('teacher'), 'hostRooms/someone'), CODE));
  });
  it('taking over an abandoned room restarts its 24 h clock', async () => {
    await seed(`rooms/${CODE}`, room({ createdAt: Date.now() - DAY - 60_000 }));
    await assertFails(update(ref(db('m1')), { [`rooms/${CODE}/hostUid`]: 'm1', 'hostRooms/m1': CODE }));
    await assertSucceeds(update(ref(db('m1')), { [`rooms/${CODE}/hostUid`]: 'm1', [`rooms/${CODE}/createdAt`]: serverTimestamp(), 'hostRooms/m1': CODE }));
  });
  it('the host can restart the 24 h clock of its own room (PLAY AGAIN)', async () => {
    await seed(`rooms/${CODE}`, room({ createdAt: Date.now() - 3_600_000 }));
    await assertSucceeds(update(ref(db('teacher'), `rooms/${CODE}`), { createdAt: serverTimestamp() }));
    await assertFails(update(ref(db('teacher'), `rooms/${CODE}`), { createdAt: Date.now() - DAY }));
  });
});

describe('field validation (lote 4)', () => {
  beforeEach(() => seedQuestion());
  const host = () => db('teacher');
  it('state only takes the known fields within range', async () => {
    const ok = { stop: 0, enemyHp: 2, enemyMaxHp: 2, lives: 3, combo: 0, questionNumber: 1 };
    await assertSucceeds(set(ref(host(), `rooms/${CODE}/state`), ok));
    await assertFails(set(ref(host(), `rooms/${CODE}/state`), { ...ok, junk: 1 }));
    await assertFails(set(ref(host(), `rooms/${CODE}/state`), { ...ok, lives: 99 }));
  });
  it('reveal rejects junk, huge values and malformed votes', async () => {
    const ok = { key: 'kx9a2b-s0q1a0', outcome: 'shield', percent: 30, answered: 2, eligible: 3 };
    await assertSucceeds(set(ref(host(), `rooms/${CODE}/reveal`), ok));
    await assertFails(set(ref(host(), `rooms/${CODE}/reveal`), { ...ok, percent: 'x'.repeat(5000) }));
    await assertFails(set(ref(host(), `rooms/${CODE}/reveal`), { ...ok, extra: { deep: true } }));
    await assertFails(set(ref(host(), `rooms/${CODE}/reveal`), { ...ok, outcome: 'strike', correct: 1, votes: [1, 2] }));
    await assertFails(set(ref(host(), `rooms/${CODE}/reveal`), { ...ok, outcome: 'strike', correct: 1, votes: [1, 1, 0, 0], strikers: ['a', 'b', 'c'] }));
  });
  it('a question needs exactly 4 options and sane numbers; units are 1-12, at most 12 of them', async () => {
    await assertFails(set(ref(host(), `rooms/${CODE}/question/options`), ['only one']));
    await assertFails(set(ref(host(), `rooms/${CODE}/question/unit`), -5));
    await assertFails(set(ref(host(), `rooms/${CODE}/config/units`), Array.from({ length: 13 }, () => 7)));
    await assertSucceeds(set(ref(host(), `rooms/${CODE}/config/units`), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
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
  it('the teacher can remove a student and reset "ready", but not rename or invent students (lote 4)', async () => {
    await seed(`rooms/${CODE}/players/ana`, player());
    await assertFails(update(ref(db('teacher'), `rooms/${CODE}/players/ana`), { name: 'Insulto' }));
    await assertFails(update(ref(db('teacher'), `rooms/${CODE}/players/ana`), { avatar: 'kuro' }));
    await assertFails(set(ref(db('teacher'), `rooms/${CODE}/players/fake1`), { ...player(), joinedAt: serverTimestamp() }));
    await assertSucceeds(update(ref(db('teacher'), `rooms/${CODE}/players/ana`), { ready: false }));
    await assertFails(update(ref(db('teacher'), `rooms/${CODE}/players/ana`), { ready: true }));
    await assertSucceeds(remove(ref(db('teacher'), `rooms/${CODE}/players/ana`))); // expel (confirmed 2026-10-18)
  });
  it('names cannot carry control characters (lote 4; bidi and zero-width are stripped by the client, names.test.ts)', async () => {
    for (const bad of ['a\u0000b', 'a\u0007b', 'tab\there']) {
      await assertFails(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), name: bad, joinedAt: serverTimestamp() }));
    }
    await assertSucceeds(set(ref(db('ana'), `rooms/${CODE}/players/ana`), { ...player(), name: 'José María', joinedAt: serverTimestamp() }));
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
  it('answers only go to the bucket of the current round (keys of other games or rounds are rejected)', async () => {
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
