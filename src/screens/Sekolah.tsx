import { useCallback, useEffect, useState } from 'react';
import { Kepala } from '../components/Rangka';
import { ciptaSekolah, NAMA_STATUS, namaPeranan, putusSekolah, senaraiMenunggu, type Keahlian, type Permohonan, type Sekolah } from '../lib/sekolah';
import { supabase } from '../lib/supabase';
import { BorangSekolah } from './DaftarSekolah';

const kelasStatus = (s: Sekolah['status']) => (s === 'aktif' ? 'pil pil-siap' : s === 'menunggu' ? 'pil pil-draf' : 'pil pil-belum');

const tarikhPendek = (iso: string) => new Date(iso).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });

/** Ibu pejabat: permohonan sekolah yang menunggu kelulusan, dengan butang lulus dan tolak. */
function SenaraiMenunggu({ dalamTalian, muatSemula }: { dalamTalian: boolean; muatSemula: () => void }) {
  const [senarai, setSenarai] = useState<Permohonan[] | null>(null);
  const [ralat, setRalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [sahkanTolak, setSahkanTolak] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const h = await senaraiMenunggu();
    if (h.ok) {
      setSenarai(h.senarai);
      setRalat(null);
    } else setRalat(h.ralat);
  }, []);

  useEffect(() => {
    if (dalamTalian) void muat();
  }, [dalamTalian, muat]);

  const putus = async (aksi: 'lulus' | 'tolak', id: string) => {
    setSibuk(id);
    setSahkanTolak(null);
    const h = await putusSekolah(aksi, id);
    setSibuk(null);
    if (!h.ok) setRalat(h.ralat);
    await muat();
    muatSemula();
  };

  return (
    <section className="bahagian" aria-labelledby="tajuk-menunggu">
      <div className="baris-tajuk">
        <h2 id="tajuk-menunggu" className="label-bahagian">
          MENUNGGU KELULUSAN
        </h2>
        <span className="mono nota-kecil">{senarai ? senarai.length : '-'}</span>
      </div>
      {!dalamTalian && !senarai && <p className="nota">Sambung internet untuk melihat permohonan sekolah.</p>}
      {ralat && (
        <div className="kad">
          <p className="mesej mesej-ralat" role="alert">
            {ralat}
          </p>
        </div>
      )}
      {senarai && senarai.length === 0 && <p className="nota">Tiada permohonan menunggu.</p>}
      {senarai && senarai.length > 0 && (
        <ul className="senarai-acara">
          {senarai.map((p) => (
            <li key={p.id} className="kad kad-garis-emas">
              <strong>{p.nama}</strong>
              <span className="nota">
                {p.kod}
                {p.negeri ? ` · ${p.negeri}` : ''} · Admin: {p.admin_nama || '-'} ({p.admin_emel || '-'}) · daftar sendiri {tarikhPendek(p.dicipta_pada)}
              </span>
              <div className="dua-butang">
                {sahkanTolak === p.id ? (
                  <button type="button" className="butang butang-bahaya butang-kecil" disabled={sibuk === p.id} onClick={() => void putus('tolak', p.id)}>
                    Sahkan tolak
                  </button>
                ) : (
                  <button type="button" className="butang butang-garis butang-kecil" disabled={sibuk === p.id} onClick={() => setSahkanTolak(p.id)}>
                    Tolak
                  </button>
                )}
                <button type="button" className="butang butang-utama butang-kecil" disabled={sibuk === p.id} onClick={() => void putus('lulus', p.id)}>
                  {sibuk === p.id ? 'Sebentar…' : 'Luluskan'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ibu pejabat: cipta sekolah terus aktif dan jemput adminnya melalui emel. */
function CiptaSekolah({ muatSemula }: { muatSemula: () => void }) {
  const [buka, setBuka] = useState(false);
  const [siap, setSiap] = useState<string | null>(null);
  return (
    <section className="bahagian" aria-labelledby="tajuk-cipta">
      <h2 id="tajuk-cipta" className="label-bahagian">
        CIPTA SEKOLAH
      </h2>
      {siap && (
        <div className="kad">
          <p className="mesej mesej-ok" role="status">
            Sekolah dicipta. Emel jemputan dihantar ke {siap}.
          </p>
        </div>
      )}
      {!buka ? (
        <button
          type="button"
          className="butang butang-garis"
          onClick={() => {
            setBuka(true);
            setSiap(null);
          }}
        >
          + Cipta sekolah
        </button>
      ) : (
        <div className="kad">
          <BorangSekolah
            awalan="cipta"
            butang="Cipta dan jemput admin"
            hantar={ciptaSekolah}
            selesai={(d) => {
              setSiap(d.emel);
              setBuka(false);
              muatSemula();
            }}
            catatan={<p className="nota">Sekolah terus aktif. Admin menerima emel jemputan untuk menetapkan kata laluan.</p>}
          />
          <button type="button" className="butang-teks tengah" onClick={() => setBuka(false)}>
            Batal
          </button>
        </div>
      )}
    </section>
  );
}

/** Skrin utama akaun pengurusan (admin sekolah dan ibu pejabat). Akaun ini tidak mengajar. */
export function Pengurusan({ keahlian, nama, dalamTalian, muatSemula }: { keahlian: Keahlian; nama: string; dalamTalian: boolean; muatSemula: () => void }) {
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
            {s.status === 'menunggu' && <p className="mesej mesej-tunggu">Sekolah anda menunggu kelulusan ibu pejabat. Anda boleh menjemput guru sebaik sahaja diluluskan.</p>}
            {s.status === 'ditolak' && <p className="mesej mesej-ralat">Permohonan sekolah anda ditolak. Hubungi ibu pejabat untuk maklumat lanjut.</p>}
            {s.status === 'aktif' && <p className="nota">Jemputan guru, makluman dan semakan RPH akan muncul di sini.</p>}
          </section>
        )}

        {keahlian.ibuPejabat && <SenaraiMenunggu dalamTalian={dalamTalian} muatSemula={muatSemula} />}

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
          </section>
        )}

        {keahlian.ibuPejabat && <CiptaSekolah muatSemula={muatSemula} />}
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
