import { describe, expect, it } from 'vitest';
import { hostOwnsRoom } from './ownership';
import type { Room } from './types';

const room = { hostUid: 'teacher', createdAt: 1, status: 'question', config: { course: 6, units: [1], difficulty: 'medium' } } as Room;

describe('hostOwnsRoom (Lote 11.4)', () => {
  it('the host keeps a whole room', () => {
    expect(hostOwnsRoom(room, 'teacher')).toBe(true);
  });
  it('a deleted room, or the partial copy a late write leaves behind, is gone', () => {
    expect(hostOwnsRoom(null, 'teacher')).toBe(false);
    expect(hostOwnsRoom({ status: 'question', state: room.state } as unknown as Room, 'teacher')).toBe(false);
  });
  it('a room taken over by another teacher (stale code reused) is gone for the old host', () => {
    expect(hostOwnsRoom({ ...room, hostUid: 'other' }, 'teacher')).toBe(false);
    expect(hostOwnsRoom(room, null)).toBe(false);
  });
});
