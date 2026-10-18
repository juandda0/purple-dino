import { useEffect, useRef, useState } from 'react';
import { music } from '../../audio/music';
import { playSfx } from '../../audio/sfx';
import { createRoom } from '../../data/room';
import { unitsWithQuestions } from '../../game/questions';
import { DIFFICULTY } from '../../game/rules';
import type { Difficulty } from '../../game/types';
import { Sprite } from '../../ui/Sprite';
import { useHost } from '../store';

const A = '/assets';
const STEP_LABELS = ['COURSE', 'UNITS', 'DIFFICULTY', 'LOBBY'];

export function TopBar({ step, done = [] }: { step?: number; done?: string[] }) {
  return (
    <div className="topbar">
      <div className="logo">
        <img src={`${A}/dinos/avatar_sena.png`} width={45} height={51} alt="" />
        PURPLE<br />DINO
      </div>
      {step != null && (
        <div className="steps">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className="row" style={{ gap: 12 }}>
              {i > 0 && <span className="ln" />}
              <span className={`s ${i < step ? 'done' : i === step ? 'now' : ''}`}>{i + 1} {done[i] ?? label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const Background = () => <img className="bg" src={`${A}/bg/menu.png`} alt="" />;

export function StartScreen() {
  const go = useHost(s => s.go);
  const [help, setHelp] = useState(false);
  const start = async () => {
    await music.unlock(); // first user gesture: audio is allowed from now on
    void music.play('lobby'); // the battle song is fetched after the lobby one starts (see music.ts NEXT)
    playSfx('select');
    go('course');
  };
  return (
    <>
      <Background />
      <Sprite src={`${A}/dinos/hero_idle_3x.png`} frames={3} width={360} height={360} duration={0.9} className="abs" style={{ left: 130, top: 440 }} label="Purple dino" />
      <div className="abs" style={{ left: 1040, top: 360, width: 540, height: 460, background: 'radial-gradient(closest-side, rgba(232,67,76,.28), rgba(232,67,76,0))' }} />
      <img className="abs" src={`${A}/sprites/enemy_king.svg`} style={{ left: 1060, top: 390, width: 480, height: 400 }} alt="King Dread" />
      <div className="vignette" />
      <div className="title-block" style={{ top: 96 }}>
        <h1 className="disp outline-lg" style={{ fontSize: 96, lineHeight: '104px', color: 'var(--white)', fontWeight: 400 }}>
          PURPLE<br /><span style={{ color: 'var(--dino-light)' }}>DINO</span>
        </h1>
        <div className="disp" style={{ fontSize: 15, letterSpacing: '.14em' }}>FIGHT THE SHADOWS · SAVE THE PRINCESS</div>
        <div className="muted" style={{ fontWeight: 500, fontSize: 24 }}>A co-op English quiz battle for the whole class</div>
      </div>
      <div className="abs col" style={{ left: 600, top: 560, width: 400, gap: 18 }}>
        <button className="btn btn-primary" style={{ padding: '24px 28px', fontSize: 22 }} onClick={start}>CREATE GAME ▶</button>
        <button className="btn btn-light" style={{ padding: '16px 22px', fontSize: 14 }} onClick={() => { playSfx('popup'); setHelp(true); }}>HOW TO PLAY</button>
      </div>
      <div className="abs disp muted" style={{ left: 0, bottom: 28, width: 1600, textAlign: 'center', fontSize: 12, letterSpacing: '.08em' }}>CAMBRIDGE ONE · PASSAGES 3RD EDITION</div>
      {help && <HowToPlay onClose={() => { playSfx('back'); setHelp(false); }} />}
    </>
  );
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        // keep focus inside the dialog
        const items = box.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
        if (!items?.length) return;
        const first = items[0]!, last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); opener?.focus(); };
  }, [onClose]);
  return (
    <div ref={box} className="abs" style={{ inset: 0, background: 'rgba(5,3,12,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} role="dialog" aria-modal="true" aria-label="How to play">
      <div className="panel pxframe col" style={{ width: 900, padding: '36px 44px', gap: 18 }}>
        <div className="disp" style={{ fontSize: 22, color: 'var(--dino-light)' }}>HOW TO PLAY</div>
        <ol style={{ fontSize: 26, lineHeight: '36px', paddingLeft: 30 }}>
          <li>Everyone scans the QR code and joins with their first name.</li>
          <li>The whole class is the purple dino. Answer on your phone before time runs out.</li>
          <li>More than half right → <b style={{ color: 'var(--yellow)' }}>SWORD STRIKE</b>. Otherwise the enemy hits the shield.</li>
          <li>No shield left and another miss → game over. Beat King Dread to save the princess!</li>
        </ol>
        <button className="btn btn-primary" style={{ padding: '18px 24px', fontSize: 16, alignSelf: 'flex-end' }} onClick={onClose} autoFocus>GOT IT</button>
      </div>
    </div>
  );
}

export function CourseScreen() {
  const go = useHost(s => s.go);
  return (
    <>
      <Background />
      <TopBar step={0} />
      <div className="title-block" style={{ top: 140 }}>
        <h1 className="title outline" style={{ fontWeight: 400 }}>CHOOSE YOUR COURSE</h1>
        <div className="subtitle">Only Course 6 is ready for now</div>
      </div>
      <div className="abs" style={{ left: 180, top: 320, width: 1240, display: 'flex', flexWrap: 'wrap', gap: 26, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5, 6, 7].map(n => n === 6 ? (
          <button key={n} className="tile on col" style={{ width: 290, height: 170, justifyContent: 'center', alignItems: 'flex-start', gap: 12, padding: '0 24px', position: 'relative', textAlign: 'left' }}
            onClick={() => { playSfx('select'); go('units'); }}>
            <span className="disp" style={{ fontSize: 24 }}>COURSE 6</span>
            <span style={{ fontWeight: 700, fontSize: 22 }}>Passages 3rd Edition</span>
            <span style={{ fontWeight: 500, fontSize: 18, opacity: 0.85 }}>{unitsWithQuestions(6).length} units ready</span>
          </button>
        ) : (
          <div key={n} className="col" style={{ width: 290, height: 170, justifyContent: 'center', gap: 14, padding: '0 24px', background: 'rgba(14,10,30,.82)', border: '4px dashed rgba(242,238,255,.22)', color: 'rgba(242,238,255,.45)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="disp" style={{ fontSize: 20 }}>COURSE {n}</span><span className="lock" /></div>
            <span className="disp" style={{ alignSelf: 'flex-start', padding: '6px 10px', background: 'rgba(242,238,255,.12)', fontSize: 11 }}>COMING SOON</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function UnitsScreen() {
  const { units, toggleUnit, setUnits, go } = useHost();
  const available = unitsWithQuestions(6);
  return (
    <>
      <Background />
      <TopBar step={1} done={['COURSE 6']} />
      <div className="title-block" style={{ top: 132 }}>
        <h1 className="title outline" style={{ fontWeight: 400 }}>CHOOSE THE UNITS</h1>
        <div className="subtitle">Course 6 · Passages 3rd Edition — which units go into battle?</div>
      </div>
      <div className="abs panel col" style={{ left: 216, top: 284, width: 1168, gap: 20, padding: '36px 40px 32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }} role="group" aria-label="Units">
          {available.map(n => {
            const on = units.includes(n);
            return (
              <button key={n} className={`tile ${on ? 'on' : ''} col`} aria-pressed={on} style={{ width: 160, height: 132, alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative' }}
                onClick={() => { playSfx('select'); toggleUnit(n); }}>
                <span className="disp" style={{ fontSize: 12, letterSpacing: '.12em', opacity: 0.7 }}>UNIT</span>
                <span className="disp" style={{ fontSize: 44, lineHeight: '44px' }}>{String(n).padStart(2, '0')}</span>
                {on && <span className="okbox" style={{ position: 'absolute', right: -14, top: -14, width: 40, height: 40, background: 'var(--yellow)', borderWidth: 4 }}><img src={`${A}/sprites/check.svg`} width={20} height={14} alt="" /></span>}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', paddingTop: 18, borderTop: '3px dashed var(--line)' }}>
          <button className="btn btn-light" style={{ padding: '18px 24px', fontSize: 14 }} onClick={() => { playSfx('select'); setUnits(units.length === available.length ? [] : available); }}>
            {units.length === available.length ? 'NONE' : 'ALL'}
          </button>
          <div className="col" style={{ alignItems: 'center', gap: 6 }}>
            <div className="disp" style={{ fontSize: 16, color: 'var(--dino-light)' }}>{units.length} UNIT{units.length === 1 ? '' : 'S'}</div>
            <div className="muted" style={{ fontWeight: 500, fontSize: 20 }}>{units.length ? units.join(' · ') : 'Pick at least one'}</div>
          </div>
          <button className="btn btn-primary" style={{ padding: '18px 28px', fontSize: 18 }} disabled={units.length === 0}
            onClick={() => { playSfx('select'); go('difficulty'); }}>NEXT ▶</button>
        </div>
      </div>
    </>
  );
}

const DIFFS: Array<{ id: Difficulty; name: string; color: string; dark: string; level: string }> = [
  { id: 'easy', name: 'EASY', color: 'var(--green)', dark: 'var(--green-dark)', level: 'Warm-up' },
  { id: 'medium', name: 'MEDIUM', color: 'var(--yellow)', dark: 'var(--yellow-dark)', level: 'Recommended' },
  { id: 'hard', name: 'HARD', color: 'var(--red)', dark: 'var(--red-dark)', level: 'Test prep' },
];

export function DifficultyScreen() {
  const { units, difficulty, setDifficulty, course, setCode, go } = useHost();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    setBusy(true);
    setError(null);
    playSfx('select');
    try {
      setCode(await createRoom({ course, units, difficulty }));
      go('room');
    } catch (e) {
      playSfx('error');
      setError(e instanceof Error ? e.message : 'Could not create the room');
      setBusy(false);
    }
  };
  return (
    <>
      <Background />
      <TopBar step={2} done={['COURSE 6', `UNITS ${units.join('·')}`]} />
      <div className="title-block" style={{ top: 132 }}>
        <h1 className="title outline" style={{ fontWeight: 400 }}>HOW TOUGH?</h1>
        <div className="subtitle">It changes how forgiving the battle is — not the English</div>
      </div>
      <div className="abs row" style={{ left: 190, top: 292, width: 1220, gap: 40, alignItems: 'flex-start' }} role="radiogroup" aria-label="Difficulty">
        {DIFFS.map(d => {
          const s = DIFFICULTY[d.id];
          const on = d.id === difficulty;
          return (
            <button key={d.id} role="radio" aria-checked={on} className="panel col" onClick={() => { playSfx('select'); setDifficulty(d.id); }}
              style={{ width: 380, textAlign: 'left', ...(on ? { transform: 'translateY(-14px)', boxShadow: 'inset 0 0 0 3px var(--line), 0 0 0 4px var(--white), 0 18px 0 var(--edge)' } : {}) }}>
              <div className="row" style={{ justifyContent: 'space-between', padding: '20px 24px', background: d.color, boxShadow: `inset 0 -6px 0 ${d.dark}`, borderBottom: '4px solid var(--edge)' }}>
                <span className="disp outline-sm" style={{ fontSize: 26, color: 'var(--white)' }}>{d.name}</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{d.level}</span>
              </div>
              <div className="col" style={{ gap: 16, padding: '24px 24px 30px' }}>
                <div className="col" style={{ gap: 8 }}>
                  <span className="disp muted" style={{ fontSize: 11, letterSpacing: '.08em' }}>SHIELD LIVES</span>
                  <span className="row" style={{ gap: 6 }}>{Array.from({ length: s.lives }, (_, i) => <img key={i} className="crest" src={`${A}/ui/crest_full.png`} alt="" />)}</span>
                </div>
                <Line label="Hits per enemy" value={s.enemyHp} />
                <Line label="Hits on the boss" value={s.bossHp} />
                <Line label="Time per question" value={`${s.seconds} s`} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="abs row" style={{ left: 190, top: 776, width: 1220, justifyContent: 'space-between' }}>
        <span className="error-text" role="alert">{error}</span>
        <button className="btn btn-primary" style={{ padding: '18px 28px', fontSize: 18 }} onClick={create} disabled={busy}>{busy ? 'CREATING…' : 'CREATE LOBBY ▶'}</button>
      </div>
    </>
  );
}

const Line = ({ label, value }: { label: string; value: string | number }) => (
  <div className="row" style={{ justifyContent: 'space-between', fontSize: 22, fontWeight: 500 }}><span>{label}</span><b>{value}</b></div>
);
