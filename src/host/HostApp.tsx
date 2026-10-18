import { useCallback, useEffect, useRef } from 'react';
import { music } from '../audio/music';
import { setSfxMuted } from '../audio/sfx';
import { Stage } from '../ui/Stage';
import { CourseScreen, DifficultyScreen, StartScreen, UnitsScreen } from './screens/Menus';
import { RoomScreen } from './RoomScreen';
import { useHost } from './store';

/** Teacher / projector app (lazy-loaded: phones never download it, nor the question bank). */
export default function HostApp() {
  const { screen, code, muted, setMuted } = useHost();
  const shaker = useRef<HTMLDivElement>(null);
  // restart the CSS shake on the same element (re-keying would remount the room and its game controller)
  const shake = useCallback(() => {
    const el = shaker.current;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }, []);

  // the sound preference is remembered between sessions
  useEffect(() => {
    music.setMuted(muted);
    setSfxMuted(muted);
  }, [muted]);

  return (
    <Stage>
      <div ref={shaker} className="abs" style={{ inset: 0 }}>
        {screen === 'start' && <StartScreen />}
        {screen === 'course' && <CourseScreen />}
        {screen === 'units' && <UnitsScreen />}
        {screen === 'difficulty' && <DifficultyScreen />}
        {screen === 'room' && code && <RoomScreen code={code} onShake={shake} />}
      </div>
      <button className="abs tag edge-br" style={{ padding: '8px 10px', fontSize: 10, zIndex: 5 }} onClick={() => setMuted(!muted)} aria-pressed={muted}>
        {muted ? 'SOUND OFF' : 'SOUND ON'}
      </button>
    </Stage>
  );
}
