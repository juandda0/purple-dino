// Is this room still the teacher's game? (pure, unit tested in ownership.test.ts)
import type { Room } from './types';

/**
 * A room is only playable by its host while it is whole: it can vanish mid-game (the teacher created a room in a
 * second tab, which closes the first one) and a write still on its way can leave a local partial copy without `config`.
 */
export function hostOwnsRoom(room: Room | null | undefined, uid: string | null): room is Room {
  return Boolean(room?.config && uid && room.hostUid === uid);
}
