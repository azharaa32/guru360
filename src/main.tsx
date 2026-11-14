import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Ikon } from './components/Ikon';
import { NavBawah } from './components/Rangka';
import { useDalamTalian, useLaluan } from './lib/hooks';
import { Profil, Takwim } from './screens/Lain';
import { Utama } from './screens/Utama';
import './theme.css';

function App() {
  const laluan = useLaluan();
  const dalamTalian = useDalamTalian();
  return (
    <div className="apl">
      {!dalamTalian && (
        <div className="jalur-talian" role="status">
          <Ikon nama="tiadaTalian" saiz={16} />
          Tiada internet. Guru360 masih boleh dibuka.
        </div>
      )}
      {laluan === 'utama' && <Utama />}
      {laluan === 'takwim' && <Takwim />}
      {laluan === 'profil' && <Profil dalamTalian={dalamTalian} />}
      <NavBawah aktif={laluan} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((ralat) => console.error('Service worker gagal didaftar', ralat));
  });
}
