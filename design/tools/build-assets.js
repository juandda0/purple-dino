// Builds the game's pixel-art assets (design/assets/) from the third-party packs in design/assets-src/.
// Everything is normalised to the game's 320x180 base grid (1 px here = 5 px on the 1600x900 projector).
//   node tools/build-assets.js
const fs = require('fs');
const path = require('path');
const { Img, frames, strip } = require('./pixel');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'assets');
const out = (...p) => { const f = path.join(OUT, ...p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

// Hero palette, taken from the purple dino of the DinoCharacters pack (male/sena)
const HERO = { ink: '#1c1c1c', dark: '#633ad5', base: '#7b4cfe', deep: '#4a2aa8', belly: '#e8d1b5', bellyDark: '#d9be9e', crest: '#00b6ff' };

// ------------------------------------------------------------------ POV (Landlord player -> dino arms)
// Landlord's first-person knight: sword on the left, shield on the right, human skin.
// We mirror it (shield left, sword right), turn the skin into purple scales and add claws.
const SKIN = { '#e9b5a3': HERO.base, '#ba756a': HERO.dark };
const SKIN_COLS = new Set(Object.keys(SKIN));

// Scale texture on purple skin (in 3x space): small darker arcs in a staggered grid
function scales(img, mask) {
  img.forEach((x, y) => {
    if (!mask(x, y)) return;
    const row = Math.floor(y / 5), ox = (row % 2) * 3;
    const lx = (x + ox) % 6, ly = y % 5;
    if (ly === 4 && lx >= 1 && lx <= 4 && img.hex(x, y) === HERO.base) img.set(x, y, HERO.dark);
    if (ly === 3 && (lx === 0 || lx === 5) && img.hex(x, y) === HERO.base) img.set(x, y, HERO.dark);
  });
}

// Fill a mask with fill(x,y) and an ink outline on its border (like sprites.py Canvas.layer)
function layer(img, mask, fill, ink = HERO.ink) {
  for (const k of mask) {
    const [x, y] = k.split(',').map(Number);
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !mask.has(`${x + dx},${y + dy}`));
    img.set(x, y, edge ? ink : fill(x, y));
  }
}
function roundRect(x0, y0, x1, y1, r) {
  const m = new Set();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) m.add(`${x},${y}`);
  }
  return m;
}

// Repaint a human fist (3x space) as a dino fist: back of the hand + three thick scaly fingers
// wrapped around a grip on the left, each ending in a cream claw that hooks over the grip.
const CLAW_DOWN = ['...KKK.', '..KCCCK', '.KCCCCK', '.KcCCK.', '.KcCK..', '.KcK...', '..K....'];
const FIST_INK = '#2a1660';
function dinoFist(img, x0, y0, w, h) {
  const LIGHT = '#9b74ff';
  // back of the hand / wrist
  const back = roundRect(x0 + 9, y0, x0 + w - 1, y0 + h + 6, 6);
  layer(img, back, (x, y) => (x < x0 + 13 || y < y0 + 3 ? LIGHT : (x > x0 + w - 5 ? HERO.dark : HERO.base)), FIST_INK);
  scales(img, (x, y) => back.has(`${x},${y}`) && x > x0 + 12 && y > y0 + 3);
  // three fingers, drawn bottom-up so the upper finger overlaps the lower one
  const fh = Math.floor((h - 4) / 3) + 1;
  for (let k = 2; k >= 0; k--) {
    const fy = y0 + 2 + k * (fh - 1);
    const finger = roundRect(x0 + 2, fy, x0 + w - 8 - k, fy + fh, 4);
    layer(img, finger, (x, y) => (y <= fy + 1 ? LIGHT : y >= fy + fh - 2 ? HERO.dark : HERO.base), FIST_INK);
    // knuckle highlight
    img.set(x0 + w - 12 - k, fy + 2, '#c3a8ff');
    const cy = fy + 2;
    CLAW_DOWN.forEach((row, j) => [...row].forEach((ch, i) => {
      const px = x0 - 3 + i, py = cy + j;
      if (ch === 'K') img.set(px, py, FIST_INK);
      else if (ch === 'C') img.set(px, py, '#fff4e0');
      else if (ch === 'c') img.set(px, py, HERO.bellyDark);
    }));
  }
}

function eraseRect(img, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) img.set(x, y, null);
  return img;
}
function keepRect(img, x0, y0, x1, y1) {
  img.forEach((x, y) => { if (x < x0 || x > x1 || y < y0 || y > y1) img.set(x, y, null); });
  return img;
}

function dino(frame1x, fists = []) {
  const skinMask = new Img(frame1x.w, frame1x.h);
  frame1x.forEach((x, y) => { if (SKIN_COLS.has(frame1x.hex(x, y))) skinMask.set(x, y, '#ffffff'); });
  const big = frame1x.recolor(SKIN).scale3x();
  const mask3 = skinMask.scale(3);
  scales(big, (x, y) => mask3.alpha(x, y) > 0);
  for (const f of fists) dinoFist(big, ...f);
  return big;
}

async function buildPov() {
  const P = path.join(SRC, 'landlord/graphics/player');
  const idle = (await frames(path.join(P, 'Player_Idle.png'), 64, 64))[0].mirror();
  const atk = (await frames(path.join(P, 'Player_Attack.png'), 64, 64)).map(f => f.mirror());
  const def = (await frames(path.join(P, 'Player_Defend.png'), 64, 64)).map(f => f.mirror());

  // Shield side (left). Idle: shield component lives in x 8..29.
  const shieldIdle = keepRect(idle.clone(), 0, 0, 31, 63);
  await dino(shieldIdle, [[63, 157, 28, 30]]).save(out('pov', 'shield_idle.png'));
  const blockFists = { 1: [88, 166, 28, 26], 2: [85, 166, 28, 26] };
  for (const i of [1, 2]) {
    const f = keepRect(def[i].clone(), 0, 0, 47, 63);
    await dino(f, [blockFists[i]]).save(out('pov', `shield_block_${i}.png`));
  }

  // Shield damage states (design doc §3.4): full -> scratched -> cracked -> split -> gone
  const base = await Img.load(out('pov', 'shield_idle.png'));
  const STEEL = new Set(['#ffffff', '#dae0ea', '#8b93af', '#b3b9d1', '#6d758d']);
  const isSteel = (im, x, y) => STEEL.has(im.hex(x, y));
  const line = (im, pts, col, hi) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let t = 0; t <= n; t++) {
        const x = Math.round(ax + (bx - ax) * t / n), y = Math.round(ay + (by - ay) * t / n);
        if (isSteel(im, x, y) || im.hex(x, y) === col) {
          im.set(x, y, col);
          if (hi && isSteel(im, x + 1, y)) im.set(x + 1, y, hi);
        }
      }
    }
  };
  const SCRATCHES = [[[34, 160], [44, 152]], [[40, 172], [52, 163]], [[58, 148], [66, 143]], [[30, 178], [37, 173]]];
  const CRACK_A = [[47, 139], [50, 148], [45, 156], [49, 165], [43, 176], [46, 186]];
  const CRACK_B = [[49, 165], [38, 168], [31, 175]];
  const CRACK_C = [[50, 148], [60, 151], [67, 147]];
  const states = [];
  states[0] = base.clone();
  states[1] = base.clone();
  for (const s of SCRATCHES) line(states[1], s, '#e9edf5');
  states[2] = states[1].clone();
  line(states[2], CRACK_A, '#2f3442', '#c9cfdf');
  line(states[2], CRACK_B, '#2f3442', '#c9cfdf');
  states[3] = states[2].clone();
  line(states[3], CRACK_C, '#2f3442', '#c9cfdf');
  // split: the whole left half is gone, broken along the main crack
  const PURPLE = new Set(['#7b4cfe', '#633ad5', '#9b74ff', '#c3a8ff', '#2a1660', '#fff4e0', '#e8d1b5', '#d9be9e']);
  states[3].forEach((x, y) => {
    if (!states[3].alpha(x, y) || PURPLE.has(states[3].hex(x, y))) return;
    const pts = CRACK_A;
    let cx = y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if (y >= ay && y <= by) cx = ax + (bx - ax) * (y - ay) / Math.max(1, by - ay);
    }
    if (x < cx - 1) states[3].set(x, y, null);
  });
  // gone: only the dino fist and forearm remain
  const arm = new Set();
  const A = [44, 218], B = [86, 174];
  const segDist = (x, y) => {
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const t = Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / (dx * dx + dy * dy)));
    return [Math.hypot(x - A[0] - dx * t, y - A[1] - dy * t), (x - A[0]) * -dy + (y - A[1]) * dx];
  };
  for (let y = 130; y < 192; y++) for (let x = 0; x < 110; x++) if (segDist(x, y)[0] <= 14) arm.add(`${x},${y}`);
  const armImg = new Img(192, 192);
  layer(armImg, arm, (x, y) => { const side = segDist(x, y)[1] / Math.hypot(42, 44); return side < -6 ? '#9b74ff' : side > 6 ? HERO.dark : HERO.base; }, FIST_INK);
  scales(armImg, (x, y) => arm.has(`${x},${y}`));
  states[4] = armImg;
  dinoFist(states[4], 63, 157, 28, 30);
  const names = ['full', 'scratched', 'cracked', 'split', 'gone'];
  for (let i = 0; i < 5; i++) await states[i].save(out('pov', `shield_${i}_${names[i]}.png`));

  // Sword side (right).
  const swordIdle = keepRect(idle.clone(), 32, 0, 63, 63);
  await dino(swordIdle, []).save(out('pov', 'sword_idle.png'));
  const atkFrames = [
    keepRect(atk[1].clone(), 32, 0, 63, 63),
    eraseRect(atk[2].clone(), 0, 58, 22, 63),
    eraseRect(atk[3].clone(), 0, 58, 22, 63),
    keepRect(atk[4].clone(), 32, 0, 63, 63),
  ];
  const atkFists = [[], [[62, 146, 30, 22]], [[59, 152, 30, 22]], []];
  const atkBig = atkFrames.map((f, i) => dino(f, atkFists[i]));
  for (let i = 0; i < atkBig.length; i++) await atkBig[i].save(out('pov', `sword_attack_${i + 1}.png`));
  // the swing arc is pure white in Landlord: split it into its own layer so it can be placed over the enemy
  for (let i = 0; i < atkBig.length; i++) {
    const arc = new Img(192, 192), arm = atkBig[i].clone();
    // white pixels not touching the blade, grouped; the big groups are the arc + its sparks
    const white = new Img(192, 192);
    atkBig[i].forEach((x, y) => {
      if (atkBig[i].hex(x, y) !== '#ffffff') return;
      const blade = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ['#b3b9d1', '#6d758d', '#4a5462'].includes(atkBig[i].hex(x + dx, y + dy)));
      const bladeEdge = y >= 160 && x < 130; // the blade's lower highlight row
      if (!blade && !bladeEdge) white.set(x, y, '#ffffff');
    });
    const kept = dropSpecks(white.clone(), 40);
    kept.forEach((x, y) => { if (kept.alpha(x, y)) { arc.set(x, y, '#ffffff'); arm.set(x, y, null); } });
    await arm.save(out('pov', `sword_attack_${i + 1}_arm.png`));
    // longer forearm (60 more rows continuing the diagonal) so the swing can be raised above the question panel
    const long = new Img(192, 252).blit(arm, 0, 0);
    for (let y = 192; y < 252; y++) for (let x = 0; x < 192; x++) {
      const sx = x - Math.round((y - 191) * 0.9);
      if (sx >= 0) long.set(x, y, arm.get(sx, 191 - ((y - 191) % 5)));
    }
    await long.save(out('pov', `sword_attack_${i + 1}_arm_long.png`));
    await arc.save(out('fx', `swing_arc_${i + 1}.png`));
  }
  await strip(atkBig).save(out('pov', 'sword_attack_strip.png'));
}

// ------------------------------------------------------------------ Dinos (DinoCharacters pack, 24x24 frames)
const DINO_DIR = path.join(SRC, 'dinos');
const AVATARS = ['female_sena', 'female_olaf', 'female_tard', 'female_loki', 'female_kira', 'female_cole',
  'female_mort', 'female_doux', 'female_nico', 'female_vita', 'female_mono', 'female_kuro'];
const ANIMS = ['idle', 'move', 'jump', 'hurt', 'dead', 'kick', 'bite', 'dash', 'avoid', 'scan'];

// Gold crown for the princess, drawn on top of the head (1x space, frame-relative)
function crown(img, x, y) {
  const C = ['Y.Y.Y', 'YYRYY', 'KKKKK'];
  C.forEach((row, j) => [...row].forEach((ch, i) => {
    const col = { K: '#382121', Y: '#ffd23f', R: '#e8434c' }[ch];
    if (col) img.set(x + i, y + j, col);
  }));
}
// Top of the head (first row with body colour), centred on it, to sit the crown on
function headTop(f, body) {
  for (let y = 0; y < f.h; y++) {
    const xs = [];
    for (let x = 0; x < f.w; x++) if (body.includes(f.hex(x, y))) xs.push(x);
    if (xs.length) return [Math.round((xs[0] + xs[xs.length - 1]) / 2), y];
  }
  return [12, 0];
}

async function buildDinos() {
  // lobby avatars: first idle frame of 12 colours, trimmed
  for (const name of AVATARS) {
    const f = (await frames(path.join(DINO_DIR, name, 'idle.png'), 24, 24))[0];
    await f.trim().img.save(out('dinos', `avatar_${name.split('_')[1]}.png`));
  }
  // hero (purple, male/sena) and princess (pink, female/kira): every animation as a strip,
  // at 1x (24px frames) and Scale3x (72px frames) to sit on the 320x180 grid at a "close" distance
  for (const [who, src] of [['hero', 'male_sena'], ['princess', 'female_kira']]) {
    for (const anim of ANIMS) {
      const file = path.join(DINO_DIR, src, anim + '.png');
      if (!fs.existsSync(file)) continue;
      let fr = await frames(file, 24, 24);
      if (who === 'princess') {
        fr = fr.map(f => { const g = new Img(24, 28).blit(f, 0, 4); const [hx, hy] = headTop(g, ['#f489f6', '#d648d9']); crown(g, hx - 2, hy - 3); return g.mirror(); });
      }
      await strip(fr).save(out('dinos', `${who}_${anim}.png`));
      await strip(fr.map(f => f.scale3x())).save(out('dinos', `${who}_${anim}_3x.png`));
    }
  }
}

// ------------------------------------------------------------------ Backgrounds
// Sky = layered clouds from "Ocean and Clouds" (576x324, cropped to 320x180 at 1:1 so the pixels match),
// ground = our own terrain from sprites.py (*_fg.svg, drawn without sky).
async function oceanSky(n, x0, y0, opts) {
  const dir = path.join(SRC, 'ocean', `Ocean_${n}`);
  const sky = new Img(576, 324);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()) {
    const layerImg = await Img.load(path.join(dir, f));
    if (layerImg.w === 576) sky.blit(layerImg, 0, 0);
  }
  const crop = sky.crop(x0, y0, 320, 180);
  return opts ? crop.adjust(opts) : crop;
}
async function svgFg(name) {
  const sharp = require('sharp');
  const { data, info } = await sharp(path.join(ROOT, 'sprites', name + '.svg'))
    .resize(320, 180, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return new Img(info.width, info.height, Buffer.from(data));
}
async function buildBackgrounds() {
  const BG = [
    // name, ocean set, crop x/y, colour tweak, foreground
    ['battle', 5, 100, 22, { hue: 8, sat: 1.05 }, 'battle_fg'],     // dusk: pink cumulus over the forest
    ['menu', 6, 256, 40, { hue: 32, sat: 0.9, light: 0.95 }, 'menu_fg'], // night: moon + clouds, pushed to violet
    ['victory', 8, 120, 6, null, 'ground_fg'],                       // dawn; the Sunny Castle goes on top (below)
    ['gameover', 6, 0, 130, { hue: 40, sat: 0.6, light: 0.6 }, 'night_fg'],
  ];
  for (const [name, n, x, y, opts, fg] of BG) {
    const sky = await oceanSky(n, x, y, opts);
    await sky.save(out('bg', `${name}_sky.png`));
    const fgImg = await svgFg(fg);
    await fgImg.save(out('bg', `${name}_fg.png`));
    const full = sky.clone().blit(fgImg, 0, 0);
    // the freed castle (Sunny Castle #18), gate lined up with the path at x=160
    if (name === 'victory') {
      // the castle stands at the end of the path: cut it just below the gate and sit it on the horizon
      const castle = await Img.load(out('castles', 'sunny_18_cut.png'));
      castle.forEach((x, y) => { if (y > 131) castle.set(x, y, null); });
      full.blit(castle, 120, -2);
    }
    await full.save(out('bg', `${name}.png`));
  }
  // King Dread's cursed castle at sunset (Lamora, Scale2x -> 384x216, centre crop 320x180)
  const lamora = (await Img.load(out('castles', 'lamora.png'))).scale2x().crop(32, 18, 320, 180);
  await lamora.save(out('bg', 'title.png'));
  await lamora.adjust({ hue: -28, sat: 0.6, light: 0.45 }).save(out('bg', 'gameover_castle.png'));
}

// Steel shield bursting into shards (from the intact Landlord shield), for the "shield broken" beat
async function buildShatter() {
  const full = await Img.load(out('pov', 'shield_0_full.png'));
  const STEEL = new Set(['#ffffff', '#dae0ea', '#8b93af', '#b3b9d1', '#6d758d']);
  const C = [58, 166], N = 6;
  const o = new Img(192, 192);
  full.forEach((x, y) => {
    if (!STEEL.has(full.hex(x, y))) return;
    const a = Math.atan2(y - C[1], x - C[0]);
    const k = Math.floor(((a + Math.PI) / (2 * Math.PI)) * N);
    const mid = -Math.PI + (k + 0.5) * (2 * Math.PI / N);
    const d = 10 + (k % 2) * 6;
    o.set(Math.round(x + Math.cos(mid) * d), Math.round(y + Math.sin(mid) * d - 12), full.get(x, y));
  });
  // dark edges on every shard so the pieces read separately
  const edged = o.clone();
  o.forEach((x, y) => {
    if (!o.alpha(x, y)) return;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !o.alpha(x + dx, y + dy))) edged.set(x, y, '#2f3442');
  });
  await edged.trim().img.save(out('pov', 'shield_shards.png'));
}

// ------------------------------------------------------------------ Audio
// UI clicks from JDSherbert's Ultimate UI SFX Pack, battle hits + music from Landlord.
function buildAudio() {
  const A = [
    ['sfx/cursor_1.ogg', 'ui_hover.ogg'], ['sfx/select_1.ogg', 'ui_select.ogg'], ['sfx/cancel_1.ogg', 'ui_back.ogg'],
    ['sfx/popup_open_1.ogg', 'ui_popup.ogg'], ['sfx/error_1.ogg', 'ui_error.ogg'], ['sfx/swipe_1.ogg', 'ui_swipe.ogg'],
    ['landlord/sound/sfx/hit.wav', 'sword_swing.wav'], ['landlord/sound/sfx/hit2.wav', 'enemy_hit.wav'],
    ['landlord/sound/sfx/hurt.wav', 'shield_clank.wav'], ['landlord/sound/sfx/hurt2.wav', 'shield_break.wav'],
    ['landlord/sound/sfx/sfx_death.wav', 'enemy_defeated.wav'], ['landlord/sound/sfx/hurt3.wav', 'game_over.wav'],
    ['landlord/sound/sfx/coin.wav', 'combo.wav'], ['landlord/sound/sfx/select.wav', 'player_ready.wav'],
    ['landlord/sound/music/menu.ogg', 'music_menu.ogg'], ['landlord/sound/music/game.ogg', 'music_battle.ogg'],
  ];
  for (const [from, to] of A) fs.copyFileSync(path.join(SRC, from), out('audio', to));
}

// ------------------------------------------------------------------ Castles
// Pixel1992 "Sunny Castles" (1000x1480 = 100x148 art at 10x) and "Lamora" (960x540 = 192x108 at 5x).
// Story: Lamora is King Dread's castle under the shadow curse; a Sunny Castle is the same castle once freed.
const native = (img, k) => {
  const o = new Img(Math.floor(img.w / k), Math.floor(img.h / k));
  o.forEach((x, y) => o.set(x, y, img.get(x * k, y * k)));
  return o;
};
// Removes the sky: flood fill from the top/side edges through colours that appear in the sky band
function cutSky(img, bandRows = 6) {
  const sky = new Set();
  for (let y = 0; y < bandRows; y++) for (let x = 0; x < img.w; x++) sky.add(img.get(x, y));
  for (let y = 0; y < img.h * 0.6; y++) { sky.add(img.get(0, y)); sky.add(img.get(img.w - 1, y)); }
  const o = img.clone(), seen = new Uint8Array(img.w * img.h), st = [];
  const push = (x, y) => { if (img.in(x, y) && !seen[y * img.w + x] && sky.has(img.get(x, y))) { seen[y * img.w + x] = 1; st.push([x, y]); } };
  for (let x = 0; x < img.w; x++) push(x, 0);
  for (let y = 0; y < img.h * 0.6; y++) { push(0, y); push(img.w - 1, y); }
  while (st.length) {
    const [x, y] = st.pop();
    o.set(x, y, null);
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  return dropSpecks(o, 12);
}
// remove opaque islands smaller than `min` pixels (8-neighbour)
function dropSpecks(img, min) {
  const seen = new Uint8Array(img.w * img.h);
  img.forEach((sx, sy) => {
    if (!img.alpha(sx, sy) || seen[sy * img.w + sx]) return;
    const comp = [[sx, sy]], st = [[sx, sy]];
    seen[sy * img.w + sx] = 1;
    while (st.length) {
      const [x, y] = st.pop();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (img.in(nx, ny) && img.alpha(nx, ny) && !seen[ny * img.w + nx]) { seen[ny * img.w + nx] = 1; st.push([nx, ny]); comp.push([nx, ny]); }
      }
    }
    if (comp.length < min) for (const [x, y] of comp) img.set(x, y, null);
  });
  return img;
}
const SUNNY = [15, 18, 22, 24, 31, 33];
async function buildCastles() {
  const dir = path.join(SRC, 'castles');
  const lamora = native(await Img.load(path.join(dir, 'lamora.png')), 5);
  await lamora.save(out('castles', 'lamora.png'));
  for (const n of SUNNY) {
    const id = String(n).padStart(2, '0');
    const art = native(await Img.load(path.join(dir, `sunny_castle_${id}.png`)), 10);
    await art.save(out('castles', `sunny_${id}.png`));
    await cutSky(art).save(out('castles', `sunny_${id}_cut.png`));
  }
}

// ------------------------------------------------------------------ UI (Pixel UI pack 3)
async function buildUi() {
  const sheet = async n => Img.load(path.join(SRC, 'ui', n + '.png'));
  const s00 = await sheet('00'), s01 = await sheet('01'), s02 = await sheet('02'), s03 = await sheet('03'), s04 = await sheet('04');
  const save = (img, name) => img.save(out('ui', name + '.png'));

  // shield "lives": silver crest = shield still standing, hollow dark crest = lost
  const crestFull = s01.crop(226, 4, 44, 40).blit(s01.crop(230, 56, 36, 32), 4, 4);
  await save(crestFull, 'crest_full');
  await save(s01.crop(226, 4, 44, 40).adjust({ sat: 0, light: 0.45 }), 'crest_empty');
  // purple versions (brand colour) of the blue crest and winged emblem
  const purple = { hue: 68, sat: 0.9 };
  await save(s01.crop(178, 4, 44, 40).blit(s01.crop(182, 56, 36, 32), 4, 4).adjust(purple), 'crest_purple');
  await save(s01.crop(176, 100, 80, 40).adjust(purple), 'emblem_purple');
  await save(s01.crop(80, 100, 80, 40), 'emblem_red');

  // stars (combo / rating)
  await save(s00.crop(135, 135, 18, 17), 'star_full');
  await save(s00.crop(7, 135, 18, 17), 'star_empty');
  // enemy HP: silver frame + red fill (one bar per hit)
  await save(s04.crop(3, 67, 42, 11), 'hp_frame');
  await save(s04.crop(55, 70, 34, 5), 'hp_fill');
  await save(s04.crop(295, 70, 34, 5), 'hp_empty');
  // countdown ring (12 dots): 5 steps from full to empty
  for (let i = 0; i < 5; i++) await save(s03.crop(i * 48, 96, 48, 48), `timer_${i}`);
  // pixel frames for panels (9-slice via CSS border-image)
  for (const [i, x] of [[0, 132], [1, 164], [2, 196], [3, 228]]) await save(s02.crop(x, 100, 24, 24), `frame_purple_${i}`);
  // arcade buttons in the four answer colours
  for (const [name, y] of [['blue', 3], ['yellow', 19], ['red', 35], ['green', 51]]) await save(s00.crop(218, y, 18, 13), `button_${name}`);
}

// ------------------------------------------------------------------ FX (Free Smoke Fx Pixel 07: 16 frames x 64px per row)
async function buildFx() {
  const sheet = await Img.load(path.join(SRC, 'smoke', 'smoke07.png'));
  const row = r => Array.from({ length: 16 }, (_, i) => sheet.crop(i * 64, r * 64, 64, 64));
  const FX = [
    // name, row, colour: shadow smoke is near-black violet, hits are warm
    ['shadow_puff', 16, '#2a1748'],   // enemy defeated -> poof
    ['shadow_burst', 3, '#1d1033'],   // dark smoke aura / lunge
    ['shadow_swirl', 8, '#6b3fb8'],   // purple rim swirl (boss)
    ['hit_ring', 12, '#ffd23f'],      // sword impact ring
    ['hit_slash', 13, '#ffffff'],     // diagonal slash streak
    ['dust', 6, '#c9b8a0'],           // walking dust
  ];
  // shadow smoke gets the same violet rim light as the shadow dinosaurs
  const rim = (f, name) => (name.startsWith('shadow_') && name !== 'shadow_swirl' ? f.outline('#6b3fb8').crop(1, 1, 64, 64) : f);
  for (const [name, r, col] of FX) await strip(row(r).map(f => rim(f.tint(col), name))).save(out('fx', name + '.png'));
}

// ------------------------------------------------------------------ gallery page for the mockups
function writeGallery() {
  const sharpMeta = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
  const groups = ['pov', 'dinos', 'castles', 'bg', 'ui', 'fx'].map(dir => {
    const files = fs.readdirSync(path.join(OUT, dir)).filter(f => f.endsWith('.png')).sort();
    const cells = files.map(f => {
      const { w, h } = sharpMeta(path.join(OUT, dir, f));
      const k = Math.max(1, Math.min(6, Math.floor(320 / Math.max(w, h))));
      const dw = Math.min(w * k, 640), dh = Math.round(h * dw / (w * k) * k);
      return `<figure><div class="img"><img src="../assets/${dir}/${f}" width="${dw}" height="${dh}" alt="${f}"></div><figcaption>${f} · ${w}×${h}</figcaption></figure>`;
    }).join('');
    return `<div class="label">${dir.toUpperCase()}</div><main>${cells}</main>`;
  }).join('');
  const audio = fs.readdirSync(path.join(OUT, 'audio')).sort()
    .map(f => `<figure><figcaption>${f}</figcaption><audio controls preload="none" src="../assets/audio/${f}"></audio></figure>`).join('');
  fs.writeFileSync(path.join(ROOT, 'mockups', 'assets.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Purple Dino · Assets</title><link rel="stylesheet" href="mockups.css?v=3">
<style>main{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end}figure{display:flex;flex-direction:column;gap:10px;align-items:center;padding:14px;background:#1A1433;border:3px solid #3B2F63}
.img{display:flex;align-items:flex-end;justify-content:center;background:repeating-conic-gradient(#2a2245 0 25%,#221b3a 0 50%) 0 0/16px 16px}img{image-rendering:pixelated;display:block;max-width:640px;height:auto}figcaption{font-family:var(--display);font-size:9px;color:var(--muted)}</style></head>
<body><header class="page-head"><h1>PURPLE DINO · ASSETS</h1>
<nav><a href="index.html">ÍNDICE</a><a href="proyector.html">PROYECTOR</a><a href="celular.html">CELULAR</a><a href="sprites.html">SPRITES</a><a class="on" href="assets.html">ASSETS</a><a href="musica.html">MÚSICA</a></nav></header>
<p class="page-sub">Generados por <code>design/tools/build-assets.js</code> a partir de los packs de <code>design/assets-src/</code> (ver CREDITS.md). Tiras animadas = frames uno al lado del otro.</p>
${groups}<div class="label">AUDIO</div><main>${audio}</main></body></html>
`);
}

(async () => {
  await buildPov();
  await buildShatter();
  await buildCastles();
  buildAudio();
  await buildUi();
  await buildFx();
  await buildDinos();
  await buildBackgrounds();
  writeGallery();
  console.log('assets built ->', path.relative(process.cwd(), OUT));
})();
