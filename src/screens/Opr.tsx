import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { useSimpanAuto } from '../lib/auto';
import { besarkan, type Dokumen } from '../lib/dokumen';
import { bacaGambar, kecilkanFoto, padamGambar, simpanGambar, useGambar, useGambarTertunda } from '../lib/gambar';
import { NAMA_BULAN, dariTarikh, hariIni, tarikhMesra } from '../lib/kalendar';
import { MAKS_GAMBAR, OPR_KOSONG, isiOpr, kanvasKeJpeg, kemasOpr, lukisOpr, oprLengkap, type DataOpr, type IsiOpr } from '../lib/opr';
import { butirProgram, ikutTarikh, tamatProgram, type Program } from '../lib/program';
import { idBaharu } from '../lib/senarai';
import { TEMPLAT_KOSONG, type Logo, type Templat } from '../lib/templat';

interface Asas {
  uid: string;
  dalamTalian: boolean;
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

const tarikhRasmi = (t: string) => {
  if (!t) return '';
  const d = dariTarikh(t);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
};
const julatTarikh = (a: string, b: string) => (a && b && b !== a ? `${tarikhRasmi(a)} HINGGA ${tarikhRasmi(b)}` : tarikhRasmi(a));

function oprBaharu(profil: Profil | null, prog?: Program): Dokumen {
  const isi: IsiOpr = {
    ...OPR_KOSONG,
    tarikh: prog?.tarikh ?? hariIni(),
    tarikh_tamat: prog?.tarikh_tamat ?? '',
    masa: prog ? butirProgram({ ...prog, tempat: '' }).toUpperCase() : '',
    tempat: prog?.tempat ?? '',
    disediakan: { jawatan: '', nama: profil?.nama ?? '' },
  };
  return { id: idBaharu(), jenis: 'opr', program_id: prog?.id ?? null, tajuk: prog?.nama ?? '', isi: isi as unknown as Record<string, unknown>, status: 'draf' };
}

// ---------------------------------------------------------------- Senarai

export function OprSenarai(p: Asas & { programId?: string }) {
  const opr = useMemo(() => p.dokumen.filter((d) => d.jenis === 'opr'), [p.dokumen]);
  // Program yang sudah berlangsung dahulu: OPR ditulis selepas program.
  const pilihan = useMemo(() => [...p.program].filter((x) => !opr.some((o) => o.program_id === x.id) && x.tarikh <= hariIni()).sort((a, b) => ikutTarikh(b, a)).slice(0, 15), [p.program, opr]);
  const [pilih, setPilih] = useState('');
  const tertundaGambar = useGambarTertunda(p.dalamTalian);

  const cipta = (prog: Program | undefined, ganti = false) => {
    const d = oprBaharu(p.profil, prog);
    p.simpanDokumen([d]);
    if (ganti) window.location.replace(`#/opr/${d.id}`);
    else window.location.hash = `#/opr/${d.id}`;
  };

  const dibuka = useRef(false);
  useEffect(() => {
    if (!p.programId || dibuka.current || !p.sedia) return;
    dibuka.current = true;
    const ada = opr.find((d) => d.program_id === p.programId);
    if (ada) window.location.replace(`#/opr/${ada.id}`);
    else cipta(p.program.find((x) => x.id === p.programId), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.programId, p.sedia]);

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="OPR" sub="Laporan satu halaman dengan gambar" />
      <main className="isi">
        <section className="kad borang kad-garis-merah" aria-labelledby="tajuk-opr-baharu">
          <h2 id="tajuk-opr-baharu">OPR baharu</h2>
          {pilihan.length > 0 && (
            <div className="medan">
              <label htmlFor="opr-program">Program dalam takwim (pilihan)</label>
              <select id="opr-program" value={pilih} onChange={(e) => setPilih(e.target.value)}>
                <option value="">Tanpa program dalam takwim</option>
                {pilihan.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nama} · {tarikhMesra(x.tarikh, tamatProgram(x))}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="butang butang-merah" onClick={() => cipta(p.program.find((x) => x.id === pilih))}>
            Mula OPR
          </button>
        </section>

        <section className="bahagian" aria-labelledby="tajuk-opr-senarai">
          <div className="baris-tajuk">
            <h2 id="tajuk-opr-senarai" className="label-bahagian">
              OPR SAYA
            </h2>
            {p.sedia && (p.tertunda || p.ralat || tertundaGambar > 0) && (
              <span className={`lencana ${p.ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
                {p.ralat ? 'Gagal dihantar' : tertundaGambar > 0 ? `${tertundaGambar} gambar menunggu` : 'Menunggu internet'}
              </span>
            )}
          </div>
          {!p.sedia && opr.length === 0 ? (
            <p className="nota">Memuat…</p>
          ) : opr.length === 0 ? (
            <p className="nota">Belum ada OPR.</p>
          ) : (
            <ul className="senarai-acara">
              {[...opr].reverse().map((d) => {
                const i = isiOpr(d);
                return (
                  <li key={d.id}>
                    <a href={`#/opr/${d.id}`} className="kad acara acara-butang">
                      <span className="acara-teks">
                        <strong>{d.tajuk || '(Belum bernama)'}</strong>
                        <span>
                          {i.tarikh ? tarikhMesra(i.tarikh) : 'Tiada tarikh'} · {i.gambar.length} gambar
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

async function blobKeDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => gagal(r.error);
    r.readAsDataURL(blob);
  });
}

export function OprEdit(p: Asas & { id?: string }) {
  const dok = p.dokumen.find((d) => d.id === p.id && d.jenis === 'opr');
  const [tajuk, setTajuk] = useState(dok?.tajuk ?? '');
  const [isi, setIsi] = useState<IsiOpr>(() => isiOpr(dok));
  const [kotor, setKotor] = useState(false);
  const [versi, setVersi] = useState(0);
  const [sahPadam, setSahPadam] = useState(false);
  const [ralatGambar, setRalatGambar] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [pratonton, setPratonton] = useState<string | null>(null);
  const dipadam = useRef(false);
  const kamera = useRef<HTMLInputElement>(null);
  const galeri = useRef<HTMLInputElement>(null);
  const pdf = usePdf();
  const url = useGambar(isi.gambar);
  const tertundaGambar = useGambarTertunda(p.dalamTalian);

  const cap = (d: Dokumen | undefined) => (d ? JSON.stringify([d.tajuk, d.isi]) : '');
  const terakhir = useRef(cap(dok));
  const capKini = cap(dok);
  useEffect(() => {
    if (capKini === terakhir.current || kotor) return;
    terakhir.current = capKini;
    setTajuk(dok?.tajuk ?? '');
    setIsi(isiOpr(dok));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capKini, kotor]);

  const simpan = () => {
    if (!kotor || !dok || dipadam.current) return;
    const bersih = kemasOpr(isi);
    const nama = besarkan(tajuk);
    const d: Dokumen = { ...dok, tajuk: nama, isi: bersih as unknown as Record<string, unknown>, status: oprLengkap(nama, bersih) ? 'siap' : 'draf' };
    terakhir.current = cap(d);
    p.simpanDokumen([d]);
    setKotor(false);
  };
  useSimpanAuto(kotor, simpan, versi);

  useEffect(() => () => void (pratonton && URL.revokeObjectURL(pratonton)), [pratonton]);

  if (!dok) {
    return (
      <>
        <KepalaKembali ke="#/opr" labelKembali="Kembali ke senarai OPR" tajuk="OPR" />
        <main className="isi">
          <section className="kad kosong">
            <h2>{p.sedia ? 'OPR tidak dijumpai' : 'Memuat…'}</h2>
            <a href="#/opr" className="butang butang-garis">
              Kembali ke senarai
            </a>
          </section>
        </main>
      </>
    );
  }

  const sentuh = () => {
    setKotor(true);
    setVersi((v) => v + 1);
    setPratonton(null);
    pdf.buang();
  };
  const ubah = (tukar: Partial<IsiOpr>) => {
    setIsi((i) => ({ ...i, ...tukar }));
    sentuh();
  };

  const tambahGambar = async (e: ChangeEvent<HTMLInputElement>) => {
    const fail = [...(e.target.files ?? [])].slice(0, MAKS_GAMBAR - isi.gambar.length);
    e.target.value = '';
    if (!fail.length) return;
    setMemproses(true);
    setRalatGambar(null);
    try {
      const baharu: string[] = [];
      for (const f of fail) {
        const laluan = `${p.uid}/opr/${dok.id}/${idBaharu()}.jpg`;
        await simpanGambar(laluan, await kecilkanFoto(f));
        baharu.push(laluan);
      }
      setIsi((i) => ({ ...i, gambar: [...i.gambar, ...baharu].slice(0, MAKS_GAMBAR) }));
      sentuh();
    } catch (ralat) {
      setRalatGambar(ralat instanceof Error ? ralat.message : 'Gambar tidak dapat disimpan.');
    } finally {
      setMemproses(false);
    }
  };

  const buangGambar = (laluan: string) => {
    void padamGambar(laluan);
    ubah({ gambar: isi.gambar.filter((g) => g !== laluan) });
  };

  const bina = async (): Promise<HTMLCanvasElement> => {
    const b = kemasOpr(isi);
    const t = p.templat ?? TEMPLAT_KOSONG;
    const gambar: string[] = [];
    for (const g of b.gambar) {
      const blob = await bacaGambar(g);
      if (blob) gambar.push(await blobKeDataUrl(blob));
    }
    const data: DataOpr = {
      kepala: { nama_sekolah: t.nama_sekolah || p.profil?.sekolah || '', alamat: t.alamat, telefon: t.telefon, emel: t.emel, logoKiri: p.logo.kiri, logoKanan: p.logo.kanan },
      tajuk: besarkan(tajuk),
      tarikh: julatTarikh(b.tarikh, b.tarikh_tamat),
      masa: b.masa,
      tempat: b.tempat,
      sasaran: b.sasaran,
      ringkasan: b.ringkasan,
      impak: b.impak,
      penambahbaikan: b.penambahbaikan,
      gambar,
      disediakan: b.disediakan,
    };
    return lukisOpr(data);
  };

  const namaFail = (akhiran: string) => `opr-${(besarkan(tajuk) || 'program').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.${akhiran}`;
  const jana = (jenis: 'pdf' | 'jpeg') => {
    simpan();
    void pdf.jana(
      async () => {
        const jpeg = await kanvasKeJpeg(await bina());
        setPratonton(URL.createObjectURL(new Blob([jpeg as BlobPart], { type: 'image/jpeg' })));
        return jenis === 'jpeg' ? jpeg : (await import('../lib/pdf')).pdfGambarPenuh(jpeg, `OPR ${besarkan(tajuk)}`);
      },
      namaFail(jenis === 'jpeg' ? 'jpg' : 'pdf'),
      `OPR ${besarkan(tajuk)}`.trim(),
      jenis === 'jpeg' ? 'image/jpeg' : 'application/pdf',
    );
  };

  const padam = () => {
    dipadam.current = true;
    isi.gambar.forEach((g) => void padamGambar(g));
    p.padamDokumen(dok.id);
    window.location.hash = '#/opr';
  };

  const penuh = isi.gambar.length >= MAKS_GAMBAR;
  const teks = (id: string, label: string, medan: 'ringkasan' | 'impak' | 'penambahbaikan', baris: number, maks: number) => (
    <div className="medan">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="besar" rows={baris} value={isi[medan]} maxLength={maks} autoCapitalize="characters" onChange={(e) => ubah({ [medan]: e.target.value } as Partial<IsiOpr>)} />
    </div>
  );
  const input = (id: string, label: string, nilai: string, set: (v: string) => void, jenis = 'text') => (
    <div className="medan">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={jenis} className={jenis === 'text' ? 'besar' : 'mono'} value={nilai} maxLength={160} autoCapitalize="characters" onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/opr" className="butang-kembali" aria-label="Kembali ke senarai OPR">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>OPR</h1>
          <span className="kepala-kecil">{tajuk.trim() ? tajuk.toUpperCase() : 'Belum bernama'}</span>
        </div>
        <span className="status-simpan" role="status">
          <i className={kotor || p.tertunda || tertundaGambar > 0 ? 'titik titik-tunggu' : p.ralat ? 'titik titik-gagal' : 'titik'} />
          {kotor ? 'Menyimpan…' : p.ralat ? 'Gagal dihantar' : p.tertunda || tertundaGambar > 0 ? 'Menunggu internet' : 'Disimpan'}
        </span>
      </header>
      <main className="isi">
        <form className="kad borang kad-garis-merah" onSubmit={(e) => e.preventDefault()}>
          <div className="medan">
            <label htmlFor="o-tajuk">Nama program</label>
            <input id="o-tajuk" className="besar" value={tajuk} maxLength={160} autoCapitalize="characters" onChange={(e) => { setTajuk(e.target.value); sentuh(); }} />
          </div>
          <div className="dua-lajur">
            {input('o-tarikh', 'Tarikh', isi.tarikh, (v) => ubah({ tarikh: v }), 'date')}
            {input('o-tamat', 'Hingga (pilihan)', isi.tarikh_tamat, (v) => ubah({ tarikh_tamat: v }), 'date')}
          </div>
          {input('o-masa', 'Masa', isi.masa, (v) => ubah({ masa: v }))}
          <div className="dua-lajur">
            {input('o-tempat', 'Tempat', isi.tempat, (v) => ubah({ tempat: v }))}
            {input('o-sasaran', 'Sasaran', isi.sasaran, (v) => ubah({ sasaran: v }))}
          </div>

          <fieldset className="kumpulan">
            <legend>
              Gambar ({isi.gambar.length}/{MAKS_GAMBAR})
            </legend>
            <ul className="grid-gambar">
              {Array.from({ length: MAKS_GAMBAR }, (_, i) => {
                const g = isi.gambar[i];
                return (
                  <li key={g ?? `kosong-${i}`} className={g ? 'petak-gambar' : 'petak-gambar petak-kosong'}>
                    {g &&
                      (url[g] ? (
                        <img src={url[g]!} alt={`Gambar ${i + 1}`} />
                      ) : (
                        <span className="gambar-tiada">{g in url ? 'Tiada dalam telefon ini' : 'Memuat…'}</span>
                      ))}
                    {g && (
                      <button type="button" className="buang-gambar" aria-label={`Buang gambar ${i + 1}`} onClick={() => buangGambar(g)}>
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={tambahGambar} />
            <input ref={galeri} type="file" accept="image/*" multiple hidden onChange={tambahGambar} />
            <div className="dua-butang">
              <button type="button" className="butang butang-putus-merah" disabled={penuh || memproses} onClick={() => kamera.current?.click()}>
                {memproses ? 'Memproses…' : 'Kamera'}
              </button>
              <button type="button" className="butang butang-putus-merah" disabled={penuh || memproses} onClick={() => galeri.current?.click()}>
                Galeri
              </button>
            </div>
            <div aria-live="polite">
              {ralatGambar && (
                <p className="mesej mesej-ralat" role="alert">
                  {ralatGambar}
                </p>
              )}
              {penuh && <p className="bantuan">Empat gambar sudah dipilih. Buang satu untuk menukarnya.</p>}
            </div>
          </fieldset>

          {teks('o-ringkasan', 'Aktiviti / ringkasan', 'ringkasan', 3, 700)}
          {teks('o-impak', 'Impak / kekuatan', 'impak', 2, 500)}
          {teks('o-tambah', 'Penambahbaikan', 'penambahbaikan', 2, 500)}
          <div className="dua-lajur">
            {input('o-sedia-nama', 'Disediakan oleh', isi.disediakan.nama, (v) => ubah({ disediakan: { ...isi.disediakan, nama: v } }))}
            {input('o-sedia-jawatan', 'Jawatan', isi.disediakan.jawatan, (v) => ubah({ disediakan: { ...isi.disediakan, jawatan: v } }))}
          </div>
        </form>

        <section className="kad" aria-label="Jana OPR">
          <div className="dua-butang">
            <button type="button" className="butang butang-garis" disabled={pdf.menjana} onClick={() => jana('jpeg')}>
              JPEG
            </button>
            <button type="button" className="butang butang-merah" disabled={pdf.menjana} onClick={() => jana('pdf')}>
              {pdf.menjana ? 'Menjana…' : 'Jana OPR (PDF)'}
            </button>
          </div>
          <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
          {pratonton && pdf.pdf && <img className="pratonton-opr" src={pratonton} alt={`Pratonton OPR ${tajuk}`} />}
          <p>OPR sentiasa satu halaman A4. Teks dan gambar dikecilkan sendiri jika isinya panjang.</p>
        </section>

        <section className="kad" aria-label="Padam OPR">
          {sahPadam ? (
            <>
              <p>Padam OPR ini bersama gambarnya? Ia tidak boleh dikembalikan.</p>
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
              Padam OPR
            </button>
          )}
        </section>
      </main>
    </>
  );
}
