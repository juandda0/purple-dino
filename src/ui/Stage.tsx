import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';

const W = 1600;
const H = 900;

/**
 * Projector stage. Game content is laid out on a fixed 1600x900 "safe area" (the 320x180 art grid x5), scaled to fit.
 * The window is always filled: whatever is left on the sides (or top/bottom) is exposed through --ox / --oy, so
 * backgrounds, the dino arms and edge-anchored HUD extend to the real screen edges instead of showing black bars.
 * `fluid`: no fixed stage, the screen flows at the window's width and scrolls (menus on small screens, see .fluid).
 */
export function Stage({ children, className = '', fluid = false }: { children: ReactNode; className?: string; fluid?: boolean }) {
  const [box, setBox] = useState({ scale: 1, ox: 0, oy: 0 });
  useLayoutEffect(() => {
    const fit = () => {
      const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      setBox({ scale, ox: (window.innerWidth / scale - W) / 2, oy: (window.innerHeight / scale - H) / 2 });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const vars = { '--ox': `${box.ox}px`, '--oy': `${box.oy}px`, transform: `scale(${box.scale})` } as CSSProperties;
  return (
    <div className={`stage-wrap ${fluid ? 'fluid' : ''}`}>
      <div className={`screen ${fluid ? 'fluid' : ''} ${className}`} style={fluid ? undefined : vars}>
        {children}
      </div>
    </div>
  );
}
