import { useEffect, useMemo, useRef, useState } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { useSimpanAuto } from '../lib/auto';
import type { Dokumen } from '../lib/dokumen';
import { NAMA_JENIS, bilTugas, dariMysg, isiJobskop, jobskopKosong, kemasJawatan, muatMysg, namaPenuh, type DataMysg, type IsiJobskop, type Jawatan, type JenisPortfolio, type PortfolioMysg } from '../lib/jobskop';
import type { KepalaSurat } from '../lib/pdf';
import { TEMPLAT_KOSONG, type Logo, type Templat } from '../lib/templat';

interface Asas {
  dokumen: Dokumen[];
  sedia: boolean;
  tertunda: boolean;
  ralat: string | null;
  simpanDokumen: (d: Dokumen[]) => void;
  padamDokumen: (id: string) => void;
  profil: Profil | null;
  templat: Templat | null;
  logo: Logo;
}

const cariJobskop = (semua: Dokumen[]) => semua.find((d) => d.jenis === 'jobskop');

function tulis(p: Asas, dok: Dokumen | undefined, isi: IsiJobskop) {
  const asal = dok ?? jobskopKosong();
  p.simpanDokumen([{ ...asal, isi: isi as unknown as Record<string, unknown>, status: isi.jawatan.length ? 'siap' : 'draf' }]);
}

function Status({ p }: { p: Asas }) {
  if (!p.sedia || !(p.tertunda || p.ralat)) return null;
  return (
    <span className={`lencana ${p.ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
      {p.ralat ? 'Gagal dihantar' : 'Menunggu internet'}
    </span>
  );
}

// ---------------------------------------------------------------- Jobskop saya

export function JobskopUtama(p: Asas) {
  const dok = cariJobskop(p.dokumen);
  const isi = useMemo(() => isiJobskop(dok), [dok]);
  const pdf = usePdf();
  const jumlah = isi.jawatan.reduce((n, j) => n + bilTugas(j.kumpulan), 0);

  const ubah = (tukar: Partial<IsiJobskop>) => tulis(p, dok, { ...isi, ...tukar });
  const alih = (i: number, arah: -1 | 1) => {
    const j = [...isi.jawatan];
    const [x] = j.splice(i, 1);
    j.splice(i + arah, 0, x);
    ubah({ jawatan: j });
  };

  const janaPdf = () => {
    const tm = p.templat ?? TEMPLAT_KOSONG;
    const kepala: KepalaSurat = { nama_sekolah: tm.nama_sekolah || p.profil?.sekolah || '', alamat: tm.alamat, telefon: tm.telefon, emel: tm.emel, kod_sekolah: tm.kod_sekolah, logoKiri: p.logo.kiri, logoKanan: p.logo.kanan };
    void pdf.jana(
      async () =>
        (await import('../lib/pdf')).pdfJobskop(kepala, {
          tahun: isi.tahun,
          nama: (p.profil?.nama ?? '').toUpperCase(),
          jawatan: isi.jawatan.map((j) => ({ nama: namaPenuh(j).toUpperCase(), kumpulan: j.kumpulan })),
          disahkan: { nama: isi.disahkan.nama.trim().toUpperCase(), jawatan: isi.disahkan.jawatan.trim().toUpperCase() },
        }),
      `jobskop-${isi.tahun}.pdf`,
      `Jobskop ${isi.tahun}`,
    );
  };

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Jobskop" sub="Senarai tugas ikut MySG Sekolah Rendah" />
      <main className="isi">
        <section className="bahagian" aria-labelledby="tajuk-jobskop">
          <div className="baris-tajuk">
            <h2 id="tajuk-jobskop" className="label-bahagian">
              JAWATAN SAYA
            </h2>
            {isi.jawatan.length > 0 && (
              <span className="mono nota-kecil">
                {isi.jawatan.length} jawatan · {jumlah} tugas
              </span>
            )}
            <Status p={p} />
          </div>
          {!p.sedia && !dok ? (
            <p className="nota">Memuat…</p>
          ) : isi.jawatan.length === 0 ? (
            <section className="kad kad-garis-merah">
              <h3 className="kad-tajuk">Belum ada jawatan</h3>
              <p>Pilih portfolio dan jawatankuasa yang anda pegang tahun ini. Senarai tugasnya diambil terus daripada MySG Sekolah Rendah KPM dan boleh diedit.</p>
            </section>
          ) : (
            <ul className="senarai-acara">
              {isi.jawatan.map((j, i) => (
                <li key={j.id} className="kad jawatan-kad">
                  <a href={`#/jobskop/e/${j.id}`} className="jawatan-pautan">
                    <span className="acara-teks">
                      <strong>{namaPenuh(j)}</strong>
                      <span>
                        {j.kod ? `${j.kod} · ` : ''}
                        {bilTugas(j.kumpulan)} tugas
                      </span>
                    </span>
                    <span className="pil pil-biru">Edit</span>
                  </a>
                  {isi.jawatan.length > 1 && (
                    <span className="jawatan-alih">
                      <button type="button" className="butang-buang" aria-label={`Naikkan ${namaPenuh(j)}`} disabled={i === 0} onClick={() => alih(i, -1)}>
                        ↑
                      </button>
                      <button type="button" className="butang-buang" aria-label={`Turunkan ${namaPenuh(j)}`} disabled={i === isi.jawatan.length - 1} onClick={() => alih(i, 1)}>
                        ↓
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <a href="#/jobskop/pilih" className="butang butang-putus">
            + Tambah dari MySG
          </a>
        </section>

        {isi.jawatan.length > 0 && (
          <form className="kad borang kad-garis-merah" onSubmit={(e) => e.preventDefault()}>
            <h2 className="kad-tajuk">Jana PDF Jobskop</h2>
            <div className="dua-lajur">
              <div className="medan">
                <label htmlFor="j-tahun">Tahun</label>
                <input id="j-tahun" type="number" inputMode="numeric" className="mono" min={2020} max={2100} value={isi.tahun} onChange={(e) => ubah({ tahun: Number(e.target.value) || isi.tahun })} />
              </div>
              <div className="medan">
                <label htmlFor="j-sah-jawatan">Disahkan oleh</label>
                <input id="j-sah-jawatan" className="besar" value={isi.disahkan.jawatan} maxLength={80} autoCapitalize="characters" onChange={(e) => ubah({ disahkan: { ...isi.disahkan, jawatan: e.target.value } })} />
              </div>
            </div>
            <div className="medan">
              <label htmlFor="j-sah-nama">Nama pengesah (pilihan)</label>
              <input id="j-sah-nama" className="besar" value={isi.disahkan.nama} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ disahkan: { ...isi.disahkan, nama: e.target.value } })} />
            </div>
            <button type="button" className="butang butang-merah" disabled={pdf.menjana} onClick={janaPdf}>
              {pdf.menjana ? 'Menjana PDF…' : 'Jana PDF'}
            </button>
            <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
          </form>
        )}
      </main>
    </>
  );
}

// ---------------------------------------------------------------- Pilih dari MySG

const URUTAN_JENIS: JenisPortfolio[] = ['berjawatan', 'tanpa_jawatan', 'jawatankuasa'];

export function JobskopPilih(p: Asas) {
  const dok = cariJobskop(p.dokumen);
  const [data, setData] = useState<DataMysg | null>(null);
  const [gagal, setGagal] = useState(false);
  const [jenis, setJenis] = useState<JenisPortfolio>('tanpa_jawatan');
  const [cari, setCari] = useState('');
  const [buka, setBuka] = useState<string | null>(null);
  const [penuh, setPenuh] = useState(false);
  // kod portfolio -> indeks kumpulan tugas yang dipilih
  const [pilih, setPilih] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let hidup = true;
    muatMysg().then(
      (d) => hidup && setData(d),
      () => hidup && setGagal(true),
    );
    return () => {
      hidup = false;
    };
  }, []);

  const kata = cari.trim().toLowerCase();
  const senarai = useMemo(() => {
    if (!data) return [];
    if (!kata) return data.portfolio.filter((x) => x.jenis === jenis);
    return data.portfolio.filter((x) => `${x.kod} ${x.nama} ${x.kumpulan.map((k) => k.tajuk).join(' ')}`.toLowerCase().includes(kata));
  }, [data, jenis, kata]);
  const bil = (j: JenisPortfolio) => data?.portfolio.filter((x) => x.jenis === j).length ?? 0;
  const dipilih = Object.entries(pilih).filter(([, k]) => k.length);

  const togol = (x: PortfolioMysg) => {
    setPilih((s) => ({ ...s, [x.kod]: s[x.kod]?.length ? [] : x.kumpulan.map((_, i) => i) }));
    if (x.kumpulan.length > 1 && !pilih[x.kod]?.length) {
      setBuka(x.kod);
      setPenuh(false);
    }
  };
  const togolKumpulan = (x: PortfolioMysg, i: number) =>
    setPilih((s) => {
      const k = s[x.kod] ?? [];
      return { ...s, [x.kod]: k.includes(i) ? k.filter((n) => n !== i) : [...k, i].sort((a, b) => a - b) };
    });

  const tambah = () => {
    if (!data || !dipilih.length) return;
    const isi = isiJobskop(dok);
    const baharu = data.portfolio.filter((x) => pilih[x.kod]?.length).map((x) => dariMysg(x, pilih[x.kod]));
    tulis(p, dok, { ...isi, jawatan: [...isi.jawatan, ...baharu] });
    window.location.hash = '#/jobskop';
  };

  return (
    <>
      <KepalaKembali ke="#/jobskop" labelKembali="Kembali ke Jobskop" tajuk="Tambah dari MySG" sub="MySG Sekolah Rendah KPM" />
      <main className="isi isi-berbar">
        <p className="nota">Tanda portfolio yang anda pegang. Bagi jawatankuasa, pilih bahagian tugas yang berkenaan sahaja. Tugas boleh diedit selepas ditambah.</p>
        <div className="medan">
          <label htmlFor="j-cari">Cari</label>
          <input id="j-cari" type="search" value={cari} placeholder="cth. panitia, kelas, kokurikulum" onChange={(e) => setCari(e.target.value)} />
        </div>
        {!kata && (
          <div className="tab tab-tiga">
            {URUTAN_JENIS.map((j) => (
              <button key={j} type="button" aria-pressed={jenis === j} onClick={() => setJenis(j)}>
                {NAMA_JENIS[j]} <span className="mono">{data ? bil(j) : ''}</span>
              </button>
            ))}
          </div>
        )}
        {gagal ? (
          <p className="mesej mesej-ralat" role="alert">
            Senarai MySG tidak dapat dimuat. Sambung internet dan buka semula skrin ini.
          </p>
        ) : !data ? (
          <p className="nota">Memuat senarai MySG…</p>
        ) : senarai.length === 0 ? (
          <p className="nota">Tiada portfolio sepadan dengan “{cari.trim()}”.</p>
        ) : (
          <ul className="kad senarai-pilih">
            {senarai.map((x) => {
              const k = pilih[x.kod] ?? [];
              const terbuka = buka === x.kod;
              const idIsi = `mysg-${x.kod}`;
              return (
                <li key={x.kod} className={k.length ? 'dipilih' : undefined}>
                  <div className="pilih-baris">
                    <label className="pilih-label">
                      <input type="checkbox" checked={k.length > 0} onChange={() => togol(x)} />
                      <span className="pilih-nama">{x.nama}</span>
                    </label>
                    <button
                      type="button"
                      className="pilih-kod mono"
                      aria-expanded={terbuka}
                      aria-controls={idIsi}
                      aria-label={`${terbuka ? 'Tutup' : 'Lihat'} tugas ${x.nama}`}
                      onClick={() => {
                        setBuka(terbuka ? null : x.kod);
                        setPenuh(false);
                      }}
                    >
                      {x.kod} · {bilTugas(x.kumpulan)} {terbuka ? '▴' : '▾'}
                    </button>
                  </div>
                  {terbuka && (
                    <div id={idIsi} className="pilih-isi">
                      {x.kongsi && <p className="bantuan">MySG menyenaraikan tugas {x.kod} bersama {x.kongsi}.</p>}
                      {x.kumpulan.map((g, i) => (
                        <div key={i} className="pilih-kumpulan">
                          {x.kumpulan.length > 1 ? (
                            <label className="pilih-label pilih-label-kecil">
                              <input type="checkbox" checked={k.includes(i)} onChange={() => togolKumpulan(x, i)} />
                              <span>
                                {g.tajuk || 'Tugas umum'} <span className="mono">({g.tugas.length})</span>
                              </span>
                            </label>
                          ) : (
                            g.tajuk && <strong className="pilih-tajuk">{g.tajuk}</strong>
                          )}
                          {(penuh || x.kumpulan.length === 1) && (
                            <ol className="pilih-tugas">
                              {(penuh ? g.tugas : g.tugas.slice(0, 3)).map((t, n) => (
                                <li key={n}>{t}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      ))}
                      {!penuh && (x.kumpulan.length > 1 || x.kumpulan[0]?.tugas.length > 3) && (
                        <button type="button" className="butang-teks" onClick={() => setPenuh(true)}>
                          Lihat semua {bilTugas(x.kumpulan)} tugas
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data && <p className="bantuan">Sumber: {data.sumber}. Semak dengan dokumen rasmi sekolah anda jika ragu.</p>}
      </main>
      <div className="bar-tindakan">
        <button type="button" className="butang butang-merah" disabled={!dipilih.length} onClick={tambah}>
          {dipilih.length ? `Tambah ${dipilih.length} portfolio ke Jobskop` : 'Tanda sekurang-kurangnya satu'}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Edit satu jawatan

export function JobskopEdit(p: Asas & { id?: string }) {
  const dok = cariJobskop(p.dokumen);
  const asal = isiJobskop(dok).jawatan.find((j) => j.id === p.id);
  const [j, setJ] = useState<Jawatan | undefined>(asal);
  const [kotor, setKotor] = useState(false);
  const [versi, setVersi] = useState(0);
  const [sahPadam, setSahPadam] = useState(false);
  const dipadam = useRef(false);

  // Muat semula hanya apabila jawatan berubah dari luar, bukan selepas simpanan sendiri.
  const capKini = asal ? JSON.stringify(asal) : '';
  const terakhir = useRef(capKini);
  useEffect(() => {
    if (capKini === terakhir.current || kotor) return;
    terakhir.current = capKini;
    setJ(asal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capKini, kotor]);

  const simpan = () => {
    if (!kotor || !j || !dok || dipadam.current) return;
    const bersih = kemasJawatan(j);
    terakhir.current = JSON.stringify(bersih);
    const isi = isiJobskop(dok);
    tulis(p, dok, { ...isi, jawatan: isi.jawatan.map((x) => (x.id === bersih.id ? bersih : x)) });
    setKotor(false);
  };
  useSimpanAuto(kotor, simpan, versi);

  if (!j || !dok) {
    return (
      <>
        <KepalaKembali ke="#/jobskop" labelKembali="Kembali ke Jobskop" tajuk="Jobskop" />
        <main className="isi">
          <section className="kad kosong">
            <h2>{p.sedia ? 'Jawatan tidak dijumpai' : 'Memuat…'}</h2>
            <a href="#/jobskop" className="butang butang-garis">
              Kembali ke Jobskop
            </a>
          </section>
        </main>
      </>
    );
  }

  const ubah = (tukar: Partial<Jawatan>) => {
    setJ((x) => (x ? { ...x, ...tukar } : x));
    setKotor(true);
    setVersi((v) => v + 1);
  };
  const ubahTugas = (g: number, f: (t: string[]) => string[]) => ubah({ kumpulan: j.kumpulan.map((k, i) => (i === g ? { ...k, tugas: f(k.tugas) } : k)) });

  const padam = () => {
    dipadam.current = true;
    const isi = isiJobskop(dok);
    tulis(p, dok, { ...isi, jawatan: isi.jawatan.filter((x) => x.id !== j.id) });
    window.location.hash = '#/jobskop';
  };

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/jobskop" className="butang-kembali" aria-label="Kembali ke Jobskop">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>Edit jawatan</h1>
          <span className="kepala-kecil">
            {j.kod ? `${j.kod} · ` : ''}
            {bilTugas(j.kumpulan)} tugas
          </span>
        </div>
        <span className="status-simpan" role="status">
          <i className={kotor || p.tertunda ? 'titik titik-tunggu' : p.ralat ? 'titik titik-gagal' : 'titik'} />
          {kotor ? 'Menyimpan…' : p.ralat ? 'Gagal dihantar' : p.tertunda ? 'Menunggu internet' : 'Disimpan'}
        </span>
      </header>
      <main className="isi">
        <form className="kad borang kad-garis-merah" onSubmit={(e) => e.preventDefault()}>
          <div className="medan">
            <label htmlFor="je-nama">Nama jawatan</label>
            <input id="je-nama" value={j.nama} maxLength={160} onChange={(e) => ubah({ nama: e.target.value })} />
          </div>
          <div className="medan">
            <label htmlFor="je-butiran">Butiran (pilihan)</label>
            <input id="je-butiran" value={j.butiran} maxLength={120} onChange={(e) => ubah({ butiran: e.target.value })} aria-describedby="je-butiran-b" />
            <span id="je-butiran-b" className="bantuan">
              Contoh: Bahasa Melayu (Ketua Panitia), 4 Adnan (Guru Kelas), Rumah Merah.
            </span>
          </div>

          {j.kumpulan.map((k, g) => (
            <fieldset className="kumpulan" key={g}>
              <legend>{k.tajuk || 'Senarai tugas'}</legend>
              {j.kumpulan.length > 1 && (
                <div className="medan">
                  <label htmlFor={`je-tajuk-${g}`}>Tajuk bahagian</label>
                  <input id={`je-tajuk-${g}`} value={k.tajuk} maxLength={200} onChange={(e) => ubah({ kumpulan: j.kumpulan.map((x, i) => (i === g ? { ...x, tajuk: e.target.value } : x)) })} />
                </div>
              )}
              {k.tugas.map((t, i) => (
                <div className="baris-senarai baris-tugas" key={i}>
                  <span className="mono penanda">{i + 1}.</span>
                  <textarea aria-label={`Tugas ${i + 1}${k.tajuk ? `, ${k.tajuk}` : ''}`} rows={Math.min(12, Math.max(2, Math.ceil(t.length / 34) + (t.match(/\n/g)?.length ?? 0)))} value={t} maxLength={4000} onChange={(e) => ubahTugas(g, (s) => s.map((x, n) => (n === i ? e.target.value : x)))} />
                  <button type="button" className="butang-buang" aria-label={`Buang tugas ${i + 1}`} onClick={() => ubahTugas(g, (s) => s.filter((_, n) => n !== i))}>
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="butang butang-putus" onClick={() => ubahTugas(g, (s) => [...s, ''])}>
                + Tambah tugas
              </button>
              {j.kumpulan.length > 1 && (
                <button type="button" className="butang butang-garis teks-bahaya" onClick={() => ubah({ kumpulan: j.kumpulan.filter((_, i) => i !== g) })}>
                  Buang bahagian ini
                </button>
              )}
            </fieldset>
          ))}
          {j.kumpulan.length === 0 && (
            <button type="button" className="butang butang-putus" onClick={() => ubah({ kumpulan: [{ tajuk: '', tugas: [''] }] })}>
              + Tambah tugas
            </button>
          )}
          <a href="#/jobskop" className="butang butang-utama">
            Selesai
          </a>
        </form>

        <section className="kad" aria-label="Buang jawatan">
          {sahPadam ? (
            <>
              <p>Buang jawatan ini daripada Jobskop anda? Tugas yang telah diedit akan hilang.</p>
              <div className="dua-butang">
                <button type="button" className="butang butang-garis" onClick={() => setSahPadam(false)}>
                  Jangan buang
                </button>
                <button type="button" className="butang butang-bahaya" onClick={padam}>
                  Ya, buang
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="butang butang-garis teks-bahaya" onClick={() => setSahPadam(true)}>
              Buang jawatan
            </button>
          )}
        </section>
      </main>
    </>
  );
}
