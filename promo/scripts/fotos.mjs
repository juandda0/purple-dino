// Saca cuadros sueltos de un video para revisarlos: node scripts/fotos.mjs <video> <seg> [seg…]
// → out/fotos/<video>-<seg>.png (640 px de ancho)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BIN = path.join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu');
const [video, ...secs] = process.argv.slice(2);
const out = path.join(ROOT, 'out/fotos');
fs.mkdirSync(out, { recursive: true });
for (const s of secs) {
  const file = path.join(out, `${path.basename(video, '.mp4')}-${s}.png`);
  execFileSync(path.join(BIN, 'ffmpeg'), ['-y', '-v', 'error', '-ss', s, '-i', video, '-frames:v', '1', '-vf', 'scale=640:-2', file], { env: { ...process.env, LD_LIBRARY_PATH: BIN } });
  console.log(path.relative(ROOT, file));
}
