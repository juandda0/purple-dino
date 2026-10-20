// Frenazo de cinta para el chiste «...the princess is FREE! / Miss too much...»: toma la jingle de victoria
// desde donde la corta el timeline y la desacelera hasta pararla en FRENAZO segundos (la velocidad cae de 1 a
// 0, así que también baja el tono, como un disco que se detiene).
// Hay que correrlo cada vez que cambian los tiempos (npm run render lo corre antes de renderizar).
// Uso: ../node_modules/.bin/vite-node scripts/frenazo.mjs   → public/audio/frenazo.wav
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FRENAZO, TRAMOS } from '../src/timeline.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const BIN = path.join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu');
const SR = 44100;
const t = TRAMOS.find((x) => x.frenazo);
if (!t) throw new Error('Ningún tramo pide frenazo (la victoria debe ir seguida de otra pista)');

// 1 s de la jingle desde el punto de corte, estéreo, PCM 16 bits
const wav = execFileSync(path.join(BIN, 'ffmpeg'), ['-v', 'error', '-ss', String(t.frenazo.trackAt), '-t', '1', '-i', path.join(ROOT, 'public/audio', t.file),
  '-ac', '2', '-ar', String(SR), '-f', 'wav', '-'], { env: { ...process.env, LD_LIBRARY_PATH: BIN }, maxBuffer: 1 << 26 });
const pcm = wav.subarray(wav.indexOf('data') + 8);
const n = pcm.length / 4;
const at = (ch, x) => {
  const i = Math.floor(x);
  if (i + 1 >= n) return 0;
  const a = pcm.readInt16LE((i * 2 + ch) * 2), b = pcm.readInt16LE(((i + 1) * 2 + ch) * 2);
  return a + (b - a) * (x - i);
};

const N = Math.round(FRENAZO * SR);
const out = Buffer.alloc(N * 4);
let pos = 0;
for (let i = 0; i < N; i++) {
  const p = i / N;
  const rate = (1 - p) ** 1.6; // frena rápido al final
  const fade = Math.min(1, (N - i) / (0.05 * SR)); // sin clic al terminar
  for (let ch = 0; ch < 2; ch++) out.writeInt16LE(Math.round(at(ch, pos) * fade), (i * 2 + ch) * 2);
  pos += rate;
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + out.length, 4); h.write('WAVEfmt ', 8);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(out.length, 40);
fs.writeFileSync(path.join(ROOT, 'public/audio/frenazo.wav'), Buffer.concat([h, out]));
console.log(`frenazo: jingle desde ${t.frenazo.trackAt.toFixed(2)} s, ${FRENAZO} s → public/audio/frenazo.wav`);
