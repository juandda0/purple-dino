import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom, useSecondsLeft } from '../data/hooks';
import { JoinError, joinRoom, leavePresence, readMyAnswer, setReady, submitAnswer } from '../data/room';
import { safeStorage } from '../lib/storage';
import { ensureSignedIn } from '../lib/firebase';
import { AVATARS } from '../game/stops';
import type { Reveal, Room } from '../game/types';
import { ANSWER_STYLES } from '../ui/answers';

const A = '/assets';
const PROFILE_KEY = 'purple-dino:profile';
const JOINED_KEY = (code: string) => `purple-dino:joined:${code}`;

interface Profile { name: string; avatar: string }
const loadProfile = (): Profile => {
  try {
    const p = JSON.parse(safeStorage.get(PROFILE_KEY) ?? '') as Profile;
    if (typeof p.name === 'string' && (AVATARS as readonly string[]).includes(p.avatar)) return p;
  } catch { /* first time */ }
  return { name: '', avatar: 'sena' };
};

/** Student phone app: the controller. Phones stay silent (design §3.5). */
export default function PlayApp() {
  const { code: codeParam } = useParams();
  const code = codeParam && /^\d{4}$/.test(codeParam) ? codeParam : null;
  const [uid, setUid] = useState<string | null>(null);

  // re-join automatically after a reload (same anonymous session, same room)
  useEffect(() => {
    if (!code || safeStorage.get(JOINED_KEY(code)) !== '1') return;
    const p = loadProfile();
    if (!p.name) return;
    joinRoom(code, p.name, p.avatar).then(setUid).catch(() => safeStorage.remove(JOINED_KEY(code)));
  }, [code]);
  useEffect(() => () => leavePresence(), []);

  return (
    <div className="phone-app">
      {code && uid ? <InRoom code={code} uid={uid} /> : <Join code={code} onJoined={(id, c) => { safeStorage.set(JOINED_KEY(c), '1'); setUid(id); }} />}
    </div>
  );
}

function Logo() {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
      <img src={`${A}/dinos/avatar_sena.png`} width={45} height={51} alt="" />
      <div className="disp" style={{ fontSize: 15, lineHeight: '22px' }}>PURPLE<br />DINO</div>
    </div>
  );
}

function Join({ code, onJoined }: { code: string | null; onJoined: (uid: string, code: string) => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(loadProfile);
  const [typedCode, setTypedCode] = useState(code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = profile.name.trim();
  const validCode = /^\d{4}$/.test(typedCode);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validCode || !name) return;
    setBusy(true);
    setError(null);
    try {
      safeStorage.set(PROFILE_KEY, JSON.stringify({ name, avatar: profile.avatar }));
      const uid = await joinRoom(typedCode, name, profile.avatar);
      if (typedCode !== code) navigate(`/join/${typedCode}`, { replace: true });
      onJoined(uid, typedCode);
    } catch (err) {
      setError(err instanceof JoinError ? err.message : 'Could not join. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <form className="phone" onSubmit={submit}>
      <Logo />
      <h1 className="disp" style={{ fontSize: 22, lineHeight: '30px', textAlign: 'center', fontWeight: 400, marginTop: 8 }}>JOIN THE PACK</h1>
      <label className="col" style={{ gap: 10 }}>
        <span className="p-label">ROOM CODE</span>
        <input className="input digit-input" inputMode="numeric" autoComplete="off" maxLength={4} pattern="\d{4}" value={typedCode}
          onChange={e => setTypedCode(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-describedby="code-hint" />
        {code && <span id="code-hint" style={{ fontWeight: 500, fontSize: 16, color: 'var(--green)' }}>Filled in from the QR code</span>}
      </label>
      <label className="col" style={{ gap: 10 }}>
        <span className="p-label">YOUR FIRST NAME</span>
        <input className="input" maxLength={16} autoComplete="given-name" autoCapitalize="words" value={profile.name}
          onChange={e => setProfile(p => ({ ...p, name: e.target.value.slice(0, 16) }))} placeholder="Ana" />
      </label>
      <div className="col" style={{ gap: 10 }}>
        <span className="p-label" id="dino-label">PICK YOUR DINO</span>
        <div className="swatches" role="group" aria-labelledby="dino-label">
          {AVATARS.map(a => (
            <button key={a} type="button" className="swatch" aria-pressed={profile.avatar === a} aria-label={`Dino ${a}`} onClick={() => setProfile(p => ({ ...p, avatar: a }))}>
              <img src={`${A}/dinos/avatar_${a}.png`} width={30} height={34} alt="" />
            </button>
          ))}
        </div>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div style={{ marginTop: 'auto' }}>
        <button className="btn btn-primary" style={{ width: '100%', height: 76, fontSize: 20 }} disabled={!validCode || !name || busy}>
          {busy ? 'JOINING…' : 'JOIN ▶'}
        </button>
      </div>
    </form>
  );
}

interface Personal { struck: number; strikes: number; streak: number; bestStreak: number; percents: number[] }
const EMPTY_PERSONAL: Personal = { struck: 0, strikes: 0, streak: 0, bestStreak: 0, percents: [] };

function InRoom({ code, uid }: { code: string; uid: string }) {
  const roomState = useRoom(code);
  const room = roomState.status === 'ready' ? roomState.room : null;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [personal, setPersonal] = useState<Personal>(EMPTY_PERSONAL);
  const counted = useRef(new Set<string>());

  const key = room?.question?.key;
  const checked = useRef(new Set<string>());
  // after a reload, find out whether this round was already answered (once per round, not on every snapshot)
  useEffect(() => {
    if (!key || checked.current.has(key)) return;
    checked.current.add(key);
    let alive = true;
    readMyAnswer(code, key).then(a => { if (alive && a != null) setAnswers(m => (m[key] != null ? m : { ...m, [key]: a })); }).catch(() => undefined);
    return () => { alive = false; };
  }, [code, key]);

  // back in the lobby (PLAY AGAIN): a new game starts from zero on this phone too
  const inLobby = room?.status === 'lobby';
  useEffect(() => {
    if (!inLobby) return;
    setAnswers({});
    setPersonal(EMPTY_PERSONAL);
    counted.current.clear();
    checked.current.clear();
  }, [inLobby]);

  // personal stats, once per result
  const reveal = room?.status === 'reveal' ? room.reveal ?? null : null;
  const joinedAt = room?.players?.[uid]?.joinedAt;
  const startedAt = room?.question?.startedAt;
  useEffect(() => {
    if (!reveal || counted.current.has(reveal.key)) return;
    counted.current.add(reveal.key);
    // rounds that started before this student joined do not count for them (R2, R8)
    if (joinedAt == null || startedAt == null || joinedAt >= startedAt) return;
    const mine = answers[reveal.key];
    setPersonal(p => {
      const percents = [...p.percents, reveal.percent];
      if (reveal.outcome !== 'strike') return { ...p, percents };
      const right = mine != null && mine === reveal.correct;
      const streak = right ? p.streak + 1 : 0;
      return { struck: p.struck + (right ? 1 : 0), strikes: p.strikes + 1, streak, bestStreak: Math.max(p.bestStreak, streak), percents };
    });
  }, [reveal, answers, joinedAt, startedAt]);

  if (roomState.status === 'loading') return <div className="phone"><div className="center-col disp">Connecting…</div></div>;
  if (!room) {
    return (
      <div className="phone">
        <Logo />
        <div className="center-col">
          <div className="disp" style={{ fontSize: 18, lineHeight: '28px' }}>THE ROOM WAS CLOSED</div>
          <p className="muted" style={{ fontSize: 18 }}>Ask your teacher for the new code.</p>
          <a className="btn btn-primary" style={{ padding: '18px 24px', fontSize: 14, textDecoration: 'none' }} href="/join">JOIN ANOTHER ROOM</a>
        </div>
      </div>
    );
  }

  const me = room.players?.[uid];
  const head = <Head room={room} name={me?.name ?? ''} avatar={me?.avatar ?? 'sena'} />;
  switch (room.status) {
    case 'lobby':
      return <Waiting code={code} room={room} ready={Boolean(me?.ready)} name={me?.name ?? ''} avatar={me?.avatar ?? 'sena'} />;
    case 'walking':
      return <Info head={head} title="GET READY" text="The pack is on the move. Eyes on the projector!" sprite="hero_move_3x" frames={6} />;
    case 'question': {
      const q = room.question!;
      if (!me || me.joinedAt >= q.startedAt) return <Info head={head} title="YOU'RE IN!" text="You'll join the battle from the next question." sprite="hero_idle_3x" frames={3} />;
      const mine = answers[q.key];
      if (mine != null) return <Locked head={head} option={mine} text={q.options[mine] ?? ''} />;
      return <Answer head={head} code={code} room={room} onAnswer={o => setAnswers(m => ({ ...m, [q.key]: o }))} />;
    }
    case 'reveal':
      return <Result head={head} reveal={room.reveal!} mine={answers[room.reveal!.key]} lives={room.state?.lives ?? 0} streak={personal.streak} />;
    default:
      return <Final room={room} personal={personal} name={me?.name ?? ''} />;
  }
}

function Head({ room, name, avatar }: { room: Room; name: string; avatar: string }) {
  const seconds = useSecondsLeft(room.status === 'question' ? room.question?.endsAt : undefined);
  return (
    <div className="p-head">
      <div className="card row" style={{ gap: 10, padding: '6px 14px 6px 8px', borderWidth: 3 }}>
        <img src={`${A}/dinos/avatar_${avatar}.png`} width={30} height={34} alt="" />
        <span style={{ fontWeight: 700, fontSize: 20 }}>{name}</span>
      </div>
      {room.status === 'question' && (
        <div className="disp" style={{ minWidth: 64, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: seconds <= 5 ? 'var(--red)' : 'var(--yellow)', border: '3px solid var(--edge)', boxShadow: '0 4px 0 var(--edge)', fontSize: 22, color: 'var(--ink)' }} aria-label={`${seconds} seconds left`}>
          {String(seconds).padStart(2, '0')}
        </div>
      )}
    </div>
  );
}

function Waiting({ code, room, ready, name, avatar }: { code: string; room: Room; ready: boolean; name: string; avatar: string }) {
  const players = Object.values(room.players ?? {});
  const readyCount = players.filter(p => p.ready).length;
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    await setReady(code, !ready).catch(() => undefined);
    setBusy(false);
  };
  return (
    <div className="phone">
      <div className="p-head"><span className="p-label">ROOM {code}</span><span className="p-label">UNITS {room.config.units.join(' · ')}</span></div>
      <div className="center-col">
        <div style={{ padding: 22, background: 'var(--panel-2)', border: '4px solid var(--edge)', boxShadow: 'inset 0 0 0 2px var(--line)' }}>
          <img src={`${A}/dinos/avatar_${avatar}.png`} width={105} height={119} alt="Your dino" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 34 }}>{name}</div>
        <div className="col" style={{ gap: 10, width: '100%' }}>
          <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}><span>The pack</span><span>{readyCount} / {players.length} ready</span></div>
          <div className="bar" style={{ height: 18 }}><div style={{ width: `${players.length ? (readyCount / players.length) * 100 : 0}%`, background: 'var(--green)' }} /></div>
        </div>
      </div>
      <button className={`btn ${ready ? 'btn-light' : 'btn-go'}`} style={{ height: 110, fontSize: 24 }} onClick={toggle} disabled={busy} aria-pressed={ready}>
        {ready ? "READY ✓ (TAP TO UNDO)" : "I'M READY"}
      </button>
      <p className="muted" style={{ textAlign: 'center', fontWeight: 500, fontSize: 16 }}>When the battle starts, look at the projector.</p>
    </div>
  );
}

function Info({ head, title, text, sprite, frames }: { head: React.ReactNode; title: string; text: string; sprite: string; frames: number }) {
  return (
    <div className="phone">
      {head}
      <div className="center-col">
        <div className="spr" style={{ '--n': frames, '--fw': '144px', '--fh': '144px', '--t': '.8s', backgroundImage: `url(${A}/dinos/${sprite}.png)` } as React.CSSProperties} aria-hidden="true" />
        <div className="disp" style={{ fontSize: 20 }}>{title}</div>
        <p className="muted" style={{ fontSize: 20, fontWeight: 500 }}>{text}</p>
      </div>
    </div>
  );
}

function Answer({ head, code, room, onAnswer }: { head: React.ReactNode; code: string; room: Room; onAnswer: (o: number) => void }) {
  const q = room.question!;
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pick = async (option: number) => {
    if (sending) return;
    setSending(true);
    try {
      await submitAnswer(code, q.key, option);
      onAnswer(option);
    } catch {
      setError('Too late! Your answer did not count.');
    }
  };
  return (
    <div className="phone">
      {head}
      <div className="col" style={{ gap: 10 }}>
        <div className="p-label">{q.attempt > 0 ? 'TRY AGAIN · ANSWERS SHUFFLED' : `UNIT ${q.unit}`}</div>
        <div className="panel" style={{ padding: '16px 18px', fontWeight: 700, fontSize: 22, lineHeight: '28px' }}>{q.text}</div>
      </div>
      <div className="col" style={{ gap: 16 }}>
        {q.options.map((text, i) => {
          const s = ANSWER_STYLES[i]!;
          return (
            <button key={i} className={`p-btn ${s.color}`} onClick={() => void pick(i)} disabled={sending}>
              <img src={s.icon} width={44} height={44} alt={s.shape} />{text}
            </button>
          );
        })}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}

function Locked({ head, option, text }: { head: React.ReactNode; option: number; text: string }) {
  const s = ANSWER_STYLES[option]!;
  return (
    <div className="phone">
      {head}
      <div className="center-col">
        <div className="disp" style={{ fontSize: 20 }}>LOCKED IN</div>
        <div className={`p-btn ${s.color}`} style={{ justifyContent: 'center', minHeight: 120, fontSize: 34 }}>
          <img src={s.icon} width={52} height={52} alt={s.shape} />{text}
        </div>
        <p className="muted" style={{ fontSize: 18, fontWeight: 500 }}>Waiting for the others… Eyes on the projector.</p>
      </div>
    </div>
  );
}

function Result({ head, reveal, mine, lives, streak }: { head: React.ReactNode; reveal: Reveal; mine: number | undefined; lives: number; streak: number }) {
  const strike = reveal.outcome === 'strike';
  const right = strike && mine != null && mine === reveal.correct;
  return (
    <div className={`phone ${strike ? 'strike' : 'hurt'}`}>
      {head}
      <div className="center-col">
        {strike
          ? <img src={`${A}/sprites/enemy_raptor_hit.svg`} width={240} height={168} alt="" />
          : <img src={`${A}/pov/shield_shards.png`} width={267} height={240} alt="" />}
        <div className="disp outline-sm" style={{ fontSize: 28, lineHeight: '36px', color: strike ? 'var(--yellow)' : 'var(--red)' }}>
          {strike ? <>SWORD<br />STRIKE!</> : lives === 0 ? <>SHIELD<br />DESTROYED</> : <>SHIELD<br />HIT</>}
        </div>
        {strike && (
          <div className="row" style={{ gap: 10, fontWeight: 700, fontSize: 22, color: right ? 'var(--green)' : 'var(--muted)' }}>
            {right ? <><span className="okbox" style={{ width: 30, height: 30 }}><img src={`${A}/sprites/check.svg`} width={18} height={13} alt="" /></span>You got it right{streak >= 2 ? ` · streak x${streak}` : ''}</> : mine == null ? "You didn't answer this time" : 'Not this one — the pack had your back'}
          </div>
        )}
        {!strike && lives === 1 && <div className="tag" style={{ padding: '8px 12px', fontSize: 11, background: 'var(--red)' }}>LAST CHANCE</div>}
        <div className="card row" style={{ justifyContent: 'space-between', padding: '16px 18px', fontWeight: 500, fontSize: 20, width: '100%' }}>
          <span>Class</span><b style={{ color: strike ? 'var(--text)' : 'var(--red)' }}>{reveal.percent}% correct</b>
        </div>
        {!strike && lives > 0 && <p className="muted" style={{ fontSize: 17 }}>Same question again, answers shuffled. Your answer stays secret for now.</p>}
      </div>
    </div>
  );
}

function Final({ room, personal, name }: { room: Room; personal: Personal; name: string }) {
  const won = room.status === 'won';
  const avg = personal.percents.length ? Math.round(personal.percents.reduce((a, b) => a + b, 0) / personal.percents.length) : 0;
  return (
    <div className={`phone ${won ? '' : 'hurt'}`} style={won ? { background: `url(${A}/castles/sunny_18.png) center top / 100% auto no-repeat`, imageRendering: 'pixelated' } : undefined}>
      <div className="center-col" style={{ justifyContent: 'flex-start', paddingTop: won ? 40 : 20 }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 4 }}>
          <div className="spr" style={{ '--n': won ? 4 : 5, '--fw': '144px', '--fh': '144px', '--t': '.7s', '--f': 2, backgroundImage: `url(${A}/dinos/${won ? 'hero_jump_3x' : 'hero_dead_3x'}.png)`, ...(won ? {} : { animation: 'none', backgroundPosition: '-288px 0' }) } as React.CSSProperties} aria-hidden="true" />
          {won && <div className="spr" style={{ '--n': 3, '--fw': '144px', '--fh': '168px', '--t': '.9s', backgroundImage: `url(${A}/dinos/princess_idle_3x.png)` } as React.CSSProperties} aria-hidden="true" />}
        </div>
        <h1 className="disp outline-sm" style={{ fontSize: 24, lineHeight: '34px', fontWeight: 400, color: won ? 'var(--white)' : 'var(--red)' }}>
          {won ? <>PRINCESS<br />RESCUED</> : <>GAME<br />OVER</>}
        </h1>
        <div className="col" style={{ gap: 12, width: '100%', marginTop: 12 }}>
          <div className="p-label">YOUR PART{name ? `, ${name.toUpperCase()}` : ''}</div>
          <div className="card row" style={{ justifyContent: 'space-between', padding: '16px 18px', fontWeight: 500, fontSize: 20 }}><span>Sword strikes you landed</span><b>{personal.struck} / {personal.strikes}</b></div>
          <div className="card row" style={{ justifyContent: 'space-between', padding: '16px 18px', fontWeight: 500, fontSize: 20 }}><span>Best streak</span><b style={{ color: 'var(--yellow)' }}>x{personal.bestStreak}</b></div>
          <div className="card row" style={{ justifyContent: 'space-between', padding: '16px 18px', fontWeight: 500, fontSize: 20 }}><span>Class accuracy</span><b>{avg}%</b></div>
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center', fontWeight: 500, fontSize: 16 }}>{won ? 'GG, pack. See you next battle.' : 'So close. The teacher can start a new try.'}</p>
    </div>
  );
}

// make sure the anonymous session exists early (faster join)
void ensureSignedIn();
