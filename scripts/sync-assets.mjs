// Copies the generated game assets (design/assets, built by design/tools/*.js) and the enemy SVGs
// (design/sprites, built by design/sprites.py) into public/assets so Vite serves them.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public', 'assets');
// overwrite in place (deleting the folder while `vite` runs makes it forget the public files)
mkdirSync(out, { recursive: true });

const dirs = ['pov', 'dinos', 'bg', 'ui', 'fx', 'castles', 'audio'];
for (const d of dirs) {
  const src = join(root, 'design', 'assets', d);
  if (existsSync(src)) cpSync(src, join(out, d), { recursive: true });
}
mkdirSync(join(out, 'sprites'), { recursive: true });
for (const f of ['enemy_raptor', 'enemy_raptor_hit', 'enemy_ptero', 'enemy_spino', 'enemy_trike', 'enemy_king', 'enemy_king_hit', 'enemy_king_roar',
  'icon_triangle', 'icon_diamond', 'icon_star', 'icon_circle', 'check', 'castle', 'cage']) {
  cpSync(join(root, 'design', 'sprites', `${f}.svg`), join(out, 'sprites', `${f}.svg`));
}
cpSync(join(root, 'design', 'assets', 'CREDITS.md'), join(out, 'CREDITS.md'));
console.log('assets synced -> public/assets');
