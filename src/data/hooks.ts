import { useEffect, useState } from 'react';
import { serverNow } from '../lib/firebase';
import type { Room } from '../game/types';
import { watchRoom } from './room';

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
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(serverNow()), 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}
