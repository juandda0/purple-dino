// Escenas del lore hechas con los sprites y fondos del juego (no hay partida que grabar para esto).
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { FPS } from './timeline.js';
import { BODY, C, DISP, Flash, outline, shakeAt, SpriteSheet } from './ui.jsx';

const fr = (s) => Math.round(s * FPS);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const Fondo = ({ src, style }) => <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, imageRendering: 'pixelated', ...style }} />;
const Sfx = ({ at, file, vol = 1 }) => (at == null ? null : <Sequence from={at}><Audio src={staticFile(`sfx/${file}`)} volume={vol} /></Sequence>);

/** «Long ago, King Dread, the king of shadows, cursed the land... and caged the princess at his castle.» */
export function Rey({ b }) {
  const f = useCurrentFrame();
  const king = fr(b.wordAt('king') ?? 0.4);
  const cursed = fr(b.wordAt('cursed') ?? 2.5);
  const caged = fr(b.wordAt('caged') ?? 4);
  const rise = spring({ frame: f - king, fps: FPS, config: { damping: 16, stiffness: 90 } });
  const cage = spring({ frame: f - caged, fps: FPS, config: { damping: 12, stiffness: 200 } });
  const glow = 0.6 + 0.4 * Math.sin(f / 5);
  const sh = shakeAt(f, cursed, 26, 16);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${interpolate(f, [0, 240], [1.04, 1.14])})` }}>
        <Fondo src="bg/gameover_sky.png" />
        <Fondo src="bg/gameover_castle.png" style={{ transform: `translateY(${interpolate(f, [0, 240], [30, 0])}px)` }} />
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 35% 60%, rgba(120,20,40,.25), rgba(8,4,18,.75) 70%)' }} />
        <Img src={staticFile('sprites/enemy_king.svg')} style={{
          position: 'absolute', left: 140, top: 250, width: 864, height: 720,
          transform: `translateY(${interpolate(rise, [0, 1], [700, 0])}px)`,
          filter: `drop-shadow(0 0 ${30 * glow}px rgba(255,40,70,.8)) drop-shadow(0 0 4px #9A78E8)`,
        }} />
        <div style={{ position: 'absolute', left: 1260, top: 380, transform: `translateX(${interpolate(cage, [0, 1], [900, 0])}px)` }}>
          <SpriteSheet src="sprites/princess_idle_3x.png" frames={3} fw={72} fh={84} scale={3} fps={4} style={{ position: 'absolute', left: 80, top: 230 }} />
          <Img src={staticFile('sprites/cage.svg')} style={{ position: 'relative', width: 360, height: 480, imageRendering: 'pixelated' }} />
        </div>
      </AbsoluteFill>
      <Flash at={cursed} color="#9A78E8" peak={0.55} />
      <div style={{ position: 'absolute', left: 1000, top: 110, opacity: interpolate(f - king, [0, 4], [0, 1], clamp) }}>
        <div style={{ fontFamily: DISP, fontSize: 92, color: C.red, textShadow: outline(7), transform: `scale(${interpolate(spring({ frame: f - king, fps: FPS, config: { damping: 10, stiffness: 240 } }), [0, 1], [1.8, 1])})`, transformOrigin: 'left center' }}>KING DREAD</div>
        <div style={{ fontFamily: DISP, fontSize: 30, color: C.white, textShadow: outline(4), marginTop: 26, opacity: interpolate(f - fr(b.wordAt('shadows') ?? 1.5), [0, 3], [0, 1], clamp) }}>THE KING OF SHADOWS</div>
      </div>
      <div style={{ position: 'absolute', left: 1250, top: 900, fontFamily: DISP, fontSize: 30, color: '#FF9AD5', textShadow: outline(4), opacity: interpolate(f - fr(b.wordAt('princess') ?? 5), [0, 3], [0, 1], clamp) }}>THE PRINCESS</div>
      <Sfx at={king} file="shield_break.wav" vol={0.7} />
      <Sfx at={cursed} file="enemy_defeated.wav" vol={0.8} />
      <Sfx at={caged} file="shield_clank.wav" />
    </AbsoluteFill>
  );
}

const BESTIAS = [
  { word: ['raptor', 'shaderaptor', 'shade'], sprite: 'enemy_raptor', w: 360, h: 252, name: 'SHADE RAPTOR', scene: 'FOREST' },
  { word: ['nightwing', 'night'], sprite: 'enemy_ptero', w: 432, h: 240, name: 'NIGHTWING', scene: 'THE CAVE' },
  { word: ['mire', 'mirespine', 'spine'], sprite: 'enemy_spino', w: 420, h: 276, name: 'MIRE SPINE', scene: 'SWAMP' },
  { word: ['ashhorn', 'ash', 'horn', 'ashorn'], sprite: 'enemy_trike', w: 420, h: 264, name: 'ASHHORN', scene: 'VOLCANO' },
];

/** «Five shadow beasts guard the road. The Shade Raptor. Nightwing. Mire Spine. Ashhorn.» */
export function Bestias({ b }) {
  const f = useCurrentFrame();
  const times = BESTIAS.map((x, i) => fr(b.wordAt(x.word) ?? 2 + i * 0.8) - 2);
  const title = spring({ frame: f, fps: FPS, config: { damping: 12, stiffness: 220 } });
  const sh = times.reduce((acc, t) => { const s = shakeAt(f, t, 14, 8); return { x: acc.x + s.x, y: acc.y + s.y }; }, { x: 0, y: 0 });
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        <Fondo src="bg/battle.png" style={{ filter: 'brightness(.8) saturate(.9)', transform: `scale(${interpolate(f, [0, 200], [1.05, 1.15])})` }} />
        <Img src={staticFile('sprites/enemy_king.svg')} style={{ position: 'absolute', left: 560, top: 60, width: 800, height: 667, opacity: 0.22, filter: 'blur(1px) brightness(.5)' }} />
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(8,4,18,.7) 95%)' }} />
        {BESTIAS.map((x, i) => {
          const s = spring({ frame: f - times[i], fps: FPS, config: { damping: 11, stiffness: 260, mass: 0.7 } });
          const hit = interpolate(f - times[i], [0, 2, 7], [3, 3, 1], clamp);
          return f < times[i] ? null : (
            <div key={x.name} style={{ position: 'absolute', left: 30 + i * 470, top: 330, width: 430, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
              <div style={{ height: 300, display: 'flex', alignItems: 'flex-end' }}>
                <Img src={staticFile(`sprites/${x.sprite}.svg`)} style={{ width: x.w * 0.95, height: x.h * 0.95, transform: `scale(${interpolate(s, [0, 1], [2.4, 1])})`, filter: `brightness(${hit}) drop-shadow(0 0 18px rgba(255,40,70,.55))` }} />
              </div>
              <div style={{ padding: '14px 16px', background: C.panel, boxShadow: `inset 0 0 0 3px ${C.line}, 0 6px 0 #000`, textAlign: 'center', transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`, opacity: s }}>
                <div style={{ fontFamily: DISP, fontSize: 24, color: C.white }}>{x.name}</div>
                <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 24, color: C.yellow, marginTop: 8 }}>{x.scene}</div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', fontFamily: DISP, fontSize: 64, color: C.white, textShadow: outline(6), transform: `scale(${interpolate(title, [0, 1], [1.6, 1])})` }}>
        FIVE <span style={{ color: C.red }}>SHADOW</span> BEASTS
      </div>
      {times.map((t, i) => <Flash key={i} at={t} peak={0.35} />)}
      {times.map((t, i) => <Sfx key={i} at={t} file={i % 2 ? 'enemy_hit.wav' : 'sword_swing.wav'} />)}
    </AbsoluteFill>
  );
}

/** «And the only weapon that can beat them... is English.» */
export function Ingles({ b }) {
  const f = useCurrentFrame();
  const only = fr(b.wordAt('only') ?? 0.3);
  const eng = fr(b.wordAt('english') ?? 2.4);
  const line = 'THE ONLY WEAPON THAT CAN BEAT THEM...';
  const chars = Math.floor(interpolate(f, [only, eng - 10], [0, line.length], clamp));
  const slam = spring({ frame: f - eng, fps: FPS, config: { damping: 9, stiffness: 300, mass: 0.6 } });
  const slash = interpolate(f - eng, [-3, 3], [-1, 1], clamp);
  const sh = shakeAt(f, eng, 30, 14);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #2A1650, #07040F 70%)', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', fontFamily: DISP, fontSize: 40, color: C.white, textShadow: outline(4), opacity: f >= eng ? 0.45 : 1 }}>
          {line.slice(0, chars)}
        </div>
        {f >= eng - 3 && (
          <div style={{ position: 'absolute', left: -200, top: 560, width: 2400, height: 26, background: '#fff', boxShadow: '0 0 40px #C4B0FF', transform: `translateX(${slash * 1400}px) rotate(-8deg)`, opacity: interpolate(f - eng, [0, 6], [1, 0], clamp) }} />
        )}
        {f >= eng && (
          <div style={{ position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center', fontFamily: DISP, fontSize: 200, color: C.yellow, textShadow: `${outline(12)}, 0 0 80px rgba(139,92,246,.9)`, transform: `scale(${interpolate(slam, [0, 1], [2.6, 1])}) rotate(${interpolate(slam, [0, 1], [-8, -3])}deg)` }}>
            ENGLISH
          </div>
        )}
      </AbsoluteFill>
      <Flash at={eng} peak={0.9} />
      <Sfx at={eng - 2} file="sword_swing.wav" />
      <Sfx at={eng} file="enemy_hit.wav" />
      <Sfx at={eng + 4} file="enemy_defeated.wav" />
    </AbsoluteFill>
  );
}

/** Cierre: sobre la pantalla de inicio del juego, la dirección para jugar y fundido a negro. */
export function Cierre({ b, len }) {
  const f = useCurrentFrame();
  const at = fr(b.wordAt('save') ?? 1.5);
  const s = spring({ frame: f - at, fps: FPS, config: { damping: 12, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(transparent, rgba(8,4,18,.95) 45%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 140, textAlign: 'center', transform: `translateY(${interpolate(s, [0, 1], [120, 0])}px)`, opacity: s }}>
        <span style={{ fontFamily: DISP, fontSize: 34, color: C.white, background: C.dino, padding: '18px 26px', boxShadow: `inset 0 -6px 0 #5B34C9, 0 6px 0 #000` }}>
          purple-dino-juandda0.web.app
        </span>
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: interpolate(f, [len - 14, len], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) }} />
    </AbsoluteFill>
  );
}
