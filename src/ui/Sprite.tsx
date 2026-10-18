import type { CSSProperties } from 'react';

interface SpriteProps {
  src: string; // horizontal strip
  frames: number;
  width: number; // one frame, already scaled
  height: number;
  duration?: number; // seconds per loop
  frame?: number; // show a single frame (no animation)
  once?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/** Animated sprite strip (CSS steps animation, so it costs no JS per frame). */
export function Sprite({ src, frames, width, height, duration = 0.8, frame, once, className = '', style, label }: SpriteProps) {
  const vars = { '--n': frames, '--fw': `${width}px`, '--fh': `${height}px`, '--t': `${duration}s`, '--f': frame ?? 0 } as CSSProperties;
  const mode = frame != null ? 'still' : once ? 'once' : '';
  return (
    <div
      className={`spr ${mode} ${className}`}
      style={{ ...vars, backgroundImage: `url(${src})`, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
