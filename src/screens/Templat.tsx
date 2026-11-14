import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Profil } from '../lib/akaun';
import type { HasilSimpan } from '../lib/simpanan';
import { TEMPLAT_KOSONG, kecilkanGambar, type Logo, type Sisi, type Templat as DataTemplat } from '../lib/templat';

type Teks = Pick<DataTemplat, 'nama_sekolah' | 'alamat' | 'telefon' | 'emel' | 'kod_sekolah'>;

const besar = (s: string) => s.trim().replace(/[ \t]+/g, ' ').toUpperCase();
const barisKemas = (s: string) =>
  s
    .split('\n')
    .map((b) => besar(b))
    .filter(Boolean)
    .join('\n');

interface Props {
  profil: Profil | null;
  templat: DataTemplat | null;
  sedia: boolean;
  belumHantar: boolean;
  logo: Logo;
  simpan: (t: DataTemplat) => Promise<HasilSimpan>;
  tetapLogo: (sisi: Sisi, dataUrl: string | null) => Promise<HasilSimpan>;
}

function PetakLogo({ sisi, nombor, gambar, tetapLogo, lapor }: { sisi: Sisi; nombor: number; gambar: string | null; tetapLogo: Props['tetapLogo']; lapor: (m: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);

  const pilih = async (e: ChangeEvent<HTMLInputElement>) => {
    const fail = e.target.files?.[0];
    e.target.value = '';
    if (!fail) return;
    setSibuk(true);
    lapor(null);
    try {
      const hasil = await tetapLogo(sisi, await kecilkanGambar(fail));
      if (hasil.jenis === 'ralat') lapor(hasil.mesej);
    } catch (ralat) {
      lapor(ralat instanceof Error ? ralat.message : 'Gambar tidak dapat diproses.');
    } finally {
      setSibuk(false);
    }
  };

  const buang = async () => {
    setSibuk(true);
    lapor(null);
    const hasil = await tetapLogo(sisi, null);
    if (hasil.jenis === 'ralat') lapor(hasil.mesej);
    setSibuk(false);
  };

  return (
    <div className="petak-logo">
      <span className="logo-bingkai">{gambar ? <img src={gambar} alt={`Logo ${nombor}`} /> : `LOGO ${nombor}`}</span>
      <span className="petak-logo-nama">{sisi === 'kiri' ? 'Logo kiri' : 'Logo kanan'}</span>
      <input ref={input} type="file" accept="image/png,image/jpeg" hidden onChange={pilih} />
      <button type="button" className="butang butang-garis butang-kecil" disabled={sibuk} onClick={() => input.current?.click()}>
        {sibuk ? 'Sebentar…' : gambar ? 'Tukar' : 'Pilih gambar'}
      </button>
      {gambar && (
        <button type="button" className="butang-teks" disabled={sibuk} onClick={buang}>
          Buang
        </button>
      )}
    </div>
  );
}

export function Templat({ profil, templat, sedia, belumHantar, logo, simpan, tetapLogo }: Props) {
  const asal = (): Teks => {
    const t = templat ?? TEMPLAT_KOSONG;
    return {
      nama_sekolah: t.nama_sekolah || profil?.sekolah || '',
      alamat: t.alamat,
      telefon: t.telefon,
      emel: t.emel,
      kod_sekolah: t.kod_sekolah,
    };
  };
  const [borang, setBorang] = useState<Teks>(asal);
  const [disentuh, setDisentuh] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);
  const [ralatLogo, setRalatLogo] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ url: string; fail: File } | null>(null);
  const [menjana, setMenjana] = useState(false);
  const [ralatPdf, setRalatPdf] = useState<string | null>(null);

  useEffect(() => {
    if (!disentuh) setBorang(asal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templat, profil?.sekolah, disentuh]);

  useEffect(() => () => void (pdf && URL.revokeObjectURL(pdf.url)), [pdf]);

  const tukar = (medan: keyof Teks, nilai: string) => {
    setDisentuh(true);
    setHasil(null);
    setBorang((b) => ({ ...b, [medan]: nilai }));
  };

  const kemas = (): Teks => ({
    nama_sekolah: besar(borang.nama_sekolah),
    alamat: barisKemas(borang.alamat),
    telefon: borang.telefon.trim(),
    emel: borang.emel.trim().toLowerCase(),
    kod_sekolah: besar(borang.kod_sekolah),
  });

  const hantar = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    const teks = kemas();
    if (!teks.nama_sekolah) {
      setHasil({ jenis: 'ralat', mesej: 'Sila isi nama sekolah.' });
      return;
    }
    setSibuk(true);
    const h = await simpan({ ...(templat ?? TEMPLAT_KOSONG), ...teks });
    setBorang(teks);
    setDisentuh(false);
    setHasil(h);
    setSibuk(false);
  };

  const jana = async () => {
    if (menjana) return;
    setMenjana(true);
    setRalatPdf(null);
    try {
      const { pdfContoh } = await import('../lib/pdf');
      const bait = await pdfContoh(
        { ...kemas(), logoKiri: logo.kiri, logoKanan: logo.kanan },
        { nama: profil?.nama ?? '', sekolah: profil?.sekolah ?? '', negeri: profil?.negeri ?? '' },
      );
      const fail = new File([bait as BlobPart], 'contoh-guru360.pdf', { type: 'application/pdf' });
      setPdf({ url: URL.createObjectURL(fail), fail });
    } catch (ralat) {
      console.error(ralat);
      setRalatPdf(
        navigator.onLine
          ? 'PDF tidak dapat dijana. Cuba lagi.'
          : 'Enjin PDF belum dimuat turun ke telefon ini. Sambung internet sekali, kemudian cuba lagi.',
      );
    } finally {
      setMenjana(false);
    }
  };

  const bolehKongsi = pdf !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdf.fail] });
  const kongsi = async () => {
    if (!pdf) return;
    try {
      await navigator.share({ files: [pdf.fail], title: 'Contoh dokumen Guru360' });
    } catch {
      /* guru membatalkan perkongsian */
    }
  };

  const pratonton = kemas();

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/profil" className="butang-kembali" aria-label="Kembali ke Profil">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>Templat sekolah saya</h1>
          <span className="kepala-kecil">Dipakai pada semua dokumen yang dijana</span>
        </div>
      </header>
      <main className="isi">
        <section className="kad" aria-labelledby="tajuk-logo">
          <h2 id="tajuk-logo">Logo</h2>
          <p>Satu atau dua logo, contohnya logo sekolah dan logo KPM. Kedua-duanya pilihan.</p>
          <div className="dua-logo">
            <PetakLogo sisi="kiri" nombor={1} gambar={logo.kiri} tetapLogo={tetapLogo} lapor={setRalatLogo} />
            <PetakLogo sisi="kanan" nombor={2} gambar={logo.kanan} tetapLogo={tetapLogo} lapor={setRalatLogo} />
          </div>
          <div aria-live="polite">
            {ralatLogo && (
              <p className="mesej mesej-ralat" role="alert">
                {ralatLogo}
              </p>
            )}
          </div>
        </section>

        <form className="kad borang" onSubmit={hantar} aria-labelledby="tajuk-kepala">
          <h2 id="tajuk-kepala">Kepala surat</h2>
          {!sedia && <p>Memuat templat…</p>}
          <div className="medan">
            <label htmlFor="nama-sekolah">Nama sekolah</label>
            <input id="nama-sekolah" className="besar" value={borang.nama_sekolah} onChange={(e) => tukar('nama_sekolah', e.target.value)} autoCapitalize="characters" maxLength={160} required />
          </div>
          <div className="medan">
            <label htmlFor="alamat">Alamat</label>
            <textarea id="alamat" className="besar" rows={3} value={borang.alamat} onChange={(e) => tukar('alamat', e.target.value)} autoCapitalize="characters" maxLength={400} aria-describedby="alamat-bantuan" />
            <span id="alamat-bantuan" className="bantuan">
              Satu baris alamat bagi setiap baris di sini.
            </span>
          </div>
          <div className="medan">
            <label htmlFor="telefon">No. telefon sekolah</label>
            <input id="telefon" type="tel" inputMode="tel" value={borang.telefon} onChange={(e) => tukar('telefon', e.target.value)} autoComplete="off" maxLength={60} />
          </div>
          <div className="medan">
            <label htmlFor="emel-sekolah">Emel sekolah</label>
            <input id="emel-sekolah" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={borang.emel} onChange={(e) => tukar('emel', e.target.value)} autoComplete="off" maxLength={120} />
          </div>
          <div className="medan">
            <label htmlFor="kod-sekolah">Kod sekolah (pilihan)</label>
            <input id="kod-sekolah" className="besar" value={borang.kod_sekolah} onChange={(e) => tukar('kod_sekolah', e.target.value)} autoCapitalize="characters" maxLength={20} />
          </div>
          <div aria-live="polite">
            {hasil?.jenis === 'disimpan' && <p className="mesej mesej-ok">Templat disimpan.</p>}
            {hasil?.jenis === 'menunggu' && <p className="mesej mesej-tunggu">Disimpan dalam telefon. Akan dihantar sendiri apabila ada internet.</p>}
            {hasil?.jenis === 'ralat' && (
              <p className="mesej mesej-ralat" role="alert">
                {hasil.mesej}
              </p>
            )}
            {!hasil && belumHantar && <p className="mesej mesej-tunggu">Ada perubahan yang belum dihantar ke pelayan.</p>}
          </div>
          <button type="submit" className="butang butang-utama" disabled={sibuk}>
            {sibuk ? 'Menyimpan…' : 'Simpan templat'}
          </button>
        </form>

        <section className="kad" aria-labelledby="tajuk-pratonton">
          <h2 id="tajuk-pratonton">Pratonton kepala surat</h2>
          <div className="helaian" aria-label="Pratonton kepala surat">
            <div className="helaian-kepala">
              <span className="helaian-logo">{logo.kiri && <img src={logo.kiri} alt="" />}</span>
              <div className="helaian-teks">
                <strong>{pratonton.nama_sekolah || 'NAMA SEKOLAH'}</strong>
                {pratonton.alamat.split('\n').filter(Boolean).map((b, i) => (
                  <span key={i}>{b}</span>
                ))}
                {(pratonton.telefon || pratonton.emel) && (
                  <span>{[pratonton.telefon && `Tel: ${pratonton.telefon}`, pratonton.emel && `Emel: ${pratonton.emel}`].filter(Boolean).join('  |  ')}</span>
                )}
                {pratonton.kod_sekolah && <span>Kod sekolah: {pratonton.kod_sekolah}</span>}
              </div>
              <span className="helaian-logo">{logo.kanan && <img src={logo.kanan} alt="" />}</span>
            </div>
            <div className="helaian-garis" />
          </div>
          <button type="button" className="butang butang-utama" onClick={jana} disabled={menjana}>
            {menjana ? 'Menjana PDF…' : pdf ? 'Jana semula PDF contoh' : 'Jana PDF contoh'}
          </button>
          <div aria-live="polite">
            {ralatPdf && (
              <p className="mesej mesej-ralat" role="alert">
                {ralatPdf}
              </p>
            )}
            {pdf && <p className="mesej mesej-ok">PDF contoh siap (A4, 1 halaman).</p>}
          </div>
          {pdf && (
            <div className={bolehKongsi ? 'dua-butang' : undefined}>
              <a className="butang butang-garis" href={pdf.url} download="contoh-guru360.pdf" target="_blank" rel="noopener">
                Buka PDF
              </a>
              {bolehKongsi && (
                <button type="button" className="butang butang-garis" onClick={kongsi}>
                  Kongsi
                </button>
              )}
            </div>
          )}
        </section>
        <p className="nota">Templat khusus bagi setiap modul (RPH, OPR dan lain-lain) akan ditambah bersama modul masing-masing.</p>
      </main>
    </>
  );
}
