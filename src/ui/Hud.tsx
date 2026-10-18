import { STOP_COUNT } from '../game/rules';

const A = '/assets';

/** Road from the dino to the castle: one marker per stop. */
export function Road({ stop, dim = false }: { stop: number; dim?: boolean }) {
  return (
    <div className="road tag" role="img" aria-label={`Stop ${stop + 1} of ${STOP_COUNT}`}>
      <img src={`${A}/dinos/avatar_sena.png`} width={30} height={34} alt="" />
      {Array.from({ length: STOP_COUNT }, (_, i) => (
        <span key={i} className="row" style={{ gap: 8 }}>
          <span className={`seg ${i <= stop ? 'done' : ''}`} />
          <span className={`stop ${i < stop ? 'won' : i === stop ? 'now' : ''}`} />
        </span>
      ))}
      <span className="seg" />
      <img src={`${A}/sprites/castle.svg`} width={56} height={40} alt="" style={{ opacity: dim ? 0.5 : 1 }} />
    </div>
  );
}

/** Shield crests: one per hit the shield can still take (the last life is played without shield). */
export function ShieldRow({ lives, maxLives }: { lives: number; maxLives: number }) {
  const slots = Math.max(1, maxLives - 1);
  const full = Math.max(0, lives - 1);
  const noShield = lives <= 1;
  return (
    <div className="shield-row tag" role="img" style={noShield ? { background: 'var(--red-dark)' } : undefined} aria-label={noShield ? 'No shield left' : `Shield: ${full} of ${slots}`}>
      {noShield ? 'NO SHIELD' : 'SHIELD'}
      {Array.from({ length: slots }, (_, i) => (
        <img key={i} className="crest" src={`${A}/ui/${i < full ? 'crest_full' : 'crest_empty'}.png`} alt="" />
      ))}
    </div>
  );
}

export function HpBars({ hp, max }: { hp: number; max: number }) {
  return (
    <div className="row" style={{ gap: 6 }} role="img" aria-label={`${hp} of ${max} hits left`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={`hpbar ${i < hp ? '' : 'empty'}`} />)}
    </div>
  );
}

/** Countdown: just the seconds in a framed box (the 12-dot ring was dropped, 2026-10-18). */
export function Timer({ seconds, panic }: { seconds: number; panic: boolean }) {
  return (
    <div className={`timer tag ${panic ? 'panic' : ''}`} role="timer" aria-label={`${seconds} seconds left`}>
      <span className="disp" style={{ fontSize: 40, color: panic ? 'var(--red)' : 'var(--yellow)' }}>{seconds}</span>
    </div>
  );
}
