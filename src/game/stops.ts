// The five stops on the road to the castle (GAME_DESIGN.md §3.1).

export interface Stop {
  name: string;
  scene: string;
  enemy: string; // sprite file in /assets/sprites
  hitSprite?: string; // dedicated "flash" sprite, otherwise a CSS flash is used
  attackSprite?: string; // pose when it hits the shield
  width: number; // display size on the 1600x900 stage
  height: number;
  teaser: string;
}

export const STOPS: readonly Stop[] = [
  { name: 'SHADE RAPTOR', scene: 'FOREST', enemy: 'enemy_raptor', hitSprite: 'enemy_raptor_hit', width: 360, height: 252, teaser: 'Something fast moves between the trees…' },
  { name: 'NIGHTWING', scene: 'THE CAVE', enemy: 'enemy_ptero', width: 432, height: 240, teaser: 'Something moves in the dark…' },
  { name: 'MIRE SPINE', scene: 'SWAMP', enemy: 'enemy_spino', width: 420, height: 276, teaser: 'A sail of spikes rises from the mud…' },
  { name: 'ASHHORN', scene: 'VOLCANO', enemy: 'enemy_trike', width: 420, height: 264, teaser: 'The ground shakes. Horns in the smoke…' },
  { name: 'KING DREAD', scene: 'CASTLE GATE', enemy: 'enemy_king', hitSprite: 'enemy_king_hit', attackSprite: 'enemy_king_roar', width: 480, height: 400, teaser: 'The king of shadows guards the princess.' },
];

/** Avatars from the DinoCharacters pack (design/assets/dinos/avatar_*.png). */
export const AVATARS = ['sena', 'olaf', 'tard', 'loki', 'kira', 'cole', 'mort', 'doux', 'nico', 'vita', 'mono', 'kuro'] as const;
export type Avatar = (typeof AVATARS)[number];
export const DINO_COLORS: Record<Avatar, string> = {
  sena: 'Purple', olaf: 'Green', tard: 'Orange', loki: 'Blue', kira: 'Pink', cole: 'Lavender',
  mort: 'Red', doux: 'Teal', nico: 'Brown', vita: 'Olive', mono: 'White', kuro: 'Black',
};
