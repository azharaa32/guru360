import { useEffect, useState, type FormEvent } from 'react';
import { KepalaKembali } from '../components/Rangka';
import { dariTarikh, hariIni } from '../lib/kalendar';
import type { Makluman, MaklumanBaharu, StatusMakluman } from '../lib/makluman';
import { senaraiAhli, type ButiranAhli } from '../lib/sekolah';

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
const pendek = (d: Date) => `${d.getDate()} ${BULAN[d.getMonth()]}`;
const tarikhHantar = (iso: string) => pendek(new Date(iso));

/** "Sebelum 20 Nov · 5 hari lagi", "Sebelum 20 Nov · hari ini" atau "Sebelum 20 Nov · lewat 2 hari". */
function teksAkhir(tarikh: string): { teks: string; lewat: boolean } {
  const beza = Math.round((dariTarikh(tarikh).getTime() - dariTarikh(hariIni()).getTime()) / 86400000);
  const baki = beza > 0 ? `${beza} hari lagi` : beza === 0 ? 'hari ini' : `lewat ${-beza} hari`;
  return { teks: `Sebelum ${pendek(dariTarikh(tarikh))} · ${baki}`, lewat: beza < 0 };
}

function PilJenis({ m }: { m: Makluman }) {
  return (
    <span className="baris-pil">
      <span className={`pil ${m.jenis === 'tindakan' ? 'pil-emas' : 'pil-biru'}`}>{m.jenis === 'tindakan' ? 'Tindakan' : 'Makluman'}</span>
      {m.sekolah_id === null && <span className="pil pil-siap">Ibu pejabat</span>}
    </span>
  );
}

interface PropsGuru {
  makluman: Makluman[];
  status: StatusMakluman[];
  uid: string;
  sekolahId: string;
  namaSekolah: string;
  sedia: boolean;
  ralat: string | null;
  dalamTalian: boolean;
  tandaBaca: (ids: string[], sekolahId: string) => Promise<void>;
  tandaSiap: (id: string, sekolahId: string, siap: boolean) => Promise<void>;
}

/** Guru: makluman dan tindakan daripada sekolah dan ibu pejabat. Membuka skrin ini menandakan semuanya sudah dibaca. */
export function MaklumanGuru({ makluman, status, uid, sekolahId, namaSekolah, sedia, ralat, dalamTalian, tandaBaca, tandaSiap }: PropsGuru) {
  const sendiri = new Map(status.filter((s) => s.guru_id === uid).map((s) => [s.makluman_id, s]));
  // Yang belum dibaca semasa skrin dibuka kekal bertanda "Baharu" sehingga guru meninggalkan skrin.
  const [baharu] = useState(() => new Set(makluman.filter((m) => !sendiri.has(m.id)).map((m) => m.id)));
  const [sibuk, setSibuk] = useState<string | null>(null);
  const belumBaca = makluman.filter((m) => !sendiri.has(m.id)).map((m) => m.id).join(',');

  useEffect(() => {
    if (belumBaca && dalamTalian) void tandaBaca(belumBaca.split(','), sekolahId);
  }, [belumBaca, dalamTalian, sekolahId, tandaBaca]);

  const siap = async (id: string, nilai: boolean) => {
    setSibuk(id);
    await tandaSiap(id, sekolahId, nilai);
    setSibuk(null);
  };

  const tindakan = makluman.filter((m) => m.jenis === 'tindakan');
  const perlu = tindakan.filter((m) => !sendiri.get(m.id)?.siap_pada).sort((a, b) => (a.tarikh_akhir ?? '9999').localeCompare(b.tarikh_akhir ?? '9999'));
  const selesai = tindakan.filter((m) => sendiri.get(m.id)?.siap_pada);
  const lain = makluman.filter((m) => m.jenis === 'makluman');

  const kad = (m: Makluman, sudahSiap: boolean) => {
    const akhir = m.tarikh_akhir ? teksAkhir(m.tarikh_akhir) : null;
    return (
      <li key={m.id} className={`kad kad-makluman${!sudahSiap && m.jenis === 'tindakan' ? ' kad-garis-emas' : ''}`}>
        <div className="baris-ahli">
          <PilJenis m={m} />
          <span className={`nota-kecil${akhir?.lewat && !sudahSiap ? ' teks-lewat' : ''}`}>
            {m.jenis === 'tindakan' ? (akhir ? (sudahSiap ? `Sebelum ${pendek(dariTarikh(m.tarikh_akhir!))}` : akhir.teks) : 'Tiada tarikh akhir') : tarikhHantar(m.dicipta_pada)}
            {m.jenis === 'makluman' && (baharu.has(m.id) ? ' · Baharu' : ' · Sudah dibaca')}
          </span>
        </div>
        <p className="teks-makluman">{m.tajuk}</p>
        {m.jenis === 'tindakan' &&
          (sudahSiap ? (
            <button type="button" className="butang butang-garis butang-kecil" disabled={sibuk === m.id || !dalamTalian} onClick={() => void siap(m.id, false)}>
              {sibuk === m.id ? 'Sebentar…' : '✓ Siap · Batalkan'}
            </button>
          ) : (
            <button type="button" className="butang butang-utama butang-kecil" disabled={sibuk === m.id || !dalamTalian} onClick={() => void siap(m.id, true)}>
              {sibuk === m.id ? 'Sebentar…' : 'Tanda siap'}
            </button>
          ))}
      </li>
    );
  };

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Makluman" sub={`Daripada ${namaSekolah || 'sekolah'} dan ibu pejabat`} />
      <main className="isi">
        {ralat && (
          <div className="kad">
            <p className="mesej mesej-ralat" role="alert">
              {ralat}
            </p>
          </div>
        )}
        {!dalamTalian && <p className="nota">Tiada internet. Senarai ini mungkin bukan yang terkini, dan tindakan tidak boleh ditanda siap.</p>}
        {!sedia && dalamTalian && <p className="nota">Memuat makluman…</p>}
        {sedia && makluman.length === 0 && <p className="nota">Belum ada makluman atau tindakan.</p>}

        {perlu.length > 0 && (
          <section className="bahagian" aria-labelledby="tajuk-perlu">
            <div className="baris-tajuk">
              <h2 id="tajuk-perlu" className="label-bahagian">
                PERLU TINDAKAN
              </h2>
              <span className="mono nota-kecil">{perlu.length}</span>
            </div>
            <ul className="senarai-acara">{perlu.map((m) => kad(m, false))}</ul>
          </section>
        )}
        {lain.length > 0 && (
          <section className="bahagian" aria-labelledby="tajuk-makluman">
            <h2 id="tajuk-makluman" className="label-bahagian">
              MAKLUMAN
            </h2>
            <ul className="senarai-acara">{lain.map((m) => kad(m, false))}</ul>
          </section>
        )}
        {selesai.length > 0 && (
          <section className="bahagian" aria-labelledby="tajuk-selesai">
            <h2 id="tajuk-selesai" className="label-bahagian">
              TINDAKAN SELESAI
            </h2>
            <ul className="senarai-acara">{selesai.map((m) => kad(m, true))}</ul>
          </section>
        )}
        {makluman.length > 0 && <p className="nota">Admin sekolah nampak sama ada anda sudah membaca dan menandakan siap.</p>}
      </main>
    </>
  );
}

interface PropsUrus {
  /** 'sekolah': admin kepada guru sekolahnya. 'semua': ibu pejabat kepada guru semua sekolah. */
  mod: 'sekolah' | 'semua';
  makluman: Makluman[];
  status: StatusMakluman[];
  sekolahId: string | null;
  jumlahGuru: number;
  sedia: boolean;
  ralat: string | null;
  dalamTalian: boolean;
  hantar: (skop: string | null, m: MaklumanBaharu) => Promise<boolean>;
  padam: (id: string) => Promise<void>;
}

/** Admin sekolah atau ibu pejabat: hantar makluman dan tindakan, dan lihat siapa sudah baca dan siap. */
export function MaklumanUrus({ mod, makluman, status, sekolahId, jumlahGuru, sedia, ralat, dalamTalian, hantar, padam }: PropsUrus) {
  const [buka, setBuka] = useState(false);
  const [jenis, setJenis] = useState<'makluman' | 'tindakan'>('makluman');
  const [tajuk, setTajuk] = useState('');
  const [akhir, setAkhir] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<string | null>(null);
  const [sahPadam, setSahPadam] = useState<string | null>(null);
  const [guru, setGuru] = useState<ButiranAhli[] | null>(null);

  // Admin sekolah: nama guru aktif, untuk menunjukkan siapa belum siap.
  useEffect(() => {
    if (mod !== 'sekolah' || !dalamTalian) return;
    let hidup = true;
    void senaraiAhli().then((h) => {
      if (hidup && h.ok) setGuru(h.senarai.filter((a) => a.peranan === 'guru' && a.status === 'aktif'));
    });
    return () => {
      hidup = false;
    };
  }, [mod, dalamTalian]);

  const skop = mod === 'sekolah' ? sekolahId : null;
  const senarai = makluman.filter((m) => (mod === 'sekolah' ? m.sekolah_id === sekolahId || m.sekolah_id === null : m.sekolah_id === null));
  const statusSkop = mod === 'sekolah' ? status.filter((s) => s.sekolah_id === sekolahId) : status;
  const jumlah = guru ? guru.length : jumlahGuru;

  const hantarBorang = async (e: FormEvent) => {
    e.preventDefault();
    const teks = tajuk.trim().replace(/\s+/g, ' ');
    if (!teks || sibuk) return;
    setSibuk(true);
    setMesej(null);
    const ok = await hantar(skop, { jenis, tajuk: teks, tarikh_akhir: jenis === 'tindakan' && akhir ? akhir : null });
    setSibuk(false);
    if (ok) {
      setTajuk('');
      setAkhir('');
      setBuka(false);
      setMesej(jenis === 'tindakan' ? 'Tindakan dihantar.' : 'Makluman dihantar.');
    }
  };

  return (
    <>
      <KepalaKembali
        ke="#/"
        labelKembali="Kembali ke Pengurusan"
        tajuk={mod === 'sekolah' ? 'Makluman & tindakan' : 'Makluman semua sekolah'}
        sub={mod === 'sekolah' ? `Kepada ${jumlah} guru sekolah ini` : `Daripada ibu pejabat kepada ${jumlah} guru`}
      />
      <main className="isi">
        {!buka ? (
          <button
            type="button"
            className="butang butang-utama"
            disabled={!dalamTalian}
            onClick={() => {
              setBuka(true);
              setMesej(null);
            }}
          >
            + Makluman atau tindakan baharu
          </button>
        ) : (
          <form className="kad borang borang-sekolah" onSubmit={hantarBorang}>
            <div className="tab" role="group" aria-label="Jenis">
              <button type="button" aria-pressed={jenis === 'makluman'} onClick={() => setJenis('makluman')}>
                Makluman
              </button>
              <button type="button" aria-pressed={jenis === 'tindakan'} onClick={() => setJenis('tindakan')}>
                Tindakan
              </button>
            </div>
            <p className="nota">{jenis === 'makluman' ? 'Untuk dibaca sahaja. Anda nampak siapa sudah membaca.' : 'Guru perlu menandakan siap. Anda nampak siapa belum siap.'}</p>
            <div className="medan">
              <label htmlFor="makluman-tajuk">{jenis === 'makluman' ? 'Makluman' : 'Tindakan yang perlu dibuat'}</label>
              <textarea id="makluman-tajuk" rows={3} maxLength={300} required value={tajuk} onChange={(e) => setTajuk(e.target.value)} />
            </div>
            {jenis === 'tindakan' && (
              <div className="medan">
                <label htmlFor="makluman-akhir">Tarikh akhir (pilihan)</label>
                <input id="makluman-akhir" type="date" min={hariIni()} value={akhir} onChange={(e) => setAkhir(e.target.value)} />
              </div>
            )}
            <button type="submit" className="butang butang-utama" disabled={sibuk}>
              {sibuk ? 'Menghantar…' : mod === 'sekolah' ? 'Hantar kepada semua guru' : 'Hantar kepada semua sekolah'}
            </button>
            <button type="button" className="butang-teks tengah" onClick={() => setBuka(false)}>
              Batal
            </button>
          </form>
        )}
        {!dalamTalian && <p className="nota">Sambung internet untuk menghantar dan melihat status terkini.</p>}
        <div aria-live="polite">
          {ralat && (
            <div className="kad">
              <p className="mesej mesej-ralat" role="alert">
                {ralat}
              </p>
            </div>
          )}
          {mesej && !ralat && (
            <div className="kad">
              <p className="mesej mesej-ok" role="status">
                {mesej}
              </p>
            </div>
          )}
        </div>

        {!sedia && dalamTalian && <p className="nota">Memuat…</p>}
        {sedia && senarai.length === 0 && <p className="nota">Belum ada makluman atau tindakan dihantar.</p>}
        {senarai.length > 0 && (
          <ul className="senarai-acara">
            {senarai.map((m) => {
              const st = statusSkop.filter((s) => s.makluman_id === m.id);
              const siap = st.filter((s) => s.siap_pada);
              const idSiap = new Set(siap.map((s) => s.guru_id));
              const idBaca = new Set(st.map((s) => s.guru_id));
              const belum = guru ? guru.filter((g) => (m.jenis === 'tindakan' ? !idSiap.has(g.pengguna_id) : !idBaca.has(g.pengguna_id))) : null;
              const milikSaya = m.sekolah_id === skop;
              const akhir = m.tarikh_akhir ? teksAkhir(m.tarikh_akhir) : null;
              return (
                <li key={m.id} className="kad kad-makluman">
                  <div className="baris-ahli">
                    <PilJenis m={m} />
                    <span className={`nota-kecil${akhir?.lewat ? ' teks-lewat' : ''}`}>{akhir ? akhir.teks : tarikhHantar(m.dicipta_pada)}</span>
                  </div>
                  <p className="teks-makluman">{m.tajuk}</p>
                  <dl className="senarai">
                    <div>
                      <dt>Sudah baca</dt>
                      <dd className="mono">
                        {st.length}/{jumlah}
                      </dd>
                    </div>
                    {m.jenis === 'tindakan' && (
                      <div>
                        <dt>Sudah siap</dt>
                        <dd className="mono">
                          {siap.length}/{jumlah}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {belum && belum.length > 0 && (
                    <p className="nota pecah">
                      <strong>{m.jenis === 'tindakan' ? `BELUM SIAP (${belum.length})` : `BELUM BACA (${belum.length})`}</strong>
                      <br />
                      {belum.map((g) => g.nama || g.emel).join(' · ')}
                    </p>
                  )}
                  {milikSaya &&
                    (sahPadam === m.id ? (
                      <div className="dua-butang">
                        <button type="button" className="butang butang-garis butang-kecil" onClick={() => setSahPadam(null)}>
                          Jangan padam
                        </button>
                        <button
                          type="button"
                          className="butang butang-bahaya butang-kecil"
                          onClick={() => {
                            setSahPadam(null);
                            void padam(m.id);
                          }}
                        >
                          Ya, padam
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="butang-teks" disabled={!dalamTalian} onClick={() => setSahPadam(m.id)}>
                        Padam
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
