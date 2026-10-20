// Importa la toma completa del narrador (generada en la web de ElevenLabs) y la reparte en el tráiler.
// La toma se respeta tal cual: se corta solo entre palabras (transcripción con marcas de tiempo de
// ElevenLabs Speech-to-Text) y cada bloque de src/bloques.js entra en su escena. Una sola ganancia
// para todo el archivo: no se toca la dinámica natural entre frases.
// Uso: node scripts/importar-voz.mjs [trailer|guia]   (guia: la pista de Edge de scripts/voz-guia.mjs)
//   lee  public/voz/<toma>.mp3 (+ <toma>.json con la transcripción; si falta, la pide con la clave de .env)
//   deja public/voz/clips/<id>.wav y src/voz.json (duración y palabras de cada bloque; lo usa el timeline)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BLOQUES } from '../src/bloques.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const BIN = path.join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu');
const SR = 44100;
const toma = process.argv[2] ?? 'trailer';
const mp3 = path.join(ROOT, `public/voz/${toma}.mp3`);
const transcripcion = path.join(ROOT, `public/voz/${toma}.json`);
const ff = (args) => execFileSync(path.join(BIN, 'ffmpeg'), args, { env: { ...process.env, LD_LIBRARY_PATH: BIN } });

// 1. Transcripción con marcas de tiempo por palabra, si no existe.
if (!fs.existsSync(transcripcion)) {
  const linea = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').find((x) => x.startsWith('ELEVENLABS_API_KEY='));
  if (!linea) throw new Error('Falta ELEVENLABS_API_KEY en promo/.env');
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(mp3)], { type: 'audio/mpeg' }), 'trailer.mp3');
  fd.append('model_id', 'scribe_v1');
  fd.append('language_code', 'eng');
  fd.append('timestamps_granularity', 'word');
  fd.append('tag_audio_events', 'false');
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': linea.slice(linea.indexOf('=') + 1).trim() }, body: fd });
  if (!r.ok) throw new Error(`Speech-to-Text ${r.status}: ${(await r.text()).slice(0, 300)}`);
  fs.writeFileSync(transcripcion, JSON.stringify(await r.json(), null, 1));
}
const limpia = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const palabras = JSON.parse(fs.readFileSync(transcripcion, 'utf8')).words.filter((w) => w.type === 'word').map((w) => ({ ...w, t: limpia(w.text) }));

// 2. PCM de la toma completa, con una sola ganancia (pico a 0 dBFS antes de la compresión).
const wavTmp = path.join(ROOT, 'public/voz/.trailer.wav');
ff(['-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', wavTmp]);
const crudo = fs.readFileSync(wavTmp);
fs.rmSync(wavTmp);
const i0 = crudo.indexOf('data') + 8;
const pcm = crudo.subarray(i0, i0 + crudo.readUInt32LE(i0 - 4));
let pico = 1;
for (let i = 0; i < pcm.length; i += 2) pico = Math.max(pico, Math.abs(pcm.readInt16LE(i)));
const g = 32767 / pico;
const DRIVE = 2; // compresión suave de locución (tanh): más cuerpo para ir sobre la música, misma entonación

const wav = (datos) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + datos.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(datos.length, 40);
  return Buffer.concat([h, datos]);
};

// 3. Corta cada bloque entre palabras: arranca 60 ms antes de su primera palabra y termina a mitad
//    del silencio siguiente (máx. 180 ms), con fundidos cortos para que no haya clics.
const OUT = path.join(ROOT, 'public/voz/clips');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let k = 0;
const resumen = {};
const es = (p, w) => p && [w].flat().includes(p.t);
for (const b of BLOQUES) {
  while (k < palabras.length && !es(palabras[k], b.desde)) k++;
  const a = k;
  for (let n = 0; n < (b.veces ?? 1); n++) {
    if (n > 0) k++;
    while (k < palabras.length && !es(palabras[k], b.hasta)) k++;
  }
  if (k >= palabras.length) throw new Error(`No encontré el bloque «${b.id}» (${b.desde}…${b.hasta}) en la transcripción`);
  const sig = palabras[k + 1];
  const ini = Math.max(0, palabras[a].start - 0.06);
  const fin = sig ? Math.min(palabras[k].end + 0.18, (palabras[k].end + sig.start) / 2) : palabras[k].end + 0.3;
  const s0 = Math.round(ini * SR);
  const s1 = Math.min(pcm.length / 2, Math.round(fin * SR));
  const datos = Buffer.alloc((s1 - s0) * 2);
  const fade = Math.round(0.012 * SR);
  for (let i = 0; i < s1 - s0; i++) {
    const env = Math.min(1, i / fade, (s1 - s0 - i) / fade);
    const x = (pcm.readInt16LE((s0 + i) * 2) * g) / 32767;
    datos.writeInt16LE(Math.round((Math.tanh(DRIVE * x) / Math.tanh(DRIVE)) * 32767 * 0.89 * env), i * 2);
  }
  fs.writeFileSync(path.join(OUT, `${b.id}.wav`), wav(datos));
  resumen[b.id] = {
    dur: +((s1 - s0) / SR).toFixed(3),
    fin: +(palabras[k].end - ini).toFixed(3), // fin de la última palabra dentro del clip
    gap: sig ? +(sig.start - palabras[k].end).toFixed(3) : 0, // pausa natural hasta el bloque siguiente en la toma
    // cada palabra con su segundo dentro del clip: para que los textos y los cortes caigan con la voz
    words: palabras.slice(a, k + 1).map((p) => ({ w: p.t, t: +(p.start - ini).toFixed(3) })),
  };
  console.log(`${b.id.padEnd(12)} ${resumen[b.id].dur.toFixed(1).padStart(5)} s  «${palabras.slice(a, k + 1).map((p) => p.text).join(' ')}»`);
  k++;
}
fs.writeFileSync(path.join(ROOT, 'src/voz.json'), JSON.stringify({ toma, bloques: resumen }, null, 1));
