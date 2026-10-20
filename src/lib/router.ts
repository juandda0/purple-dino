// The app has three routes (/, /join, /join/:code): a few lines over the History API instead of react-router,
// which weighed ~25 KB gzip in the bundle every phone downloads.
import { useSyncExternalStore } from 'react';

const NAVIGATE = 'purple-dino:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE, onChange);
  };
}

/** Current path, re-rendering on navigate() and the browser's back/forward. */
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname);

/** Whether this history entry was opened with { fromStart: true } (JOIN A GAME on the start screen). */
export const useFromStart = () => useSyncExternalStore(subscribe, () => (history.state as { fromStart?: boolean } | null)?.fromStart === true);

export function navigate(to: string, { replace = false, state = null }: { replace?: boolean; state?: unknown } = {}) {
  if (replace) history.replaceState(state, '', to);
  else history.pushState(state, '', to);
  window.dispatchEvent(new Event(NAVIGATE));
}

/** `/join` -> null code, `/join/1234` -> '1234'; undefined for any other path. */
export function matchJoin(path: string): { code: string | null } | undefined {
  const m = /^\/join(?:\/([^/]+))?\/?$/.exec(path);
  return m ? { code: m[1] ?? null } : undefined;
}
