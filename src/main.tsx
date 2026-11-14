import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Ikon } from './components/Ikon';
import { NavBawah } from './components/Rangka';
import { useProfil, useSesi } from './lib/akaun';
import { useDalamTalian, useLaluan } from './lib/hooks';
import { useJadual } from './lib/jadual';
import { binaKalendar, useCutiSendiri } from './lib/kalendar';
import { useDokumen } from './lib/dokumen';
import { useProgram } from './lib/program';
import { useRph } from './lib/rph';
import { useTemplat } from './lib/templat';
import { Profil } from './screens/Lain';
import { Takwim } from './screens/Takwim';
import { Cuti } from './screens/Cuti';
import { HariIni } from './screens/HariIni';
import { Jadual } from './screens/Jadual';
import { KertasEdit, KertasSenarai } from './screens/KertasKerja';
import { KataLaluanBaharu, Masuk, Memuat } from './screens/Masuk';
import { RphEdit, RphMinggu } from './screens/Rph';
import { SuratEdit, SuratSenarai } from './screens/Surat';
import { Templat } from './screens/Templat';
import { Utama } from './screens/Utama';
import './theme.css';

function App() {
  const { nama: laluan, param } = useLaluan();
  const dalamTalian = useDalamTalian();
  const { keadaan, pemulihan, tamatPemulihan } = useSesi();
  const sesi = keadaan.status === 'ada' ? keadaan.sesi : null;
  const { profil, sedia, belumHantar, simpan } = useProfil(sesi?.user.id ?? null, dalamTalian);
  const jadual = useJadual(sesi?.user.id ?? null, dalamTalian);
  const cutiSendiri = useCutiSendiri(sesi?.user.id ?? null, dalamTalian);
  const templat = useTemplat(sesi?.user.id ?? null, dalamTalian);
  const rph = useRph(sesi?.user.id ?? null, dalamTalian);
  const prog = useProgram(sesi?.user.id ?? null, dalamTalian);
  const dok = useDokumen(sesi?.user.id ?? null, dalamTalian);
  const negeri = profil?.negeri ?? null;
  const kal = useMemo(() => binaKalendar(negeri, cutiSendiri.cuti), [negeri, cutiSendiri.cuti]);

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
      {laluan === 'utama' && <Utama profil={profil} sedia={sedia} kal={kal} waktu={jadual.waktu} rph={rph.rph} />}
      {laluan === 'hariini' && <HariIni kal={kal} waktu={jadual.waktu} rph={rph.rph} cuti={cutiSendiri.cuti} program={prog.program} sedia={jadual.sedia} />}
      {laluan === 'jadual' && <Jadual negeri={profil?.negeri ?? null} {...jadual} />}
      {laluan === 'rph' &&
        (() => {
          const asas = { uid: sesi.user.id, profil, kal, waktu: jadual.waktu, templat: templat.templat, logo: templat.logo, ...rph };
          return param[0] === 'e' ? (
            <RphEdit key={`${param[1]}/${param[2]}`} {...asas} tarikh={param[1]} kunci={param[2]} fokus={param[3]} />
          ) : (
            <RphMinggu {...asas} tarikh={param[0] === 'm' ? param[1] : undefined} />
          );
        })()}
      {laluan === 'kertas' &&
        (() => {
          const asas = { ...dok, program: prog.program, profil, templat: templat.templat, logo: templat.logo };
          return param[0] && param[0] !== 'p' ? <KertasEdit key={param[0]} {...asas} id={param[0]} /> : <KertasSenarai {...asas} programId={param[0] === 'p' ? param[1] : undefined} />;
        })()}
      {laluan === 'surat' &&
        (() => {
          const asas = { ...dok, program: prog.program, profil, templat: templat.templat, logo: templat.logo };
          return param[0] && param[0] !== 'p' ? <SuratEdit key={param[0]} {...asas} id={param[0]} /> : <SuratSenarai {...asas} programId={param[0] === 'p' ? param[1] : undefined} />;
        })()}
      {laluan === 'takwim' && (
        <Takwim
          negeri={profil?.negeri ?? null}
          cuti={cutiSendiri.cuti}
          program={prog.program}
          programSedia={prog.sedia}
          programTertunda={prog.tertunda}
          programRalat={prog.ralat}
          simpanProgram={prog.simpanProgram}
          padamProgram={prog.padamProgram}
        />
      )}
      {laluan === 'cuti' && <Cuti negeri={profil?.negeri ?? null} {...cutiSendiri} />}
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
