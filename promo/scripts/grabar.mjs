// Graba una partida real para el tráiler: el proyector (1920×1080) y un celular (390×844 @2x),
// cada uno en su propio Chrome headless, más 11 alumnos simulados con el SDK de Firebase.
// Necesita el juego corriendo con emuladores (`npm run dev:emu` en la raíz).
// Uso: node scripts/grabar.mjs <win|lose>
//   deja public/rec/<toma>-host.mp4, public/rec/<toma>-phone.mp4 y public/rec/<toma>.json (eventos con su
//   segundo en la grabación). Los cuadros sueltos quedan en public/rec/raw/ (se borran al codificar).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  connectDatabaseEmulator, get, getDatabase, onDisconnect, onValue, ref, serverTimestamp, set, update,
} from 'firebase/database';

const ROOT = path.resolve(import.meta.dirname, '..');
const GAME = 'http://127.0.0.1:5173';
const CHROME = path.join(ROOT, 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell');
const BIN = path.join(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// ---- guion de la partida: qué pasa en cada pregunta (en orden, contando los reintentos)
//   strike = la mayoría acierta · shield = la mayoría falla · panic = responden en el último tercio
const TOMAS = {
  win: {
    difficulty: 'medium',
    units: [7, 8, 9],
    plan: [
      { outcome: 'strike' }, { outcome: 'strike' }, // Shade Raptor (combo)
      { outcome: 'shield' }, { outcome: 'strike' }, { outcome: 'strike' }, // Nightwing: escudo agrietado
      { outcome: 'strike', panic: true }, { outcome: 'strike' }, // Mire Spine: pánico
      { outcome: 'shield' }, { outcome: 'strike' }, { outcome: 'strike' }, // Ashhorn: sin escudo, LAST CHANCE
      { outcome: 'strike' }, { outcome: 'strike', panic: true }, { outcome: 'strike' }, // King Dread
    ],
  },
  lose: {
    difficulty: 'hard',
    units: [1, 2, 3],
    plan: [{ outcome: 'shield' }, { outcome: 'shield', panic: true }],
  },
};
const toma = process.argv[2];
const T = TOMAS[toma];
if (!T) throw new Error(`Uso: node scripts/grabar.mjs <${Object.keys(TOMAS).join('|')}>`);

const NAMES = ['Ana', 'Luis', 'Sofi', 'Mateo', 'Valen', 'Sam', 'Nico', 'Dani', 'Maria', 'Tomas', 'Leo'];
const AVATARS = ['sena', 'olaf', 'tard', 'loki', 'cole', 'mort', 'doux', 'nico', 'vita', 'mono', 'kuro'];
const PHONE = { name: 'Juli', avatar: 'kira' };

// ---- banco de preguntas: para saber cuál opción es la correcta (el host nunca la publica)
const BANK = fs.readdirSync(path.resolve(ROOT, '../src/content/questions/course-6'))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.resolve(ROOT, '../src/content/questions/course-6', f), 'utf8')));
function correctIndex(q) {
  const b = BANK.find((x) => x.question === q.text && x.options.every((o) => q.options.includes(o)));
  if (!b) throw new Error(`No encontré en el banco: ${q.text}`);
  return q.options.indexOf(b.options[b.answer]);
}
const wrongIndex = (q, ok) => [0, 1, 2, 3].filter((i) => i !== ok)[Math.floor(Math.random() * 3)];

// ---- grabación con el screencast de Chrome (cuadros JPEG con su hora)
const t0 = Date.now();
const events = [];
const log = (type, data = {}) => {
  const e = { t: +((Date.now() - t0) / 1000).toFixed(2), type, ...data };
  events.push(e);
  console.log(e.t.toFixed(1).padStart(6), type, JSON.stringify(data));
};

async function recorder(page, name, size) {
  const dir = path.join(ROOT, 'public/rec/raw', `${toma}-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await page.createCDPSession();
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `${String(frames.length).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp * 1000 - t0 });
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size.w, maxHeight: size.h, everyNthFrame: 1 });
  return {
    async stop() {
      await cdp.send('Page.stopScreencast').catch(() => undefined);
      const end = Date.now() - t0;
      // cuadros con su duración real → video a 30 fps constantes; arranca en t=0 repitiendo el primer cuadro
      const lines = ['ffconcat version 1.0'];
      frames.forEach((f, i) => {
        const start = i === 0 ? 0 : f.t;
        const next = frames[i + 1]?.t ?? end;
        lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, (next - start) / 1000).toFixed(4)}`);
      });
      lines.push(`file '${frames.at(-1).file}'`);
      fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'));
      const out = path.join(ROOT, 'public/rec', `${toma}-${name}.mp4`);
      execFileSync(path.join(BIN, 'ffmpeg'), ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
        '-r', '30', '-fps_mode', 'cfr', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', out],
      { env: { ...process.env, LD_LIBRARY_PATH: BIN } });
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`→ ${path.relative(ROOT, out)} (${frames.length} cuadros, ${(frames.length / (end / 1000)).toFixed(1)} fps reales)`);
    },
  };
}

async function launch(viewport) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: viewport,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--hide-scrollbars'],
  });
}
const clickText = async (page, selector, text) => {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent ?? '');
    if (t.toLowerCase().includes(text.toLowerCase())) return h.click();
  }
  throw new Error(`No encontré «${text}» en ${selector}`);
};

// ---- alumnos simulados (mismo camino que src/data/room.ts: joinRoom, setReady, submitAnswer)
const CONFIG = { apiKey: 'demo-api-key', authDomain: 'demo-purple-dino.firebaseapp.com', projectId: 'demo-purple-dino', databaseURL: 'http://127.0.0.1:9000/?ns=demo-purple-dino' };
async function bot(i) {
  const app = initializeApp(CONFIG, `bot-${toma}-${i}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getDatabase(app);
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  const uid = (await signInAnonymously(auth)).user.uid;
  return {
    uid, db, name: NAMES[i],
    async join(code) {
      await set(ref(db, `rooms/${code}/players/${uid}`), { name: NAMES[i], avatar: AVATARS[i], ready: false, joinedAt: serverTimestamp() });
      const mine = ref(db, `presence/${code}/${uid}`);
      await onDisconnect(mine).remove();
      await set(mine, true);
    },
    ready: (code) => update(ref(db, `rooms/${code}/players/${uid}`), { ready: true }),
    answer: (code, key, option) => set(ref(db, `answers/${code}/${key}/${uid}`), option).catch((e) => console.warn(NAMES[i], e.message)),
  };
}

// ================================================================== la toma
const hostBrowser = await launch({ width: 1920, height: 1080 });
const phoneBrowser = await launch({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const host = (await hostBrowser.pages())[0] ?? (await hostBrowser.newPage());
const phone = (await phoneBrowser.pages())[0] ?? (await phoneBrowser.newPage());
const bots = await Promise.all(NAMES.map((_, i) => bot(i)));

await host.goto(GAME, { waitUntil: 'networkidle0' });
await host.evaluate(() => document.fonts.ready);
await sleep(800);
const recHost = await recorder(host, 'host', { w: 1920, h: 1080 });
log('start-screen');
await sleep(3200);

// menús: crear partida
await clickText(host, 'button', 'CREATE GAME'); log('menu-course');
await sleep(1600);
await clickText(host, 'button.course', 'COURSE 6'); log('menu-units');
await sleep(1100);
for (const n of T.units) { await clickText(host, 'button.unit', String(n).padStart(2, '0')); await sleep(420); }
await sleep(700);
await clickText(host, 'button', 'NEXT'); log('menu-difficulty');
await sleep(1100);
await clickText(host, 'button.diff', T.difficulty);
await sleep(1100);
await clickText(host, 'button', 'CREATE LOBBY');
await host.waitForSelector('[aria-label^="Room code"]');
const code = (await host.$eval('[aria-label^="Room code"]', (el) => el.getAttribute('aria-label'))).replace(/\D/g, '');
log('lobby', { code });
await sleep(1500);

// el celular entra con el QR (código ya puesto) mientras los demás van llegando
await phone.goto(`${GAME}/join/${code}`, { waitUntil: 'networkidle0' });
await phone.evaluate(() => document.fonts.ready);
const recPhone = await recorder(phone, 'phone', { w: 780, h: 1688 });
log('phone-join');
const joins = (async () => {
  for (const [i, b] of bots.entries()) {
    await b.join(code);
    log('join', { name: b.name });
    await sleep(i < 3 ? rand(700, 1100) : rand(350, 700));
  }
})();
await sleep(900);
await phone.type('input[name="nickname"]', PHONE.name, { delay: 140 });
await sleep(500);
await phone.click(`button.swatch:nth-child(${['sena', 'olaf', 'tard', 'loki', 'kira'].indexOf(PHONE.avatar) + 1})`);
await sleep(700);
await clickText(phone, 'button', 'JOIN');
log('phone-joined');
await joins;
await sleep(900);
for (const b of bots) { await b.ready(code); await sleep(rand(150, 420)); }
await sleep(300);
await clickText(phone, 'button', 'READY'); log('phone-ready');
await sleep(1800);
await clickText(host, 'button', 'START'); log('battle-start');

// la batalla: el host avanza solo; los alumnos responden según el plan
let n = -1;
let lastStatus = '';
let lastStop = -1;
const done = new Promise((resolve) => {
  onValue(ref(bots[0].db, `rooms/${code}`), (s) => {
    const room = s.val();
    if (!room) return;
    if (room.state && room.state.stop !== lastStop) { lastStop = room.state.stop; log('stop', { stop: lastStop }); }
    if (room.status !== lastStatus || (room.status === 'question' && room.question?.key !== events.findLast((e) => e.type === 'question')?.key)) {
      lastStatus = room.status;
      if (room.status === 'walking') log('walking', { stop: room.state?.stop });
      if (room.status === 'reveal') log('reveal', { outcome: room.reveal?.outcome, percent: room.reveal?.percent, lives: room.state?.lives, enemyHp: room.state?.enemyHp, combo: room.state?.combo });
      if (room.status === 'won' || room.status === 'lost') { log(room.status); resolve(room.status); }
      if (room.status === 'question') {
        const q = room.question;
        n++;
        const step = T.plan[n] ?? { outcome: 'strike' };
        log('question', { key: q.key, n, stop: room.state.stop, attempt: q.attempt, ...step, text: q.text });
        const ok = correctIndex(q);
        const seconds = (q.endsAt - q.startedAt) / 1000;
        const [a, b] = step.panic ? [seconds * 0.7, seconds * 0.88] : [1.2, 4.6];
        // strike: 8 de 11 bots aciertan (+ el celular) · shield: 2 de 11 (el celular falla)
        const right = step.outcome === 'strike' ? 8 : 2;
        bots.forEach((bt, i) => setTimeout(() => void bt.answer(code, q.key, i < right ? ok : wrongIndex(q, ok)), rand(a, b) * 1000));
        const phonePick = step.outcome === 'strike' ? ok : wrongIndex(q, ok);
        setTimeout(async () => {
          await phone.waitForSelector('button.p-btn:not([disabled])', { timeout: 8000 }).catch(() => undefined);
          const btns = await phone.$$('button.p-btn');
          await btns[phonePick]?.click();
          log('phone-answer', { pick: phonePick, ok: phonePick === ok });
        }, (step.panic ? a + 0.4 : 2.2) * 1000);
      }
    }
  });
});
const result = await done;
await sleep(result === 'won' ? 11000 : 8000);
log('end');

await recPhone.stop();
await recHost.stop();
fs.writeFileSync(path.join(ROOT, 'public/rec', `${toma}.json`), JSON.stringify({ code, events }, null, 1));
await hostBrowser.close();
await phoneBrowser.close();
process.exit(0);
