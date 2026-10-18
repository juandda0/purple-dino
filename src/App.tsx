import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// Two separate bundles: phones only download the controller; the projector chunk carries the
// question bank, the game loop and the audio.
const HostApp = lazy(() => import('./host/HostApp'));
const PlayApp = lazy(() => import('./play/PlayApp'));

const Loading = () => <div className="disp" style={{ padding: 32, textAlign: 'center' }}>Loading…</div>;

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HostApp />} />
          <Route path="/join" element={<PlayApp />} />
          <Route path="/join/:code" element={<PlayApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
