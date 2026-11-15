import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/kaushan-script/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-900.css';
import { App } from './ui/App';
import './ui/styles.css';

// Hors connexion : seulement sur la version en ligne, jamais pendant le développement.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sans service worker, le jeu fonctionne quand même */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
