// Hoja de contactos: junta varias imágenes en una sola (con su nombre) para revisarlas de un vistazo.
// Uso: node scripts/hoja.mjs <salida.png> <columnas> <img…>
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHROME = path.join(ROOT, 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell');
const [out, cols, ...imgs] = process.argv.slice(2);
const html = `<body style="margin:0;background:#111;color:#fff;font:14px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;width:${cols * 480}px">${imgs.map((f) => `<figure style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:100%;display:block"><figcaption>${path.basename(f)}</figcaption></figure>`).join('')}</body>`;
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: cols * 480, height: 400 } });
const p = await b.newPage();
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log(out);
