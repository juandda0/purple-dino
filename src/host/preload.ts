// Warm the browser cache during the lobby so the first question, strike and shield hit do not wait for the
// school Wi-Fi (small files: sprites, effects, UI). Music is handled by audio/music.ts.
import { preloadSfx } from '../audio/sfx';
import { STOPS } from '../game/stops';

const A = '/assets';
const IMAGES = [
  `${A}/bg/battle.png`, `${A}/pov/shield_0_full.png`, `${A}/pov/shield_1_scratched.png`, `${A}/pov/shield_2_cracked.png`,
  `${A}/pov/shield_3_split.png`, `${A}/pov/shield_4_gone.png`, `${A}/pov/shield_block_1.png`, `${A}/pov/shield_shards.png`,
  `${A}/pov/sword_idle.png`, `${A}/pov/sword_attack_2_arm_long.png`, `${A}/fx/swing_arc_3.png`, `${A}/fx/hit_ring.png`,
  `${A}/fx/shadow_puff.png`, `${A}/fx/dust.png`, `${A}/ui/hp_frame.png`, `${A}/ui/hp_fill.png`, `${A}/ui/hp_empty.png`,
  `${A}/ui/frame_purple_0.png`, `${A}/ui/crest_full.png`, `${A}/ui/crest_empty.png`,
  ...[0, 1, 2, 3, 4].map(i => `${A}/ui/timer_${i}.png`),
  ...['icon_triangle', 'icon_diamond', 'icon_star', 'icon_circle', 'check'].map(n => `${A}/sprites/${n}.svg`),
  ...STOPS.flatMap(s => [s.enemy, s.hitSprite, s.attackSprite].filter(Boolean).map(n => `${A}/sprites/${n}.svg`)),
];

let done = false;
export function preloadBattleAssets() {
  if (done) return;
  done = true;
  const run = () => {
    for (const src of IMAGES) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    }
    preloadSfx();
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 500);
}
