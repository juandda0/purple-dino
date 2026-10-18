import { useEffect, useState } from 'react';
import { serverNow } from '../lib/firebase';
import type { Room } from '../game/types';
import { watchConnection, watchRoom } from './room';

export type RoomState = { status: 'loading' } | { status: 'missing' } | { status: 'error'; error: Error } | { status: 'ready'; room: Room };

/** Live room snapshot. */
export function useRoom(code: string | null): RoomState {
  const [state, setState] = useState<RoomState>({ status: 'loading' });
  useEffect(() => {
    if (!code) return;
    return watchRoom(
      code,
      room => setState(room ? { status: 'ready', room } : { status: 'missing' }),
      error => setState({ status: 'error', error }),
    );
  }, [code]);
  return code ? state : { status: 'missing' };
}

/** Seconds left until a server timestamp, refreshed a few times per second. */
export function useSecondsLeft(endsAt: number | undefined): number {
  const left = () => (endsAt ? Math.max(0, Math.ceil((endsAt - serverNow()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(left);
  const [forEndsAt, setForEndsAt] = useState(endsAt);
  if (forEndsAt !== endsAt) {
    // new question: show its real time from the first render (not the previous question's value)
    setForEndsAt(endsAt);
    setSeconds(left());
  }
  useEffect(() => {
    if (!endsAt) return;
    // whole seconds in state: React skips the re-renders where the number did not change
    const id = setInterval(() => setSeconds(Math.max(0, Math.ceil((endsAt - serverNow()) / 1000))), 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? seconds : 0;
}

/** True once this browser has been disconnected from the database for `afterMs` (short blips are ignored). */
export function useConnectionLost(afterMs = 3000): boolean {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = watchConnection(connected => {
      clearTimeout(timer);
      if (connected) setLost(false);
      else timer = setTimeout(() => setLost(true), afterMs);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [afterMs]);
  return lost;
}
