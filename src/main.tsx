import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Ikon } from './components/Ikon';
import { NavBawah } from './components/Rangka';
import { useProfil, useSesi } from './lib/akaun';
import { useDalamTalian, useLaluan } from './lib/hooks';
import { useJadual } from './lib/jadual';
import { binaKalendar, useCutiBersama, useCutiSendiri } from './lib/kalendar';
import { useDokumen } from './lib/dokumen';
import { useProgram } from './lib/program';
import { useRph } from './lib/rph';
import { useMakluman } from './lib/makluman';
import { useKeahlian } from './lib/sekolah';
import { useSemakanSaya } from './lib/semakan';
import { pautanEmel } from './lib/supabase';
import { useTemplat } from './lib/templat';
import { Profil } from './screens/Lain';
import { Pengurusan, TiadaSekolah } from './screens/Sekolah';
import { MaklumanGuru, MaklumanUrus } from './screens/Makluman';
import { Panduan } from './screens/Panduan';
import { SemakRph } from './screens/SemakRph';
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
  // Cuti yang ditetapkan sekolah dan ibu pejabat digabung dengan cuti sendiri guru untuk kalendar dan RPH.
  const bersama = useCutiBersama(uid && (mengajar || pengurusan) ? uid : null, dalamTalian);
  const semakanSaya = useSemakanSaya(uidGuru, dalamTalian);
  const mak = useMakluman(uid && (mengajar || pengurusan) ? uid : null, dalamTalian);
  const guruAktif = (sekolahId?: string) => keahlian.ahli.filter((a) => a.peranan === 'guru' && a.status === 'aktif' && (!sekolahId || a.sekolah_id === sekolahId)).length;
  const semuaCuti = useMemo(() => [...cutiSendiri.cuti, ...bersama.cuti], [cutiSendiri.cuti, bersama.cuti]);
  const kal = useMemo(() => binaKalendar(negeri, semuaCuti), [negeri, semuaCuti]);

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
        ) : laluan === 'semak' && adminAktif && keahlian.sekolah ? (
          <SemakRph sekolahId={keahlian.sekolah.id} negeri={keahlian.sekolah.negeri} dalamTalian={dalamTalian} tarikh={param[0]} guruId={param[1]} />
        ) : laluan === 'makluman' && param[0] === 'semua' && keahlian.ibuPejabat ? (
          <MaklumanUrus key="semua" mod="semua" makluman={mak.makluman} status={mak.status} sekolahId={null} jumlahGuru={guruAktif()} sedia={mak.sedia} ralat={mak.ralat} dalamTalian={dalamTalian} hantar={mak.hantar} padam={mak.padam} />
        ) : laluan === 'makluman' && adminAktif && keahlian.sekolah ? (
          <MaklumanUrus
            key="sekolah"
            mod="sekolah"
            makluman={mak.makluman}
            status={mak.status}
            sekolahId={keahlian.sekolah.id}
            jumlahGuru={guruAktif(keahlian.sekolah.id)}
            sedia={mak.sedia}
            ralat={mak.ralat}
            dalamTalian={dalamTalian}
            hantar={mak.hantar}
            padam={mak.padam}
          />
        ) : laluan === 'cuti' && param[0] === 'semua' && keahlian.ibuPejabat ? (
          <Cuti
            mod="semua"
            negeri={null}
            cuti={bersama.cuti.filter((c) => c.sekolah_id === null)}
            sedia={bersama.sedia}
            tertunda={false}
            ralat={bersama.ralat}
            simpanCuti={(c) => void bersama.simpan(null, c)}
            padamCuti={(id) => void bersama.padam(id)}
          />
        ) : laluan === 'cuti' && adminAktif && keahlian.sekolah ? (
          <Cuti
            mod="sekolah"
            negeri={keahlian.sekolah.negeri}
            cuti={bersama.cuti.filter((c) => c.sekolah_id === keahlian.sekolah?.id)}
            sedia={bersama.sedia}
            tertunda={false}
            ralat={bersama.ralat}
            simpanCuti={(c) => void bersama.simpan(keahlian.sekolah?.id ?? null, c)}
            padamCuti={(id) => void bersama.padam(id)}
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
      {laluan === 'utama' && (
        <Utama
          profil={profil}
          sedia={sedia}
          kal={kal}
          waktu={jadual.waktu}
          rph={rph.rph}
          makluman={{
            jumlah: mak.makluman.length,
            belumBaca: mak.makluman.filter((m) => !mak.status.some((x) => x.makluman_id === m.id && x.guru_id === uid)).length,
            belumSiap: mak.makluman.filter((m) => m.jenis === 'tindakan' && !mak.status.some((x) => x.makluman_id === m.id && x.guru_id === uid && x.siap_pada)).length,
            perhatian: mak.makluman.filter((m) => {
              const st = mak.status.find((x) => x.makluman_id === m.id && x.guru_id === uid);
              return !st || (m.jenis === 'tindakan' && !st.siap_pada);
            }).length,
          }}
        />
      )}
      {laluan === 'makluman' && keahlian.sekolah && uid && (
        <MaklumanGuru
          makluman={mak.makluman}
          status={mak.status}
          uid={uid}
          sekolahId={keahlian.sekolah.id}
          namaSekolah={keahlian.sekolah.nama}
          sedia={mak.sedia}
          ralat={mak.ralat}
          dalamTalian={dalamTalian}
          tandaBaca={mak.tandaBaca}
          tandaSiap={mak.tandaSiap}
        />
      )}
      {laluan === 'hariini' && <HariIni kal={kal} waktu={jadual.waktu} rph={rph.rph} cuti={semuaCuti} program={prog.program} sedia={jadual.sedia} />}
      {laluan === 'jadual' && <Jadual negeri={profil?.negeri ?? null} {...jadual} />}
      {laluan === 'rph' &&
        (() => {
          const asas = { uid: sesi.user.id, profil, kal, waktu: jadual.waktu, templat: templat.templat, logo: templat.logo, semakan: semakanSaya, ...rph };
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
          cuti={semuaCuti}
          program={prog.program}
          programSedia={prog.sedia}
          programTertunda={prog.tertunda}
          programRalat={prog.ralat}
          simpanProgram={prog.simpanProgram}
          padamProgram={prog.padamProgram}
        />
      )}
      {laluan === 'cuti' && <Cuti negeri={profil?.negeri ?? null} {...cutiSendiri} bersama={bersama.cuti} />}
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
