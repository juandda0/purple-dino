import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { playSfx } from '../../audio/sfx';
import { DIFFICULTY } from '../../game/rules';
import { preloadBattleAssets } from '../preload';
import type { Room } from '../../game/types';
import { TopBar } from './Menus';

const A = '/assets';

const DENSITY = [
  { upTo: 15, cols: 3, h: 56, gap: 12, font: 22, check: 30, small: false },
  { upTo: 32, cols: 4, h: 44, gap: 10, font: 18, check: 24, small: false },
  { upTo: Infinity, cols: 5, h: 36, gap: 8, font: 16, check: 20, small: true },
];
function densityFor(n: number) {
  const d = DENSITY.find(x => n <= x.upTo)!;
  return { ...d, max: d.cols === 5 ? 49 : Infinity }; // 5 x 10 rows; the last cell says "+N MORE"
}

function joinUrl(code: string) {
  return `${window.location.origin}/join/${code}`;
}

export function Lobby({ code, room, online, onStart, onBack, onRemove }: {
  code: string; room: Room; online: Set<string>; onStart: () => void; onBack: () => void; onRemove: (uid: string) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => preloadBattleAssets(), []);
  useEffect(() => {
    QRCode.toDataURL(joinUrl(code), { margin: 0, width: 330, color: { dark: '#1B1430', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [code]);

  const players = Object.entries(room.players ?? {}).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  const connected = players.filter(([uid]) => online.has(uid));
  const ready = connected.filter(([, p]) => p.ready);
  const waiting = connected.filter(([, p]) => !p.ready).map(([, p]) => p.name);
  const canStart = connected.length > 0 && ready.length === connected.length;
  // tiles get denser as the pack grows, so everybody fits on the 1600x900 stage
  const density = densityFor(players.length);
  const shown = players.slice(0, density.max);
  const hidden = players.length - shown.length;

  // a little "ding" every time someone gets ready
  const readyCount = useRef(ready.length);
  useEffect(() => {
    if (ready.length > readyCount.current) playSfx('ready', 0.5);
    readyCount.current = ready.length;
  }, [ready.length]);

  const { config } = room;
  return (
    <>
      <img className="bg" src={`${A}/bg/menu.png`} alt="" />
      <TopBar />
      <div className="abs row" style={{ right: 64, top: 36, gap: 12, fontFamily: 'var(--display)', fontSize: 13 }}>
        <div className="card" style={{ padding: '12px 16px' }}>COURSE {config.course}</div>
        <div className="card" style={{ padding: '12px 16px' }}>UNITS {config.units.join(' · ')}</div>
        <div className="card" style={{ padding: '12px 16px', background: 'var(--yellow)', color: 'var(--ink)' }}>
          {config.difficulty.toUpperCase()} · {DIFFICULTY[config.difficulty].lives} LIVES
        </div>
      </div>
      {/* fixed height: the START button must always be visible, even with 40 students (design: up to 40 per room) */}
      <div className="abs row" style={{ left: 64, top: 132, width: 1472, height: 728, gap: 40, alignItems: 'stretch' }}>
        <div className="panel col" style={{ width: 500, flexShrink: 0, alignItems: 'center', gap: 20, padding: '32px 36px 36px' }}>
          <div className="disp" style={{ fontSize: 22, lineHeight: '30px', textAlign: 'center' }}>SCAN TO<br />JOIN THE PACK</div>
          <div style={{ padding: 10, background: 'var(--white)', border: '4px solid var(--edge)', position: 'relative', width: 354, height: 354 }}>
            {qr && <img src={qr} width={330} height={330} alt={`QR code to join room ${code}`} style={{ imageRendering: 'pixelated' }} />}
            <img className="abs" src={`${A}/dinos/avatar_sena.png`} width={45} height={51} alt="" style={{ left: 154, top: 152, background: '#fff', outline: '6px solid #fff' }} />
          </div>
          <div className="muted" style={{ fontWeight: 500, fontSize: 20, textAlign: 'center' }}>
            or go to <b style={{ color: 'var(--text)' }}>{window.location.host}/join</b> and type
          </div>
          <div className="row" style={{ gap: 10 }} role="img" aria-label={`Room code ${code.split('').join(' ')}`}>
            {code.split('').map((d, i) => (
              <div key={i} className="disp" style={{ width: 68, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dino)', border: '4px solid var(--edge)', boxShadow: 'inset 0 -6px 0 var(--dino-dark)', fontSize: 36 }}>{d}</div>
            ))}
          </div>
        </div>
        <div className="panel col" style={{ flex: 1, minWidth: 0, gap: 22, padding: '32px 36px 32px' }}>
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div className="col" style={{ gap: 10 }}>
              <div className="disp" style={{ fontSize: 22 }}>THE PACK</div>
              <div className="muted" style={{ fontWeight: 500, fontSize: 20 }}>{connected.length} player{connected.length === 1 ? '' : 's'} connected</div>
            </div>
            <div className="disp row" style={{ alignItems: 'baseline', gap: 8, color: 'var(--dino-light)' }} aria-live="polite">
              <span style={{ fontSize: 44 }}>{ready.length}</span><span className="muted" style={{ fontSize: 18 }}>/{connected.length} READY</span>
            </div>
          </div>
          <div style={{ display: 'flex', height: 24, border: '4px solid var(--edge)', background: 'var(--panel-2)' }}>
            <div style={{ width: `${connected.length ? (ready.length / connected.length) * 100 : 0}%`, background: 'var(--green)', boxShadow: 'inset 0 -5px 0 var(--green-dark)', transition: 'width .3s' }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${density.cols}, minmax(0, 1fr))`, gridAutoRows: density.h, gap: density.gap, alignContent: 'start', overflow: 'hidden' }}>
            {players.length === 0 && <div className="muted" style={{ fontSize: 24, gridColumn: '1 / -1' }}>Waiting for the first dino…</div>}
            {shown.map(([uid, p]) => {
              const on = online.has(uid);
              return (
                <div key={uid} className={`player ${p.ready && on ? 'tile pop-in' : 'pop-in'}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: density.small ? 8 : 12, minWidth: 0, padding: density.small ? '0 8px' : '0 12px 0 10px', ...(p.ready && on ? { borderWidth: 3 } : { background: 'rgba(242,238,255,.04)', border: '3px dashed rgba(242,238,255,.22)' }), opacity: on ? 1 : 0.45 }}>
                  <img src={`${A}/dinos/avatar_${p.avatar}.png`} width={density.small ? 15 : 30} height={density.small ? 17 : 34} alt="" />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: density.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.ready ? 'var(--text)' : 'rgba(242,238,255,.6)' }}>{p.name}</span>
                  {p.ready && on ? <span className="okbox" style={{ width: density.check, height: density.check }}><img src={`${A}/sprites/check.svg`} width={density.small ? 12 : 18} height={density.small ? 9 : 13} alt="ready" /></span>
                    : <span style={{ width: density.check, textAlign: 'center', fontWeight: 700, fontSize: density.font, color: 'rgba(242,238,255,.45)' }}>{on ? '…' : '×'}</span>}
                  {/* the teacher can take a student out (stale entry, wrong name); shows on hover/focus */}
                  <button className="kick" aria-label={`Remove ${p.name}`} title={`Remove ${p.name}`} onClick={() => onRemove(uid)}>×</button>
                </div>
              );
            })}
            {hidden > 0 && <div className="disp muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+{hidden} MORE</div>}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', gap: 20 }}>
            <button className="btn btn-light" style={{ padding: '16px 20px', fontSize: 13 }} onClick={onBack}>◀ BACK</button>
            <div className="muted" style={{ fontWeight: 500, fontSize: 20, flex: 1 }}>
              {waiting.length > 0 ? <>Waiting for <b style={{ color: 'var(--text)' }}>{waiting.slice(0, 3).join(', ')}{waiting.length > 3 ? ` + ${waiting.length - 3} more` : ''}</b>…</> : connected.length ? 'Everybody is ready!' : ''}
            </div>
            <button className={`btn ${canStart ? 'btn-go' : ''}`} style={{ padding: '20px 30px', fontSize: 18 }} disabled={!canStart} onClick={onStart}>START ▶</button>
          </div>
        </div>
      </div>
    </>
  );
}
