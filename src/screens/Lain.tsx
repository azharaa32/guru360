import { useEffect, useState, type FormEvent } from 'react';
import { Kepala } from '../components/Rangka';
import { NEGERI, PROFIL_KOSONG, type HasilSimpan, type Profil as DataProfil } from '../lib/akaun';
import { APP_VERSION } from '../lib/config';
import { sudahDipasang, usePelayan, type StatusPelayan } from '../lib/hooks';
import { supabase } from '../lib/supabase';

const teksPelayan: Record<StatusPelayan, string> = {
  menyemak: 'Menyemak…',
  ok: 'Bersambung',
  gagal: 'Tidak dapat dihubungi',
  'luar-talian': 'Tiada internet',
};

const kemas = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

interface PropsProfil {
  dalamTalian: boolean;
  emel: string;
  profil: DataProfil | null;
  sedia: boolean;
  belumHantar: boolean;
  simpan: (p: DataProfil) => Promise<HasilSimpan>;
}

export function Profil({ dalamTalian, emel, profil, sedia, belumHantar, simpan }: PropsProfil) {
  const { status, semak } = usePelayan(dalamTalian);
  const [borang, setBorang] = useState<DataProfil>(profil ?? PROFIL_KOSONG);
  const [disentuh, setDisentuh] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<HasilSimpan | null>(null);
  const [sahKeluar, setSahKeluar] = useState(false);

  // Isi borang apabila profil sampai dari pelayan, selagi guru belum mula menaip.
  useEffect(() => {
    if (!disentuh) setBorang(profil ?? PROFIL_KOSONG);
  }, [profil, disentuh]);

  const tukar = (medan: keyof DataProfil, nilai: string) => {
    setDisentuh(true);
    setHasil(null);
    setBorang((b) => ({ ...b, [medan]: medan === 'negeri' ? nilai || null : nilai }));
  };

  const hantar = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    const data: DataProfil = {
      nama: kemas(borang.nama),
      sekolah: kemas(borang.sekolah),
      negeri: borang.negeri,
      gred: kemas(borang.gred),
    };
    if (!data.nama) {
      setHasil({ jenis: 'ralat', mesej: 'Sila isi nama anda.' });
      return;
    }
    setSibuk(true);
    const h = await simpan(data);
    setBorang(data);
    setDisentuh(false);
    setHasil(h);
    setSibuk(false);
  };

  const keluar = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <Kepala tajuk="Profil" sub={emel} />
      <main className="isi">
        <form className="kad borang" onSubmit={hantar} aria-labelledby="tajuk-profil">
          <h2 id="tajuk-profil">Maklumat guru</h2>
          {!sedia && <p>Memuat profil…</p>}
          <div className="medan">
            <label htmlFor="nama">Nama</label>
            <input
              id="nama"
              className="besar"
              value={borang.nama}
              onChange={(e) => tukar('nama', e.target.value)}
              autoComplete="name"
              autoCapitalize="characters"
              maxLength={120}
              required
            />
          </div>
          <div className="medan">
            <label htmlFor="sekolah">Sekolah</label>
            <input
              id="sekolah"
              className="besar"
              value={borang.sekolah}
              onChange={(e) => tukar('sekolah', e.target.value)}
              autoComplete="organization"
              autoCapitalize="characters"
              maxLength={160}
            />
          </div>
          <div className="medan">
            <label htmlFor="negeri">Negeri</label>
            <select id="negeri" value={borang.negeri ?? ''} onChange={(e) => tukar('negeri', e.target.value)}>
              <option value="">Pilih negeri</option>
              {NEGERI.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="bantuan">Menentukan kalendar penggal dan cuti KPM anda.</span>
          </div>
          <div className="medan">
            <label htmlFor="gred">Gred (pilihan)</label>
            <input
              id="gred"
              className="besar"
              value={borang.gred}
              onChange={(e) => tukar('gred', e.target.value)}
              autoCapitalize="characters"
              maxLength={20}
            />
          </div>
          <div aria-live="polite">
            {hasil?.jenis === 'disimpan' && <p className="mesej mesej-ok">Profil disimpan.</p>}
            {hasil?.jenis === 'menunggu' && (
              <p className="mesej mesej-tunggu">Disimpan dalam telefon. Akan dihantar sendiri apabila ada internet.</p>
            )}
            {hasil?.jenis === 'ralat' && (
              <p className="mesej mesej-ralat" role="alert">
                {hasil.mesej}
              </p>
            )}
            {!hasil && belumHantar && <p className="mesej mesej-tunggu">Ada perubahan yang belum dihantar ke pelayan.</p>}
          </div>
          <button type="submit" className="butang butang-utama" disabled={sibuk}>
            {sibuk ? 'Menyimpan…' : 'Simpan profil'}
          </button>
        </form>

        <a href="#/templat" className="kad kad-pautan">
          <span className="kad-pautan-teks">
            <strong>Templat sekolah saya</strong>
            <span>Kepala surat dan logo untuk semua dokumen</span>
          </span>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </a>

        <section className="kad" aria-labelledby="tajuk-tentang">
          <h2 id="tajuk-tentang" className="kad-tajuk">
            Tentang aplikasi
          </h2>
          <dl className="senarai">
            <div>
              <dt>Versi</dt>
              <dd className="mono">{APP_VERSION}</dd>
            </div>
            <div>
              <dt>Cara dibuka</dt>
              <dd>{sudahDipasang() ? 'Aplikasi dipasang' : 'Pelayar web'}</dd>
            </div>
            <div>
              <dt>Pelayan data</dt>
              <dd>
                <span className={`lencana lencana-${status}`} role="status">
                  {teksPelayan[status]}
                </span>
              </dd>
            </div>
          </dl>
          {status === 'gagal' && (
            <button type="button" className="butang butang-garis" onClick={semak}>
              Cuba semula
            </button>
          )}
        </section>

        <section className="kad" aria-label="Log keluar">
          {sahKeluar ? (
            <>
              <p>
                {belumHantar
                  ? 'Ada perubahan yang belum dihantar ke pelayan. Ia kekal dalam telefon ini dan dihantar apabila anda log masuk semula. Log keluar sekarang?'
                  : 'Log keluar daripada Guru360 pada telefon ini?'}
              </p>
              <div className="dua-butang">
                <button type="button" className="butang butang-garis" onClick={() => setSahKeluar(false)}>
                  Batal
                </button>
                <button type="button" className="butang butang-bahaya" onClick={keluar}>
                  Ya, log keluar
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="butang butang-garis" onClick={() => setSahKeluar(true)}>
              Log keluar
            </button>
          )}
        </section>
      </main>
    </>
  );
}
