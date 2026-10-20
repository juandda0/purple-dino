// Energía (RMS, dB) de una pista cada 0,5 s, para elegir los cortes de la música.
// Uso: node scripts/energia.mjs public/audio/music_battle.mp3 [desde] [hasta]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const BIN = path.join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu');
const [file, a = 0, b = 9999] = process.argv.slice(2);
const pcm = execFileSync(path.join(BIN, 'ffmpeg'), ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 'wav', '-'], { env: { ...process.env, LD_LIBRARY_PATH: BIN }, maxBuffer: 1 << 28 });
const d = pcm.subarray(44);
const W = 4000;
const rows = [];
for (let i = 0; i + W * 2 <= d.length; i += W * 2) {
  let s = 0;
  for (let j = 0; j < W; j++) { const x = d.readInt16LE(i + j * 2) / 32768; s += x * x; }
  const t = i / 2 / 8000;
  if (t >= a && t <= b) rows.push(`${t.toFixed(1).padStart(6)} ${(10 * Math.log10(s / W + 1e-9)).toFixed(1).padStart(6)} ${'#'.repeat(Math.max(0, Math.round(40 + 10 * Math.log10(s / W + 1e-9))))}`);
}
console.log(rows.join('\n'));
