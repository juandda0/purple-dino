// All Realtime Database access lives here. Paths and permissions: database.rules.json / docs/modelo-de-acceso.md
//   rooms/{code}                 public game state (host writes, signed-in users read)
//   rooms/{code}/players/{uid}   each student writes only their own entry
//   presence/{code}/{uid}        who is connected right now (host reads)
//   answers/{code}/{key}/{uid}   one locked answer per student and round (host reads all)
import {
  get, onDisconnect, onValue, ref, remove, serverTimestamp, set, update, type Unsubscribe,
} from 'firebase/database';
import { db, ensureSignedIn } from '../lib/firebase';
import { safeStorage } from '../lib/storage';
import type { GameConfig, Player, Room } from '../game/types';

const HOST_ROOM_KEY = 'purple-dino:host-room';

export const roomRef = (code: string) => ref(db, `rooms/${code}`);

const randomCode = () => String(Math.floor(Math.random() * 10_000)).padStart(4, '0');

/** Creates a room with a free 4-digit code. The rules reject codes in use, so we just try another. */
export async function createRoom(config: GameConfig): Promise<string> {
  const uid = await ensureSignedIn();
  // a teacher only keeps one room: remove the one from the previous game, if any
  const previous = safeStorage.get(HOST_ROOM_KEY);
  if (previous) await deleteRoom(previous).catch(() => undefined);

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode();
    try {
      await set(roomRef(code), { hostUid: uid, createdAt: serverTimestamp(), status: 'lobby', config });
      safeStorage.set(HOST_ROOM_KEY, code);
      return code;
    } catch {
      // code taken (permission denied) -> try another
    }
  }
  throw new Error('Could not find a free room code. Try again.');
}

/** Host-only: writes part of the public room state. */
export const updateRoom = (code: string, patch: Record<string, unknown>) => update(roomRef(code), patch);

export async function deleteRoom(code: string) {
  await Promise.all([remove(ref(db, `answers/${code}`)), remove(ref(db, `presence/${code}`))]);
  await remove(roomRef(code));
  if (safeStorage.get(HOST_ROOM_KEY) === code) safeStorage.remove(HOST_ROOM_KEY);
}

export async function readAnswers(code: string, key: string): Promise<Record<string, number>> {
  const snap = await get(ref(db, `answers/${code}/${key}`));
  return (snap.val() as Record<string, number> | null) ?? {};
}

export const clearAnswers = (code: string) => remove(ref(db, `answers/${code}`));

export function watchAnswers(code: string, key: string, cb: (answers: Record<string, number>) => void): Unsubscribe {
  return onValue(ref(db, `answers/${code}/${key}`), s => cb((s.val() as Record<string, number> | null) ?? {}));
}

export function watchPresence(code: string, cb: (online: Set<string>) => void): Unsubscribe {
  return onValue(ref(db, `presence/${code}`), s => cb(new Set(Object.keys((s.val() as Record<string, true> | null) ?? {}))));
}

export function watchRoom(code: string, cb: (room: Room | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onValue(roomRef(code), s => cb(s.val() as Room | null), onError);
}

// ------------------------------------------------------------------ student side

export class JoinError extends Error {}

/** Joins (or re-joins after a reload) with a first name and a dino; keeps presence while the tab is open. */
export async function joinRoom(code: string, name: string, avatar: string): Promise<string> {
  const uid = await ensureSignedIn();
  const snap = await get(roomRef(code));
  const room = snap.val() as Room | null;
  if (!room) throw new JoinError('That room does not exist. Check the code.');
  if (room.status === 'won' || room.status === 'lost') throw new JoinError('That game has already finished.');

  const me = ref(db, `rooms/${code}/players/${uid}`);
  if (room.players?.[uid]) await update(me, { name, avatar });
  else await set(me, { name, avatar, ready: false, joinedAt: serverTimestamp() } satisfies Omit<Player, 'joinedAt'> & { joinedAt: object });
  keepPresence(code, uid);
  return uid;
}

let presenceStop: Unsubscribe | null = null;

function keepPresence(code: string, uid: string) {
  presenceStop?.();
  const mine = ref(db, `presence/${code}/${uid}`);
  presenceStop = onValue(ref(db, '.info/connected'), async s => {
    if (s.val() !== true) return;
    await onDisconnect(mine).remove();
    await set(mine, true).catch(() => undefined);
  });
}

export function leavePresence() {
  presenceStop?.();
  presenceStop = null;
}

export const setReady = async (code: string, ready: boolean) =>
  update(ref(db, `rooms/${code}/players/${await ensureSignedIn()}`), { ready });

export const submitAnswer = async (code: string, key: string, option: number) =>
  set(ref(db, `answers/${code}/${key}/${await ensureSignedIn()}`), option);

export async function readMyAnswer(code: string, key: string): Promise<number | null> {
  const snap = await get(ref(db, `answers/${code}/${key}/${await ensureSignedIn()}`));
  return snap.exists() ? Number(snap.val()) : null;
}
