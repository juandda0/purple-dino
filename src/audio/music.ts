// Music engine (projector only; phones stay silent). Tracks come from /assets/audio/music.json
// (built by design/tools/build-music.js), so new songs replace old ones without code changes.
//
// Two states while a question runs:
//   calm   (> PANIC_AT of the time left)  the track as is
//   panic  (<= PANIC_AT)                   crossfade to `<track>_intense` (if present), +12% tempo and pitch,
//                                          double heartbeat, clock tick, rising noise
export const PANIC_AT = 1 / 3;

export type TrackName = 'lobby' | 'battle' | 'boss' | 'victory' | 'defeat';

interface TrackInfo {
  file: string;
  loop?: boolean;
  loopStart?: number;
  loopEnd?: number;
  volume?: number;
  then?: TrackName;
}

interface Layer {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

const BASE = '/assets/audio/';

export class Music {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private tone!: BiquadFilterNode;
  private manifest: Record<string, TrackInfo> = {};
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: { name: string; layers: Layer[] } | null = null;
  private panic = false;
  private nextBeat = 0;
  private riser: Layer | null = null;
  muted = false;

  /** Must run from a user gesture (browsers block audio until then). */
  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.tone = this.ctx.createBiquadFilter();
      this.tone.type = 'lowpass';
      this.tone.frequency.value = 20000;
      this.tone.connect(this.master).connect(this.ctx.destination);
      try {
        this.manifest = await (await fetch(BASE + 'music.json')).json();
      } catch {
        this.manifest = {};
      }
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  private load(name: string): Promise<AudioBuffer | null> {
    const info = this.manifest[name];
    if (!info || !this.ctx) return Promise.resolve(null);
    let p = this.buffers.get(name);
    if (!p) {
      const ctx = this.ctx;
      p = fetch(BASE + info.file)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then(b => ctx.decodeAudioData(b))
        .catch(() => null);
      this.buffers.set(name, p);
    }
    return p;
  }

  /** Starts decoding tracks ahead of time (e.g. the battle songs while in the lobby). */
  preload(...names: string[]) {
    for (const n of names) void this.load(n);
  }

  private layer(name: string, buffer: AudioBuffer, gainValue: number, offset = 0): Layer {
    const ctx = this.ctx!;
    const info = this.manifest[name]!;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = info.loop !== false;
    if (info.loopStart != null && info.loopEnd != null) {
      src.loopStart = info.loopStart;
      src.loopEnd = info.loopEnd;
    }
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(gain).connect(this.tone);
    src.start(ctx.currentTime + 0.05, offset);
    return { src, gain };
  }

  async play(name: TrackName, fade = 0.8) {
    if (!this.ctx || this.current?.name === name) return;
    const buffer = await this.load(name);
    if (!buffer) return;
    this.stop(fade);
    this.calm();
    const main = this.layer(name, buffer, 0);
    main.gain.gain.setTargetAtTime(this.manifest[name]?.volume ?? 1, this.ctx.currentTime, fade / 3);
    const cur = { name, layers: [main] };
    this.current = cur;
    void this.load(`${name}_intense`);
    const then = this.manifest[name]?.then;
    if (this.manifest[name]?.loop === false) {
      main.src.onended = () => {
        if (this.current === cur) {
          this.current = null;
          if (then) void this.play(then);
        }
      };
    }
  }

  stop(fade = 0.6) {
    if (!this.ctx || !this.current) return;
    const now = this.ctx.currentTime;
    for (const l of this.current.layers) {
      l.gain.gain.cancelScheduledValues(now);
      l.gain.gain.setTargetAtTime(0, now, fade / 3);
      l.src.stop(now + fade * 2);
    }
    this.current = null;
  }

  /** Back to calm for the next question. */
  calm() {
    this.panic = false;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(20000, now, 0.2);
    this.riser?.gain.gain.setTargetAtTime(0, now, 0.1);
    const [main, intense] = this.current?.layers ?? [];
    if (main) {
      main.gain.gain.setTargetAtTime(1, now, 0.3);
      main.src.playbackRate.setTargetAtTime(1, now, 0.3);
    }
    if (intense && this.current) {
      intense.gain.gain.setTargetAtTime(0, now, 0.3);
      intense.src.stop(now + 1.5);
      this.current.layers.length = 1;
    }
  }

  /** Call often while a question runs. */
  setTimeLeft(left: number, total: number) {
    if (!this.ctx || !this.current) return;
    const panic = left <= total * PANIC_AT;
    const now = this.ctx.currentTime;
    if (panic && !this.panic) {
      this.panic = true;
      void this.enterPanic(left);
    }
    if (panic && now >= this.nextBeat) {
      this.thump(1);
      if (Math.abs(left - Math.round(left)) < 0.3) this.tick();
      this.nextBeat = now + 0.5;
    }
  }

  private async enterPanic(left: number) {
    const cur = this.current;
    if (!cur || !this.ctx) return;
    const twinName = `${cur.name}_intense`;
    const twin = this.manifest[twinName] ? await this.load(twinName) : null;
    if (twin && this.current === cur && this.panic && cur.layers.length === 1) {
      cur.layers.push(this.layer(twinName, twin, 0, this.manifest[twinName]?.loopStart ?? 0));
    }
    const now = this.ctx.currentTime;
    const [main, intense] = cur.layers;
    for (const l of cur.layers) l.src.playbackRate.setTargetAtTime(1.12, now, 0.4);
    if (main && intense) {
      main.gain.gain.setTargetAtTime(0, now, 0.25);
      intense.gain.gain.setTargetAtTime(1, now, 0.25);
    }
    this.startRiser(left);
  }

  /** Time is up: a hit, then the music ducks while the result is revealed. */
  timeUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.riser?.gain.gain.setTargetAtTime(0, now, 0.05);
    this.thump(1.4, 45);
    this.noiseBurst(0.6, 0.5);
    for (const l of this.current?.layers ?? []) l.src.playbackRate.setTargetAtTime(1, now, 0.2);
    this.tone.frequency.setTargetAtTime(900, now, 0.1);
    this.panic = false;
  }

  // ---- synthesized layers
  private thump(strength = 1, freq = 70) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (const [dt, v] of [[0, 1], [0.16, 0.6]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(freq * 1.8, t + dt);
      o.frequency.exponentialRampToValueAtTime(freq, t + dt + 0.09);
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.9 * strength * v, t + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.22);
      o.connect(g).connect(this.master);
      o.start(t + dt);
      o.stop(t + dt + 0.25);
    }
  }

  private tick() {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1760;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.06);
  }

  private noise(seconds: number) {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  private startRiser(seconds: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = this.noise(Math.max(1, seconds + 1));
    f.type = 'bandpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + Math.max(0.5, seconds));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + Math.max(0.5, seconds));
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + seconds + 0.3);
    this.riser = { src, gain: g };
  }

  private noiseBurst(vol: number, len: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = this.noise(len);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(g).connect(this.master);
    src.start(t);
  }
}

export const music = new Music();
