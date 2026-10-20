// Grilla de compases de cada pista de música (tempo, tonalidad y dónde empieza cada compás), con el mismo
// analizador que usa el juego (design/tools/build-music.js → analyse). La usa el timeline para que cada
// cambio de pista entre justo en el tiempo fuerte de un compás.
// También mide el volumen (RMS) de cada pista desde donde arranca, para igualarlas en la mezcla.
// Uso: node scripts/compases.mjs   → src/compases.json
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { MUSICA } from '../src/escenas.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { analyse, decodeMp3, resample, SR } = require('../../design/tools/build-music.js');

const out = {};
for (const [key, { file, from = 0 }] of Object.entries(MUSICA)) {
  const { sr, chans } = await decodeMp3(path.join(ROOT, 'public/audio', file));
  let mono = new Float32Array(chans[0].length);
  for (const c of chans) for (let i = 0; i < c.length; i++) mono[i] += c[i] / chans.length;
  if (sr !== SR) mono = resample(mono, sr, SR);
  const an = analyse(mono);
  const bars = an.bars.map((b) => +b.t.toFixed(3));
  // RMS de los 20 s que suenan desde `from` (o la pista entera si es más corta)
  const a = Math.round(from * SR), z = Math.min(mono.length, a + 20 * SR);
  let ss = 0;
  for (let i = a; i < z; i++) ss += mono[i] * mono[i];
  const rmsDb = 10 * Math.log10(ss / (z - a));
  out[key] = { file, bpm: +an.bpm.toFixed(2), key: an.key.name, dur: +(mono.length / SR).toFixed(2), rmsDb: +rmsDb.toFixed(2), bars };
  console.log(`${key.padEnd(8)} ${an.bpm.toFixed(1)} BPM  ${an.key.name.padEnd(9)} ${rmsDb.toFixed(1)} dB  ${bars.length} compases  primeros: ${bars.slice(0, 6).join(', ')}`);
}
fs.writeFileSync(path.join(ROOT, 'src/compases.json'), JSON.stringify(out));
