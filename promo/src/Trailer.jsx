// El tráiler: bloques del guion en orden (tomas reales o escenas de lore), textos, voz, música y efectos.
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Bestias, Cierre, Ingles, Rey } from './Lore.jsx';
import { FPS, FRENAZO, LEAD, SUBS, TIMELINE, TRAMOS } from './timeline.js';
import { BODY, C, Caption, DISP, Flash, Phone, shakeAt, useFonts } from './ui.jsx';

const fr = (s) => Math.round(s * FPS);
const span = (a, b) => ({ from: fr(a), durationInFrames: Math.max(1, fr(b) - fr(a)) });
const ESCENA = { rey: Rey, bestias: Bestias, ingles: Ingles };

// Momentos en que habla el narrador (la música baja ahí).
const VOZ = TIMELINE.map((b) => [b.start + LEAD, b.start + LEAD + b.voz.dur]);
const duck = (t) => {
  const d = Math.min(...VOZ.map(([a, z]) => (t < a ? a - t : t > z ? t - z : 0)));
  // sube despacio en las pausas cortas entre frases (si no, la música «bombea» justo antes de cada corte)
  // bajo la voz la música queda ~10 dB por debajo; en las pausas sube y llena el hueco entre frases
  return interpolate(d, [0, 0.45], [0.5, 0.85], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

function Toma({ s }) {
  const f = useCurrentFrame();
  const len = fr(s.to - s.from);
  const hit = s.word ? fr(s.anchor - s.from) : 0;
  const punch = interpolate(f, [0, 6], [1.08, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const drift = interpolate(f, [0, len], [1, 1.035]);
  const z = s.zoom ?? { s: 1, x: 960, y: 540 };
  const sh = s.shake ? shakeAt(f, hit) : { x: 0, y: 0 };
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: C.ink }}>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${z.s * punch * drift})`, transformOrigin: `${z.x}px ${z.y}px` }}>
        <OffthreadVideo src={staticFile(`rec/${s.src}.mp4`)} trimBefore={fr(s.srcFrom)} playbackRate={s.rate} muted style={{ width: 1920, height: 1080 }} />
      </AbsoluteFill>
      {s.flash ? <Flash at={hit} /> : null}
      {s.phone ? <Phone srcFrom={s.phone.srcFrom} rate={s.phone.rate} pos={s.phone.pos} /> : null}
    </AbsoluteFill>
  );
}

function Bloque({ b }) {
  const Escena = ESCENA[b.scene];
  return (
    <AbsoluteFill>
      {Escena ? <Escena b={b} /> : null}
      {b.shots.map((s, i) => (
        <Sequence key={i} {...span(s.from, s.to)}>
          <Toma s={s} />
        </Sequence>
      ))}
      {b.scene === 'cierre' ? <Cierre b={b} len={fr(b.dur)} /> : null}
      {b.captions.map((c, i) => (
        <Sequence key={`c${i}`} {...span(c.from, c.to)}>
          <Caption text={c.text} pos={c.pos} accent={c.accent} dur={fr(c.to - c.from)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

// Un tramo de música: arranca en su tiempo fuerte (m.trackFrom), con el volumen igualado (m.gain) y los
// fundidos que calculó el timeline (cortes secos en la barra entre pistas en loop, colas para las jingles).
function Musica({ m }) {
  const len = fr(m.to - m.from);
  const fi = Math.max(1, fr(m.fadeIn));
  const fo = Math.max(1, fr(m.fadeOut));
  return (
    <Audio
      src={staticFile(`audio/${m.file}`)}
      trimBefore={fr(m.trackFrom)}
      volume={(f) => m.gain * duck(m.from + f / FPS) * interpolate(f, [0, fi, len - fo, len], [m.fadeIn ? 0 : 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
    />
  );
}

/** Frenazo de cinta al final de la victoria (public/audio/frenazo.wav, de scripts/frenazo.mjs). */
function Frenazo({ m }) {
  return <Audio src={staticFile('audio/frenazo.wav')} volume={(f) => m.gain * duck(m.frenazo.from + f / FPS)} />;
}

// soloMusica: sin voz ni efectos (para revisar la mezcla de la música: --props='{"soloMusica":true}')
export function Trailer({ soloMusica = false }) {
  useFonts();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {TIMELINE.map((b) => (
        <Sequence key={b.id} name={b.id} {...span(b.start, b.start + b.dur)}>
          <Bloque b={b} />
        </Sequence>
      ))}
      {TRAMOS.map((m, i) => (
        <Sequence key={`m${i}`} name={`música ${m.key}`} {...span(m.from, m.to)}>
          <Musica m={m} />
        </Sequence>
      ))}
      {TRAMOS.filter((m) => m.frenazo).map((m) => (
        <Sequence key="frenazo" name="frenazo" {...span(m.frenazo.from, m.frenazo.from + FRENAZO + 0.05)}>
          <Frenazo m={m} />
        </Sequence>
      ))}
      {!soloMusica && TIMELINE.map((b) => (
        <Sequence key={`v${b.id}`} name={`voz ${b.id}`} from={fr(b.start + LEAD)}>
          <Audio src={staticFile(`voz/clips/${b.id}.wav`)} volume={1} />
        </Sequence>
      ))}
      {!soloMusica && TIMELINE.flatMap((b) => b.shots.flatMap((s) => s.sfx.map((x, i) => (
        <Sequence key={`${b.id}-${s.from}-${i}`} from={fr(b.start + x.t)}>
          <Audio src={staticFile(`sfx/${x.file}`)} volume={x.vol} />
        </Sequence>
      ))))}
      {SUBS.map((x, i) => (
        <Sequence key={`s${i}`} name={`sub ${x.text}`} {...span(x.from, x.to)}>
          <Subtitulo text={x.text} />
        </Sequence>
      ))}
      {TIMELINE[0].guia ? (
        <div style={{ position: 'absolute', right: 18, top: 14, fontFamily: DISP, fontSize: 14, color: '#fff', opacity: 0.6, textShadow: '0 2px 0 #000' }}>
          VOZ GUÍA
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

/** Subtítulo en inglés, abajo al centro (para quien vea el tráiler sin sonido). */
function Subtitulo({ text }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, display: 'flex', justifyContent: 'center' }}>
      <div translate="no" style={{ maxWidth: 1300, padding: '6px 20px 9px', background: 'rgba(8,4,18,.8)', fontFamily: BODY, fontWeight: 700, fontSize: 44, lineHeight: 1.2, color: C.white, textAlign: 'center' }}>
        {text}
      </div>
    </div>
  );
}
