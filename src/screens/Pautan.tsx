import { useState, type FormEvent } from 'react';
import { KepalaKembali } from '../components/Rangka';
import { KATEGORI, bersihUrl, namaLaman, type Kategori, type Pautan, type PautanBaharu } from '../lib/pautan';

const Anak = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

/** Satu baris pautan yang dibuka dalam tab baharu. */
function BarisPautan({ p, sekolahId }: { p: Pautan; sekolahId?: string | null }) {
  return (
    <li>
      <a href={p.url} target="_blank" rel="noopener noreferrer" className="baris-pautan">
        <span className="acara-teks">
          <strong className="pecah">{p.tajuk}</strong>
          <span>
            {namaLaman(p.url)}
            {p.sekolah_id === null && sekolahId !== undefined ? ' · Ibu pejabat' : ''}
          </span>
        </span>
        <Anak />
        <span className="sr-only">(dibuka dalam tab baharu)</span>
      </a>
    </li>
  );
}

function TabKategori({ ada, aktif, pilih }: { ada: Kategori[]; aktif: Kategori; pilih: (k: Kategori) => void }) {
  return (
    <div className="tab-kategori" role="group" aria-label="Kategori pautan">
      {KATEGORI.filter((k) => ada.includes(k.id)).map((k) => (
        <button key={k.id} type="button" aria-pressed={aktif === k.id} onClick={() => pilih(k.id)}>
          {k.nama}
        </button>
      ))}
    </div>
  );
}

/** Kad di skrin Utama guru: pautan ikut kategori, lima pertama, dengan pautan ke halaman penuh. */
export function KadPautan({ pautan }: { pautan: Pautan[] }) {
  const ada = KATEGORI.map((k) => k.id).filter((k) => pautan.some((p) => p.kategori === k));
  const [pilihan, setPilihan] = useState<Kategori | null>(null);
  if (ada.length === 0) return null;
  const aktif = pilihan && ada.includes(pilihan) ? pilihan : ada[0];
  const senarai = pautan.filter((p) => p.kategori === aktif);
  return (
    <section className="kad" aria-labelledby="tajuk-pautan">
      <div className="baris-tajuk">
        <h2 id="tajuk-pautan">Pautan pantas</h2>
        <a href="#/pautan" className="pautan-kecil">
          Lihat semua
        </a>
      </div>
      {ada.length > 1 && <TabKategori ada={ada} aktif={aktif} pilih={setPilihan} />}
      <ul className="senarai-pautan">
        {senarai.slice(0, 5).map((p) => (
          <BarisPautan key={p.id} p={p} />
        ))}
      </ul>
      {senarai.length > 5 && (
        <a href="#/pautan" className="pautan-kecil">
          {senarai.length - 5} lagi dalam {KATEGORI.find((k) => k.id === aktif)!.nama}
        </a>
      )}
    </section>
  );
}

/** Halaman penuh untuk guru: semua pautan ikut kategori. */
export function PautanGuru({ pautan, sedia, namaSekolah }: { pautan: Pautan[]; sedia: boolean; namaSekolah: string }) {
  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Pautan pantas" sub={`Daripada ${namaSekolah || 'sekolah'} dan ibu pejabat`} />
      <main className="isi">
        {sedia && pautan.length === 0 && <p className="nota">Belum ada pautan. Admin sekolah anda boleh menambahnya.</p>}
        {KATEGORI.map((k) => {
          const s = pautan.filter((p) => p.kategori === k.id);
          if (!s.length) return null;
          return (
            <section key={k.id} className="bahagian" aria-labelledby={`kat-${k.id}`}>
              <h2 id={`kat-${k.id}`} className="label-bahagian">
                {k.nama.toUpperCase()}
              </h2>
              <ul className="kad senarai-pautan">
                {s.map((p) => (
                  <BarisPautan key={p.id} p={p} sekolahId={p.sekolah_id} />
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </>
  );
}

interface PropsUrus {
  mod: 'sekolah' | 'semua';
  skop: string | null;
  namaSekolah?: string;
  pautan: Pautan[];
  sedia: boolean;
  ralat: string | null;
  dalamTalian: boolean;
  tambah: (skop: string | null, p: PautanBaharu) => Promise<boolean>;
  ubah: (id: string, p: PautanBaharu) => Promise<boolean>;
  padam: (id: string) => Promise<boolean>;
  tukarTempat: (a: Pautan, b: Pautan) => Promise<void>;
}

/** Admin sekolah (mod sekolah) atau ibu pejabat (mod semua): urus pautan. */
export function PautanUrus({ mod, skop, namaSekolah, pautan, sedia, ralat, dalamTalian, tambah, ubah, padam, tukarTempat }: PropsUrus) {
  const milik = pautan.filter((p) => p.sekolah_id === skop);
  const [sunting, setSunting] = useState<string | null>(null);
  const [kategori, setKategori] = useState<Kategori>('utama');
  const [tajuk, setTajuk] = useState('');
  const [url, setUrl] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);
  const [sahPadam, setSahPadam] = useState<string | null>(null);

  const kosongkan = () => {
    setSunting(null);
    setTajuk('');
    setUrl('');
  };
  const mulaSunting = (p: Pautan) => {
    setSunting(p.id);
    setKategori(p.kategori);
    setTajuk(p.tajuk);
    setUrl(p.url);
    setMesej(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hantar = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    const alamat = bersihUrl(url);
    if (!alamat) return setMesej({ jenis: 'ralat', teks: 'Alamat tidak sah. Guna alamat penuh yang bermula dengan https://, contohnya https://delima.edu.my' });
    const t = tajuk.replace(/\s+/g, ' ').trim();
    if (!t) return setMesej({ jenis: 'ralat', teks: 'Isi nama pautan.' });
    setSibuk(true);
    setMesej(null);
    const data = { kategori, tajuk: t.slice(0, 80), url: alamat };
    const ok = sunting ? await ubah(sunting, data) : await tambah(skop, data);
    setSibuk(false);
    if (ok) {
      setMesej({ jenis: 'ok', teks: sunting ? 'Pautan dikemas kini.' : 'Pautan ditambah. Guru akan nampak di skrin Utama.' });
      kosongkan();
    }
  };

  return (
    <>
      <KepalaKembali
        ke="#/"
        labelKembali="Kembali ke Pengurusan"
        tajuk={mod === 'semua' ? 'Pautan semua sekolah' : 'Pautan pantas'}
        sub={mod === 'semua' ? 'Dipaparkan kepada guru semua sekolah' : `Untuk guru ${namaSekolah ?? 'sekolah ini'}`}
      />
      <main className="isi">
        <form className="kad borang" onSubmit={hantar}>
          <h2>{sunting ? 'Ubah pautan' : 'Tambah pautan'}</h2>
          <div className="medan">
            <label htmlFor="pautan-kategori">Kategori</label>
            <select id="pautan-kategori" value={kategori} onChange={(e) => setKategori(e.target.value as Kategori)}>
              {KATEGORI.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="medan">
            <label htmlFor="pautan-tajuk">Nama pautan</label>
            <input id="pautan-tajuk" value={tajuk} onChange={(e) => setTajuk(e.target.value)} maxLength={80} required autoComplete="off" placeholder="Contoh: DELIMa KPM" />
          </div>
          <div className="medan">
            <label htmlFor="pautan-url">Alamat laman</label>
            <input
              id="pautan-url"
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={500}
              required
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
            />
            <p className="bantuan">Hanya alamat https diterima. Tampal terus daripada pelayar.</p>
          </div>
          <div aria-live="polite">
            {(mesej || ralat) && (
              <p className={`mesej mesej-${ralat ? 'ralat' : mesej!.jenis}`} role={ralat || mesej?.jenis === 'ralat' ? 'alert' : 'status'}>
                {ralat ?? mesej!.teks}
              </p>
            )}
          </div>
          <button type="submit" className="butang butang-utama" disabled={sibuk || !dalamTalian}>
            {sibuk ? 'Menyimpan…' : sunting ? 'Simpan perubahan' : 'Tambah pautan'}
          </button>
          {sunting && (
            <button type="button" className="butang-teks tengah" onClick={kosongkan}>
              Batal
            </button>
          )}
          {!dalamTalian && <p className="nota">Perlu internet untuk menambah atau mengubah pautan.</p>}
        </form>

        {sedia && milik.length === 0 && <p className="nota">Belum ada pautan.</p>}
        {KATEGORI.map((k) => {
          const s = milik.filter((p) => p.kategori === k.id);
          if (!s.length) return null;
          return (
            <section key={k.id} className="bahagian" aria-labelledby={`urus-${k.id}`}>
              <div className="baris-tajuk">
                <h2 id={`urus-${k.id}`} className="label-bahagian">
                  {k.nama.toUpperCase()}
                </h2>
                <span className="mono nota-kecil">{s.length}</span>
              </div>
              <ul className="senarai-acara">
                {s.map((p, i) => (
                  <li key={p.id} className="kad kad-makluman">
                    <span className="acara-teks">
                      <strong className="pecah">{p.tajuk}</strong>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="pautan-kecil pecah">
                        {namaLaman(p.url)}
                      </a>
                    </span>
                    {sahPadam === p.id ? (
                      <div className="dua-butang">
                        <button type="button" className="butang butang-garis butang-kecil" onClick={() => setSahPadam(null)}>
                          Batal
                        </button>
                        <button
                          type="button"
                          className="butang butang-bahaya butang-kecil"
                          disabled={!dalamTalian}
                          onClick={() => {
                            setSahPadam(null);
                            void padam(p.id);
                          }}
                        >
                          Ya, padam
                        </button>
                      </div>
                    ) : (
                      <div className="butang-pautan">
                        <button type="button" className="butang butang-garis butang-kecil" disabled={i === 0 || !dalamTalian} onClick={() => void tukarTempat(p, s[i - 1])} aria-label={`Naikkan ${p.tajuk}`}>
                          ↑
                        </button>
                        <button type="button" className="butang butang-garis butang-kecil" disabled={i === s.length - 1 || !dalamTalian} onClick={() => void tukarTempat(p, s[i + 1])} aria-label={`Turunkan ${p.tajuk}`}>
                          ↓
                        </button>
                        <button type="button" className="butang butang-garis butang-kecil" disabled={!dalamTalian} onClick={() => mulaSunting(p)}>
                          Ubah
                        </button>
                        <button type="button" className="butang butang-garis butang-kecil" disabled={!dalamTalian} onClick={() => setSahPadam(p.id)}>
                          Padam
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {mod === 'sekolah' && pautan.some((p) => p.sekolah_id === null) && (
          <p className="nota">Guru juga nampak {pautan.filter((p) => p.sekolah_id === null).length} pautan daripada ibu pejabat.</p>
        )}
      </main>
    </>
  );
}
