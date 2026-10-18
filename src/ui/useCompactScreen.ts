import { useSyncExternalStore } from 'react';

// phones, portrait tablets and short landscape phones: a 1600x900 stage scaled down there is unreadable
const COMPACT = '(max-width: 1099px), (max-height: 499px), (orientation: portrait)';
const subscribe = (onChange: () => void) => {
  const m = window.matchMedia(COMPACT);
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
};

/** True where the menus should reflow instead of using the scaled projector stage (see Stage `fluid`). */
export const useCompactScreen = () => useSyncExternalStore(subscribe, () => window.matchMedia(COMPACT).matches);
