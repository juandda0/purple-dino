import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// pixel fonts served from the site itself (SIL OFL), not from Google: no third-party request per student
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './styles/game.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
