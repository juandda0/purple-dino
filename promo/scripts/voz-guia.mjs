// Pista guía con la voz gratuita de Edge (paquete msedge-tts), solo para revisar el borrador mientras
// llega la toma de ElevenLabs. Pide todo el guion de una vez (Edge limita las peticiones seguidas) con
// las marcas de tiempo de cada palabra, y lo deja en el mismo formato que la transcripción de
// ElevenLabs: public/voz/guia.mp3 + public/voz/guia.json. Después: node scripts/importar-voz.mjs guia
import fs from 'node:fs';
import path from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { BLOQUES } from '../src/bloques.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const VOZ = 'en-US-AndrewMultilingualNeural';
const OUT = path.join(ROOT, 'public/voz');
fs.mkdirSync(OUT, { recursive: true });

const tts = new MsEdgeTTS();
await tts.setMetadata(VOZ, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
const tmp = fs.mkdtempSync(path.join(OUT, 'tmp-'));
const { audioFilePath, metadataFilePath } = await tts.toFile(tmp, BLOQUES.map((b) => b.texto).join('\n\n'), { rate: 1.12 });
tts.close();
fs.copyFileSync(audioFilePath, path.join(OUT, 'guia.mp3'));
// metadatos de Edge: { Metadata: [{ Type: 'WordBoundary', Data: { Offset, Duration, text: { Text } } }] } en
// unidades de 100 ns; a veces son varios objetos JSON seguidos
const words = fs.readFileSync(metadataFilePath, 'utf8').trim().split(/\}\s*(?=\{)/).map((x, i, all) => (i < all.length - 1 ? `${x}}` : x))
  .flatMap((l) => JSON.parse(l).Metadata ?? [])
  .filter((m) => m.Type === 'WordBoundary')
  .map((m) => ({ text: m.Data.text.Text, start: m.Data.Offset / 1e7, end: (m.Data.Offset + m.Data.Duration) / 1e7, type: 'word' }));
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'guia.json'), JSON.stringify({ words }, null, 1));
console.log(`${words.length} palabras, ${words.at(-1).end.toFixed(1)} s`);
