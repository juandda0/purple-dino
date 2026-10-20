// Piezas visuales compartidas: tipografía del juego, textos que golpean, celular y sacudidas.
import { useEffect, useState } from 'react';
import { continueRender, delayRender, Easing, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS } from './timeline.js';

export const C = {
  ink: '#120A24', panel: '#1C1236', line: '#7C4DFF', dino: '#8B5CF6', white: '#F2EEFF',
  yellow: '#FFD23F', red: '#FF4D5E', green: '#2BD17E',
};
export const DISP = '"Press Start 2P", monospace';
export const BODY = '"Pixelify Sans", sans-serif';

/** Carga las fuentes del juego antes del primer cuadro. */
export function useFonts() {
  const [handle] = useState(() => delayRender('fuentes'));
  useEffect(() => {
    const fonts = [
      new FontFace('Press Start 2P', `url(${staticFile('fonts/press-start-2p-latin-400-normal.woff2')})`),
      new FontFace('Pixelify Sans', `url(${staticFile('fonts/pixelify-sans-latin-400-normal.woff2')})`, { weight: '400' }),
      new FontFace('Pixelify Sans', `url(${staticFile('fonts/pixelify-sans-latin-700-normal.woff2')})`, { weight: '700' }),
    ];
    Promise.all(fonts.map((f) => f.load().then(() => document.fonts.add(f)))).then(() => continueRender(handle));
  }, [handle]);
}

// Contorno pixelado duro (como .outline del juego) + sombra caída.
export const outline = (px, color = C.ink) => {
  const s = [];
  for (let x = -px; x <= px; x += px) for (let y = -px; y <= px; y += px) if (x || y) s.push(`${x}px ${y}px 0 ${color}`);
  return [...s, `0 ${px * 2.5}px 0 ${color}`].join(',');
};

const POS = { top: { top: 120 }, bottom: { bottom: 150 }, center: { top: 470 } };

/** Texto que entra de golpe (escala con rebote y un leve giro) y sale rápido. */
export function Caption({ text, pos = 'top', accent = false, dur }) {
  const f = useCurrentFrame();
  const inn = spring({ frame: f, fps: FPS, config: { damping: 11, stiffness: 260, mass: 0.6 } });
  const out = interpolate(f, [dur - 4, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = accent ? 64 : 48;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', ...POS[pos] }}>
      <div style={{
        fontFamily: DISP, fontSize: size, lineHeight: 1.15, color: accent ? C.yellow : C.white, textAlign: 'center',
        textShadow: outline(4), opacity: out, padding: '18px 30px 22px', background: 'rgba(18,10,36,.9)',
        boxShadow: `inset 0 0 0 5px ${accent ? C.yellow : C.line}, 0 10px 0 #000`,
        transform: `scale(${interpolate(inn, [0, 1], [1.7, 1])}) rotate(${interpolate(inn, [0, 1], [-6, accent ? -2 : 0])}deg)`,
      }}>{text}</div>
    </div>
  );
}

/** Celular con la grabación de la app del alumno. pos: right | center. */
export function Phone({ srcFrom, rate = 1, pos = 'right' }) {
  const f = useCurrentFrame();
  const inn = spring({ frame: f, fps: FPS, config: { damping: 14, stiffness: 180 } });
  const h = pos === 'center' ? 920 : 860;
  const w = Math.round((h * 390) / 844);
  const left = pos === 'center' ? 960 - w / 2 : 1880 - w;
  return (
    <div style={{
      position: 'absolute', left: left - 18, top: (1080 - h) / 2 - 18, width: w + 36, height: h + 36, borderRadius: 56,
      background: '#0B0716', boxShadow: `0 0 0 4px ${C.line}, 0 30px 60px rgba(0,0,0,.6)`, padding: 18,
      transform: `translateX(${interpolate(inn, [0, 1], [700, 0])}px) rotate(${interpolate(inn, [0, 1], [14, pos === 'center' ? 0 : 3])}deg)`,
    }}>
      <div style={{ width: w, height: h, borderRadius: 40, overflow: 'hidden', background: C.ink }}>
        <OffthreadVideo src={staticFile('rec/win-phone.mp4')} trimBefore={Math.round(srcFrom * FPS)} playbackRate={rate} muted style={{ width: w, height: h, objectFit: 'cover' }} />
      </div>
    </div>
  );
}

/** Sacudida que decae (en cuadros desde el golpe). */
export const shakeAt = (f, at, amp = 22, len = 12) => {
  const d = f - at;
  if (d < 0 || d > len) return { x: 0, y: 0 };
  const k = amp * (1 - d / len);
  return { x: Math.sin(d * 2.7) * k, y: Math.cos(d * 3.9) * k * 0.7 };
};

/** Destello blanco (o del color dado) en el cuadro `at`. */
export function Flash({ at, color = '#fff', peak = 0.85 }) {
  const f = useCurrentFrame();
  const o = interpolate(f - at, [0, 1, 6], [0, peak, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  return <div style={{ position: 'absolute', inset: 0, background: color, opacity: f < at ? 0 : o, pointerEvents: 'none' }} />;
}

/** Sprite por cuadros (hoja horizontal), pixelado. */
export function SpriteSheet({ src, frames, fw, fh, scale, fps = 6, style }) {
  const f = useCurrentFrame();
  const { fps: vfps } = useVideoConfig();
  const i = Math.floor((f / vfps) * fps) % frames;
  return (
    <div style={{
      width: fw * scale, height: fh * scale, backgroundImage: `url(${staticFile(src)})`, backgroundSize: `${fw * frames * scale}px ${fh * scale}px`,
      backgroundPosition: `${-i * fw * scale}px 0`, imageRendering: 'pixelated', ...style,
    }} />
  );
}
