import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Ikon } from './components/Ikon';
import { NavBawah } from './components/Rangka';
import { useProfil, useSesi } from './lib/akaun';
import { useDalamTalian, useLaluan } from './lib/hooks';
import { useJadual } from './lib/jadual';
import { useTemplat } from './lib/templat';
import { Profil, Takwim } from './screens/Lain';
import { Jadual } from './screens/Jadual';
import { KataLaluanBaharu, Masuk, Memuat } from './screens/Masuk';
import { Templat } from './screens/Templat';
import { Utama } from './screens/Utama';
import './theme.css';

function App() {
  const laluan = useLaluan();
  const dalamTalian = useDalamTalian();
  const { keadaan, pemulihan, tamatPemulihan } = useSesi();
  const sesi = keadaan.status === 'ada' ? keadaan.sesi : null;
  const { profil, sedia, belumHantar, simpan } = useProfil(sesi?.user.id ?? null, dalamTalian);
  const jadual = useJadual(sesi?.user.id ?? null, dalamTalian);
  const templat = useTemplat(sesi?.user.id ?? null, dalamTalian);

  const jalur = !dalamTalian && (
    <div className="jalur-talian" role="status">
      <Ikon nama="tiadaTalian" saiz={16} />
      Tiada internet. Guru360 masih boleh dibuka.
    </div>
  );

  if (keadaan.status === 'memuat') return <Memuat />;
  if (!sesi)
    return (
      <div className="apl">
        {jalur}
        <Masuk />
      </div>
    );
  if (pemulihan)
    return (
      <div className="apl">
        {jalur}
        <KataLaluanBaharu selesai={tamatPemulihan} />
      </div>
    );
  return (
    <div className="apl">
      {jalur}
      {laluan === 'utama' && <Utama profil={profil} sedia={sedia} bilWaktu={jadual.waktu.length} />}
      {laluan === 'jadual' && <Jadual negeri={profil?.negeri ?? null} {...jadual} />}
      {laluan === 'takwim' && <Takwim />}
      {laluan === 'profil' && (
        <Profil
          dalamTalian={dalamTalian}
          emel={sesi.user.email ?? ''}
          profil={profil}
          sedia={sedia}
          belumHantar={belumHantar}
          simpan={simpan}
        />
      )}
      {laluan === 'templat' && (
        <Templat
          profil={profil}
          templat={templat.templat}
          sedia={templat.sedia}
          belumHantar={templat.belumHantar}
          logo={templat.logo}
          simpan={templat.simpan}
          tetapLogo={templat.tetapLogo}
        />
      )}
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
