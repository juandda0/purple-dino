import { useCallback, useEffect, useRef } from 'react';
import { music } from '../audio/music';
import { setSfxMuted } from '../audio/sfx';
import { Stage } from '../ui/Stage';
import { useCompactScreen } from '../ui/useCompactScreen';
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

  // the lobby and the battle are made for the projector; the menus reflow on phones and portrait tablets
  const fluid = useCompactScreen() && screen !== 'room';

  // after a screen change the pressed button is gone: move focus to the new screen's heading
  useEffect(() => {
    shaker.current?.closest('.stage-wrap')?.scrollTo({ top: 0 }); // fluid menus scroll: start the new one at the top
    const h = shaker.current?.querySelector<HTMLElement>('h1');
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [screen]);

  // the sound preference is remembered between sessions
  useEffect(() => {
    music.setMuted(muted);
    setSfxMuted(muted);
  }, [muted]);

  return (
    <Stage fluid={fluid}>
      <div ref={shaker} className="host-screens">
        {screen === 'start' && <StartScreen />}
        {screen === 'course' && <CourseScreen />}
        {screen === 'units' && <UnitsScreen />}
        {screen === 'difficulty' && <DifficultyScreen />}
        {screen === 'room' && code && <RoomScreen code={code} onShake={shake} />}
      </div>
      <button className="abs tag edge-br" style={{ padding: '10px 12px', fontSize: 14, zIndex: 5 }} onClick={() => setMuted(!muted)} aria-label="Sound" aria-pressed={!muted}>
        {muted ? 'SOUND OFF' : 'SOUND ON'}
      </button>
    </Stage>
  );
}
