// Music for the projector: remixes the Suno battle into the boss theme (bossRemix), synthesises the two
// chiptune jingles the packs don't have (victory / defeat) and copies the Suno tracks.
//   node tools/build-music.js   ->  assets/audio/{music_boss.mp3, jingle_victory.mp3, jingle_defeat.mp3, music.json}
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'audio');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- MP3 in / MP3 out
async function decodeMp3(file) {
  const { MPEGDecoder } = await import('mpg123-decoder');
  const dec = new MPEGDecoder();
  await dec.ready;
  const { channelData, sampleRate } = dec.decode(fs.readFileSync(file));
  const chans = channelData.map(c => Float32Array.from(c)); // copy out of the WASM heap before freeing it
  dec.free();
  return { sr: sampleRate, chans };
}

// Windowed-sinc resampler (polyphase: the rate ratio reduces to up/down, one 32-tap filter per phase).
// Changes the sample rate only: pitch and tempo stay as they are.
function resample(x, from, to) {
  if (from === to) return x;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a), g = gcd(from, to), up = to / g, down = from / g;
  const H = 16, fc = 0.46 * Math.min(1, to / from); // cutoff in cycles per input sample (~20 kHz)
  const phases = Array.from({ length: up }, (_, p) => {
    const h = new Float64Array(2 * H);
    let sum = 0;
    for (let k = 0; k < 2 * H; k++) {
      const d = k - H + 1 - p / up;
      h[k] = (d === 0 ? 1 : Math.sin(2 * Math.PI * fc * d) / (2 * Math.PI * fc * d)) * (0.5 + 0.5 * Math.cos(Math.PI * d / H));
      sum += h[k];
    }
    return h.map(v => v / sum);
  });
  const y = new Float32Array(Math.floor(x.length * up / down));
  for (let n = 0; n < y.length; n++) {
    const i0 = Math.floor(n * down / up), h = phases[(n * down) % up];
    let acc = 0;
    for (let k = 0; k < 2 * H; k++) { const j = i0 - H + 1 + k; if (j >= 0 && j < x.length) acc += x[j] * h[k]; }
    y[n] = acc;
  }
  return y;
}

async function encodeMp3(chans, sr, kbps) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const enc = new Mp3Encoder(chans.length, sr, kbps);
  const parts = [], BLOCK = 1152;
  for (let i = 0; i < chans[0].length; i += BLOCK) {
    const l = chans[0].subarray(i, i + BLOCK);
    const buf = chans.length > 1 ? enc.encodeBuffer(l, chans[1].subarray(i, i + BLOCK)) : enc.encodeBuffer(l);
    if (buf.length) parts.push(Buffer.from(buf));
  }
  parts.push(Buffer.from(enc.flush()));
  return Buffer.concat(parts);
}
// LAME adds 576 + 529 samples of priming at the start; the loop must skip them to be seamless
const ENCODER_DELAY = 1105;

// ---------------------------------------------------------------- tiny chiptune synth
const SR = 44100;
const NOTE = n => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((semis + (Number(m[3]) + 1) * 12 - 69) / 12);
};
const OSC = {
  square: duty => (ph => ((ph % 1) < duty ? 1 : -1)),
  tri: () => (ph => 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5)),
};

function render(seconds, voices) {
  const out = new Float32Array(Math.ceil(seconds * SR));
  for (const v of voices) {
    let t = 0;
    for (const [note, beats, opts = {}] of v.notes) {
      const dur = beats * v.beat;
      if (note !== '-') {
        const wave = v.noise ? null : OSC[v.wave](v.duty ?? 0.5);
        const f0 = v.noise ? 0 : NOTE(note);
        const a = 0.005, rel = opts.release ?? v.release ?? 0.04, len = dur * (opts.legato ?? v.legato ?? 0.92);
        const i0 = Math.floor(t * SR), n = Math.floor((len + rel) * SR);
        let ph = 0, lfsr = 0x7fff, held = 0;
        for (let i = 0; i < n && i0 + i < out.length; i++) {
          const s = i / SR;
          let env = s < a ? s / a : s < len ? 1 - (v.decay ?? 0) * Math.min(1, (s - a) / len) : Math.max(0, 1 - (s - len) / rel) * (1 - (v.decay ?? 0));
          if (v.noise) {
            // NES-style noise: LFSR clocked at a "pitch" rate, short decaying hits
            env = Math.exp(-s / (opts.hit ?? 0.06));
            if (i % (opts.period ?? 6) === 0) { const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); held = lfsr & 1 ? 1 : -1; }
            out[i0 + i] += held * env * v.vol;
            continue;
          }
          const vib = opts.vibrato && s > 0.15 ? 1 + 0.012 * Math.sin(2 * Math.PI * 6 * s) : 1;
          const slide = opts.slideTo ? 1 + (NOTE(opts.slideTo) / f0 - 1) * Math.min(1, s / len) : 1;
          ph += (f0 * vib * slide) / SR;
          out[i0 + i] += wave(ph) * env * v.vol;
        }
      }
      t += dur;
    }
  }
  // soft limiter
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.2) * 0.85;
  return out;
}
const toInt16 = f => Int16Array.from(f, s => Math.max(-32768, Math.min(32767, Math.round(s * 32767))));

// Victory, written to follow the Suno battle theme ("E Minor Charge", E minor, 150 BPM):
// the battle's E-minor arpeggio turns into E major, then a heroic fanfare over I-vi-IV-V with 16th-note
// arpeggios like the Suno tracks, and a held high E. ~11 s, then the lobby loop comes back.
function victory() {
  const beat = 60 / 150;
  const bars = [ // chord per half bar (2 beats): root for the bass, notes for the arpeggio
    ['E', ['E4', 'G4', 'B4', 'E5']], ['E', ['E4', 'G4', 'B4', 'E5']],               // bar 0: E minor (the battle)
    ['E', ['E4', 'G#4', 'B4', 'E5']], ['E', ['E4', 'G#4', 'B4', 'E5']],             // bar 1: E
    ['A', ['E4', 'A4', 'C#5', 'E5']], ['B', ['F#4', 'B4', 'D#5', 'F#5']],           // bar 2: A  B
    ['C#', ['E4', 'G#4', 'C#5', 'E5']], ['A', ['E4', 'A4', 'C#5', 'E5']],           // bar 3: C#m A
    ['B', ['F#4', 'B4', 'D#5', 'F#5']], ['B', ['F#4', 'A4', 'B4', 'D#5']],          // bar 4: B  B7
  ];
  const lead = [
    ['E5', 0.5], ['G5', 0.5], ['B5', 0.5], ['G5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G#5', 0.5],
    ['B5', 1.5], ['G#5', 0.5], ['E5', 1], ['B4', 1],
    ['C#5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G#5', 2, { vibrato: true }],
    ['A5', 1.5], ['G#5', 0.5], ['F#5', 1], ['E5', 1],
    ['D#5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G#5', 0.5], ['A5', 0.5], ['B5', 1.5],
    ['E5', 0.25], ['G#5', 0.25], ['B5', 0.25], ['E6', 7.25, { vibrato: true, release: 0.8 }],
  ];
  const harmony = [
    ['-', 4],
    ['G#5', 1.5], ['E5', 0.5], ['B4', 1], ['G#4', 1],
    ['A4', 0.5], ['B4', 0.5], ['C#5', 0.5], ['D#5', 0.5], ['E5', 2],
    ['E5', 1.5], ['E5', 0.5], ['C#5', 1], ['C#5', 1],
    ['B4', 0.5], ['B4', 0.5], ['D#5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['F#5', 1.5],
    ['B4', 0.25], ['E5', 0.25], ['G#5', 0.25], ['B5', 7.25, { vibrato: true, release: 0.8 }],
  ];
  const arp = [], bass = [], drums = [];
  for (const [root, notes] of bars) {
    for (let i = 0; i < 8; i++) arp.push([notes[i % 4], 0.25]);
    for (let i = 0; i < 4; i++) bass.push([root + (i % 2 ? '3' : '2'), 0.5]);
  }
  arp.push(['-', 8]);
  bass.push(['E2', 0.25], ['G#2', 0.25], ['B2', 0.25], ['E3', 0.25], ['E2', 7, { release: 0.8 }]);
  // bar 0: kick + snare roll into the major; bars 1-4: kick on 1/3, snare on 2/4, 8th hats; final crash
  const K = { hit: 0.09, period: 22 }, S = { hit: 0.07, period: 3 }, H = { hit: 0.018, period: 1 }, C = { hit: 1.1, period: 1 };
  drums.push(['x', 1, K], ['x', 1, S]);
  for (let i = 0; i < 8; i++) drums.push(['x', 0.25, { ...S, hit: 0.03 + i * 0.006 }]);
  for (let bar = 1; bar <= 4; bar++) for (let b = 0; b < 4; b++) drums.push(['x', 0.5, bar === 1 && b === 0 ? C : b % 2 ? S : K], ['x', 0.5, H]);
  drums.push(['x', 0.25, S], ['x', 0.25, S], ['x', 0.25, S], ['x', 0.25, S], ['x', 7, C]);
  const mono = render(13.2, [
    { wave: 'square', duty: 0.25, vol: 0.3, beat, legato: 0.88, notes: lead },
    { wave: 'square', duty: 0.5, vol: 0.12, beat, legato: 0.85, notes: harmony },
    { wave: 'square', duty: 0.125, vol: 0.07, beat, legato: 0.6, notes: arp },
    { wave: 'tri', vol: 0.45, beat, legato: 0.75, notes: bass },
    { noise: true, vol: 0.2, beat, notes: drums },
  ]);
  return polish(mono, 0.15);
}

// Stereo ping-pong echo (dotted 8th at 150 BPM) so the synth sits next to the Suno mixes, then RMS-match them
function polish(mono, targetRms) {
  const d = Math.round(SR * 0.3), L = new Float32Array(mono.length), R = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    L[i] = mono[i] + (i >= d ? 0.28 * R[i - d] : 0);
    R[i] = mono[i] + (i >= d ? 0.28 * L[i - d] : 0);
  }
  let ss = 0;
  for (let i = 0; i < L.length; i++) ss += (L[i] * L[i] + R[i] * R[i]) / 2;
  const g = targetRms / Math.sqrt(ss / L.length);
  // fade the tail so the jingle ends cleanly
  const fade = SR * 0.6;
  for (let i = 0; i < L.length; i++) {
    const f = Math.min(1, (L.length - i) / fade);
    L[i] = Math.tanh(L[i] * g) * f; R[i] = Math.tanh(R[i] * g) * f;
  }
  return [L, R];
}

// Defeat: slow "wah-wah" chromatic descent in A minor, low thud, dark final chord (~6 s)
function defeat() {
  const beat = 60 / 84;
  return render(7, [
    { wave: 'square', duty: 0.5, vol: 0.3, beat, legato: 0.85, notes: [
      ['E5', 1, { slideTo: 'D#5' }], ['D#5', 1, { slideTo: 'D5' }], ['D5', 1, { slideTo: 'C#5' }],
      ['C#5', 2, { slideTo: 'A4', vibrato: true }], ['-', 0.5], ['A4', 2.5, { vibrato: true, release: 0.6 }]] },
    { wave: 'square', duty: 0.125, vol: 0.12, beat, notes: [
      ['C5', 1], ['B4', 1], ['Bb4', 1], ['A4', 2], ['-', 0.5], ['E4', 2.5, { release: 0.6 }]] },
    { wave: 'tri', vol: 0.45, beat, legato: 0.9, notes: [
      ['A2', 1], ['G#2', 1], ['G2', 1], ['F#2', 2], ['-', 0.5], ['A1', 2.5, { release: 0.8 }]] },
    { noise: true, vol: 0.28, beat, notes: [['-', 5], ['x', 0.5, { hit: 0.05 }], ['x', 2.5, { hit: 0.9, period: 14 }]] },
  ]);
}

// ---------------------------------------------------------------- analysis (beat grid, chords, key)
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len / 2;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// magnitude spectrum of Hann-windowed frames centred every `hop` samples
function stft(x, N, hop, onFrame) {
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(N / 2);
  const frames = Math.floor(x.length / hop);
  for (let f = 0; f < frames; f++) {
    const s0 = f * hop - N / 2;
    for (let i = 0; i < N; i++) { const j = s0 + i; re[i] = j >= 0 && j < x.length ? x[j] * win[i] : 0; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    onFrame(f, mag);
  }
}

// Onset envelope = positive log-spectral flux, 100 frames/s; `low` = kick band (< 170 Hz), `mid` = snare band (1-4 kHz)
const HOP = 441, FPS = SR / HOP;
const frameTime = f => (f - 0.5) * HOP / SR; // the flux of frame f peaks when the onset is half a hop before its centre
function onsets(x) {
  const N = 1024, all = [], low = [], mid = [];
  let prev = null;
  stft(x, N, HOP, (f, mag) => {
    const lg = mag.map(m => Math.log1p(100 * m));
    let a = 0, l = 0, md = 0;
    if (prev) for (let k = 1; k < N / 2; k++) { const d = lg[k] - prev[k]; if (d > 0) { a += d; if (k <= 4) l += d; else if (k >= 23 && k <= 93) md += d; } }
    all.push(a); low.push(l); mid.push(md); prev = lg;
  });
  // remove the slow loudness trend (0.5 s moving average) so only the hits remain
  const detrend = e => e.map((v, i) => {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - 25); j <= Math.min(e.length - 1, i + 25); j++) { s += e[j]; c++; }
    return Math.max(0, v - s / c);
  });
  return { all: Float64Array.from(detrend(all)), low: Float64Array.from(detrend(low)), mid: Float64Array.from(detrend(mid)) };
}

// DFT of the onset envelope at the beat frequency: |X| = how strong that tempo is, arg X = where the beats fall
function pulse(env, bpm, from = 0, to = env.length) {
  const w = 2 * Math.PI * bpm / 60 / FPS;
  let re = 0, im = 0;
  for (let n = from; n < to; n++) { re += env[n] * Math.cos(w * n); im -= env[n] * Math.sin(w * n); }
  return { mag: Math.hypot(re, im), frac: ((-Math.atan2(im, re) / (2 * Math.PI)) % 1 + 1) % 1 };
}
function tempo(env, lo = 110, hi = 180) {
  let best = lo, bestMag = 0;
  const scan = (a, b, step) => { for (let bpm = a; bpm <= b; bpm += step) { const m = pulse(env, bpm).mag; if (m > bestMag) { bestMag = m; best = bpm; } } };
  scan(lo, hi, 0.05);
  scan(best - 0.06, best + 0.06, 0.001);
  return best;
}
// Suno songs drift between sections (~143.7 -> ~145.5 BPM here), so the grid comes from dynamic-programming
// beat tracking (Ellis 2007) around the global tempo, then a +-8 beat linear fit smooths the 10 ms frames away
function beatTrack(env, bpm) {
  const P = 60 / bpm * FPS, sd = Math.sqrt(env.reduce((s, v) => s + v * v, 0) / env.length) || 1;
  const score = new Float64Array(env.length), from = new Int32Array(env.length).fill(-1);
  for (let t = 0; t < env.length; t++) {
    let best = 0;
    for (let d = Math.round(P * 0.75); d <= Math.round(P * 1.33) && d <= t; d++) {
      const s = score[t - d] - 100 * Math.log(d / P) ** 2;
      if (from[t] < 0 || s > best) { best = s; from[t] = t - d; }
    }
    if (best < 0) from[t] = -1; // a fresh start beats a bad jump
    score[t] = env[t] / sd + Math.max(0, best);
  }
  let t = env.length - 1;
  for (let i = env.length - Math.round(P); i < env.length; i++) if (score[i] > score[t]) t = i;
  const frames = [];
  for (; t >= 0; t = from[t]) frames.unshift(t);
  const smooth = frames.map((_, i) => {
    const a = Math.max(0, i - 8), b = Math.min(frames.length - 1, i + 8);
    let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (let j = a; j <= b; j++) { sx += j; sy += frames[j]; sxx += j * j; sxy += j * frames[j]; n++; }
    const k = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return sy / n + k * (i - sx / n);
  });
  // then slide the whole grid onto the onsets: median offset to the (parabolic) peak within +-40 ms
  const offs = [];
  for (const f of smooth) {
    let p = Math.round(f);
    for (let j = Math.round(f) - 4; j <= Math.round(f) + 4; j++) if (env[j] > (env[p] ?? 0)) p = j;
    if (p <= 0 || p >= env.length - 1 || env[p] < 2 * sd) continue;
    const d = env[p - 1] - 2 * env[p] + env[p + 1];
    offs.push(p + (d ? 0.5 * (env[p - 1] - env[p + 1]) / d : 0) - f);
  }
  offs.sort((a, b) => a - b);
  const shift = offs.length ? offs[offs.length >> 1] : 0;
  return smooth.map(f => frameTime(f + shift));
}

// 12-bin chroma of every frame (16k FFT for a usable bass resolution); `bass` = 40-200 Hz only
function chroma(x) {
  const N = 16384, hop = 2048, frames = [], pc = new Int8Array(N / 2).fill(-1);
  for (let k = 1; k < N / 2; k++) {
    const f = k * SR / N;
    if (f >= 40 && f <= 2000) pc[k] = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
  }
  stft(x, N, hop, (f, mag) => {
    const c = new Float64Array(12), bass = new Float64Array(12);
    for (let k = 1; k < N / 2; k++) if (pc[k] >= 0) { c[pc[k]] += mag[k]; if (k * SR / N <= 200) bass[pc[k]] += mag[k]; }
    frames.push({ t: f * hop / SR, c, bass });
  });
  return frames;
}
const PCS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / Math.sqrt(na * nb || 1); };
// average chroma over [t, t + len), skipping the first and last 10 % (chord changes smear there)
function chromaOf(frames, t, len) {
  const c = new Float64Array(12), bass = new Float64Array(12);
  for (const fr of frames) if (fr.t >= t + 0.1 * len && fr.t < t + 0.9 * len) for (let i = 0; i < 12; i++) { c[i] += fr.c[i]; bass[i] += fr.bass[i]; }
  return { c, bass };
}
// best triad template (root, minor/major) + a bonus when the root is also the strongest bass note;
// roots limited to the key's scale (a B major in E minor stays B, not a D#m look-alike)
function chordOf({ c, bass }, roots = PCS.map((_, i) => i)) {
  const maxBass = Math.max(...bass) || 1;
  let best = null;
  for (const r of roots) for (const minor of [true, false]) {
    const tpl = new Float64Array(12);
    tpl[r] = 1; tpl[(r + (minor ? 3 : 4)) % 12] = 0.8; tpl[(r + 7) % 12] = 0.9;
    const score = cos(c, tpl) + 0.3 * bass[r] / maxBass;
    if (!best || score > best.score) best = { root: r, minor, score, name: PCS[r] + (minor ? 'm' : '') };
  }
  return best;
}
// Krumhansl-Schmuckler key profiles against the total chroma
function keyOf(c) {
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const corr = (a, b) => { const ma = a.reduce((s, v) => s + v) / 12, mb = b.reduce((s, v) => s + v) / 12; let d = 0, va = 0, vb = 0; for (let i = 0; i < 12; i++) { d += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return d / Math.sqrt(va * vb); };
  let best = null;
  for (let r = 0; r < 12; r++) for (const [prof, q] of [[MAJ, 'major'], [MIN, 'minor']]) {
    const rot = Array.from({ length: 12 }, (_, i) => prof[(i - r + 12) % 12]), s = corr(c, rot);
    if (!best || s > best.score) best = { name: `${PCS[r]} ${q}`, tonic: r, minor: q === 'minor', score: s };
  }
  return best;
}
const totalChroma = frames => frames.reduce((acc, fr) => acc.map((v, i) => v + fr.c[i]), new Float64Array(12));

// Beat grid + downbeats + chord per bar of a (mono) song. Downbeats: Viterbi over the position in the bar
// (1-4), rewarding chord changes (beat-chroma novelty) and kicks on beat 1; the bar position may jump
// (a Suno section seam or a dropped beat) at a cost, so the bar phase is found locally, not once.
function analyse(mono) {
  const env = onsets(mono), frames = chroma(mono), bpm = tempo(env.all), beats = beatTrack(env.all, bpm);
  const key = keyOf(totalChroma(frames)), scale = (key.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(i => (i + key.tonic) % 12);
  const onsetAt = (e, t) => { const f = Math.round(t * FPS + 0.5); let m = 0; for (let j = f - 2; j <= f + 2; j++) if (e[j] > m) m = e[j]; return m; };
  const bc = beats.slice(0, -1).map((t, i) => chromaOf(frames, t, beats[i + 1] - t).c);
  const nov = bc.map((c, i) => (i ? 1 - cos(bc[i - 1], c) : 0)), kick = bc.map((_, i) => onsetAt(env.low, beats[i]));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, mN = mean(nov), mK = mean(kick), JUMP = 4;
  let score = [0, 0, 0, 0];
  const back = [];
  for (let i = 0; i < bc.length; i++) {
    const best = Math.max(...score), from = [], next = [];
    for (let s = 0; s < 4; s++) {
      const stay = score[(s + 3) % 4], jump = best - JUMP;
      from.push(stay >= jump ? (s + 3) % 4 : score.indexOf(best));
      next.push(Math.max(stay, jump) + (s === 0 ? nov[i] / mN + 0.3 * kick[i] / mK : 0));
    }
    back.push(from); score = next;
  }
  const pos = new Array(bc.length);
  pos[bc.length - 1] = score.indexOf(Math.max(...score));
  for (let i = bc.length - 1; i > 0; i--) pos[i - 1] = back[i][pos[i]];
  const downs = pos.map((p, i) => (p === 0 ? i : -1)).filter(i => i >= 0);
  const bars = downs.slice(0, -1).map((i, k) => {
    const t = beats[i], len = beats[downs[k + 1]] - t, ch = chromaOf(frames, t, len);
    return { t, len, beats: downs[k + 1] - i, chroma: ch.c, ...chordOf(ch, scale) };
  });
  const bpms = bars.filter(b => b.beats === 4).map(b => 240 / b.len);
  return { bpm, bpmRange: [Math.min(...bpms), Math.max(...bpms)], beats, bars, env, frames, key };
}

// ---------------------------------------------------------------- boss: remix of the Suno battle
const midiHz = m => 440 * 2 ** ((m - 69) / 12);
const WAVES = {
  square: (ph, d) => ((ph % 1) < d ? 1 : -1),
  tri: ph => 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5),
  saw: ph => 2 * (ph % 1) - 1,
  sine: ph => Math.sin(2 * Math.PI * ph),
};
// one note at absolute time t (s) into a stereo bus; the envelope (attack / release) stays inside `dur`
function tone(bus, t, dur, freq, o = {}) {
  const [L, R] = bus, i0 = Math.round(t * SR), n = Math.round(dur * SR), wave = WAVES[o.wave ?? 'square'];
  const a = o.attack ?? 0.005, rel = o.release ?? 0.05, pan = o.pan ?? 0;
  const gl = (o.vol ?? 0.2) * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = (o.vol ?? 0.2) * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  let ph = o.phase ?? 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const s = i / SR;
    let env = Math.min(1, s / a, (dur - s) / rel);
    if (o.decay) env *= Math.exp(-s / o.decay);
    const f = o.drop ? o.drop + (freq - o.drop) * Math.exp(-s / (o.dropTime ?? 0.04)) : freq; // pitch fall (kicks)
    ph += f * (o.vibrato ? 1 + o.vibrato * Math.sin(2 * Math.PI * 5.5 * s) : 1) / SR;
    const y = wave(ph, o.duty ?? 0.5) * env;
    L[i0 + i] += y * gl; R[i0 + i] += y * gr;
  }
}
// NES-style noise hit (LFSR clocked every `period` samples), exponential decay or a crescendo `swell`
function noise(bus, t, dur, o = {}) {
  const [L, R] = bus, i0 = Math.round(t * SR), n = Math.round(dur * SR);
  let lfsr = 0x7fff, held = 0;
  for (let i = 0; i < n && i0 + i < L.length; i++) {
    const s = i / SR;
    if (i % (o.period ?? 4) === 0) { const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); held = lfsr & 1 ? 1 : -1; }
    const env = Math.exp(-s / (o.decay ?? 0.05)) * Math.min(1, (dur - s) / 0.005);
    L[i0 + i] += held * env * (o.vol ?? 0.1); R[i0 + i] += held * env * (o.vol ?? 0.1);
  }
}
// thunderous 8-bit kick: sine falling 160 -> 42 Hz + a noise click
function kick(bus, t, vol) {
  tone(bus, t, 0.45, 160, { wave: 'sine', drop: 42, dropTime: 0.045, decay: 0.16, release: 0.05, vol });
  noise(bus, t, 0.03, { period: 10, decay: 0.008, vol: vol * 0.5 });
}
// low castle bell: inharmonic partials of a minor-third bell (hum, prime, tierce, quint, nominal...)
function bell(bus, t, dur, freq, vol) {
  for (const [r, v, d] of [[0.5, 1, 2.6], [1, 0.8, 1.8], [1.19, 0.45, 1.3], [1.5, 0.3, 1.1], [2, 0.5, 1], [2.52, 0.2, 0.6], [3.01, 0.15, 0.45], [4.17, 0.08, 0.3]])
    tone(bus, t, dur, freq * r, { wave: 'sine', vol: vol * v, decay: d, release: 0.2 });
}
// pipe organ: stacked squares (8' + 4' + mixture) and a quiet saw for the reed; one call = one note
function organ(bus, t, dur, m, vol, attack) {
  const f = midiHz(m), o = { attack, release: Math.min(0.3, dur / 4) };
  tone(bus, t, dur, f, { ...o, duty: 0.5, vol, pan: -0.15 });
  tone(bus, t, dur, f * 2.002, { ...o, duty: 0.25, vol: vol * 0.45, pan: 0.15 });
  tone(bus, t, dur, f * 0.999, { ...o, wave: 'saw', vol: vol * 0.35 });
  tone(bus, t, dur, f * 4, { ...o, duty: 0.125, vol: vol * 0.12 });
}
// choir-like pad: detuned triangles with vibrato, spread left/right
function choir(bus, t, dur, m, vol) {
  const f = midiHz(m), o = { wave: 'tri', attack: Math.min(0.4, dur / 3), release: Math.min(0.25, dur / 4), vibrato: 0.005 };
  tone(bus, t, dur, f * 0.997, { ...o, vol, pan: -0.6 });
  tone(bus, t, dur, f * 1.003, { ...o, vol, pan: 0.6, phase: 0.37 });
  tone(bus, t, dur, f * 2, { ...o, wave: 'square', duty: 0.3, vol: vol * 0.18 });
}

function biquad(x, type, f0, gainDb = 0, q = Math.SQRT1_2) {
  const A = 10 ** (gainDb / 40), w = 2 * Math.PI * f0 / SR, c = Math.cos(w), sn = Math.sin(w);
  const al = type.endsWith('shelf') ? sn / 2 * Math.SQRT2 : sn / (2 * q), sa = 2 * Math.sqrt(A) * al;
  const k = {
    lowshelf: [A * ((A + 1) - (A - 1) * c + sa), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sa), (A + 1) + (A - 1) * c + sa, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sa],
    highshelf: [A * ((A + 1) + (A - 1) * c + sa), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sa), (A + 1) - (A - 1) * c + sa, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sa],
    lowpass: [(1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al],
  }[type];
  const [b0, b1, b2, a0, a1, a2] = k.map(v => v / k[3]);
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const rms = chans => { let s = 0, n = 0; for (const c of chans) for (let i = 0; i < c.length; i++) { s += c[i] * c[i]; n++; } return Math.sqrt(s / n); };

// Boss theme (King Dread): the intense Suno battle ("Alarm Arpeggios", E minor) as the lead, analysed
// for beat grid + chord per bar, with a 4-bar organ/bell intro and organ, choir, sub drone and kicks
// under it that follow those chords. Returns stereo PCM + the loop (in samples, before the encoder delay).
async function bossRemix() {
  const src = await decodeMp3(path.join(ROOT, 'assets-src', 'music', 'music_battle_intense.mp3'));
  const [bL, bR] = src.chans.map(c => resample(c, src.sr, SR));
  const an = analyse(bL.map((l, i) => (l + bR[i]) / 2));
  const { bars } = an;
  // the base loop: a pair of downbeats near the song's own loop points (past the Suno intro, before its
  // ending) whose next bars match best (4 bars of chroma + same roots, 2 bars of drum pattern), so the jump
  // sounds like the song going on. Drum pattern = onset envelope sampled 64 times per bar (tempo-free).
  const near = t => bars.reduce((a, b, i) => (Math.abs(b.t - t) < Math.abs(bars[a].t - t) ? i : a), 0);
  const groove = i => bars.slice(i, i + 2).flatMap(b => Array.from({ length: 64 }, (_, q) => an.env.all[Math.round((b.t + b.len * q / 64) * FPS + 0.5)]));
  const pearson = (x, y) => { const mx = x.reduce((s, v) => s + v) / x.length, my = y.reduce((s, v) => s + v) / y.length; return cos(x.map(v => v - mx), y.map(v => v - my)); };
  let b0, b1, seam = { score: -Infinity };
  for (let i = Math.max(1, near(8.35) - 2); i <= near(8.35) + 2; i++)
    for (let j = near(161.8) - 3; j <= Math.min(bars.length - 5, near(161.8) + 3); j++) {
      let harm = 0;
      for (let k = 0; k < 4; k++) harm += cos(bars[i + k].chroma, bars[j + k].chroma) / 4 + (bars[i + k].root === bars[j + k].root ? 0.05 : 0);
      const drums = pearson(groove(i), groove(j));
      if (harm + 0.25 * drums > seam.score) { seam = { score: harm + 0.25 * drums, harm, drums }; b0 = i; b1 = j; }
    }
  const loop = bars.slice(b0, b1), T0 = bars[b0].t, nb = loop.length;
  const odd = bars.filter(b => b.beats !== 4).map(b => `${b.t.toFixed(2)} s (${b.beats} beats)`);
  console.log(`boss base: Alarm Arpeggios, key ${an.key.name}, ${an.bpm.toFixed(2)} BPM overall (bars ${an.bpmRange[0].toFixed(1)}-${an.bpmRange[1].toFixed(1)}), ` +
    `${an.beats.length} beats, ${bars.length} bars${odd.length ? ', odd bars at ' + odd.join(', ') : ''}`);
  console.log(`  intro chords ${[...loop.slice(0, 3), bars[b0 - 1]].map(b => b.name).join(' ')}; loop bars ${b0}-${b1} = ${T0.toFixed(3)}-${bars[b1].t.toFixed(3)} s of the song (${nb} bars; seam: harmony ${seam.harm.toFixed(3)}, drum pattern r=${seam.drums.toFixed(2)})`);
  for (let i = 0; i < nb; i += 8) console.log(`  bar ${String(i).padStart(2)}: ${loop.slice(i, i + 8).map(b => b.name.padEnd(3)).join(' ')}`);

  // timeline: 4 intro bars (at the loop's opening tempo), the base from its first loop bar, 1 bar of tail
  const INTRO = 4, ibar = loop.slice(0, 8).reduce((sum, b) => sum + b.len, 0) / 8;
  const O = Math.round(INTRO * ibar * SR), S0 = Math.round(T0 * SR), N = Math.round((bars[b1].t - T0) * SR);
  const fade = Math.round(ibar * SR), tail = Math.round(bars[b1].len * SR), len = O + N + tail;
  const base = [bL, bR].map(c => biquad(biquad(c, 'lowshelf', 110, 3.5), 'highshelf', 6000, -2)); // darker, heavier
  const mix = [new Float32Array(len), new Float32Array(len)];
  for (let i = -fade; i < N + tail; i++) {
    // fade the Suno bar before the loop in under the last intro bar, fade the tail out
    const g = i < 0 ? (1 + i / fade) ** 2 : i >= N ? 1 - (i - N) / tail : 1;
    for (let c = 0; c < 2; c++) mix[c][O + i] = base[c][S0 + i] * g;
  }
  const baseRms = rms(mix.map(c => c.subarray(O, O + N)));

  // layers (one bus each, so the organ/choir can be filtered): chords merged into runs of equal roots
  const organBus = [new Float32Array(len), new Float32Array(len)], choirBus = [new Float32Array(len), new Float32Array(len)];
  const low = [new Float32Array(len), new Float32Array(len)];
  const runs = (list, start) => list.reduce((acc, b) => {
    const last = acc[acc.length - 1];
    if (last && last.root === b.root) last.dur += b.len; else acc.push({ root: b.root, t: start + b.t - list[0].t, dur: b.len });
    return acc;
  }, []);
  const at = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12; // the first midi note of pitch class pc >= lo
  // intro: organ power chords (root + fifth + octaves) on the loop's first chords, a bell toll + kick on
  // every downbeat, an 8-bit snare roll swelling into the base; the last intro bar takes the chord of the
  // Suno bar that fades in under it
  const intro = [...loop.slice(0, INTRO - 1), bars[b0 - 1]].map((b, i) => ({ root: b.root, t: i * ibar, len: ibar }));
  for (const r of runs(intro, 0)) {
    const root = at(r.root, 38); // D2..C#3
    for (const m of [root, root + 7, root + 12, root + 19, root + 24]) organ(organBus, r.t, r.dur, m, 0.03, 0.6);
  }
  for (const b of intro) { bell(low, b.t, ibar, midiHz(at(b.root, 45)), 0.16); kick(low, b.t, 0.4); }
  for (let k = 0; k < 16; k++) noise(low, (INTRO - 1 + k / 16) * ibar, ibar / 16, { period: 3, decay: 0.04, vol: 0.02 + 0.1 * (k / 15) ** 2 });
  // under the base: organ + choir on root + fifth, sub drone on the root, kick on every downbeat
  for (const r of runs(loop, O / SR)) {
    const root = at(r.root, 40); // E2..D#3
    for (const m of [root, root + 7]) organ(organBus, r.t, r.dur, m, 0.018, 0.12);
    for (const m of [root + 12, root + 19]) choir(choirBus, r.t, r.dur, m, 0.028);
    tone(low, r.t, r.dur, midiHz(at(r.root, 28)), { wave: 'sine', vol: 0.05, attack: 0.03, release: 0.08 });
    tone(low, r.t, r.dur, midiHz(at(r.root, 28) + 12), { wave: 'tri', vol: 0.02, attack: 0.03, release: 0.08 });
  }
  for (const b of loop) kick(low, O / SR + b.t - T0, 0.16);

  const layers = [0, 1].map(c => {
    const o = biquad(organBus[c], 'lowpass', 3200), ch = biquad(choirBus[c], 'lowpass', 2200);
    return o.map((v, i) => v + ch[i] + low[c][i]);
  });
  const dB = b => (20 * Math.log10(rms(b.map(c => c.subarray(O, O + N))) / baseRms)).toFixed(1);
  for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) mix[c][i] += layers[c][i];

  // RMS-match the loop to the Suno songs (0.15 once decoded: the 160 kbps MP3 loses ~0.4 dB, so aim 0.157)
  // with a soft knee above 0.6 (slight saturation, never past 0.92)
  const knee = (v, k = 0.6, ceil = 0.92) => (Math.abs(v) < k ? v : Math.sign(v) * (k + (ceil - k) * Math.tanh((Math.abs(v) - k) / (ceil - k))));
  const TARGET = 0.157;
  let gain = TARGET / rms(mix), out;
  for (let pass = 0; pass < 3; pass++) {
    out = mix.map(c => c.map(v => knee(v * gain)));
    gain *= TARGET / rms(out.map(c => c.subarray(O, O + N)));
  }
  console.log(`  layers ${dB(layers)} dB vs the base (organ ${dB(organBus)}, choir ${dB(choirBus)}, sub+kick ${dB(low)}), intro ${INTRO} bars, ` +
    `RMS ${rms(out).toFixed(3)} (intro ${rms(out.map(c => c.subarray(0, O))).toFixed(3)}), loop ${(O / SR).toFixed(3)}-${((O + N) / SR).toFixed(3)} s`);
  return { chans: out, loopStart: O, loopEnd: O + N };
}

async function main() {
  const manifest = {};
  // boss: remix of the Suno battle -> 160 kbps stereo MP3, looping from the first bar after the intro
  const boss = await bossRemix();
  fs.writeFileSync(path.join(OUT, 'music_boss.mp3'), await encodeMp3(boss.chans.map(toInt16), SR, 160));
  const sec = n => Math.round((ENCODER_DELAY + n) / SR * 1e5) / 1e5;
  manifest.boss = { file: 'music_boss.mp3', loopStart: sec(boss.loopStart), loopEnd: sec(boss.loopEnd) };
  // the Landlord loops are ogg (no priming) and loop end-to-end
  manifest.lobby = { file: 'music_menu.ogg' };
  manifest.battle = { file: 'music_battle.ogg' };
  for (const [name, fn] of [['victory', victory], ['defeat', defeat]]) {
    const res = fn();
    const chans = (Array.isArray(res) ? res : [res]).map(toInt16);
    fs.writeFileSync(path.join(OUT, `jingle_${name}.mp3`), await encodeMp3(chans, SR, chans.length > 1 ? 160 : 96));
    manifest[name] = { file: `jingle_${name}.mp3`, loop: false, ...(name === 'victory' ? { then: 'lobby' } : {}) };
  }
  // Suno tracks (see SUNO_PROMPTS.md) dropped in assets-src/music/ replace the placeholders
  const SUNO = { lobby: 'music_lobby', battle: 'music_battle', battle_intense: 'music_battle_intense', boss: 'music_boss_suno',
    victory: 'jingle_victory_suno', defeat: 'jingle_defeat_suno' };
  // loop points measured on the decoded Suno files (bar-aligned, skipping each song's ending)
  const LOOPS = { lobby: [0.15, 159.4], battle: [24.55, 165.35], battle_intense: [8.35, 161.8] };
  for (const [key, base] of Object.entries(SUNO)) {
    const src = ['.mp3', '.ogg', '.wav'].map(ext => path.join(ROOT, 'assets-src', 'music', base + ext)).find(f => fs.existsSync(f));
    if (!src) continue;
    const file = base + path.extname(src);
    fs.copyFileSync(src, path.join(OUT, file));
    const [loopStart, loopEnd] = LOOPS[key] || [];
    manifest[key] = { ...manifest[key], file, loopStart, loopEnd };
    console.log('Suno track:', key, '->', file);
  }
  fs.writeFileSync(path.join(OUT, 'music.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const f of ['music_boss.mp3', 'jingle_victory.mp3', 'jingle_defeat.mp3'])
    console.log(f, (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB');
}

module.exports = { bossRemix, decodeMp3, resample, analyse, chromaOf, chordOf, cos, onsets, pulse, chroma, keyOf, totalChroma, ENCODER_DELAY, SR, FPS, frameTime };
if (require.main === module) main();
