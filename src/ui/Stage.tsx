import { useLayoutEffect, useState, type ReactNode } from 'react';

const W = 1600;
const H = 900;

/** Fixed 1600x900 projector stage (320x180 art grid x5), scaled to fit the window with letterboxing. */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="stage-wrap">
      <div className={`screen ${className}`} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
