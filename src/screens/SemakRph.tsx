import { useEffect, useState } from 'react';
import { KepalaKembali } from '../components/Rangka';
import { dariTarikh, hariIni, tambahHari, tarikhMesra } from '../lib/kalendar';
import { mulaMinggu } from '../lib/rph';
import { ahliSekolahHq, senaraiAhli, type ButiranAhli } from '../lib/sekolah';
import { useSemakRph, type RphGuru, type Semakan } from '../lib/semakan';

const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
const hariTarikh = (t: string) => {
  const d = dariTarikh(t);
  return `${HARI[d.getDay()]} ${d.getDate()} ${BULAN[d.getMonth()]}`;
};
const tarikhValid = (t: string | undefined): t is string => !!t && /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(dariTarikh(t).getTime());

/** Satu RPH guru: ringkasan, bacaan penuh, ulasan dan tanda disemak. */
function KadRph({ r, s, semak, batal, dalamTalian, bacaSahaja }: { r: RphGuru; s: Semakan | undefined; semak: (r: RphGuru, ulasan: string) => Promise<void>; batal: (id: string) => Promise<void>; dalamTalian: boolean; bacaSahaja: boolean }) {
  const [penuh, setPenuh] = useState(false);
  const [ulasan, setUlasan] = useState(s?.ulasan ?? '');
  const [sibuk, setSibuk] = useState(false);
  useEffect(() => setUlasan(s?.ulasan ?? ''), [s?.ulasan]);
  const siap = r.status === 'siap';
  const jalan = async (kerja: () => Promise<void>) => {
    setSibuk(true);
    await kerja();
    setSibuk(false);
  };
  const bahagian = (label: string, teks: string) =>
    teks.trim() ? (
      <div className="semak-bahagian">
        <span className="label-bahagian">{label}</span>
        <p>{teks}</p>
      </div>
    ) : null;
  return (
    <li className={`kad kad-makluman${siap && !s ? ' kad-garis-emas' : ''}`}>
      <div className="baris-ahli">
        <strong>
          {hariTarikh(r.tarikh)} · {r.mula}–{r.tamat}
        </strong>
        <span className={`pil ${!siap ? 'pil-draf' : s ? 'pil-siap' : 'pil-emas'}`}>{!siap ? '● Draf' : s ? '✓ Disemak' : 'Belum disemak'}</span>
      </div>
      <span className="nota-kecil">
        {r.subjek}
        {r.kelas ? ` · ${r.kelas}` : ''}
      </span>
      <div className={penuh ? 'semak-isi' : 'semak-isi semak-ringkas'}>
        {bahagian('OBJEKTIF', r.objektif) ?? <p className="nota">Objektif belum diisi.</p>}
        {penuh && bahagian('AKTIVITI', r.aktiviti)}
        {penuh && bahagian('PENTAKSIRAN', r.pentaksiran)}
        {penuh && bahagian('REFLEKSI', r.refleksi)}
      </div>
      <button type="button" className="butang-teks" aria-expanded={penuh} onClick={() => setPenuh((p) => !p)}>
        {penuh ? 'Tutup' : 'Baca penuh'}
      </button>
      {bacaSahaja ? (
        s?.ulasan ? (
          <div className="semak-bahagian">
            <span className="label-bahagian">ULASAN ADMIN SEKOLAH</span>
            <p>{s.ulasan}</p>
          </div>
        ) : null
      ) : siap ? (
        <>
          <div className="medan">
            <label htmlFor={`ulasan-${r.id}`}>Ulasan (pilihan)</label>
            <textarea id={`ulasan-${r.id}`} rows={2} maxLength={1000} value={ulasan} onChange={(e) => setUlasan(e.target.value)} />
          </div>
          <div className="dua-butang">
            {s && (
              <button type="button" className="butang butang-garis butang-kecil" disabled={sibuk || !dalamTalian} onClick={() => void jalan(() => batal(r.id))}>
                Batal semakan
              </button>
            )}
            <button type="button" className="butang butang-utama butang-kecil" disabled={sibuk || !dalamTalian || (!!s && ulasan.trim() === s.ulasan)} onClick={() => void jalan(() => semak(r, ulasan))}>
              {sibuk ? 'Sebentar…' : s ? 'Simpan ulasan' : 'Tanda disemak'}
            </button>
          </div>
        </>
      ) : (
        <p className="nota">RPH ini masih draf. Ia boleh disemak selepas guru menandakannya siap.</p>
      )}
    </li>
  );
}

interface PropsSemak {
  sekolahId: string;
  negeri: string | null;
  dalamTalian: boolean;
  tarikh?: string;
  guruId?: string;
  /** Ibu pejabat: baca RPH mana-mana sekolah tanpa menyemak. */
  hq?: { namaSekolah: string };
}

/** Admin sekolah: baca dan semak RPH guru sekolahnya, minggu demi minggu. Ibu pejabat: baca sahaja. */
export function SemakRph({ sekolahId, negeri, dalamTalian, tarikh, guruId, hq }: PropsSemak) {
  const asas = hq ? `#/sekolah/${sekolahId}` : '#/semak';
  const mula = mulaMinggu(tarikhValid(tarikh) ? tarikh : hariIni(), negeri);
  const tamat = tambahHari(mula, 6);
  const mingguIni = mulaMinggu(hariIni(), negeri);
  const { rph, semakan, sedia, ralat, semak, batal } = useSemakRph(sekolahId, mula, tamat, dalamTalian);
  const [guru, setGuru] = useState<ButiranAhli[] | null>(null);

  useEffect(() => {
    if (!dalamTalian) return;
    let hidup = true;
    void (hq ? ahliSekolahHq(sekolahId) : senaraiAhli()).then((h) => {
      if (hidup && h.ok) setGuru(h.senarai.filter((a) => a.peranan === 'guru'));
    });
    return () => {
      hidup = false;
    };
  }, [dalamTalian, sekolahId, !!hq]); // eslint-disable-line react-hooks/exhaustive-deps

  const petaSemakan = new Map(semakan.map((s) => [s.rph_id, s]));
  const nama = (id: string) => {
    const g = guru?.find((x) => x.pengguna_id === id);
    return g ? g.nama || g.emel : 'Guru';
  };
  // Guru aktif, serta guru lain yang ada RPH pada minggu ini (contohnya yang sudah keluar).
  const idGuru = [...new Set([...(guru ?? []).filter((g) => g.status === 'aktif').map((g) => g.pengguna_id), ...rph.map((r) => r.guru_id)])];
  const kira = (id: string) => {
    const milik = rph.filter((r) => r.guru_id === id);
    const siap = milik.filter((r) => r.status === 'siap');
    const disemak = siap.filter((r) => petaSemakan.has(r.id)).length;
    return { siap: siap.length, draf: milik.length - siap.length, disemak, belum: siap.length - disemak };
  };
  const jumlahSiap = rph.filter((r) => r.status === 'siap').length;
  const jumlahDisemak = rph.filter((r) => r.status === 'siap' && petaSemakan.has(r.id)).length;
  const dipilih = guruId && idGuru.includes(guruId) ? guruId : null;
  const milikDipilih = dipilih ? rph.filter((r) => r.guru_id === dipilih) : [];

  return (
    <>
      <KepalaKembali
        ke={dipilih ? `${asas}/${mula}` : '#/'}
        labelKembali={dipilih ? 'Kembali ke senarai guru' : 'Kembali ke Pengurusan'}
        tajuk={dipilih ? nama(dipilih) : hq ? hq.namaSekolah : 'Semak RPH'}
        sub={`${hq && !dipilih ? 'RPH · baca sahaja · ' : ''}Minggu ${tarikhMesra(mula, tamat)}`}
      />
      <main className="isi">
        <nav className="pilih-minggu" aria-label="Pilih minggu">
          <a href={`${asas}/${tambahHari(mula, -7)}${dipilih ? `/${dipilih}` : ''}`} aria-label="Minggu sebelum">
            ‹ Sebelum
          </a>
          <a href={`${asas}/${mingguIni}${dipilih ? `/${dipilih}` : ''}`} aria-current={mula === mingguIni ? 'page' : undefined}>
            Minggu ini
          </a>
          <a href={`${asas}/${tambahHari(mula, 7)}${dipilih ? `/${dipilih}` : ''}`} aria-label="Minggu selepas">
            Selepas ›
          </a>
        </nav>
        {!dalamTalian && <p className="nota">Sambung internet untuk membaca dan menyemak RPH guru.</p>}
        {ralat && (
          <div className="kad">
            <p className="mesej mesej-ralat" role="alert">
              {ralat}
            </p>
          </div>
        )}
        {dalamTalian && !sedia && !ralat && <p className="nota">Memuat RPH…</p>}

        {sedia && !dipilih && (
          <section className="bahagian" aria-labelledby="tajuk-semua-guru">
            <div className="baris-tajuk">
              <h2 id="tajuk-semua-guru" className="label-bahagian">
                SEMUA GURU
              </h2>
              <span className="mono nota-kecil">
                {jumlahDisemak}/{jumlahSiap} disemak
              </span>
            </div>
            {idGuru.length === 0 ? (
              <p className="nota">Belum ada guru di sekolah ini.</p>
            ) : (
              <ul className="senarai-acara">
                {idGuru.map((id) => {
                  const k = kira(id);
                  return (
                    <li key={id}>
                      <a href={`${asas}/${mula}/${id}`} className={`kad kad-pautan${k.belum > 0 ? ' kad-garis-emas' : ''}`}>
                        <span className="kad-pautan-teks">
                          <strong className="pecah">{nama(id)}</strong>
                          <span>{k.siap + k.draf === 0 ? 'Tiada RPH minggu ini' : `${k.siap} siap · ${k.draf} draf · ${k.disemak} disemak`}</span>
                        </span>
                        {k.belum > 0 && <span className="lencana-kira">{k.belum}</span>}
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="nota">{hq ? 'Nombor kuning ialah bilangan RPH siap yang belum disemak oleh admin sekolah. Ibu pejabat membaca sahaja.' : 'Nombor kuning ialah bilangan RPH siap yang belum disemak. Guru nampak tanda "Disemak" dan ulasan pada RPH masing-masing.'}</p>
          </section>
        )}

        {sedia && dipilih && (
          <>
            {milikDipilih.length === 0 ? (
              <p className="nota">Guru ini tiada RPH pada minggu ini.</p>
            ) : (
              <ul className="senarai-acara">
                {milikDipilih.map((r) => (
                  <KadRph key={r.id} r={r} s={petaSemakan.get(r.id)} semak={semak} batal={batal} dalamTalian={dalamTalian} bacaSahaja={!!hq} />
                ))}
              </ul>
            )}
            {!hq && <p className="nota">RPH yang sudah disemak masih boleh diedit oleh guru; tanda semakan akan gugur jika isinya diubah.</p>}
          </>
        )}
      </main>
    </>
  );
}
