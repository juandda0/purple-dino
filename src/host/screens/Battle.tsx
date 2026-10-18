import { useEffect, useRef, useState } from 'react';
import { music, PANIC_AT } from '../../audio/music';
import { playSfx } from '../../audio/sfx';
import { useSecondsLeft } from '../../data/hooks';
import { serverNow } from '../../lib/firebase';
import { BOSS_STOP, DIFFICULTY, isLastChance, shieldFor, type ShieldSprite } from '../../game/rules';
import { STOPS } from '../../game/stops';
import type { BattleState, Room } from '../../game/types';
import { ANSWER_STYLES } from '../../ui/answers';
import { HpBars, Road, ShieldRow, Timer } from '../../ui/Hud';
import { Sprite } from '../../ui/Sprite';

const A = '/assets';
const SHIELD_FILE: Record<ShieldSprite, string> = {
  full: 'shield_0_full', scratched: 'shield_1_scratched', cracked: 'shield_2_cracked', split: 'shield_3_split', gone: 'shield_4_gone',
};

interface Props {
  room: Room;
  answered: number;
  eligible: number;
  onShake: () => void;
}

export function Battle({ room, answered, eligible, onShake }: Props) {
  const state = room.state as BattleState;
  const { difficulty } = room.config;
  const stop = STOPS[state.stop]!;
  const reveal = room.status === 'reveal' ? room.reveal ?? null : null;
  const question = room.question ?? null;
  const total = DIFFICULTY[difficulty].seconds;
  const seconds = useSecondsLeft(room.status === 'question' ? question?.endsAt : undefined);
  const panic = room.status === 'question' && seconds <= total * PANIC_AT;

  // ---- music: battle / boss loop, calm at each new question, panic near the end, duck on reveal
  useEffect(() => {
    void music.play(state.stop === BOSS_STOP ? 'boss' : 'battle');
    if (state.stop === BOSS_STOP - 1) music.preload('boss'); // one stop ahead, not at the start
  }, [state.stop]);
  useEffect(() => {
    if (room.status === 'question') music.calm();
    if (room.status === 'reveal') music.timeUp();
    // endsAt too: a question that landed late gets its time back (Lote 11.1), so the music leaves panic mode
  }, [room.status, question?.key, question?.endsAt]);
  useEffect(() => {
    if (room.status !== 'question' || !question) return;
    const id = setInterval(() => music.setTimeLeft(Math.max(0, (question.endsAt - serverNow()) / 1000), total), 200);
    return () => clearInterval(id);
  }, [room.status, question, total]);

  // ---- sound + shake when a result comes in (once per round). Keyed on the reveal key: other room
  // snapshots (someone joining, a reload) must not cancel the delayed sounds.
  const latest = useRef({ reveal, combo: state.combo, enemyHp: state.enemyHp, lives: state.lives, onShake });
  latest.current = { reveal, combo: state.combo, enemyHp: state.enemyHp, lives: state.lives, onShake };
  const revealKey = reveal?.key;
  useEffect(() => {
    const { reveal: r, combo, enemyHp, lives, onShake: shake } = latest.current;
    if (!revealKey || !r) return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    if (r.outcome === 'strike') {
      playSfx('swing');
      timers.push(setTimeout(() => playSfx('enemyHit'), 180));
      if (combo >= 2) timers.push(setTimeout(() => playSfx('combo'), 500));
      if (enemyHp === 0) timers.push(setTimeout(() => playSfx('enemyDefeated'), 900));
    } else {
      playSfx(lives <= 1 ? 'shieldBreak' : 'clank');
    }
    shake();
    return () => timers.forEach(clearTimeout);
  }, [revealKey]);

  const walking = room.status === 'walking';
  const striking = reveal?.outcome === 'strike';
  const hurt = reveal?.outcome === 'shield';
  const shield = shieldFor(difficulty, state.lives);
  const lastChance = isLastChance(state.lives);
  const defeated = striking && state.enemyHp === 0;

  return (
    <div className={`abs ${walking ? 'walking' : ''} ${hurt ? 'block' : ''}`} style={{ inset: 0 }}>
      <img className="bg" src={`${A}/bg/battle.png`} alt="" />

      {/* enemy */}
      {!walking && (
        <div className="abs col" style={{ left: 800 - Math.max(240, stop.width / 2), top: stop.height > 300 ? 140 : 196, width: Math.max(480, stop.width), alignItems: 'center', gap: 14 }}>
          <div className="plate tag">
            <div style={{ fontSize: 16, letterSpacing: '.06em' }}>{stop.name}</div>
            <HpBars hp={state.enemyHp} max={state.enemyMaxHp} />
          </div>
          <div style={{ position: 'relative', width: stop.width, height: stop.height }}>
            <img
              className={`enemy ${striking && !defeated ? 'hit' : ''} ${defeated ? 'gone' : ''} ${hurt ? 'lunge' : ''}`}
              src={`${A}/sprites/${striking && stop.hitSprite ? stop.hitSprite : hurt && stop.attackSprite ? stop.attackSprite : stop.enemy}.svg`}
              width={stop.width} height={stop.height} alt={stop.name}
            />
            {striking && <Sprite src={`${A}/fx/hit_ring.png`} frames={16} width={240} height={240} duration={0.7} once className="abs" style={{ left: stop.width / 2 - 120, top: stop.height / 2 - 140 }} />}
            {defeated && <Sprite src={`${A}/fx/shadow_puff.png`} frames={16} width={320} height={320} duration={1.2} once className="abs" style={{ left: stop.width / 2 - 160, top: stop.height / 2 - 200 }} />}
          </div>
        </div>
      )}
      {walking && (
        <>
          <Sprite src={`${A}/fx/dust.png`} frames={16} width={320} height={320} duration={1} className="abs" style={{ left: 380, top: 640, opacity: 0.5 }} />
          <Sprite src={`${A}/fx/dust.png`} frames={16} width={320} height={320} duration={1} className="abs" style={{ left: 900, top: 640, opacity: 0.5, animationDelay: '.5s' }} />
        </>
      )}

      {/* first-person dino arms */}
      <img className="pov pov-shield" src={`${A}/pov/${hurt && shield !== 'gone' ? 'shield_block_1' : SHIELD_FILE[shield]}.png`} alt="" />
      {hurt && lastChance && <img className="abs float-up" src={`${A}/pov/shield_shards.png`} style={{ left: 20, top: 400, width: 445, height: 400 }} alt="" />}
      {!striking && <img className="pov pov-sword" src={`${A}/pov/sword_idle.png`} alt="" />}

      <div className="vignette" />
      {(lastChance || panic) && room.status !== 'walking' && <div className="danger" style={panic && !lastChance ? { opacity: 0.6 } : undefined} />}

      {/* HUD */}
      <div className="abs hud-left">
        <Road stop={state.stop} />
        <ShieldRow lives={state.lives} maxLives={DIFFICULTY[difficulty].lives} />
      </div>
      <div className="abs hud-right">
        <div className="tag" style={{ padding: '10px 16px', fontSize: 18 }}>STOP {state.stop + 1}/5 · {stop.scene}</div>
        {question && <div className="tag" style={{ padding: '8px 14px', fontSize: 16, background: 'var(--dino-dark)' }}>UNIT {question.unit}</div>}
        {state.combo >= 2 && <div className="tag pop-in" style={{ padding: '8px 14px', fontSize: 16, background: 'var(--yellow)', color: 'var(--ink)' }}>COMBO x{state.combo}</div>}
      </div>
      {room.status === 'question' && <div className="abs" style={{ left: 744, top: 20 }}><Timer seconds={seconds} panic={panic} /></div>}

      {walking && <WalkBanner stopIndex={state.stop} />}
      {room.status === 'question' && question && (
        <QuestionPanel text={question.text} options={question.options} state={state} answered={answered} eligible={eligible} retry={question.attempt > 0} />
      )}
      {reveal && question && (striking
        ? <StrikePanel text={question.text} options={question.options} votes={reveal.votes ?? [0, 0, 0, 0]} correct={reveal.correct ?? -1} percent={reveal.percent} strikers={reveal.strikers ?? []} more={reveal.moreStrikers ?? 0} />
        : <ShieldPanel percent={reveal.percent} lastChance={lastChance} lost={state.lives === 0} />)}

      {/* swing in front of the panel, raised above it */}
      {striking && (
        <>
          {/* frames are 302 art px wide (Landlord's 192 + 110 px of blade we added) -> 1510 px; anchored to the right edge */}
          <img className="abs swing" src={`${A}/fx/swing_arc_3.png`} style={{ width: 1510, height: 960, opacity: 0.85 }} alt="" />
          <img className="abs swing" src={`${A}/pov/sword_attack_2_arm_long.png`} style={{ width: 1510, height: 1500 }} alt="" />
          <div className="abs disp outline float-up" style={{ left: 520, top: 400, fontSize: 52, color: 'var(--yellow)' }}>-1</div>
          <div className="abs disp outline pop-in" style={{ left: 0, top: 28, width: 1600, textAlign: 'center', fontSize: 48, lineHeight: '60px', color: 'var(--yellow)', transform: 'rotate(-2deg)' }}>
            {defeated ? `${stop.name} DEFEATED!` : 'SWORD STRIKE!'}
          </div>
        </>
      )}
      {hurt && (
        <>
          <div className="abs disp outline pop-in" style={{ left: 250, top: 300, fontSize: 36, transform: 'rotate(-10deg)' }}>CLANK!</div>
          {lastChance && (
            <div className="abs col" style={{ left: 0, top: 110, width: 1600, alignItems: 'center', gap: 22 }}>
              <div className="disp outline-lg pop-in" style={{ fontSize: 84, lineHeight: '92px', color: 'var(--red)', transform: 'rotate(-3deg)' }}>LAST CHANCE</div>
              <div className="tag" style={{ padding: '10px 18px', fontSize: 18, background: 'var(--red-dark)' }}>ONE MORE MISS AND IT'S OVER</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WalkBanner({ stopIndex }: { stopIndex: number }) {
  const stop = STOPS[stopIndex]!;
  const prev = stopIndex > 0 ? STOPS[stopIndex - 1] : null;
  return (
    <div className="abs col" style={{ left: 0, top: 160, width: 1600, alignItems: 'center', gap: 26 }}>
      <div className="disp outline pop-in" style={{ fontSize: 48, lineHeight: '56px', color: 'var(--yellow)' }}>{prev ? `${prev.name} DEFEATED` : 'THE JOURNEY BEGINS'}</div>
      <div className="panel row" style={{ gap: 22, padding: '20px 26px 24px' }}>
        <img src={`${A}/sprites/${stop.enemy}.svg`} style={{ width: stop.width * 0.4, height: stop.height * 0.4, filter: 'brightness(.6)' }} alt="" />
        <div className="col" style={{ gap: 8 }}>
          <div className="disp" style={{ fontSize: 15, color: 'var(--dino-light)' }}>STOP {stopIndex + 1} / 5 · {stop.scene}</div>
          <div style={{ fontWeight: 700, fontSize: 30 }}>{stop.teaser}</div>
        </div>
      </div>
    </div>
  );
}

function Options({ options, votes, correct }: { options: string[]; votes?: number[]; correct?: number }) {
  return (
    <div className="opts" translate="no">
      {options.map((text, i) => {
        const s = ANSWER_STYLES[i]!;
        const isCorrect = correct === i;
        return (
          <div key={i} className={`opt ${s.color} ${correct != null && !isCorrect ? 'dim' : ''} ${isCorrect ? 'correct' : ''}`}>
            <img src={s.icon} width={40} height={40} alt={s.shape} />
            <span className="txt">{text}</span>
            {votes && <span className="votes">{votes[i] ?? 0}</span>}
            {isCorrect && <span className="okbox" style={{ width: 36, height: 36 }}><img src={`${A}/sprites/check.svg`} width={20} height={14} alt="correct" /></span>}
          </div>
        );
      })}
    </div>
  );
}

function QuestionPanel({ text, options, state, answered, eligible, retry }: { text: string; options: string[]; state: BattleState; answered: number; eligible: number; retry: boolean }) {
  return (
    <div className="abs panel pxframe col pop-in" style={{ left: 330, top: 558, width: 940, gap: 18, padding: '22px 28px 28px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="disp" style={{ fontSize: 16, letterSpacing: '.06em', color: retry ? 'var(--yellow)' : 'var(--dino-light)' }}>
          {retry ? 'TRY AGAIN · ANSWERS SHUFFLED' : `HIT ${state.enemyMaxHp - state.enemyHp + 1} OF ${state.enemyMaxHp}`}
        </div>
        <div className="row" style={{ gap: 10 }} aria-live="polite">
          <div className="bar" style={{ width: 120 }}><div style={{ width: `${eligible ? (answered / eligible) * 100 : 0}%`, background: 'var(--dino-light)' }} /></div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{eligible ? `${answered}/${eligible} answered` : 'Waiting for the pack to connect…'}</div>
        </div>
      </div>
      <div translate="no" style={{ fontWeight: 700, fontSize: 40, lineHeight: '46px' }}>{text}</div>
      <Options options={options} />
    </div>
  );
}

function StrikePanel({ text, options, votes, correct, percent, strikers, more }: { text: string; options: string[]; votes: number[]; correct: number; percent: number; strikers: string[]; more: number }) {
  return (
    <div className="abs panel col" style={{ left: 330, top: 558, width: 940, gap: 18, padding: '22px 28px 28px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="disp" style={{ fontSize: 16, letterSpacing: '.06em', color: 'var(--green)' }}>CORRECT · {percent}% GOT IT</div>
        <div className="row" style={{ gap: 10 }}>
          <div className="bar" style={{ width: 120 }}><div style={{ width: `${percent}%`, background: 'var(--green)' }} /></div>
          {strikers.length > 0 && <div style={{ fontWeight: 700, fontSize: 20 }}>{strikers.join(', ')}{more ? ` + ${more} more` : ''} struck</div>}
        </div>
      </div>
      <div translate="no" style={{ fontWeight: 700, fontSize: 40, lineHeight: '46px' }}>{text}</div>
      <Options options={options} votes={votes} correct={correct} />
    </div>
  );
}

function ShieldPanel({ percent, lastChance, lost }: { percent: number; lastChance: boolean; lost: boolean }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setCount(c => Math.max(1, c - 1)), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="abs panel row" style={{ left: 400, top: 640, width: 800, gap: 28, padding: '26px 30px 30px' }}>
      <div className="col" style={{ alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div className="disp" style={{ fontSize: 44, color: 'var(--red)' }}>{percent}%</div>
        <div className="disp muted" style={{ fontSize: 14, letterSpacing: '.06em' }}>GOT IT</div>
      </div>
      <div className="col" style={{ gap: 10, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 34, lineHeight: '38px' }}>{lost ? 'The shield is gone…' : 'Not enough. Try again.'}</div>
        <div className="muted" style={{ fontWeight: 500, fontSize: 20, lineHeight: '26px' }}>
          {lost ? 'The shadows strike one last time.' : `Same question, answers shuffled. The right answer stays secret.${lastChance ? ' No shield left!' : ''}`}
        </div>
      </div>
      {!lost && (
        <div className="btn btn-primary col" style={{ flexShrink: 0, padding: '16px 18px', gap: 6 }}>
          <span style={{ fontSize: 14 }}>RETRY IN</span><span style={{ fontSize: 32, lineHeight: '32px' }}>{count}</span>
        </div>
      )}
    </div>
  );
}
