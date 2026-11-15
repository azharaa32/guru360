import { StrictMode, useMemo, useState } from 'react';
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
import { useKeahlian } from './lib/sekolah';
import { pautanEmel } from './lib/supabase';
import { useTemplat } from './lib/templat';
import { Profil } from './screens/Lain';
import { Pengurusan, TiadaSekolah } from './screens/Sekolah';
import { Panduan } from './screens/Panduan';
import { Takwim } from './screens/Takwim';
import { Cuti } from './screens/Cuti';
import { JobskopEdit, JobskopPilih, JobskopUtama } from './screens/Jobskop';
import { HariIni } from './screens/HariIni';
import { Jadual } from './screens/Jadual';
import { KertasEdit, KertasSenarai } from './screens/KertasKerja';
import { KataLaluanBaharu, Masuk, Memuat, TerimaPautan } from './screens/Masuk';
import { RphEdit, RphMinggu } from './screens/Rph';
import { MinitEdit, MinitSenarai } from './screens/Minit';
import { OprEdit, OprSenarai } from './screens/Opr';
import { SuratEdit, SuratSenarai } from './screens/Surat';
import { Templat } from './screens/Templat';
import { Utama } from './screens/Utama';
import './theme.css';

function App() {
  const { nama: laluan, param } = useLaluan();
  const dalamTalian = useDalamTalian();
  const { keadaan, pemulihan, mulaTetapKata, tamatPemulihan } = useSesi();
  const [pautan, setPautan] = useState(pautanEmel);
  const sesi = keadaan.status === 'ada' ? keadaan.sesi : null;
  const uid = sesi?.user.id ?? null;
  const { keahlian, sedia: keahlianSedia, ralat: ralatKeahlian, cubaLagi } = useKeahlian(uid, dalamTalian);
  // Hanya guru aktif di sekolah yang diluluskan memakai modul mengajar; akaun pengurusan tidak memuat data guru.
  const mengajar = keahlian.peranan === 'guru' && keahlian.sekolah?.status === 'aktif';
  const pengurusan = keahlian.ibuPejabat || keahlian.peranan === 'admin';
  const uidGuru = mengajar ? uid : null;
  const { profil, sedia, belumHantar, simpan } = useProfil(uid, dalamTalian);
  const jadual = useJadual(uidGuru, dalamTalian);
  const cutiSendiri = useCutiSendiri(uidGuru, dalamTalian);
  // Kepala surat dikongsi satu sekolah: guru membacanya, admin sekolah menetapkannya.
  const adminAktif = keahlian.peranan === 'admin' && keahlian.sekolah?.status === 'aktif';
  const templat = useTemplat(uid && (mengajar || adminAktif) ? (keahlian.sekolah?.id ?? null) : null, dalamTalian);
  const rph = useRph(uidGuru, dalamTalian);
  const prog = useProgram(uidGuru, dalamTalian);
  const dok = useDokumen(uidGuru, dalamTalian);
  const negeri = profil?.negeri ?? null;
  const kal = useMemo(() => binaKalendar(negeri, cutiSendiri.cuti), [negeri, cutiSendiri.cuti]);

  const jalur = !dalamTalian && (
    <div className="jalur-talian" role="status">
      <Ikon nama="tiadaTalian" saiz={16} />
      Tiada internet. Guru360 masih boleh dibuka.
    </div>
  );

  if (keadaan.status === 'memuat') return <Memuat />;
  if (pautan)
    return (
      <div className="apl">
        {jalur}
        <TerimaPautan
          pautan={pautan}
          berjaya={() => {
            mulaTetapKata();
            setPautan(null);
          }}
          tutup={() => setPautan(null)}
        />
      </div>
    );
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
  if (!keahlianSedia && !ralatKeahlian) return <Memuat />;
  if (!mengajar && !pengurusan)
    return (
      <div className="apl">
        {jalur}
        <TiadaSekolah
          emel={sesi.user.email ?? ''}
          sebab={keahlian.sekolah?.status === 'menunggu' ? 'menunggu' : keahlian.sekolah?.status === 'ditolak' ? 'ditolak' : 'tiada'}
          ralat={keahlianSedia ? null : ralatKeahlian}
          cubaLagi={cubaLagi}
        />
      </div>
    );
  if (!mengajar)
    return (
      <div className="apl">
        {jalur}
        {laluan === 'profil' ? (
            <Profil
              muatSemula={cubaLagi}
              uid={sesi.user.id}
              keahlian={keahlian}
              dalamTalian={dalamTalian}
              emel={sesi.user.email ?? ''}
              profil={profil}
              sedia={sedia}
              belumHantar={belumHantar}
              simpan={simpan}
            />
        ) : laluan === 'templat' && adminAktif ? (
          <Templat
            profil={profil}
            templat={templat.templat}
            sedia={templat.sedia}
            belumHantar={templat.belumHantar}
            logo={templat.logo}
            simpan={templat.simpan}
            tetapLogo={templat.tetapLogo}
            bolehUbah
          />
        ) : (
          <Pengurusan keahlian={keahlian} nama={profil?.nama ?? ''} dalamTalian={dalamTalian} muatSemula={cubaLagi} />
        )}
        <NavBawah aktif={laluan === 'profil' ? 'profil' : 'utama'} pengurusan />
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
      {laluan === 'minit' &&
        (() => {
          const asas = { ...dok, program: prog.program, profil, templat: templat.templat, logo: templat.logo };
          return param[0] && param[0] !== 'p' ? <MinitEdit key={param[0]} {...asas} id={param[0]} /> : <MinitSenarai {...asas} programId={param[0] === 'p' ? param[1] : undefined} />;
        })()}
      {laluan === 'opr' &&
        (() => {
          const asas = { ...dok, uid: sesi.user.id, dalamTalian, program: prog.program, profil, templat: templat.templat, logo: templat.logo };
          return param[0] && param[0] !== 'p' ? <OprEdit key={param[0]} {...asas} id={param[0]} /> : <OprSenarai {...asas} programId={param[0] === 'p' ? param[1] : undefined} />;
        })()}
      {laluan === 'jobskop' &&
        (() => {
          const asas = { ...dok, profil, templat: templat.templat, logo: templat.logo };
          return param[0] === 'pilih' ? <JobskopPilih {...asas} /> : param[0] === 'e' ? <JobskopEdit key={param[1]} {...asas} id={param[1]} /> : <JobskopUtama {...asas} />;
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
          muatSemula={cubaLagi}
          uid={sesi.user.id}
          keahlian={keahlian}
          dalamTalian={dalamTalian}
          emel={sesi.user.email ?? ''}
          profil={profil}
          sedia={sedia}
          belumHantar={belumHantar}
          simpan={simpan}
        />
      )}
      {laluan === 'panduan' && <Panduan />}
      {laluan === 'templat' && (
        <Templat
          profil={profil}
          templat={templat.templat}
          sedia={templat.sedia}
          belumHantar={templat.belumHantar}
          logo={templat.logo}
          simpan={templat.simpan}
          tetapLogo={templat.tetapLogo}
          bolehUbah={false}
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
