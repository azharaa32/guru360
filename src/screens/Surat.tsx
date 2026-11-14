import { useEffect, useMemo, useRef, useState } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { useSimpanAuto } from '../lib/auto';
import { TEMPLAT_SURAT, isiSurat, kemasSurat, rujukanSeterusnya, suratKosong, suratLengkap, type Dokumen, type IsiSurat, type TemplatSurat } from '../lib/dokumen';
import { NAMA_BULAN, dariTarikh, hariIni, tarikhMesra } from '../lib/kalendar';
import type { KepalaSurat } from '../lib/pdf';
import { butirProgram, type Program } from '../lib/program';
import { idBaharu } from '../lib/senarai';
import { TEMPLAT_KOSONG, type Logo, type Templat } from '../lib/templat';

interface Asas {
  dokumen: Dokumen[];
  sedia: boolean;
  tertunda: boolean;
  ralat: string | null;
  simpanDokumen: (d: Dokumen[]) => void;
  padamDokumen: (id: string) => void;
  program: Program[];
  profil: Profil | null;
  templat: Templat | null;
  logo: Logo;
}

const NAMA_HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const tarikhRasmi = (t: string) => {
  if (!t) return '';
  const d = dariTarikh(t);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
};
const tarikhBerhari = (t: string) => (t ? `${tarikhRasmi(t)} (${NAMA_HARI[dariTarikh(t).getDay()]})` : '');
const ialahSurat = (d: Dokumen) => d.jenis === 'surat' || d.jenis === 'memo';
const URUTAN: TemplatSurat[] = ['mesyuarat', 'kebenaran', 'iringan', 'memo'];

function suratBaharu(templat: TemplatSurat, semua: Dokumen[], profil: Profil | null, prog?: Program): Dokumen {
  const terakhir = [...semua].reverse().find((d) => ialahSurat(d) && isiSurat(d).rujukan);
  const isi = suratKosong(templat, hariIni(), rujukanSeterusnya(terakhir ? isiSurat(terakhir).rujukan : undefined), { nama: profil?.nama ?? '', jawatan: '' });
  if (prog) {
    isi.acara_tarikh = prog.tarikh;
    isi.acara_masa = butirProgram({ ...prog, tempat: '' });
    isi.acara_tempat = prog.tempat;
  }
  return { id: idBaharu(), jenis: TEMPLAT_SURAT[templat].jenis, program_id: prog?.id ?? null, tajuk: prog?.nama ?? '', isi: isi as unknown as Record<string, unknown>, status: 'draf' };
}

// ---------------------------------------------------------------- Senarai

export function SuratSenarai(p: Asas & { programId?: string }) {
  const surat = useMemo(() => p.dokumen.filter(ialahSurat), [p.dokumen]);

  const cipta = (templat: TemplatSurat, prog?: Program, ganti = false) => {
    const d = suratBaharu(templat, p.dokumen, p.profil, prog);
    p.simpanDokumen([d]);
    if (ganti) window.location.replace(`#/surat/${d.id}`);
    else window.location.hash = `#/surat/${d.id}`;
  };

  // Dari takwim (#/surat/p/<id program>): buka surat panggilan program itu, atau cipta yang baharu.
  const dibuka = useRef(false);
  useEffect(() => {
    if (!p.programId || dibuka.current || !p.sedia) return;
    dibuka.current = true;
    const ada = surat.find((d) => d.program_id === p.programId && isiSurat(d).templat === 'mesyuarat');
    if (ada) window.location.replace(`#/surat/${ada.id}`);
    else cipta('mesyuarat', p.program.find((x) => x.id === p.programId), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.programId, p.sedia]);

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Memo & Surat" sub="Pilih templat, isi, jana PDF" />
      <main className="isi">
        <section className="bahagian" aria-labelledby="tajuk-surat-baharu">
          <h2 id="tajuk-surat-baharu" className="label-bahagian">
            BAHARU
          </h2>
          <ul className="grid-templat">
            {URUTAN.map((t) => (
              <li key={t}>
                <button type="button" className="kad jubin-templat" onClick={() => cipta(t)}>
                  <strong>{TEMPLAT_SURAT[t].nama}</strong>
                  <span>{TEMPLAT_SURAT[t].ringkas}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bahagian" aria-labelledby="tajuk-surat-senarai">
          <div className="baris-tajuk">
            <h2 id="tajuk-surat-senarai" className="label-bahagian">
              MEMO & SURAT SAYA
            </h2>
            {p.sedia && (p.tertunda || p.ralat) && (
              <span className={`lencana ${p.ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
                {p.ralat ? 'Gagal dihantar' : 'Menunggu internet'}
              </span>
            )}
          </div>
          {!p.sedia && surat.length === 0 ? (
            <p className="nota">Memuat…</p>
          ) : surat.length === 0 ? (
            <p className="nota">Belum ada memo atau surat.</p>
          ) : (
            <ul className="senarai-acara">
              {[...surat].reverse().map((d) => {
                const i = isiSurat(d);
                return (
                  <li key={d.id}>
                    <a href={`#/surat/${d.id}`} className="kad acara acara-butang">
                      <span className="acara-teks">
                        <strong>{d.tajuk || '(Belum ada perkara)'}</strong>
                        <span>
                          {TEMPLAT_SURAT[i.templat].nama}
                          {i.tarikh ? ` · ${tarikhMesra(i.tarikh)}` : ''}
                          {i.rujukan ? ` · ${i.rujukan}` : ''}
                        </span>
                      </span>
                      <span className={`pil ${d.status === 'siap' ? 'pil-siap' : 'pil-draf'}`}>{d.status === 'siap' ? '● Siap' : '● Draf'}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------- Editor

export function SuratEdit(p: Asas & { id?: string }) {
  const dok = p.dokumen.find((d) => d.id === p.id && ialahSurat(d));
  const [tajuk, setTajuk] = useState(dok?.tajuk ?? '');
  const [isi, setIsi] = useState<IsiSurat>(() => isiSurat(dok));
  const [kotor, setKotor] = useState(false);
  const [versi, setVersi] = useState(0);
  const [sahPadam, setSahPadam] = useState(false);
  const dipadam = useRef(false);
  const pdf = usePdf();

  // Muat semula hanya apabila dokumen berubah dari luar, bukan selepas simpanan sendiri.
  const cap = (d: Dokumen | undefined) => (d ? JSON.stringify([d.tajuk, d.isi]) : '');
  const terakhir = useRef(cap(dok));
  const capKini = cap(dok);
  useEffect(() => {
    if (capKini === terakhir.current || kotor) return;
    terakhir.current = capKini;
    setTajuk(dok?.tajuk ?? '');
    setIsi(isiSurat(dok));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capKini, kotor]);

  const simpan = () => {
    if (!kotor || !dok || dipadam.current) return;
    const bersih = kemasSurat(isi);
    const perkara = tajuk.trim().replace(/\s+/g, ' ').toUpperCase();
    const d: Dokumen = { ...dok, tajuk: perkara, isi: bersih as unknown as Record<string, unknown>, status: suratLengkap(perkara, bersih) ? 'siap' : 'draf' };
    terakhir.current = cap(d);
    p.simpanDokumen([d]);
    setKotor(false);
  };
  useSimpanAuto(kotor, simpan, versi);

  if (!dok) {
    return (
      <>
        <KepalaKembali ke="#/surat" labelKembali="Kembali ke senarai memo dan surat" tajuk="Memo & Surat" />
        <main className="isi">
          <section className="kad kosong">
            <h2>{p.sedia ? 'Dokumen tidak dijumpai' : 'Memuat…'}</h2>
            <a href="#/surat" className="butang butang-garis">
              Kembali ke senarai
            </a>
          </section>
        </main>
      </>
    );
  }

  const t = TEMPLAT_SURAT[isi.templat];
  const memo = isi.templat === 'memo';
  const sentuh = () => {
    setKotor(true);
    setVersi((v) => v + 1);
  };
  const ubah = (tukar: Partial<IsiSurat>) => {
    setIsi((i) => ({ ...i, ...tukar }));
    sentuh();
  };
  const lengkap = suratLengkap(tajuk, isi);

  const janaPdf = () => {
    simpan();
    const b = kemasSurat(isi);
    const tm = p.templat ?? TEMPLAT_KOSONG;
    const kepala: KepalaSurat = { nama_sekolah: tm.nama_sekolah || p.profil?.sekolah || '', alamat: tm.alamat, telefon: tm.telefon, emel: tm.emel, kod_sekolah: tm.kod_sekolah, logoKiri: p.logo.kiri, logoKanan: p.logo.kanan };
    const perkara = tajuk.trim().replace(/\s+/g, ' ').toUpperCase();
    void pdf.jana(
      async () =>
        (await import('../lib/pdf')).pdfSurat(kepala, {
          templat: b.templat,
          rujukan: b.rujukan,
          tarikh: tarikhRasmi(b.tarikh),
          kepada: b.kepada,
          daripada: b.daripada,
          perkara,
          pembuka: b.pembuka,
          butiran: t.adaButiran ? { tarikh: tarikhBerhari(b.acara_tarikh), masa: b.acara_masa, tempat: b.acara_tempat } : null,
          labelSenarai: t.labelSenarai,
          senarai: b.senarai,
          penutup: b.penutup,
          penandatangan: b.penandatangan,
        }),
      `${memo ? 'memo' : 'surat'}-${(perkara || 'baharu').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`,
      `${t.nama}: ${perkara}`.trim(),
    );
  };

  const padam = () => {
    dipadam.current = true;
    p.padamDokumen(dok.id);
    window.location.hash = '#/surat';
  };

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/surat" className="butang-kembali" aria-label="Kembali ke senarai memo dan surat">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>{t.nama}</h1>
          <span className="kepala-kecil">{lengkap ? 'Sedia dicetak' : 'Draf'}</span>
        </div>
        <span className="status-simpan" role="status">
          <i className={kotor || p.tertunda ? 'titik titik-tunggu' : p.ralat ? 'titik titik-gagal' : 'titik'} />
          {kotor ? 'Menyimpan…' : p.ralat ? 'Gagal dihantar' : p.tertunda ? 'Menunggu internet' : 'Disimpan'}
        </span>
      </header>
      <main className="isi">
        <form className="kad borang kad-garis-emas" onSubmit={(e) => e.preventDefault()}>
          <div className="dua-lajur">
            <div className="medan">
              <label htmlFor="s-rujukan">Rujukan{memo ? ' (pilihan)' : ''}</label>
              <input id="s-rujukan" className="besar" value={isi.rujukan} maxLength={80} autoCapitalize="characters" onChange={(e) => ubah({ rujukan: e.target.value })} aria-describedby="s-rujukan-b" />
            </div>
            <div className="medan">
              <label htmlFor="s-tarikh">Tarikh {memo ? 'memo' : 'surat'}</label>
              <input id="s-tarikh" type="date" className="mono" value={isi.tarikh} onChange={(e) => ubah({ tarikh: e.target.value })} />
            </div>
          </div>
          <span id="s-rujukan-b" className="bantuan">
            Contoh: SRIB/600-1/4 (12). Surat seterusnya menyambung nombor dalam kurungan.
          </span>
          <div className="medan">
            <label htmlFor="s-kepada">Kepada</label>
            <textarea id="s-kepada" rows={memo ? 2 : 3} value={isi.kepada} maxLength={600} onChange={(e) => ubah({ kepada: e.target.value })} aria-describedby="s-kepada-b" />
            <span id="s-kepada-b" className="bantuan">
              {memo ? 'Contoh: Semua guru Tahap 2.' : 'Satu baris bagi setiap baris nama dan alamat penerima.'}
            </span>
          </div>
          {memo && (
            <div className="medan">
              <label htmlFor="s-daripada">Daripada</label>
              <input id="s-daripada" className="besar" value={isi.daripada} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ daripada: e.target.value })} />
            </div>
          )}
          <div className="medan">
            <label htmlFor="s-perkara">Perkara</label>
            <input
              id="s-perkara"
              className="besar"
              value={tajuk}
              maxLength={200}
              autoCapitalize="characters"
              onChange={(e) => {
                setTajuk(e.target.value);
                sentuh();
              }}
            />
          </div>
          <div className="medan">
            <label htmlFor="s-pembuka">{memo ? 'Isi memo' : 'Perenggan pembuka'}</label>
            <textarea id="s-pembuka" rows={memo ? 6 : 4} value={isi.pembuka} maxLength={6000} onChange={(e) => ubah({ pembuka: e.target.value })} aria-describedby="s-pembuka-b" />
            <span id="s-pembuka-b" className="bantuan">
              Tinggalkan satu baris kosong untuk perenggan baharu.
            </span>
          </div>

          {t.adaButiran && (
            <fieldset className="kumpulan">
              <legend>Butiran {isi.templat === 'mesyuarat' ? 'mesyuarat' : 'program'}</legend>
              <div className="medan">
                <label htmlFor="s-acara-tarikh">Tarikh</label>
                <input id="s-acara-tarikh" type="date" className="mono" value={isi.acara_tarikh} onChange={(e) => ubah({ acara_tarikh: e.target.value })} />
              </div>
              <div className="medan">
                <label htmlFor="s-acara-masa">Masa</label>
                <input id="s-acara-masa" value={isi.acara_masa} maxLength={80} onChange={(e) => ubah({ acara_masa: e.target.value })} />
              </div>
              <div className="medan">
                <label htmlFor="s-acara-tempat">Tempat</label>
                <input id="s-acara-tempat" value={isi.acara_tempat} maxLength={160} onChange={(e) => ubah({ acara_tempat: e.target.value })} />
              </div>
            </fieldset>
          )}

          {t.labelSenarai && (
            <fieldset className="kumpulan">
              <legend>{t.labelSenarai}</legend>
              {isi.senarai.map((s, i) => (
                <div className="baris-senarai" key={i}>
                  <span className="mono penanda">{i + 1}.</span>
                  <input aria-label={`${t.labelSenarai} ${i + 1}`} value={s} maxLength={300} onChange={(e) => ubah({ senarai: isi.senarai.map((x, j) => (j === i ? e.target.value : x)) })} />
                  {isi.senarai.length > 1 && (
                    <button type="button" className="butang-buang" aria-label={`Buang ${t.labelSenarai?.toLowerCase()} ${i + 1}`} onClick={() => ubah({ senarai: isi.senarai.filter((_, j) => j !== i) })}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="butang butang-putus" onClick={() => ubah({ senarai: [...isi.senarai, ''] })}>
                + Tambah
              </button>
              {isi.templat === 'mesyuarat' && isi.senarai.every((s) => !s.trim()) && (
                <button
                  type="button"
                  className="butang butang-garis"
                  onClick={() => ubah({ senarai: ['Ucapan pengerusi', 'Pengesahan minit mesyuarat yang lalu', 'Perkara-perkara berbangkit', 'Pembentangan kertas kerja', 'Hal-hal lain', 'Penangguhan'] })}
                >
                  Agenda lazim
                </button>
              )}
            </fieldset>
          )}

          {!memo && (
            <div className="medan">
              <label htmlFor="s-penutup">Perenggan penutup</label>
              <textarea id="s-penutup" rows={3} value={isi.penutup} maxLength={3000} onChange={(e) => ubah({ penutup: e.target.value })} />
            </div>
          )}

          <fieldset className="kumpulan">
            <legend>Penandatangan</legend>
            <div className="medan">
              <label htmlFor="s-tt-nama">Nama</label>
              <input id="s-tt-nama" className="besar" value={isi.penandatangan.nama} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ penandatangan: { ...isi.penandatangan, nama: e.target.value } })} />
            </div>
            <div className="medan">
              <label htmlFor="s-tt-jawatan">Jawatan</label>
              <input id="s-tt-jawatan" className="besar" value={isi.penandatangan.jawatan} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ penandatangan: { ...isi.penandatangan, jawatan: e.target.value } })} />
            </div>
          </fieldset>

          {isi.templat === 'kebenaran' && <p className="mesej mesej-tunggu">Keratan jawapan ibu bapa ditambah sendiri di bahagian bawah surat.</p>}
          <button type="button" className="butang butang-utama" disabled={pdf.menjana} onClick={janaPdf}>
            {pdf.menjana ? 'Menjana PDF…' : 'Jana PDF'}
          </button>
          <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
          {pdf.pdf && <p>“Kongsi” membuka senarai aplikasi telefon, termasuk WhatsApp.</p>}
        </form>

        <section className="kad" aria-label="Padam dokumen">
          {sahPadam ? (
            <>
              <p>Padam {memo ? 'memo' : 'surat'} ini? Ia tidak boleh dikembalikan.</p>
              <div className="dua-butang">
                <button type="button" className="butang butang-garis" onClick={() => setSahPadam(false)}>
                  Jangan padam
                </button>
                <button type="button" className="butang butang-bahaya" onClick={padam}>
                  Ya, padam
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="butang butang-garis teks-bahaya" onClick={() => setSahPadam(true)}>
              Padam {memo ? 'memo' : 'surat'}
            </button>
          )}
        </section>
      </main>
    </>
  );
}
