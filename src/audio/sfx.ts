// Sound effects (projector only): JDSherbert UI SFX + Landlord battle hits, in /assets/audio.
const FILES = {
  hover: 'ui_hover.ogg',
  select: 'ui_select.ogg',
  back: 'ui_back.ogg',
  popup: 'ui_popup.ogg',
  error: 'ui_error.ogg',
  swing: 'sword_swing.wav',
  enemyHit: 'enemy_hit.wav',
  clank: 'shield_clank.wav',
  shieldBreak: 'shield_break.wav',
  enemyDefeated: 'enemy_defeated.wav',
  combo: 'combo.wav',
  ready: 'player_ready.wav',
} as const;

export type Sfx = keyof typeof FILES;

const cache = new Map<Sfx, HTMLAudioElement>();
let muted = false;

export function setSfxMuted(value: boolean) {
  muted = value;
}

function base(name: Sfx) {
  let a = cache.get(name);
  if (!a) {
    a = new Audio(`/assets/audio/${FILES[name]}`);
    a.preload = 'auto';
    cache.set(name, a);
  }
  return a;
}

/** Fetch every effect once (lobby), so the first strike/clank plays on time. */
export function preloadSfx() {
  for (const name of Object.keys(FILES) as Sfx[]) base(name).load();
}

export function playSfx(name: Sfx, volume = 0.6) {
  if (muted) return;
  const original = base(name);
  // clone so the same sound can overlap (e.g. several players getting ready at once)
  const a = original.cloneNode() as HTMLAudioElement;
  a.volume = volume;
  void a.play().catch(() => undefined);
}
