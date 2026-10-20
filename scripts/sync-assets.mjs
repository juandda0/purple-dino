// Copies the game assets that the app actually uses from design/ (built by design/tools/*.js and
// design/sprites.py) into public/assets. Allowlist on purpose: spare art, unused music and anything whose
// licence is not confirmed (e.g. Lamora, the spare Sunny Castles) must never be published by accident.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'design', 'assets');
const out = join(root, 'public', 'assets');

const music = JSON.parse(readFileSync(join(src, 'audio', 'music.json'), 'utf8'));
const ALLOW = [
  'bg/menu.png', 'bg/battle.png', 'bg/victory.png', 'bg/gameover.png',
  'pov/shield_?_*.png', 'pov/shield_block_1.png', 'pov/shield_shards.png', 'pov/sword_idle.png', 'pov/sword_attack_2_arm_long.png',
  'dinos/avatar_*.png', 'dinos/hero_idle_3x.png', 'dinos/hero_move_3x.png', 'dinos/hero_jump_3x.png', 'dinos/hero_dead_3x.png',
  'dinos/princess_idle_3x.png', 'dinos/????_jump_3x.png', 'dinos/????_dead_3x.png', // ???? = the 12 avatar colours (4 letters)
  'ui/crest_full.png', 'ui/crest_empty.png', 'ui/hp_*.png', 'ui/frame_purple_0.png', 'ui/emblem_purple.png',
  'fx/hit_ring.png', 'fx/shadow_puff.png', 'fx/dust.png', 'fx/swing_arc_3.png',
  'castles/sunny_18.png',
  'audio/music.json', ...Object.values(music).map(t => `audio/${t.file}`),
  // sound effects used by src/audio/sfx.ts
  ...['ui_hover.ogg', 'ui_select.ogg', 'ui_back.ogg', 'ui_popup.ogg', 'ui_error.ogg', 'sword_swing.wav', 'enemy_hit.wav',
    'shield_clank.wav', 'shield_break.wav', 'enemy_defeated.wav', 'combo.wav', 'player_ready.wav'].map(f => `audio/${f}`),
  'CREDITS.md',
];
const SPRITES = ['enemy_raptor', 'enemy_raptor_hit', 'enemy_ptero', 'enemy_spino', 'enemy_trike', 'enemy_king', 'enemy_king_hit',
  'enemy_king_roar', 'icon_triangle', 'icon_diamond', 'icon_star', 'icon_circle', 'check', 'castle', 'cage'];

const toRegExp = glob => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
const list = dir => readdirSync(join(src, dir)).map(f => `${dir}/${f}`);
const available = ['bg', 'pov', 'dinos', 'ui', 'fx', 'castles', 'audio'].flatMap(d => (existsSync(join(src, d)) ? list(d) : [])).concat('CREDITS.md');

const wanted = new Set();
for (const glob of ALLOW) {
  const re = toRegExp(glob);
  const hits = available.filter(f => re.test(f));
  if (!hits.length) throw new Error(`sync-assets: nothing matches ${glob}`);
  hits.forEach(f => wanted.add(f));
}

// start clean each time but keep the folder itself (deleting it while `vite` runs makes it forget public files)
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) rmSync(join(out, entry), { recursive: true, force: true });
for (const f of wanted) {
  mkdirSync(dirname(join(out, f)), { recursive: true });
  copyFileSync(join(src, f), join(out, f));
}
mkdirSync(join(out, 'sprites'), { recursive: true });
for (const f of SPRITES) copyFileSync(join(root, 'design', 'sprites', `${f}.svg`), join(out, 'sprites', `${f}.svg`));
console.log(`assets synced -> public/assets (${wanted.size + SPRITES.length} files)`);
