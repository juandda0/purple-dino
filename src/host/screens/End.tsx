import { useMemo } from 'react';
import { DIFFICULTY } from '../../game/rules';
import type { Room } from '../../game/types';
import { Road } from '../../ui/Hud';
import { Sprite } from '../../ui/Sprite';
import { toughestUnit, type HostStats } from '../controller';

const A = '/assets';

interface EndProps {
  room: Room;
  stats: HostStats | null;
  onPlayAgain: () => void;
  onChangeUnits: () => void;
  onExit: () => void;
}

const accuracy = (s: HostStats | null) => (s && s.possible ? Math.round((s.correct / s.possible) * 100) : 0);

function Confetti() {
  // deterministic pieces so re-renders do not reshuffle them
  const pieces = useMemo(() => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const colors = ['#F7C52B', '#FF6FA8', '#7A3CF0', '#2DBE6C', '#2F7DE1', '#FFFFFF'];
    return Array.from({ length: 50 }, () => {
      const size = 8 + Math.floor(rnd() * 3) * 4;
      return { left: Math.floor(rnd() * 1600), size, tall: rnd() < 0.5, color: colors[Math.floor(rnd() * colors.length)], dur: 4 + rnd() * 4, delay: -rnd() * 8 };
    });
  }, []);
  return (
    <div className="abs" style={{ inset: 0, pointerEvents: 'none' }} aria-hidden="true">
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece" style={{ left: p.left, top: 0, width: p.size, height: p.size * (p.tall ? 2 : 1), background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

const Stat = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="row" style={{ justifyContent: 'space-between', fontSize: 22, fontWeight: 500 }}><span>{label}</span>{children}</div>
);

export function Victory({ room, stats, onPlayAgain, onExit }: EndProps) {
  const state = room.state;
  const lives = state?.lives ?? 0;
  const maxLives = DIFFICULTY[room.config.difficulty].lives;
  return (
    <>
      <img className="bg" src={`${A}/bg/victory.png`} alt="" />
      <Confetti />
      <img className="abs" src={`${A}/sprites/cage.svg`} style={{ left: 1200, top: 470, width: 180, height: 240 }} alt="Open cage" />
      <Sprite src={`${A}/dinos/hero_jump_3x.png`} frames={4} width={360} height={360} duration={0.7} className="abs" style={{ left: 470, top: 450 }} label="Purple dino jumping" />
      <Sprite src={`${A}/dinos/princess_idle_3x.png`} frames={3} width={360} height={420} duration={0.9} className="abs" style={{ left: 880, top: 390 }} label="The princess" />
      <div className="title-block" style={{ top: 24 }}>
        <img src={`${A}/ui/emblem_purple.png`} width={160} height={80} alt="" />
        <h1 className="disp outline-lg" style={{ fontSize: 64, lineHeight: '72px', fontWeight: 400 }}>PRINCESS RESCUED</h1>
        <div className="tag" style={{ padding: '10px 18px', fontSize: 14, background: 'var(--dino)' }}>THE PACK BROKE THE SHADOW CURSE</div>
      </div>
      <div className="abs panel col" style={{ left: 40, bottom: 48, width: 420, gap: 14, padding: '24px 26px 30px' }}>
        <div className="disp" style={{ fontSize: 14, letterSpacing: '.06em', color: 'var(--dino-light)' }}>BATTLE REPORT</div>
        <Stat label="Stops cleared"><b>5 / 5</b></Stat>
        <Stat label="Questions"><b>{stats?.questions ?? state?.questionNumber ?? 0}</b></Stat>
        <Stat label="Class accuracy"><b>{accuracy(stats)}%</b></Stat>
        <Stat label="Shield left">
          <span className="row" style={{ gap: 4 }}>{Array.from({ length: maxLives - 1 }, (_, i) => <img key={i} className="crest" src={`${A}/ui/${i < lives - 1 ? 'crest_full' : 'crest_empty'}.png`} alt="" />)}</span>
        </Stat>
        <Stat label="Best combo"><b>x{stats?.bestCombo ?? 0}</b></Stat>
        <div className="muted" style={{ fontSize: 16 }}>Course {room.config.course} · Units {room.config.units.join(' · ')} · {room.config.difficulty}</div>
      </div>
      <div className="abs col" style={{ right: 40, bottom: 56, gap: 18, width: 360 }}>
        <button className="btn btn-primary" style={{ padding: '22px 26px', fontSize: 18 }} onClick={onPlayAgain}>PLAY AGAIN ▶</button>
        <button className="btn btn-light" style={{ padding: '16px 22px', fontSize: 14 }} onClick={onExit}>BACK TO START</button>
      </div>
    </>
  );
}

export function GameOver({ room, stats, onPlayAgain, onChangeUnits, onExit }: EndProps) {
  const state = room.state;
  const unit = stats ? toughestUnit(stats) : null;
  return (
    <>
      <img className="bg" src={`${A}/bg/gameover.png`} alt="" />
      <img className="abs" src={`${A}/sprites/enemy_ptero.svg`} style={{ left: 1060, top: 300, width: 288, height: 160, opacity: 0.9 }} alt="" />
      <div className="title-block" style={{ top: 70, gap: 22 }}>
        <h1 className="disp outline-lg" style={{ fontSize: 96, lineHeight: '104px', color: 'var(--red)', fontWeight: 400 }}>GAME OVER</h1>
        <div style={{ fontWeight: 700, fontSize: 30 }}>The shadows win… this time.</div>
        <Road stop={state?.stop ?? 0} dim />
      </div>
      <Sprite src={`${A}/dinos/hero_dead_3x.png`} frames={5} frame={2} width={360} height={360} className="abs" style={{ left: 620, top: 470 }} label="Defeated dino" />
      <img className="abs" src={`${A}/pov/shield_shards.png`} style={{ left: 930, top: 700, width: 267, height: 240 }} alt="Broken shield" />
      <div className="abs panel col" style={{ left: 40, bottom: 48, width: 420, gap: 14, padding: '24px 26px 30px' }}>
        <div className="disp" style={{ fontSize: 14, letterSpacing: '.06em', color: 'var(--red)' }}>THE SHIELD BROKE</div>
        <Stat label="You reached"><b>Stop {(state?.stop ?? 0) + 1} / 5</b></Stat>
        <Stat label="Questions"><b>{stats?.questions ?? 0}</b></Stat>
        <Stat label="Class accuracy"><b>{accuracy(stats)}%</b></Stat>
        {unit != null && <div style={{ paddingTop: 10, borderTop: '3px dashed var(--line)', fontSize: 18, lineHeight: '24px', fontWeight: 500 }}>To review: <b>Unit {unit}</b> was the toughest.</div>}
      </div>
      <div className="abs col" style={{ right: 40, bottom: 56, gap: 18, width: 360 }}>
        <button className="btn btn-primary" style={{ padding: '22px 26px', fontSize: 18 }} onClick={onPlayAgain}>TRY AGAIN ▶</button>
        <button className="btn btn-light" style={{ padding: '16px 22px', fontSize: 14 }} onClick={onChangeUnits}>CHANGE UNITS</button>
        <button className="btn btn-light" style={{ padding: '16px 22px', fontSize: 14 }} onClick={onExit}>BACK TO START</button>
      </div>
    </>
  );
}
