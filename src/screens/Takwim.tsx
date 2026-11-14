import { useMemo, useState } from 'react';
import { TAHUN_ADA, kumpulan } from '../data/kalendar';
import { butirProgram, programPada, tarikhBerprogram, type Program } from '../lib/program';
import { ProgramTakwim } from './ProgramTakwim';
import {
  BULAN_PENDEK,
  NAMA_BULAN,
  binaKalendar,
  cutiAkanDatang,
  dariTarikh,
  hariIni,
  keTarikh,
  tarikhMesra,
  tarikhPenuh,
  type CutiSendiri,
  type StatusHari,
} from '../lib/kalendar';

interface Props {
  negeri: string | null;
  cuti: CutiSendiri[];
  program: Program[];
  programSedia: boolean;
  programTertunda: boolean;
  programRalat: string | null;
  simpanProgram: (p: Program[]) => void;
  padamProgram: (id: string) => void;
}

const LABEL_HARI = ['IS', 'SE', 'RA', 'KH', 'JU', 'SA', 'AH'];

function kelasSel(s: StatusHari): string {
  if (s.jenis === 'cuti') return s.sebab.some((x) => x.jenis !== 'sekolah') ? 'sel-cuti' : 'sel-cuti-sekolah';
  if (s.jenis === 'hujung-minggu') return 'sel-rehat';
  if (s.jenis === 'luar-sesi') return 'sel-rehat';
  return s.ganti ? 'sel-ganti' : '';
}

function teksStatus(s: StatusHari): string {
  if (s.jenis === 'sekolah') return s.ganti ? `Hari persekolahan ganti: ${s.ganti.nama}` : 'Hari persekolahan';
  if (s.jenis === 'hujung-minggu') return 'Hujung minggu';
  if (s.jenis === 'luar-sesi') return 'Di luar sesi persekolahan';
  return s.sebab.map((x) => x.nama).join(' · ');
}

const warnaJenis = (jenis: string) => (jenis === 'sekolah' ? 'biru' : jenis === 'sendiri' ? 'emas' : 'merah');

export function Takwim({ negeri, cuti, program, programSedia, programTertunda, programRalat, simpanProgram, padamProgram }: Props) {
  const kini = hariIni();
  const [bulan, setBulan] = useState(() => {
    const d = new Date();
    return { tahun: d.getFullYear(), bulan: d.getMonth() };
  });
  const [pilih, setPilih] = useState(kini);
  const kal = useMemo(() => binaKalendar(negeri, cuti), [negeri, cuti]);

  const sel = useMemo(() => {
    const pertama = new Date(bulan.tahun, bulan.bulan, 1);
    const kosong = (pertama.getDay() + 6) % 7; // minggu bermula Isnin
    const bilHari = new Date(bulan.tahun, bulan.bulan + 1, 0).getDate();
    const hasil: ({ tarikh: string; hari: number; status: StatusHari } | null)[] = Array(kosong).fill(null);
    for (let h = 1; h <= bilHari; h++) {
      const t = keTarikh(new Date(bulan.tahun, bulan.bulan, h));
      hasil.push({ tarikh: t, hari: h, status: kal.status(t) });
    }
    return hasil;
  }, [bulan, kal]);

  const gerak = (n: number) => {
    setBulan((b) => {
      const d = new Date(b.tahun, b.bulan + n, 1);
      return { tahun: d.getFullYear(), bulan: d.getMonth() };
    });
  };

  const tahunAda = TAHUN_ADA.includes(bulan.tahun);
  const statusPilih = kal.status(pilih);
  const berprogram = useMemo(() => tarikhBerprogram(program), [program]);
  const programPilih = useMemo(() => programPada(program, pilih), [program, pilih]);
  const akanDatang = useMemo(() => cutiAkanDatang(negeri, cuti, kini), [negeri, cuti, kini]);

  return (
    <>
      <header className="kepala">
        <div className="kepala-teks">
          <h1>Takwim</h1>
          <span className="kepala-kecil" aria-live="polite">
            {NAMA_BULAN[bulan.bulan]} {bulan.tahun}
          </span>
        </div>
        <button type="button" className="butang-kembali" aria-label="Bulan sebelum" onClick={() => gerak(-1)}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button type="button" className="butang-kembali" aria-label="Bulan seterusnya" onClick={() => gerak(1)}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </header>
      <main className="isi">
        {!negeri && (
          <a href="#/profil" className="kad kad-pautan kad-amaran">
            <span className="kad-pautan-teks">
              <strong>Pilih negeri di Profil</strong>
              <span>Cuti sekolah dan cuti umum bergantung pada negeri anda. Sekarang hanya cuti persekutuan dipaparkan.</span>
            </span>
          </a>
        )}

        <section className="kad kalendar" aria-label={`Kalendar ${NAMA_BULAN[bulan.bulan]} ${bulan.tahun}`}>
          <div className="kalendar-grid kalendar-label" aria-hidden="true">
            {LABEL_HARI.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <div className="kalendar-grid">
            {sel.map((c, i) =>
              c ? (
                <button
                  key={c.tarikh}
                  type="button"
                  className={`sel ${kelasSel(c.status)}${c.tarikh === kini ? ' sel-kini' : ''}`}
                  aria-pressed={c.tarikh === pilih}
                  aria-label={`${tarikhPenuh(c.tarikh)}: ${teksStatus(c.status)}${berprogram.has(c.tarikh) ? ', ada program' : ''}`}
                  onClick={() => setPilih(c.tarikh)}
                >
                  {c.hari}
                  {berprogram.has(c.tarikh) && <i className="titik-program" aria-hidden="true" />}
                </button>
              ) : (
                <span key={`k${i}`} />
              ),
            )}
          </div>
          <div className="petunjuk" aria-hidden="true">
            <span>
              <i className="sel-cuti" /> Cuti umum / tambahan
            </span>
            <span>
              <i className="sel-cuti-sekolah" /> Cuti sekolah
            </span>
            <span>
              <i className="sel-rehat" /> Hujung minggu
            </span>
            <span>
              <i className="titik-petunjuk" /> Program
            </span>
          </div>
        </section>

        <section className="kad butir-hari" aria-live="polite">
          <strong>{tarikhPenuh(pilih)}</strong>
          <span>{teksStatus(statusPilih)}</span>
          {statusPilih.jenis === 'cuti' && statusPilih.sebab.some((x) => x.semak) && <span className="bantuan">* Tarikh ini perlu disahkan dengan dokumen rasmi.</span>}
          {programPilih.length > 0 && (
            <ul className="program-hari">
              {programPilih.map((p) => (
                <li key={p.id}>
                  <strong>{p.nama}</strong>
                  {butirProgram(p) && <span>{butirProgram(p)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProgramTakwim program={program} sedia={programSedia} tertunda={programTertunda} ralat={programRalat} pilih={pilih} simpanProgram={simpanProgram} padamProgram={padamProgram} />

        {!tahunAda && <p className="nota">Kalendar KPM bagi tahun {bulan.tahun} belum dimuatkan. Hanya hujung minggu dan cuti sendiri dipaparkan.</p>}

        <section className="bahagian" aria-labelledby="tajuk-akan-datang">
          <div className="baris-tajuk">
            <h2 id="tajuk-akan-datang" className="label-bahagian">
              CUTI AKAN DATANG
            </h2>
            <a href="#/cuti" className="pautan-kecil">
              Cuti & kalendar KPM
            </a>
          </div>
          {akanDatang.length === 0 ? (
            <p className="nota">Tiada cuti dalam kalendar yang dimuatkan.</p>
          ) : (
            <ul className="senarai-acara">
              {akanDatang.map((c) => {
                const d = dariTarikh(c.mula);
                return (
                  <li key={`${c.mula}${c.nama}`} className="kad acara">
                    <span className={`acara-tarikh warna-${warnaJenis(c.jenis)}`}>
                      <span className="mono">{d.getDate()}</span>
                      <span>{BULAN_PENDEK[d.getMonth()]}</span>
                    </span>
                    <span className="acara-teks">
                      <strong>
                        {c.nama}
                        {c.semak ? ' *' : ''}
                      </strong>
                      <span>{tarikhMesra(c.mula, c.tamat)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {negeri && (
            <p className="nota">
              {negeri} · Kumpulan {kumpulan(negeri)}.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
