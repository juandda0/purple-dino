// Tiny RGBA pixel helpers on top of sharp, for editing third-party pixel art.
const sharp = require('sharp');

class Img {
  constructor(w, h, data) {
    this.w = w; this.h = h;
    this.d = data || Buffer.alloc(w * h * 4);
  }
  static async load(file) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return new Img(info.width, info.height, Buffer.from(data));
  }
  async save(file) {
    await sharp(this.d, { raw: { width: this.w, height: this.h, channels: 4 } }).png().toFile(file);
    return this;
  }
  clone() { return new Img(this.w, this.h, Buffer.from(this.d)); }
  i(x, y) { return (y * this.w + x) * 4; }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) {
    if (!this.in(x, y)) return 0;
    const i = this.i(x, y);
    return ((this.d[i] << 24) | (this.d[i + 1] << 16) | (this.d[i + 2] << 8) | this.d[i + 3]) >>> 0;
  }
  hex(x, y) {
    const v = this.get(x, y);
    if ((v & 255) === 0) return null;
    return '#' + (v >>> 8).toString(16).padStart(6, '0');
  }
  set(x, y, c) {
    if (!this.in(x, y)) return;
    const i = this.i(x, y);
    if (c == null) { this.d.writeUInt32BE(0, i); return; }
    const v = typeof c === 'string' ? parseHex(c) : c;
    this.d.writeUInt32BE(v >>> 0, i);
  }
  alpha(x, y) { return this.in(x, y) ? this.d[this.i(x, y) + 3] : 0; }
  forEach(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) fn(x, y); }

  crop(x0, y0, w, h) {
    const o = new Img(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.set(x, y, this.get(x0 + x, y0 + y));
    return o;
  }
  mirror() {
    const o = new Img(this.w, this.h);
    this.forEach((x, y) => o.set(this.w - 1 - x, y, this.get(x, y)));
    return o;
  }
  // map: {'#rrggbb': '#rrggbb' | null}
  recolor(map) {
    const o = this.clone();
    o.forEach((x, y) => {
      const h = o.hex(x, y);
      if (h && h in map) o.set(x, y, map[h] == null ? null : parseHex(map[h]) | (o.alpha(x, y) & 255));
    });
    return o;
  }
  // paste src at (dx,dy); only opaque pixels
  blit(src, dx, dy) {
    src.forEach((x, y) => { if (src.alpha(x, y) > 0) this.set(dx + x, dy + y, src.get(x, y)); });
    return this;
  }
  trim() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    this.forEach((x, y) => { if (this.alpha(x, y) > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
    if (x1 < 0) return { img: new Img(1, 1), x: 0, y: 0 };
    return { img: this.crop(x0, y0, x1 - x0 + 1, y1 - y0 + 1), x: x0, y: y0 };
  }
  pad(l, t, r, b) { return new Img(this.w + l + r, this.h + t + b).blit(this, l, t); }
  // nearest-neighbour integer upscale
  scale(n) {
    const o = new Img(this.w * n, this.h * n);
    o.forEach((x, y) => o.set(x, y, this.get(Math.floor(x / n), Math.floor(y / n))));
    return o;
  }
  // Scale2x / EPX: doubles resolution while keeping pixel-art edges
  scale2x() {
    const o = new Img(this.w * 2, this.h * 2);
    this.forEach((x, y) => {
      const P = this.get(x, y), A = this.get(x, y - 1), B = this.get(x + 1, y), C = this.get(x - 1, y), D = this.get(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      o.set(2 * x, 2 * y, e0); o.set(2 * x + 1, 2 * y, e1); o.set(2 * x, 2 * y + 1, e2); o.set(2 * x + 1, 2 * y + 1, e3);
    });
    return o;
  }
  // AdvMAME3x / Scale3x
  scale3x() {
    const o = new Img(this.w * 3, this.h * 3);
    this.forEach((x, y) => {
      const g = (dx, dy) => this.get(x + dx, y + dy);
      const A = g(-1, -1), B = g(0, -1), C = g(1, -1), D = g(-1, 0), E = g(0, 0), F = g(1, 0), G = g(-1, 1), H = g(0, 1), I = g(1, 1);
      let e = [E, E, E, E, E, E, E, E, E];
      if (B !== H && D !== F) {
        e[0] = D === B ? D : E;
        e[1] = (D === B && E !== C) || (B === F && E !== A) ? B : E;
        e[2] = B === F ? F : E;
        e[3] = (D === B && E !== G) || (D === H && E !== A) ? D : E;
        e[5] = (B === F && E !== I) || (H === F && E !== C) ? F : E;
        e[6] = D === H ? D : E;
        e[7] = (D === H && E !== I) || (H === F && E !== G) ? H : E;
        e[8] = H === F ? F : E;
      }
      for (let k = 0; k < 9; k++) o.set(3 * x + (k % 3), 3 * y + Math.floor(k / 3), e[k]);
    });
    return o;
  }
  // every opaque pixel becomes `color`, keeping its alpha
  tint(color, alphaMul = 1) {
    const o = this.clone();
    const v = parseHex(color);
    o.forEach((x, y) => {
      const a = o.alpha(x, y);
      if (a > 0) o.set(x, y, (v & 0xffffff00) | Math.round(a * alphaMul));
    });
    return o;
  }
  // hue rotate (degrees), saturation and lightness multipliers
  adjust({ hue = 0, sat = 1, light = 1 } = {}) {
    const o = this.clone();
    o.forEach((x, y) => {
      const i = o.i(x, y);
      if (!o.d[i + 3]) return;
      let [h, s, l] = rgb2hsl(o.d[i], o.d[i + 1], o.d[i + 2]);
      h = (h + hue / 360 + 1) % 1; s = Math.min(1, s * sat); l = Math.min(1, l * light);
      const [r, g, b] = hsl2rgb(h, s, l);
      o.d[i] = r; o.d[i + 1] = g; o.d[i + 2] = b;
    });
    return o;
  }
  // 1px outline around opaque pixels (4-neighbour)
  outline(color) {
    const o = this.pad(1, 1, 1, 1);
    const src = o.clone();
    o.forEach((x, y) => {
      if (src.alpha(x, y) > 0) return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src.alpha(x + dx, y + dy) > 0)) o.set(x, y, color);
    });
    return o;
  }
}

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hsl2rgb(h, s, l) {
  if (!s) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
}

function parseHex(h) {
  const s = h.replace('#', '');
  const rgb = parseInt(s.slice(0, 6), 16);
  const a = s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255;
  return ((rgb << 8) | a) >>> 0;
}

// Horizontal strip of equal frames -> array of Img
async function frames(file, fw, fh) {
  const sheet = await Img.load(file);
  const out = [];
  for (let y = 0; y + fh <= sheet.h; y += fh)
    for (let x = 0; x + fw <= sheet.w; x += fw) out.push(sheet.crop(x, y, fw, fh));
  return out;
}

function strip(list) {
  const w = list.reduce((s, f) => s + f.w, 0), h = Math.max(...list.map(f => f.h));
  const o = new Img(w, h);
  let x = 0;
  for (const f of list) { o.blit(f, x, 0); x += f.w; }
  return o;
}

module.exports = { Img, frames, strip, parseHex };
