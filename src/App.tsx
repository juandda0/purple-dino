import { lazy, Suspense, useEffect } from 'react';
import { misconfigured } from './lib/firebase';
import { matchJoin, navigate, usePath } from './lib/router';
import { ErrorBoundary } from './ui/ErrorBoundary';

// Two separate bundles: phones only download the controller; the projector chunk carries the
// question bank, the game loop and the audio.
const HostApp = lazy(() => import('./host/HostApp'));
const PlayApp = lazy(() => import('./play/PlayApp'));

const Loading = () => <div className="disp" style={{ padding: 32, textAlign: 'center' }}>Loading…</div>;

/** Unknown paths go to the start screen. */
function ToStart() {
  useEffect(() => navigate('/', { replace: true }), []);
  return null;
}

export function App() {
  const path = usePath();
  const join = matchJoin(path);
  return (
    <ErrorBoundary>
      {misconfigured && (
        <div role="alert" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, padding: 8, background: 'var(--red)', textAlign: 'center', fontWeight: 700 }}>
          This build has no Firebase project configured (see README → Deploy).
        </div>
      )}
      <Suspense fallback={<Loading />}>
        {path === '/' ? <HostApp /> : join ? <PlayApp codeParam={join.code} /> : <ToStart />}
      </Suspense>
    </ErrorBoundary>
  );
}
