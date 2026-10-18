import { useCallback, useEffect, useRef, useState } from 'react';
import { music } from '../audio/music';
import { playSfx } from '../audio/sfx';
import { useConnectionLost, useRoom } from '../data/hooks';
import { clearAnswers, deleteRoom, removePlayer, updateRoom, watchAnswers, watchPresence } from '../data/room';
import { hostOwnsRoom } from '../game/ownership';
import { currentUid } from '../lib/firebase';
import { GameController } from './controller';
import { Battle } from './screens/Battle';
import { GameOver, Victory } from './screens/End';
import { Lobby } from './screens/Lobby';
import { useHost } from './store';

/** Everything that happens inside a room on the teacher's screen. */
export function RoomScreen({ code, onShake }: { code: string; onShake: () => void }) {
  const roomState = useRoom(code);
  const { stats, setStats, setCode, go } = useHost();
  const controller = useRef<GameController | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [answeredCount, setAnsweredCount] = useState(0);
  const [trouble, setTrouble] = useState(false); // writes keep being rejected
  const offline = useConnectionLost();

  useEffect(() => watchPresence(code, setOnline), [code]);
  useEffect(() => () => controller.current?.dispose(), []);

  // a room that vanished, changed hands or is only a partial local copy is not ours any more (Lote 11.4)
  const room = roomState.status === 'ready' && hostOwnsRoom(roomState.room, currentUid()) ? roomState.room : null;
  const gone = roomState.status !== 'loading' && !room;
  useEffect(() => {
    if (!gone) return;
    controller.current?.dispose();
    controller.current = null;
    void music.play('lobby');
  }, [gone]);
  const questionKey = room?.status === 'question' ? room.question?.key : undefined;

  // live "11/15 answered"
  useEffect(() => {
    if (!questionKey) return;
    setAnsweredCount(0);
    return watchAnswers(code, questionKey, a => setAnsweredCount(Object.keys(a).length));
  }, [code, questionKey]);

  // end-of-game music
  const status = room?.status;
  useEffect(() => {
    if (status === 'won') void music.play('victory');
    if (status === 'lost') void music.play('defeat');
    if (status === 'won' || status === 'lost') {
      controller.current?.dispose();
      controller.current = null;
    }
  }, [status]);

  const start = useCallback(() => {
    if (!room) return;
    playSfx('select');
    controller.current?.dispose();
    setStats(null);
    setTrouble(false);
    controller.current = new GameController(code, room.config, setStats, setTrouble);
    controller.current.start();
  }, [code, room, setStats]);

  const exit = useCallback(async (to: 'start' | 'units') => {
    playSfx('back');
    controller.current?.dispose();
    controller.current = null;
    await deleteRoom(code).catch(() => undefined); // the game data is deleted when the teacher leaves
    setCode(null);
    setStats(null);
    void music.play('lobby');
    go(to);
  }, [code, go, setCode, setStats]);

  /** Same class, same room: back to the lobby with everybody "not ready". */
  const playAgain = useCallback(async () => {
    if (!room) return;
    playSfx('select');
    const patch: Record<string, unknown> = { status: 'lobby', state: null, question: null, reveal: null };
    for (const uid of Object.keys(room.players ?? {})) patch[`players/${uid}/ready`] = false;
    await clearAnswers(code).catch(() => undefined);
    await updateRoom(code, patch);
    setStats(null);
    void music.play('lobby');
  }, [code, room, setStats]);

  return (
    <>
      {renderView()}
      {offline || trouble ? (
        <div className="abs tag" role="alert" style={{ left: 450, top: 140, width: 700, padding: '14px 18px', fontSize: 16, textAlign: 'center', background: 'var(--red-dark)', zIndex: 5 }}>
          {offline ? 'NO CONNECTION — CHECK THE WI-FI. THE GAME WILL CONTINUE WHEN IT IS BACK.' : 'THE GAME COULD NOT BE SAVED. RETRYING…'}
        </div>
      ) : null}
    </>
  );

  function renderView() {
    if (roomState.status === 'loading') return <Centered>Opening the room…</Centered>;
    if (!room) {
      return (
        <Centered>
          The room is gone.
          <button className="btn btn-primary" style={{ padding: '18px 24px', fontSize: 16, marginTop: 24 }} onClick={() => { setCode(null); go('start'); }}>BACK TO START</button>
        </Centered>
      );
    }

    // same eligible set the controller decides with (published with the question)
    const eligible = room.question?.eligible ?? 0;

    switch (room.status) {
      case 'lobby':
        return <Lobby code={code} room={room} online={online} onStart={start} onBack={() => void exit('units')} onRemove={uid => void removePlayer(code, uid).catch(() => playSfx('error'))} />;
      case 'won':
        return <Victory room={room} stats={stats} onPlayAgain={() => void playAgain()} onChangeUnits={() => void exit('units')} onExit={() => void exit('start')} />;
      case 'lost':
        return <GameOver room={room} stats={stats} onPlayAgain={() => void playAgain()} onChangeUnits={() => void exit('units')} onExit={() => void exit('start')} />;
      default:
        // walking / question / reveal. If the teacher reloaded mid-battle the controller is gone: offer to restart.
        if (!controller.current) {
          return (
            <Centered>
              This battle was interrupted.
              <button className="btn btn-primary" style={{ padding: '18px 24px', fontSize: 16, marginTop: 24 }} onClick={() => void playAgain()}>BACK TO THE LOBBY</button>
            </Centered>
          );
        }
        return room.state ? <Battle room={room} answered={Math.min(answeredCount, eligible)} eligible={eligible} onShake={onShake} /> : null;
    }
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="abs col disp" style={{ inset: 0, alignItems: 'center', justifyContent: 'center', fontSize: 22, textAlign: 'center' }}>
      <img className="bg" src="/assets/bg/menu.png" alt="" style={{ zIndex: -1 }} />
      {children}
    </div>
  );
}
