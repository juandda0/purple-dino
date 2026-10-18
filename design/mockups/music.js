// Purple Dino · music engine (projector only; phones stay silent).
// Tracks come from assets/audio/music.json, so Suno tracks can replace the placeholders without code changes.
//
//   const music = new Music('../assets/audio/');
//   music.play('lobby');                 // crossfades from whatever is playing
//   music.play('battle');                // battle loop (+ 'battle_intense' layer if the file exists)
//   music.setTimeLeft(7.5, 20);          // call every frame/tick during a question -> intensity
//   music.timeUp();                      // stinger when the timer hits 0
//   music.play('victory') / 'defeat'     // one-shot jingle, then `then` track if defined
//
// Two states while a question runs (threshold scales with the question time: 30 / 20 / 15 s):
//   calm   (> 1/3 of the time left)  battle loop as is
//   panic  (<= 1/3)                   crossfade to battle_intense (if present), +12% tempo and pitch,
//                                     heartbeat twice a second, clock tick, rising noise
const PANIC_AT = 1 / 3; // share of the question time left when the battle music turns to panic

class Music {
  constructor(base = '../assets/audio/') {
    this.base = base;
    this.ctx = null;
    this.buffers = {};
    this.current = null;   // { name, layers: [{src, gain}] }
    this.level = 0;
    this.nextBeat = 0;
    this.volume = 0.8;
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    // the whole mix goes through a low-pass that opens up as tension rises
    this.tone = this.ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 20000;
    this.tone.connect(this.master).connect(this.ctx.destination);
    this.manifest = await (await fetch(this.base + 'music.json')).json();
  }

  async load(name) {
    const t = this.manifest[name];
    if (!t) return null;
    if (!this.buffers[name]) {
      const res = await fetch(this.base + t.file);
      if (!res.ok) return null;
      this.buffers[name] = await this.ctx.decodeAudioData(await res.arrayBuffer());
    }
    return this.buffers[name];
  }

  layer(name, buffer, gainValue, when, offset = 0) {
    const t = this.manifest[name];
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = t.loop !== false;
    if (t.loopStart != null) { src.loopStart = t.loopStart; src.loopEnd = t.loopEnd; }
    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(gain).connect(this.tone);
    src.start(when, offset);
    return { src, gain };
  }

  async play(name, { fade = 0.8 } = {}) {
    await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.current?.name === name) return;
    const buffer = await this.load(name);
    if (!buffer) return;
    this.stop({ fade });
    this.reset();
    const now = this.ctx.currentTime + 0.05;
    const main = this.layer(name, buffer, 0, now);
    main.gain.gain.setTargetAtTime(this.manifest[name].volume ?? 1, now, fade / 3);
    const layers = [main];
    this.current = { name, layers, startedAt: now };
    // battle tracks may come with an "_intense" twin (same key); preload it, it comes in when tension rises
    this.load(name + '_intense');
    const then = this.manifest[name].then;
    if (this.manifest[name].loop === false) {
      main.src.onended = () => { if (this.current?.layers[0] === main) { this.current = null; if (then) this.play(then); } };
    }
  }

  stop({ fade = 0.6 } = {}) {
    if (!this.current) return;
    const now = this.ctx.currentTime;
    for (const l of this.current.layers) {
      l.gain.gain.cancelScheduledValues(now);
      l.gain.gain.setTargetAtTime(0, now, fade / 3);
      l.src.stop(now + fade * 2);
    }
    this.current = null;
  }

  // back to calm for the next question: the intense layer fades out and is dropped
  reset() {
    this.level = 0;
    if (!this.ctx) return;
    const [main, intense] = this.current?.layers || [];
    if (intense) {
      const now = this.ctx.currentTime;
      intense.gain.gain.setTargetAtTime(0, now, 0.3);
      intense.src.stop(now + 1.5);
      main.gain.gain.setTargetAtTime(1, now, 0.3);
      main.src.playbackRate.setTargetAtTime(1, now, 0.3);
      this.current.layers.length = 1;
    }
    this.tone.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.2);
    for (const l of this.current?.layers || []) l.src.playbackRate.setTargetAtTime(1, this.ctx.currentTime, 0.3);
    this.riser?.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  // Drive the music from the question timer
  setTimeLeft(left, total) {
    if (!this.current || !this.ctx) return;
    const level = left <= total * PANIC_AT ? 1 : 0;
    const now = this.ctx.currentTime;
    if (level !== this.level) {
      this.level = level;
      if (level) this.enterIntense();
      else this.applyLevel();
      if (level) this.startRiser(left);
    }
    // panic: heartbeat twice a second and a clock tick on each whole second
    if (level && now >= this.nextBeat) {
      this.thump(1);
      if (Math.abs(left - Math.round(left)) < 0.3) this.tick();
      this.nextBeat = now + 0.5;
    }
  }

  // the intense version enters from its loop start (past its intro); the calm one keeps running muted
  async enterIntense() {
    const cur = this.current, twinName = cur.name + '_intense';
    const twin = this.manifest[twinName] && await this.load(twinName);
    if (twin && this.current === cur && this.level && cur.layers.length === 1)
      cur.layers.push(this.layer(twinName, twin, 0, this.ctx.currentTime, this.manifest[twinName].loopStart || 0));
    this.applyLevel();
  }
  applyLevel() {
    if (!this.current) return;
    const now = this.ctx.currentTime, [main, intense] = this.current.layers;
    for (const l of this.current.layers) l.src.playbackRate.setTargetAtTime(this.level ? 1.12 : 1, now, 0.4);
    if (intense) {
      main.gain.gain.setTargetAtTime(this.level ? 0 : 1, now, 0.25);
      intense.gain.gain.setTargetAtTime(this.level ? 1 : 0, now, 0.25);
    }
  }

  timeUp() {
    if (!this.ctx) return;
    this.riser?.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.thump(1.4, 45);
    this.noiseBurst(0.6, 0.5);
    // duck the music while the result is revealed
    for (const l of this.current?.layers || []) l.src.playbackRate.setTargetAtTime(1, this.ctx.currentTime, 0.2);
    this.tone.frequency.setTargetAtTime(900, this.ctx.currentTime, 0.1);
    this.level = 0;
  }

  // ---- synthesized layers (no files needed)
  thump(strength = 1, freq = 70) {
    const t = this.ctx.currentTime;
    for (const [dt, v] of [[0, 1], [0.16, 0.6]]) {       // lub-dub
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.setValueAtTime(freq * 1.8, t + dt);
      o.frequency.exponentialRampToValueAtTime(freq, t + dt + 0.09);
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.9 * strength * v, t + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.22);
      o.connect(g).connect(this.master);
      o.start(t + dt); o.stop(t + dt + 0.25);
    }
  }
  tick() {
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = 1760;
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.06);
  }
  noiseBuffer(seconds) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  startRiser(seconds) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noiseBuffer(Math.max(1, seconds + 1));
    f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + seconds);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + seconds);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + seconds + 0.3);
    this.riser = { src, gain: g };
  }
  noiseBurst(vol, len) {
    const t = this.ctx.currentTime, src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.noiseBuffer(len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(g).connect(this.master); src.start(t);
  }
}
window.Music = Music;
window.Music.PANIC_AT = PANIC_AT;
