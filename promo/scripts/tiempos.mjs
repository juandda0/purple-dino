// Imprime el timeline (bloque, inicio, duración, tomas) para revisar el montaje sin abrir el estudio.
// Uso: ../node_modules/.bin/vite-node scripts/tiempos.mjs
import { FPS, TIMELINE, TOTAL, TRAMOS } from '../src/timeline.js';
for (const b of TIMELINE) {
  console.log(`${b.id.padEnd(10)} ${b.start.toFixed(2).padStart(6)}s f${String(Math.round(b.start * FPS)).padStart(5)}  ${b.dur.toFixed(2)}s  voz ${b.voz.dur.toFixed(2)}s`);
  for (const s of b.shots) console.log(`             toma ${s.src} @${s.srcFrom.toFixed(2)} [${s.from.toFixed(2)}–${s.to.toFixed(2)}] sfx ${s.sfx.map((x) => x.file.split('.')[0]).join(',')}`);
}
console.log('TOTAL', TOTAL.toFixed(2), 's');
console.log(TRAMOS.map((m) => `${m.key} ${m.from.toFixed(1)}–${m.to.toFixed(1)}`).join(' | '));

// Palabras ancla que no aparecen en la voz (caen en una posición estimada)
import { ESCENAS } from '../src/escenas.js';
const faltan = [];
for (const b of TIMELINE) {
  const e = ESCENAS[b.id];
  const pide = [...(e.shots ?? []).flatMap((s) => [s.cut, s.word, s.phone?.word]), ...(e.captions ?? []).flatMap((c) => [c.word, c.until])].filter(Boolean);
  for (const w of pide) if (!b.voz.words?.some((p) => [w].flat().includes(p.w))) faltan.push(`${b.id}:${w}`);
}
console.log(faltan.length ? `Faltan: ${faltan.join(' ')}` : 'Todas las palabras ancla están en la voz');
