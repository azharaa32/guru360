import { useEffect, useState, type ReactNode } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import { useGambar } from '../lib/gambar';
import { tarikhMesra } from '../lib/kalendar';
import { senaraiAhli, type ButiranAhli } from '../lib/sekolah';
import { gambarOpr, pelanPdf, type DokumenAsing } from '../lib/pdfDokumen';
import { supabase, terjemahRalat } from '../lib/supabase';
import { TEMPLAT_KOSONG, type Logo, type Templat } from '../lib/templat';

interface RingkasDok {
  id: string;
  guru_id: string;
  jenis: string;
  tajuk: string;
  status: 'draf' | 'siap';
  dikemas_kini_pada: string;
}
interface RingkasProgram {
  id: string;
  guru_id: string;
  nama: string;
  tarikh: string;
  tarikh_tamat: string | null;
  tempat: string;
}

const NAMA_JENIS: Record<string, string> = { kertas_kerja: 'Kertas kerja', memo: 'Memo', surat: 'Surat', minit: 'Minit mesyuarat', opr: 'OPR', jobskop: 'Jobskop' };
const SUSUNAN = ['kertas_kerja', 'surat', 'memo', 'minit', 'opr', 'jobskop'];
const LABEL: Record<string, string> = {
  latar: 'Latar belakang',
  rasional: 'Rasional',
  objektif: 'Objektif',
  sasaran: 'Sasaran',
  tarikh: 'Tarikh',
  tarikh_tamat: 'Tarikh tamat',
  masa: 'Masa',
  tempat: 'Tempat',
  jawatankuasa: 'Jawatankuasa',
  aturcara: 'Aturcara',
  belanja: 'Anggaran belanja',
  sumber: 'Sumber kewangan',
  penutup: 'Penutup',
  disediakan: 'Disediakan oleh',
  disahkan: 'Disahkan oleh',
  rujukan: 'Rujukan',
  kepada: 'Kepada',
  daripada: 'Daripada',
  pembuka: 'Isi',
  acara_tarikh: 'Tarikh acara',
  acara_masa: 'Masa acara',
  acara_tempat: 'Tempat acara',
  senarai: 'Senarai',
  penandatangan: 'Penandatangan',
  kehadiran: 'Kehadiran',
  agenda: 'Agenda',
  ringkasan: 'Ringkasan',
  impak: 'Impak',
  penambahbaikan: 'Penambahbaikan',
  tahun: 'Tahun',
  jawatan: 'Jawatan',
};
const LANGKAU = new Set(['templat', 'tiada_kos', 'id', 'kod', 'gambar']);
const TARIKH = /^\d{4}-\d{2}-\d{2}$/;
const tarikhPendek = (iso: string) => new Date(iso).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });

const kosong = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.every(kosong)) || (typeof v === 'object' && !Array.isArray(v) && Object.entries(v as object).every(([k, x]) => LANGKAU.has(k) || typeof x === 'boolean' || kosong(x)));

const teksAsas = (k: string, v: string | number | boolean): string => {
  if (typeof v === 'boolean') return k === 'hadir' ? (v ? 'hadir' : 'tidak hadir') : '';
  if (typeof v === 'number') return k === 'harga' ? `RM ${v.toFixed(2)}` : String(v);
  return TARIKH.test(v) ? tarikhMesra(v) : v;
};

/** Papar satu nilai isi dokumen: teks, senarai, atau senarai butiran bersarang. */
function Nilai({ v, k }: { v: unknown; k: string }): ReactNode {
  if (Array.isArray(v)) {
    const ada = v.filter((x) => !kosong(x));
    return (
      <ul className="baca-senarai">
        {ada.map((x, i) => (
          <li key={i}>{typeof x === 'object' && x !== null ? <Butiran o={x as Record<string, unknown>} /> : teksAsas(k, x as string)}</li>
        ))}
      </ul>
    );
  }
  if (typeof v === 'object' && v !== null) return <Butiran o={v as Record<string, unknown>} />;
  return <p className="baca-teks">{teksAsas(k, v as string)}</p>;
}

/** Satu objek kecil (orang, baris aturcara, agenda): nilai ringkas dalam satu baris, senarai di bawahnya. */
function Butiran({ o }: { o: Record<string, unknown> }) {
  const masuk = Object.entries(o).filter(([k, v]) => !LANGKAU.has(k) && !kosong(v));
  const ringkas = masuk.filter(([, v]) => typeof v !== 'object').map(([k, v]) => teksAsas(k, v as string));
  const sarang = masuk.filter(([, v]) => typeof v === 'object');
  return (
    <>
      <span className="baca-teks">{ringkas.filter(Boolean).join(' · ')}</span>
      {sarang.map(([k, v]) => (
        <Nilai key={k} k={k} v={v} />
      ))}
    </>
  );
}

/** Gambar OPR dan butang jana PDF bagi satu dokumen guru, memakai kepala surat sekolah. */
function PdfDokumen({ d, templat, logo, namaSekolah, namaGuru }: { d: DokumenAsing; templat: Templat | null; logo: Logo; namaSekolah: string; namaGuru: string }) {
  const pdf = usePdf();
  const laluan = gambarOpr(d);
  const url = useGambar(laluan);
  const t = templat ?? TEMPLAT_KOSONG;
  const pelan = pelanPdf(d, { nama_sekolah: t.nama_sekolah || namaSekolah, alamat: t.alamat, telefon: t.telefon, emel: t.emel, kod_sekolah: t.kod_sekolah, logoKiri: logo.kiri, logoKanan: logo.kanan }, namaGuru);
  return (
    <>
      {laluan.length > 0 && (
        <section className="semak-bahagian">
          <span className="label-bahagian">GAMBAR</span>
          <ul className="grid-gambar">
            {laluan.map((g, i) => (
              <li key={g} className="petak-gambar">
                {url[g] ? <img src={url[g]!} alt={`Gambar ${i + 1} OPR`} /> : <span className="gambar-tiada">{g in url ? 'Belum dihantar oleh guru' : 'Memuat…'}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {pelan && (
        <>
          <button type="button" className="butang butang-utama" disabled={pdf.menjana} onClick={() => void pdf.jana(pelan.bina, pelan.namaFail, pelan.tajuk)}>
            {pdf.menjana ? 'Menjana…' : 'Jana PDF'}
          </button>
          <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
        </>
      )}
    </>
  );
}

interface PropsDokumen {
  sekolahId: string;
  namaSekolah: string;
  templat: Templat | null;
  logo: Logo;
  dalamTalian: boolean;
  guruId?: string;
  dokId?: string;
}

/** Admin sekolah: baca dokumen dan program guru sekolahnya, dan jana PDFnya. Baca sahaja; tiada butang ubah. */
export function DokumenGuru({ sekolahId, namaSekolah, templat, logo, dalamTalian, guruId, dokId }: PropsDokumen) {
  const [dok, setDok] = useState<RingkasDok[] | null>(null);
  const [program, setProgram] = useState<RingkasProgram[]>([]);
  const [guru, setGuru] = useState<ButiranAhli[] | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [isi, setIsi] = useState<{ id: string; isi: Record<string, unknown> } | null>(null);

  useEffect(() => {
    if (!dalamTalian) return;
    let hidup = true;
    void (async () => {
      const d = await supabase.from('dokumen').select('id, guru_id, jenis, tajuk, status, dikemas_kini_pada').eq('sekolah_id', sekolahId);
      const p = await supabase.from('program').select('id, guru_id, nama, tarikh, tarikh_tamat, tempat').eq('sekolah_id', sekolahId);
      const a = await senaraiAhli();
      if (!hidup) return;
      if (d.error || p.error) return setRalat(terjemahRalat((d.error ?? p.error)!.message));
      setDok(((d.data ?? []) as unknown as RingkasDok[]).sort((x, y) => (y.dikemas_kini_pada ?? '').localeCompare(x.dikemas_kini_pada ?? '')));
      setProgram(((p.data ?? []) as unknown as RingkasProgram[]).sort((x, y) => y.tarikh.localeCompare(x.tarikh)));
      if (a.ok) setGuru(a.senarai.filter((x) => x.peranan === 'guru'));
      setRalat(null);
    })();
    return () => {
      hidup = false;
    };
  }, [sekolahId, dalamTalian]);

  useEffect(() => {
    if (!dokId || !dalamTalian) return;
    let hidup = true;
    setIsi(null);
    void supabase
      .from('dokumen')
      .select('id, isi')
      .eq('id', dokId)
      .then(({ data, error }) => {
        if (!hidup) return;
        const baris = ((data ?? []) as unknown as { id: string; isi: Record<string, unknown> }[])[0];
        if (error || !baris) setRalat(error ? terjemahRalat(error.message) : 'Dokumen ini tidak dijumpai. Mungkin guru sudah memadamnya.');
        else setIsi(baris);
      });
    return () => {
      hidup = false;
    };
  }, [dokId, dalamTalian]);

  const nama = (id: string) => {
    const g = guru?.find((x) => x.pengguna_id === id);
    return g ? g.nama || g.emel : 'Guru';
  };
  const idGuru = [...new Set([...(guru ?? []).filter((g) => g.status === 'aktif').map((g) => g.pengguna_id), ...(dok ?? []).map((d) => d.guru_id), ...program.map((p) => p.guru_id)])];
  const dipilih = guruId && idGuru.includes(guruId) ? guruId : null;
  const dibuka = dipilih && dokId ? (dok ?? []).find((d) => d.id === dokId && d.guru_id === dipilih) : undefined;
  const milik = dipilih ? (dok ?? []).filter((d) => d.guru_id === dipilih) : [];
  const programMilik = dipilih ? program.filter((p) => p.guru_id === dipilih) : [];

  return (
    <>
      <KepalaKembali
        ke={dibuka ? `#/dokumen/${dipilih}` : dipilih ? '#/dokumen' : '#/'}
        labelKembali={dibuka ? 'Kembali ke senarai dokumen' : dipilih ? 'Kembali ke senarai guru' : 'Kembali ke Pengurusan'}
        tajuk={dibuka ? NAMA_JENIS[dibuka.jenis] ?? 'Dokumen' : dipilih ? nama(dipilih) : 'Dokumen guru'}
        sub={dibuka ? `${nama(dipilih!)} · baca sahaja` : dipilih ? 'Dokumen dan program · baca sahaja' : 'Kertas kerja, surat, minit, OPR, jobskop dan program'}
      />
      <main className="isi">
        {!dalamTalian && <p className="nota">Sambung internet untuk membaca dokumen guru.</p>}
        {ralat && (
          <div className="kad">
            <p className="mesej mesej-ralat" role="alert">
              {ralat}
            </p>
          </div>
        )}
        {dalamTalian && !dok && !ralat && <p className="nota">Memuat dokumen…</p>}

        {dok && !dipilih && (
          <>
            {idGuru.length === 0 ? (
              <p className="nota">Belum ada guru di sekolah ini.</p>
            ) : (
              <ul className="senarai-acara">
                {idGuru.map((id) => {
                  const n = dok.filter((d) => d.guru_id === id).length;
                  const np = program.filter((p) => p.guru_id === id).length;
                  return (
                    <li key={id}>
                      <a href={`#/dokumen/${id}`} className="kad kad-pautan">
                        <span className="kad-pautan-teks">
                          <strong className="pecah">{nama(id)}</strong>
                          <span>{n + np === 0 ? 'Belum ada dokumen' : `${n} dokumen · ${np} program`}</span>
                        </span>
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="nota">Anda boleh membaca semua dokumen guru sekolah ini dan menjana PDFnya, tetapi tidak boleh mengubahnya. RPH dibaca di skrin Semak RPH.</p>
          </>
        )}

        {dok && dipilih && !dokId && (
          <>
            {milik.length + programMilik.length === 0 && <p className="nota">Guru ini belum ada dokumen atau program.</p>}
            {SUSUNAN.filter((j) => milik.some((d) => d.jenis === j)).map((j) => (
              <section key={j} className="bahagian" aria-label={NAMA_JENIS[j]}>
                <h2 className="label-bahagian">{NAMA_JENIS[j].toUpperCase()}</h2>
                <ul className="senarai-acara">
                  {milik
                    .filter((d) => d.jenis === j)
                    .map((d) => (
                      <li key={d.id}>
                        <a href={`#/dokumen/${dipilih}/${d.id}`} className="kad kad-pautan">
                          <span className="kad-pautan-teks">
                            <strong className="pecah">{d.tajuk || (j === 'jobskop' ? 'Jobskop' : 'Tanpa tajuk')}</strong>
                            <span>
                              {d.status === 'siap' ? 'Siap' : 'Draf'} · dikemas kini {tarikhPendek(d.dikemas_kini_pada)}
                            </span>
                          </span>
                          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </a>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
            {programMilik.length > 0 && (
              <section className="bahagian" aria-label="Program">
                <h2 className="label-bahagian">PROGRAM DALAM TAKWIM</h2>
                <ul className="senarai-acara">
                  {programMilik.map((p) => (
                    <li key={p.id} className="kad kad-makluman">
                      <strong className="pecah">{p.nama}</strong>
                      <span className="nota-kecil">
                        {tarikhMesra(p.tarikh, p.tarikh_tamat ?? undefined)}
                        {p.tempat ? ` · ${p.tempat}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {dipilih && dokId && dok && !dibuka && !ralat && <p className="nota">Dokumen ini tidak dijumpai. Mungkin guru sudah memadamnya.</p>}
        {dibuka && (
          <article className="kad baca-dokumen">
            <div className="baris-ahli">
              <span className="label-bahagian">{(NAMA_JENIS[dibuka.jenis] ?? 'Dokumen').toUpperCase()}</span>
              <span className={`pil ${dibuka.status === 'siap' ? 'pil-siap' : 'pil-draf'}`}>{dibuka.status === 'siap' ? '● Siap' : '● Draf'}</span>
            </div>
            {dibuka.tajuk && <h2 className="pecah">{dibuka.tajuk}</h2>}
            {!isi || isi.id !== dibuka.id ? (
              !ralat && <p className="nota">Memuat isi…</p>
            ) : kosong(isi.isi) ? (
              <p className="nota">Dokumen ini belum diisi.</p>
            ) : (
              Object.entries(isi.isi)
                .filter(([k, v]) => !LANGKAU.has(k) && !kosong(v) && typeof v !== 'boolean')
                .map(([k, v]) => (
                  <section key={k} className="semak-bahagian">
                    <span className="label-bahagian">{(LABEL[k] ?? k.replace(/_/g, ' ')).toUpperCase()}</span>
                    <Nilai k={k} v={v} />
                  </section>
                ))
            )}
            {isi && isi.id === dibuka.id && !kosong(isi.isi) && (
              <PdfDokumen key={dibuka.id} d={{ id: dibuka.id, guru_id: dibuka.guru_id, jenis: dibuka.jenis, tajuk: dibuka.tajuk, isi: isi.isi }} templat={templat} logo={logo} namaSekolah={namaSekolah} namaGuru={nama(dipilih!)} />
            )}
          </article>
        )}
      </main>
    </>
  );
}
