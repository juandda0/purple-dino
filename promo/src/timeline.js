// Arma el tráiler a partir de la voz: cada bloque dura lo que su frase más la pausa natural que tenía en la
// toma (src/voz.json, que dejan scripts/importar-voz.mjs o scripts/voz-guia.mjs), y las tomas, textos y
// golpes caen en las palabras que pide src/escenas.js. Después cada tramo de música se ajusta a compases
// enteros (src/compases.json), para que los cambios de pista caigan en el tiempo fuerte.
import { BLOQUES } from './bloques.js';
import compases from './compases.json';
import { ESCENAS, MUSICA } from './escenas.js';
import voz from './voz.json';
import win from '../public/rec/win.json';
import lose from '../public/rec/lose.json';

export const FPS = 30;
export const LEAD = 0.12; // la voz entra un poco después del corte
const HEAD = 0.06; // el clip de voz arranca 60 ms antes de su primera palabra (importar-voz.mjs)
const limpia = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
const REC = { 'win-host': win.events, 'lose-host': lose.events };

const vozDe = (b) => {
  const textoWords = b.texto.split(/\s+/).map(limpia).filter(Boolean);
  return voz.bloques?.[b.id] ?? { dur: textoWords.length / 2.7, words: null };
};

// Duración propia de cada bloque: la última palabra + la pausa natural de la toma hasta la siguiente frase
// (así se conserva el ritmo del narrador), con el aire extra o el mínimo que pida la escena.
function duracion(b, i) {
  const e = ESCENAS[b.id];
  const v = vozDe(b);
  const ultimo = i === BLOQUES.length - 1;
  const natural = ultimo ? LEAD + v.dur + (e.fin ?? 1) : v.fin != null ? v.fin + v.gap - HEAD : LEAD + v.dur + 0.4;
  const piso = LEAD + (v.fin ?? v.dur) + 0.1;
  return { dur: Math.max(e.min ?? 0, natural + (e.pausa ?? 0), piso), piso: Math.max(e.min ?? 0, piso) };
}

// Tramos de música: bloques seguidos con la misma pista suenan como una sola toma.
const LOOP = new Set(['intense', 'boss', 'battle']);
function tramosDe() {
  const runs = [];
  BLOQUES.forEach((b, i) => {
    const key = ESCENAS[b.id].music;
    const last = runs.at(-1);
    if (key && last?.key === key && last.end === i) { last.blocks.push(i); last.end = i + 1; } else if (key) runs.push({ key, blocks: [i], end: i + 1 });
  });
  return runs;
}

// Ajusta cada tramo de una pista en loop que desemboca en otra pista (o en silencio) para que el cambio caiga
// a tiempo: la pista que entra arranca siempre en el tiempo fuerte de un compás (MUSICA.from), y la que sale
// termina en una barra si se puede, o si no en un pulso. La diferencia se reparte entre las pausas del tramo:
// la de la transición (la última) crece hasta 0,35 s y las de adentro 0,1 s; al acortar, primero las de
// adentro (0,12 s cada una) y la de la transición como mucho 0,1 s, para no apurar el cambio.
function ajustar(durs) {
  const out = durs.map((d) => ({ ...d }));
  const cupo = (i, max) => Math.max(0, Math.min(max, out[i].dur - out[i].piso));
  const mover = (r, delta) => {
    const ultimo = r.blocks.at(-1);
    const otros = r.blocks.slice(0, -1);
    if (delta >= 0) {
      const enUltimo = Math.min(delta, 0.35);
      out[ultimo].dur += enUltimo;
      otros.forEach((i) => { out[i].dur += (delta - enUltimo) / otros.length; });
      return;
    }
    let falta = -delta;
    for (const i of otros) { const q = Math.min(falta / Math.max(1, otros.length), cupo(i, 0.12)); out[i].dur -= q; }
    falta = -delta - otros.reduce((s, i) => s + (durs[i].dur - out[i].dur), 0);
    for (const i of otros) { const q = Math.min(falta, cupo(i, 0.12 - (durs[i].dur - out[i].dur))); out[i].dur -= q; falta -= q; }
    out[ultimo].dur -= Math.min(falta, cupo(ultimo, 0.1));
  };
  for (const r of tramosDe()) {
    if (!LOOP.has(r.key) || r.end >= BLOQUES.length) continue;
    const from = MUSICA[r.key].from;
    const bars = compases[r.key].bars;
    const len = r.blocks.reduce((s, i) => s + out[i].dur, 0);
    const crece = 0.35 + 0.1 * (r.blocks.length - 1);
    const encoge = r.blocks.slice(0, -1).reduce((s, i) => s + cupo(i, 0.12), 0) + cupo(r.blocks.at(-1), 0.1);
    const cerca = (lista) => lista.map((t) => t - (from + len)).filter((d) => d <= crece && d >= -encoge)
      .reduce((a, b) => (a == null || Math.abs(b) < Math.abs(a) ? b : a), null);
    const pulsos = bars.slice(0, -1).flatMap((t, k) => [0, 1, 2, 3].map((q) => t + ((bars[k + 1] - t) * q) / 4));
    const delta = cerca(bars) ?? cerca(pulsos) ?? 0;
    mover(r, delta);
  }
  return out;
}

function resolver(b, start, dur) {
  const e = ESCENAS[b.id];
  const textoWords = b.texto.split(/\s+/).map(limpia).filter(Boolean);
  const v = vozDe(b);
  // segundo (dentro del bloque) en que se dice la n-ésima palabra `w`
  const wordAt = (w, n = 1) => {
    const lista = v.words ?? textoWords.map((x, i) => ({ w: x, t: (i / textoWords.length) * v.dur }));
    let k = 0;
    for (const p of lista) if ([w].flat().includes(p.w) && ++k === n) return LEAD + p.t;
    return null;
  };

  const shots = (e.shots ?? []).map((s, i, all) => {
    const from = i === 0 ? 0 : Math.max(0, (wordAt(s.cut) ?? (i / all.length) * dur) - 0.06);
    return { ...s, from };
  }).map((s, i, all) => {
    const to = all[i + 1]?.from ?? dur;
    const rate = s.rate ?? 1;
    const anchor = s.word ? wordAt(s.word) ?? s.from : s.from;
    const srcFrom = Math.max(0, s.at - (anchor - s.from) * rate);
    const phone = s.phone && {
      ...s.phone,
      srcFrom: Math.max(0, s.phone.at - ((s.phone.word ? wordAt(s.phone.word) ?? s.from : s.from) - s.from) * (s.phone.rate ?? 1)),
    };
    // efectos del juego que caen dentro de la toma (el juego los toca en el proyector; la grabación es muda)
    const srcTo = srcFrom + (to - s.from) * rate;
    const sfx = (REC[s.src] ?? []).flatMap((ev) => sonidos(ev))
      .filter((x) => x.t >= srcFrom && x.t < srcTo)
      .map((x) => ({ ...x, t: s.from + (x.t - srcFrom) / rate }));
    return { ...s, to, rate, anchor, srcFrom, phone, sfx };
  });

  const caps = (e.captions ?? []).map((c) => ({ ...c, from: Math.max(0, (wordAt(c.word, c.n) ?? 0) - 0.05) }));
  const captions = caps.map((c, i) => ({ ...c, to: c.until ? wordAt(c.until) ?? dur : caps[i + 1]?.from ?? dur }));
  return { ...b, ...e, start, dur, voz: v, guia: !!voz.toma && voz.toma === 'guia', wordAt, shots, captions };
}

// Mismos efectos y retrasos que src/host/screens/Battle.tsx y la sala.
function sonidos(ev) {
  if (ev.type === 'reveal' && ev.outcome === 'strike') {
    return [
      { t: ev.t, file: 'sword_swing.wav', vol: 0.9 },
      { t: ev.t + 0.18, file: 'enemy_hit.wav', vol: 1 },
      ...(ev.combo >= 2 ? [{ t: ev.t + 0.5, file: 'combo.wav', vol: 0.8 }] : []),
      ...(ev.enemyHp === 0 ? [{ t: ev.t + 0.9, file: 'enemy_defeated.wav', vol: 0.9 }] : []),
    ];
  }
  if (ev.type === 'reveal') return [{ t: ev.t, file: ev.lives <= 1 ? 'shield_break.wav' : 'shield_clank.wav', vol: 1 }];
  if (ev.type === 'lost') return [{ t: ev.t, file: 'game_over.wav', vol: 0.9 }];
  if (ev.type === 'join') return [{ t: ev.t + 0.1, file: 'player_ready.wav', vol: 0.7 }];
  if (ev.type.startsWith('menu-') || ev.type === 'battle-start') return [{ t: ev.t, file: 'ui_select.ogg', vol: 0.7 }];
  return [];
}

const DURS = ajustar(BLOQUES.map(duracion));
export const TIMELINE = (() => {
  let t = 0;
  return BLOQUES.map((b, i) => {
    const r = resolver(b, t, DURS[i].dur);
    t += r.dur;
    return r;
  });
})();
export const TOTAL = TIMELINE.reduce((s, b) => s + b.dur, 0);

// Mezcla de cada tramo. Todas las pistas al volumen de la más baja (ninguna salta sobre otra). Entre pistas en
// loop, corte en la barra: la que entra arranca a volumen pleno y la que sale se funde encima dos cuadros;
// hacia el silencio o desde una jingle, cola de 0,35 s. La victoria
// arranca de modo que su platillo (inicio del compás 1) caiga cuando aparece la princesa, y termina con un
// frenazo de cinta (public/audio/frenazo.wav, de scripts/frenazo.mjs) para el chiste de la derrota.
const PISO_DB = Math.min(...Object.keys(MUSICA).map((k) => compases[k].rmsDb));
export const FRENAZO = 0.4;
const CRUCE = 2 / FPS;
export const TRAMOS = tramosDe().map((r, k, all) => {
  const first = TIMELINE[r.blocks[0]];
  const last = TIMELINE[r.end - 1];
  const from = first.start;
  let to = last.start + last.dur;
  const sigue = all[k + 1]?.blocks[0] === r.end;
  let trackFrom = MUSICA[r.key].from;
  if (r.key === 'victory') {
    const princesa = first.shots.find((s) => s.cut === 'princess')?.from ?? 1;
    trackFrom = Math.max(0, compases.victory.bars[0] - princesa);
  }
  const tramo = {
    key: r.key, file: MUSICA[r.key].file, from, to, trackFrom,
    gain: 10 ** ((PISO_DB - compases[r.key].rmsDb) / 20),
    fadeIn: 0, // entra a volumen pleno: la anterior se funde por debajo (si no, queda un microhueco)
    fadeOut: !TIMELINE[r.end] ? 1.2 : sigue && LOOP.has(r.key) ? CRUCE : 0.35,
  };
  if (sigue && LOOP.has(r.key)) tramo.to = to + CRUCE; // se encima dos cuadros con la siguiente
  if (r.key === 'victory' && sigue) {
    tramo.to = to - FRENAZO;
    tramo.fadeOut = 0.01;
    tramo.frenazo = { from: tramo.to, trackAt: trackFrom + (tramo.to - from) };
  }
  if (!LOOP.has(r.key) && sigue && r.key !== 'victory') tramo.to = to + tramo.fadeOut; // la cola de la jingle pasa por debajo
  return tramo;
});

// Subtítulos: el texto del guion (bien escrito, aunque la transcripción junte o separe palabras) partido
// en renglones cortos, cada uno a la hora de su primera palabra en la voz. Los usan el video y el .srt.
const MAX = 42;
export const SUBS = TIMELINE.flatMap((b) => {
  const ws = b.texto.split(/\s+/);
  const chunks = [];
  let cur = [];
  ws.forEach((w, i) => {
    cur.push({ w, i });
    const len = cur.map((x) => x.w).join(' ').length;
    const next = ws[i + 1];
    if (!next || /[.!?]$/.test(w) || (/,$/.test(w) && len > 18) || len + next.length + 1 > MAX) { chunks.push(cur); cur = []; }
  });
  // cada palabra del guion se busca en orden en la voz (admite «shade» ↔ «shaderaptor», que avanza una
  // sola vez); la que no aparece cerca hereda la hora de la anterior. Cada renglón arranca en su primera palabra.
  const voice = b.voz.words ?? [];
  let j = 0;
  let last = 0;
  const times = ws.map((x, i) => {
    const w = limpia(x);
    if (!voice.length) return (i / ws.length) * b.voz.dur;
    if (!w) return last;
    for (let k = j; k < Math.min(voice.length, j + 3); k++) {
      const v = voice[k].w;
      const parecida = w.length >= 5 && v.slice(0, 3) === w.slice(0, 3) && Math.abs(v.length - w.length) <= 2; // «ashhorn» ↔ «ashorn»
      if (v === w || v.startsWith(w) || w.startsWith(v) || parecida || (k === j && v.endsWith(w))) {
        j = v.startsWith(w) && v !== w ? k : k + 1; // «shaderaptor» también cubre la palabra siguiente
        last = voice[k].t;
        return last;
      }
    }
    return last;
  });
  const at = (i) => LEAD + times[i];
  const starts = chunks.map((c) => at(c[0].i));
  const end = LEAD + b.voz.dur + 0.15;
  return chunks.map((c, k) => ({
    text: c.map((x) => x.w).join(' ').replace(/^\.\.\.\s*/, ''),
    from: b.start + starts[k] - 0.04,
    to: b.start + (k + 1 < chunks.length ? starts[k + 1] - 0.04 : end),
  }));
});
