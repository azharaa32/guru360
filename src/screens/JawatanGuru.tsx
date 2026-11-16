import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KepalaKembali } from '../components/Rangka';
import { LAJUR_JAWATAN, padanJawatan, type JawatanDitetapkan } from '../lib/jawatan';
import { NAMA_JENIS, muatMysg, namaPenuh, type IsiJobskop, type Jawatan, type JenisPortfolio, type PortfolioMysg } from '../lib/jobskop';
import { senaraiAhli, type ButiranAhli } from '../lib/sekolah';
import { supabase, terjemahRalat } from '../lib/supabase';

const JENIS: JenisPortfolio[] = ['berjawatan', 'tanpa_jawatan', 'jawatankuasa'];

/** Admin sekolah: tetapkan jawatan (portfolio MySG) kepada guru bagi satu tahun. Guru memasukkannya ke jobskop sendiri. */
export function JawatanGuru({ sekolahId, dalamTalian, guruId }: { sekolahId: string; dalamTalian: boolean; guruId?: string }) {
  const tahunIni = new Date().getFullYear();
  const [tahun, setTahun] = useState(tahunIni);
  const [semua, setSemua] = useState<JawatanDitetapkan[] | null>(null);
  const [guru, setGuru] = useState<ButiranAhli[] | null>(null);
  const [mysg, setMysg] = useState<PortfolioMysg[]>([]);
  const [ralat, setRalat] = useState<string | null>(null);
  const [kod, setKod] = useState('');
  const [butiran, setButiran] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [sahPadam, setSahPadam] = useState<string | null>(null);
  // Jobskop setiap guru (jawatan yang guru tambah sendiri), mengikut id guru.
  const [jobskop, setJobskop] = useState<Record<string, IsiJobskop>>({});

  const muat = useCallback(async () => {
    const { data, error } = await supabase.from('jawatan_guru').select(LAJUR_JAWATAN).eq('sekolah_id', sekolahId);
    if (error) return setRalat(terjemahRalat(error.message));
    setSemua((data ?? []) as unknown as JawatanDitetapkan[]);
    const j = await supabase.from('dokumen').select('id, guru_id, isi').eq('sekolah_id', sekolahId).eq('jenis', 'jobskop');
    if (!j.error) setJobskop(Object.fromEntries(((j.data ?? []) as unknown as { guru_id: string; isi: IsiJobskop }[]).map((d) => [d.guru_id, d.isi])));
  }, [sekolahId]);

  useEffect(() => {
    if (!dalamTalian) return;
    let hidup = true;
    void muat();
    void senaraiAhli().then((h) => {
      if (hidup && h.ok) setGuru(h.senarai.filter((a) => a.peranan === 'guru' && a.status === 'aktif'));
    });
    void muatMysg().then((d) => {
      if (hidup) setMysg(d.portfolio);
    });
    return () => {
      hidup = false;
    };
  }, [dalamTalian, muat]);

  const dipilih = guruId ? (guru ?? []).find((g) => g.pengguna_id === guruId) : undefined;
  const tahunan = (semua ?? []).filter((j) => j.tahun === tahun);
  const milik = dipilih ? tahunan.filter((j) => j.guru_id === dipilih.pengguna_id) : [];

  /** Jawatan dalam jobskop guru (bagi tahun dipilih) yang belum ditetapkan atau disahkan admin. */
  const belumSah = (idGuru: string): Jawatan[] => {
    const js = jobskop[idGuru];
    if (!js || js.tahun !== tahun || !Array.isArray(js.jawatan)) return [];
    const sah = tahunan.filter((x) => x.guru_id === idGuru);
    return js.jawatan.filter((j) => !sah.some((d) => padanJawatan(d, j)));
  };
  const sahkan = async (j: Jawatan) => {
    if (!dipilih || sibuk) return;
    setSibuk(true);
    setRalat(null);
    const { error } = await supabase
      .from('jawatan_guru')
      .insert({ sekolah_id: sekolahId, guru_id: dipilih.pengguna_id, tahun, kod: j.kod ?? '', nama: j.nama.trim().slice(0, 160), butiran: (j.butiran ?? '').trim().toUpperCase().slice(0, 120) });
    setSibuk(false);
    if (error) setRalat(terjemahRalat(error.message));
    await muat();
  };

  const tetapkan = async (e: FormEvent) => {
    e.preventDefault();
    const port = mysg.find((p) => p.kod === kod);
    if (!port || !dipilih || sibuk) return;
    const teks = butiran.replace(/\s+/g, ' ').trim().toUpperCase();
    if (milik.some((j) => j.kod === port.kod && j.butiran === teks)) return setRalat('Jawatan ini sudah ditetapkan kepada guru ini.');
    setSibuk(true);
    setRalat(null);
    const { error } = await supabase.from('jawatan_guru').insert({ sekolah_id: sekolahId, guru_id: dipilih.pengguna_id, tahun, kod: port.kod, nama: port.nama, butiran: teks });
    setSibuk(false);
    if (error) setRalat(/duplicate|unique/i.test(error.message) ? 'Jawatan ini sudah ditetapkan kepada guru ini.' : terjemahRalat(error.message));
    else {
      setKod('');
      setButiran('');
    }
    await muat();
  };

  const padam = async (id: string) => {
    setSahPadam(null);
    const { error } = await supabase.from('jawatan_guru').delete().in('id', [id]);
    if (error) setRalat(terjemahRalat(error.message));
    await muat();
  };

  return (
    <>
      <KepalaKembali
        ke={dipilih ? '#/jawatan' : '#/'}
        labelKembali={dipilih ? 'Kembali ke senarai guru' : 'Kembali ke Pengurusan'}
        tajuk={dipilih ? dipilih.nama || dipilih.emel : 'Jawatan guru'}
        sub={dipilih ? `Jawatan tahun ${tahun}` : 'Portfolio dan jawatankuasa ikut MySG'}
      />
      <main className="isi">
        <div className="tab" role="group" aria-label="Tahun">
          {[tahunIni, tahunIni + 1].map((t) => (
            <button key={t} type="button" aria-pressed={tahun === t} onClick={() => setTahun(t)}>
              {t}
            </button>
          ))}
        </div>
        {!dalamTalian && <p className="nota">Sambung internet untuk melihat dan menetapkan jawatan.</p>}
        {ralat && (
          <div className="kad">
            <p className="mesej mesej-ralat" role="alert">
              {ralat}
            </p>
          </div>
        )}
        {dalamTalian && (!semua || !guru) && !ralat && <p className="nota">Memuat…</p>}

        {semua && guru && !dipilih && (
          <>
            {guru.length === 0 ? (
              <p className="nota">Belum ada guru aktif. Jemput guru dahulu di skrin Pengurusan.</p>
            ) : (
              <ul className="senarai-acara">
                {guru.map((g) => {
                  const j = tahunan.filter((x) => x.guru_id === g.pengguna_id);
                  const menunggu = belumSah(g.pengguna_id).length;
                  return (
                    <li key={g.pengguna_id}>
                      <a href={`#/jawatan/${g.pengguna_id}`} className={`kad kad-pautan${menunggu ? ' kad-garis-emas' : ''}`}>
                        <span className="kad-pautan-teks">
                          <strong className="pecah">{g.nama || g.emel}</strong>
                          <span className="pecah">{j.length === 0 ? 'Belum ada jawatan ditetapkan' : j.map((x) => (x.butiran ? `${x.nama} ${x.butiran}` : x.nama)).join(' · ')}</span>
                          {menunggu > 0 && <span>{menunggu} jawatan ditambah guru menunggu pengesahan</span>}
                        </span>
                        {menunggu > 0 && <span className="lencana-kira">{menunggu}</span>}
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="nota">Guru nampak jawatan yang ditetapkan di skrin Jobskop dan memasukkannya ke jobskop sendiri. Guru juga boleh menambah jawatan sendiri; nombor kuning ialah jawatan yang menunggu pengesahan anda.</p>
          </>
        )}

        {semua && dipilih && (
          <>
            {belumSah(dipilih.pengguna_id).length > 0 && (
              <section className="bahagian" aria-labelledby="tajuk-sendiri">
                <div className="baris-tajuk">
                  <h2 id="tajuk-sendiri" className="label-bahagian">
                    DITAMBAH GURU · MENUNGGU PENGESAHAN
                  </h2>
                  <span className="mono nota-kecil">{belumSah(dipilih.pengguna_id).length}</span>
                </div>
                <ul className="senarai-acara">
                  {belumSah(dipilih.pengguna_id).map((j) => (
                    <li key={j.id} className="kad kad-makluman kad-garis-emas">
                      <div className="baris-ahli">
                        <span className="acara-teks">
                          <strong className="pecah">{namaPenuh(j)}</strong>
                          <span>
                            {j.kod ? `${j.kod} · ` : 'Jawatan sendiri · '}
                            {(j.kumpulan ?? []).reduce((n, k) => n + k.tugas.length, 0)} tugas
                          </span>
                        </span>
                        <button type="button" className="butang butang-utama butang-kecil" disabled={sibuk || !dalamTalian} onClick={() => void sahkan(j)}>
                          Sahkan
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="nota">Jika jawatan ini tidak betul, minta guru membuangnya daripada jobskop.</p>
              </section>
            )}

            <section className="bahagian" aria-labelledby="tajuk-ditetapkan">
              <div className="baris-tajuk">
                <h2 id="tajuk-ditetapkan" className="label-bahagian">
                  JAWATAN DITETAPKAN ATAU DISAHKAN
                </h2>
                <span className="mono nota-kecil">{milik.length}</span>
              </div>
              {milik.length === 0 ? (
                <p className="nota">Belum ada jawatan untuk tahun {tahun}.</p>
              ) : (
                <ul className="senarai-acara">
                  {milik.map((j) => (
                    <li key={j.id} className="kad kad-makluman">
                      <div className="baris-ahli">
                        <span className="acara-teks">
                          <strong className="pecah">{j.butiran ? `${j.nama} ${j.butiran}` : j.nama}</strong>
                          <span>{j.kod}</span>
                        </span>
                        {sahPadam === j.id ? (
                          <button type="button" className="butang butang-bahaya butang-kecil" onClick={() => void padam(j.id)}>
                            Sahkan buang
                          </button>
                        ) : (
                          <button type="button" className="butang butang-garis butang-kecil" onClick={() => setSahPadam(j.id)}>
                            Buang
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form className="kad borang borang-sekolah" onSubmit={tetapkan}>
              <h2 className="kad-tajuk">Tetapkan jawatan</h2>
              <div className="medan">
                <label htmlFor="jawatan-kod">Portfolio atau jawatankuasa (MySG)</label>
                <select id="jawatan-kod" value={kod} onChange={(e) => setKod(e.target.value)} required>
                  <option value="">Pilih jawatan</option>
                  {JENIS.map((jn) => (
                    <optgroup key={jn} label={NAMA_JENIS[jn]}>
                      {mysg
                        .filter((p) => p.jenis === jn)
                        .map((p) => (
                          <option key={p.kod} value={p.kod}>
                            {p.nama}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="medan">
                <label htmlFor="jawatan-butiran">Butiran (pilihan)</label>
                <input id="jawatan-butiran" value={butiran} maxLength={120} onChange={(e) => setButiran(e.target.value)} autoCapitalize="characters" />
                <p className="bantuan">Contoh: "4 ADNAN" bagi Guru Kelas, atau "BAHASA MELAYU" bagi Ketua Panitia.</p>
              </div>
              <button type="submit" className="butang butang-utama" disabled={sibuk || !dalamTalian || !kod}>
                {sibuk ? 'Sebentar…' : 'Tetapkan'}
              </button>
            </form>
          </>
        )}
        {semua && guru && guruId && !dipilih && <p className="nota">Guru ini tidak lagi aktif di sekolah anda.</p>}
      </main>
    </>
  );
}
