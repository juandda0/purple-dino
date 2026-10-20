// Escribe los subtítulos del tráiler como .srt (para YouTube u otros reproductores).
// Uso: ../node_modules/.bin/vite-node scripts/srt.mjs  → out/purple-dino-trailer.en.srt
import fs from 'node:fs';
import path from 'node:path';
import { SUBS } from '../src/timeline.js';

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const out = path.resolve(import.meta.dirname, '../out/purple-dino-trailer.en.srt');
fs.writeFileSync(out, SUBS.map((s, i) => `${i + 1}\n${ts(s.from)} --> ${ts(s.to)}\n${s.text}\n`).join('\n'));
console.log(`${SUBS.length} subtítulos → ${path.relative(process.cwd(), out)}`);
