import { Kepala } from '../components/Rangka';
import { NAMA_STATUS, namaPeranan, type Keahlian, type Sekolah } from '../lib/sekolah';
import { supabase } from '../lib/supabase';

const kelasStatus = (s: Sekolah['status']) => (s === 'aktif' ? 'pil pil-siap' : s === 'menunggu' ? 'pil pil-draf' : 'pil pil-belum');

/** Skrin utama akaun pengurusan (admin sekolah dan ibu pejabat). Akaun ini tidak mengajar. */
export function Pengurusan({ keahlian, nama }: { keahlian: Keahlian; nama: string }) {
  const guruAktif = (sekolahId: string) => keahlian.ahli.filter((a) => a.sekolah_id === sekolahId && a.status === 'aktif' && a.peranan === 'guru').length;
  const s = keahlian.sekolah;
  return (
    <>
      <Kepala kecil={namaPeranan(keahlian)} tajuk={nama || 'Pengurusan'} sub="Akaun pengurusan; tiada modul mengajar" />
      <main className="isi">
        {keahlian.peranan === 'admin' && s && (
          <section className="kad kad-garis-hijau" aria-labelledby="tajuk-sekolah-saya">
            <div className="baris-tajuk">
              <h2 id="tajuk-sekolah-saya" className="label-bahagian">
                SEKOLAH SAYA
              </h2>
              <span className={kelasStatus(s.status)}>● {NAMA_STATUS[s.status]}</span>
            </div>
            <h3 className="kad-tajuk">{s.nama}</h3>
            <dl className="senarai">
              <div>
                <dt>Kod sekolah</dt>
                <dd className="mono">{s.kod}</dd>
              </div>
              <div>
                <dt>Negeri</dt>
                <dd>{s.negeri ?? '-'}</dd>
              </div>
              <div>
                <dt>Guru aktif</dt>
                <dd className="mono">{guruAktif(s.id)}</dd>
              </div>
            </dl>
            <p className="nota">Jemputan guru, makluman dan semakan RPH akan muncul di sini.</p>
          </section>
        )}

        {keahlian.ibuPejabat && (
          <section className="bahagian" aria-labelledby="tajuk-semua-sekolah">
            <div className="baris-tajuk">
              <h2 id="tajuk-semua-sekolah" className="label-bahagian">
                SEMUA SEKOLAH
              </h2>
              <span className="mono nota-kecil">{keahlian.semuaSekolah.length} sekolah</span>
            </div>
            {keahlian.semuaSekolah.length === 0 ? (
              <p className="nota">Belum ada sekolah.</p>
            ) : (
              <ul className="senarai-acara">
                {keahlian.semuaSekolah.map((x) => (
                  <li key={x.id} className="kad acara">
                    <span className="acara-teks">
                      <strong>{x.nama}</strong>
                      <span>
                        {x.kod}
                        {x.negeri ? ` · ${x.negeri}` : ''} · {guruAktif(x.id)} guru
                      </span>
                    </span>
                    <span className={kelasStatus(x.status)}>● {NAMA_STATUS[x.status]}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="nota">Kelulusan sekolah baharu dan cipta sekolah akan muncul di sini.</p>
          </section>
        )}
      </main>
    </>
  );
}

/** Akaun yang log masuk tetapi tidak berada di bawah mana-mana sekolah. */
export function TiadaSekolah({ emel, sebab, ralat, cubaLagi }: { emel: string; sebab: 'tiada' | 'menunggu' | 'ditolak'; ralat: string | null; cubaLagi: () => void }) {
  return (
    <>
      <Kepala tajuk="Guru360" sub={emel} />
      <main className="isi">
        <section className="kad kad-garis-emas" aria-labelledby="tajuk-tiada-sekolah">
          {ralat ? (
            <>
              <h2 id="tajuk-tiada-sekolah" className="kad-tajuk">
                Sekolah belum dapat disahkan
              </h2>
              <p>{ralat}</p>
              <button type="button" className="butang butang-utama" onClick={cubaLagi}>
                Cuba lagi
              </button>
            </>
          ) : sebab === 'tiada' ? (
            <>
              <h2 id="tajuk-tiada-sekolah" className="kad-tajuk">
                Akaun ini belum ada sekolah
              </h2>
              <p>Guru360 digunakan di bawah sekolah. Minta admin sekolah anda menjemput emel ini:</p>
              <p className="mono">{emel}</p>
              <p className="nota">Jika anda pernah berada di sebuah sekolah dan sudah dikeluarkan, data anda kekal dengan sekolah itu.</p>
            </>
          ) : (
            <>
              <h2 id="tajuk-tiada-sekolah" className="kad-tajuk">
                {sebab === 'menunggu' ? 'Sekolah anda menunggu kelulusan' : 'Pendaftaran sekolah anda ditolak'}
              </h2>
              <p>{sebab === 'menunggu' ? 'Ibu pejabat belum meluluskan sekolah anda. Cuba buka semula kemudian.' : 'Hubungi ibu pejabat untuk maklumat lanjut.'}</p>
              <button type="button" className="butang butang-garis" onClick={cubaLagi}>
                Semak semula
              </button>
            </>
          )}
        </section>
        <button type="button" className="butang butang-garis" onClick={() => void supabase.auth.signOut()}>
          Log keluar
        </button>
      </main>
    </>
  );
}
