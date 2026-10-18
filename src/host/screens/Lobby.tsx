import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { playSfx } from '../../audio/sfx';
import { DIFFICULTY } from '../../game/rules';
import type { Room } from '../../game/types';
import { TopBar } from './Menus';

const A = '/assets';

function joinUrl(code: string) {
  return `${window.location.origin}/join/${code}`;
}

export function Lobby({ code, room, online, onStart, onBack }: { code: string; room: Room; online: Set<string>; onStart: () => void; onBack: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
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
      <div className="abs row" style={{ left: 64, top: 132, width: 1472, gap: 40, alignItems: 'stretch' }}>
        <div className="panel col" style={{ width: 500, flexShrink: 0, alignItems: 'center', gap: 20, padding: '32px 36px 36px' }}>
          <div className="disp" style={{ fontSize: 22, lineHeight: '30px', textAlign: 'center' }}>SCAN TO<br />JOIN THE PACK</div>
          <div style={{ padding: 10, background: 'var(--white)', border: '4px solid var(--edge)', position: 'relative', width: 354, height: 354 }}>
            {qr && <img src={qr} width={330} height={330} alt={`QR code to join room ${code}`} style={{ imageRendering: 'pixelated' }} />}
            <img className="abs" src={`${A}/dinos/avatar_sena.png`} width={45} height={51} alt="" style={{ left: 154, top: 152, background: '#fff', outline: '6px solid #fff' }} />
          </div>
          <div className="muted" style={{ fontWeight: 500, fontSize: 20, textAlign: 'center' }}>
            or go to <b style={{ color: 'var(--text)' }}>{window.location.host}/join</b> and type
          </div>
          <div className="row" style={{ gap: 10 }} aria-label={`Room code ${code.split('').join(' ')}`}>
            {code.split('').map((d, i) => (
              <div key={i} className="disp" style={{ width: 68, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dino)', border: '4px solid var(--edge)', boxShadow: 'inset 0 -6px 0 var(--dino-dark)', fontSize: 36 }}>{d}</div>
            ))}
          </div>
        </div>
        <div className="panel col" style={{ flex: 1, justifyContent: 'space-between', gap: 22, padding: '32px 36px 36px' }}>
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
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '12px 14px', alignContent: 'flex-start', overflow: 'hidden' }}>
            {players.length === 0 && <div className="muted" style={{ fontSize: 24 }}>Waiting for the first dino…</div>}
            {players.map(([uid, p]) => {
              const on = online.has(uid);
              return (
                <div key={uid} className={p.ready && on ? 'tile pop-in' : 'pop-in'} style={{ display: 'flex', alignItems: 'center', gap: 12, width: 274, height: 56, padding: '0 12px 0 10px', ...(p.ready && on ? { borderWidth: 3 } : { background: 'rgba(242,238,255,.04)', border: '3px dashed rgba(242,238,255,.22)' }), opacity: on ? 1 : 0.45 }}>
                  <img src={`${A}/dinos/avatar_${p.avatar}.png`} width={30} height={34} alt="" />
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.ready ? 'var(--text)' : 'rgba(242,238,255,.6)' }}>{p.name}</span>
                  {p.ready && on ? <span className="okbox" style={{ width: 30, height: 30 }}><img src={`${A}/sprites/check.svg`} width={18} height={13} alt="ready" /></span>
                    : <span style={{ width: 30, textAlign: 'center', fontWeight: 700, fontSize: 24, color: 'rgba(242,238,255,.45)' }}>{on ? '…' : '×'}</span>}
                </div>
              );
            })}
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
