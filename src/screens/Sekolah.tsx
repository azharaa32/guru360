import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Kepala } from '../components/Rangka';
import {
  ciptaSekolah,
  hantarSemulaJemputan,
  janaKodDaftar,
  jemputGuru,
  keluarkanGuru,
  NAMA_STATUS,
  namaPeranan,
  padamKodDaftar,
  padamSekolah,
  putusSekolah,
  senaraiAhli,
  senaraiKodDaftar,
  senaraiMenunggu,
  type ButiranAhli,
  type Keahlian,
  type KodDaftar,
  type Permohonan,
  type Sekolah,
} from '../lib/sekolah';
import { hariIni, tambahHari, tarikhMesra } from '../lib/kalendar';
import type { Makluman, StatusMakluman } from '../lib/makluman';
import { mulaMinggu } from '../lib/rph';
import { useRingkasanRph } from '../lib/semakan';
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

/** Admin sekolah: jemput guru melalui emel, lihat senarai guru, hantar semula jemputan dan keluarkan guru. */
function GuruSekolah({ dalamTalian, muatSemula }: { dalamTalian: boolean; muatSemula: () => void }) {
  const [senarai, setSenarai] = useState<ButiranAhli[] | null>(null);
  const [emel, setEmel] = useState('');
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);
  const [sahkan, setSahkan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const h = await senaraiAhli();
    if (h.ok) setSenarai(h.senarai);
    else setMesej({ jenis: 'ralat', teks: h.ralat });
  }, []);

  useEffect(() => {
    if (dalamTalian) void muat();
  }, [dalamTalian, muat]);

  const jemput = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    const alamat = emel.trim();
    setSibuk('jemput');
    setMesej(null);
    const h = await jemputGuru(alamat);
    setSibuk(null);
    if (h.ok) {
      setEmel('');
      setMesej({
        jenis: 'ok',
        teks: h.emel_dihantar ? `Emel jemputan dihantar ke ${alamat}.` : `${alamat} sudah ada akaun Guru360 dan kini ahli sekolah anda. Guru itu boleh terus log masuk.`,
      });
      await muat();
      muatSemula();
    } else setMesej({ jenis: 'ralat', teks: h.ralat });
  };

  const tindak = async (aksi: 'semula' | 'keluar', a: ButiranAhli) => {
    setSibuk(a.id);
    setSahkan(null);
    setMesej(null);
    const h = aksi === 'semula' ? await hantarSemulaJemputan(a.id) : await keluarkanGuru(a.id);
    setSibuk(null);
    if (!h.ok) setMesej({ jenis: 'ralat', teks: h.ralat });
    else setMesej({ jenis: 'ok', teks: aksi === 'semula' ? `Emel jemputan dihantar semula ke ${a.emel}.` : `${a.nama || a.emel} dikeluarkan. Rekodnya kekal dengan sekolah.` });
    await muat();
    if (aksi === 'keluar') muatSemula();
  };

  const guru = (senarai ?? []).filter((a) => a.peranan === 'guru');
  const aktif = guru.filter((a) => a.status === 'aktif' && a.diterima).length;
  const dijemput = guru.filter((a) => a.status === 'aktif' && !a.diterima).length;

  return (
    <>
      <section className="bahagian" aria-labelledby="tajuk-jemput">
        <h2 id="tajuk-jemput" className="label-bahagian">
          JEMPUT GURU
        </h2>
        <form className="kad borang borang-sekolah" onSubmit={jemput}>
          <div className="medan">
            <label htmlFor="jemput-emel">Emel guru</label>
            <input id="jemput-emel" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} required value={emel} onChange={(e) => setEmel(e.target.value)} />
          </div>
          <div aria-live="polite">
            {mesej && (
              <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : 'status'}>
                {mesej.teks}
              </p>
            )}
          </div>
          <button type="submit" className="butang butang-utama" disabled={sibuk === 'jemput' || !dalamTalian}>
            {sibuk === 'jemput' ? 'Sebentar…' : 'Jemput'}
          </button>
          {!dalamTalian && <p className="nota">Sambung internet untuk menjemput guru.</p>}
        </form>
      </section>

      <section className="bahagian" aria-labelledby="tajuk-guru">
        <div className="baris-tajuk">
          <h2 id="tajuk-guru" className="label-bahagian">
            GURU
          </h2>
          <span className="mono nota-kecil">{senarai ? `${aktif} aktif · ${dijemput} dijemput` : '-'}</span>
        </div>
        {!senarai && <p className="nota">{dalamTalian ? 'Memuat senarai guru…' : 'Sambung internet untuk melihat senarai guru.'}</p>}
        {senarai && guru.length === 0 && <p className="nota">Belum ada guru. Jemput guru pertama dengan emel mereka di atas.</p>}
        {guru.length > 0 && (
          <ul className="senarai-acara">
            {guru.map((a) => {
              const keluar = a.status === 'keluar';
              const menunggu = !keluar && !a.diterima;
              return (
                <li key={a.id} className={`kad${a.minta_keluar_pada && !keluar ? ' kad-garis-emas' : ''}`}>
                  <div className="baris-ahli">
                    <span className="acara-teks">
                      <strong className={a.nama ? undefined : 'pecah'}>{a.nama || a.emel}</strong>
                      <span className="pecah">
                        {keluar
                          ? `Keluar ${a.keluar_pada ? tarikhPendek(a.keluar_pada) : ''} · rekod kekal`
                          : menunggu
                            ? `Dijemput ${tarikhPendek(a.masuk_pada)} · belum tetapkan kata laluan`
                            : a.nama
                              ? a.emel
                              : 'Nama belum diisi'}
                      </span>
                    </span>
                    <span className={`pil ${keluar ? 'pil-belum' : menunggu ? 'pil-draf' : 'pil-siap'}`}>● {keluar ? 'Keluar' : menunggu ? 'Dijemput' : 'Aktif'}</span>
                  </div>
                  {a.minta_keluar_pada && !keluar && <p className="mesej mesej-tunggu">Guru ini meminta dikeluarkan pada {tarikhPendek(a.minta_keluar_pada)}.</p>}
                  {!keluar && (
                    <div className="dua-butang">
                      {sahkan === a.id ? (
                        <button type="button" className="butang butang-bahaya butang-kecil" disabled={sibuk === a.id} onClick={() => void tindak('keluar', a)}>
                          Sahkan keluarkan
                        </button>
                      ) : (
                        <button type="button" className="butang butang-garis butang-kecil" disabled={sibuk === a.id} onClick={() => setSahkan(a.id)}>
                          Keluarkan
                        </button>
                      )}
                      {menunggu && (
                        <button type="button" className="butang butang-garis butang-kecil" disabled={sibuk === a.id} onClick={() => void tindak('semula', a)}>
                          Hantar semula
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

/** Skrin utama akaun pengurusan (admin sekolah dan ibu pejabat). Akaun ini tidak mengajar. */
/** Ibu pejabat: jana kod pendaftaran sekali guna untuk sekolah yang mahu mendaftar sendiri. */
function KodPendaftaran({ dalamTalian }: { dalamTalian: boolean }) {
  const [senarai, setSenarai] = useState<KodDaftar[] | null>(null);
  const [catatan, setCatatan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);
  const [sahPadam, setSahPadam] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const h = await senaraiKodDaftar();
    if (h.ok) setSenarai(h.senarai);
    else setMesej({ jenis: 'ralat', teks: h.ralat });
  }, []);
  useEffect(() => {
    if (dalamTalian) void muat();
  }, [dalamTalian, muat]);

  const jana = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setMesej(null);
    const h = await janaKodDaftar(catatan);
    setSibuk(false);
    if (h.ok) {
      setCatatan('');
      setMesej({ jenis: 'ok', teks: `Kod baharu: ${h.kod}. Beri kod ini kepada sekolah berkenaan.` });
      await muat();
    } else setMesej({ jenis: 'ralat', teks: h.ralat });
  };
  const salin = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
      setMesej({ jenis: 'ok', teks: `Kod ${kod} disalin.` });
    } catch {
      setMesej({ jenis: 'ralat', teks: 'Tidak dapat menyalin. Tekan lama pada kod untuk menyalinnya.' });
    }
  };
  const padam = async (id: string) => {
    setSahPadam(null);
    const h = await padamKodDaftar(id);
    if (!h.ok) setMesej({ jenis: 'ralat', teks: h.ralat });
    await muat();
  };

  const belum = (senarai ?? []).filter((k) => !k.digunakan_pada);
  const sudah = (senarai ?? []).length - belum.length;
  return (
    <section className="bahagian" aria-labelledby="tajuk-kod">
      <div className="baris-tajuk">
        <h2 id="tajuk-kod" className="label-bahagian">
          KOD PENDAFTARAN SEKOLAH
        </h2>
        <span className="mono nota-kecil">{senarai ? `${belum.length} belum guna · ${sudah} sudah` : '-'}</span>
      </div>
      <form className="kad borang borang-sekolah" onSubmit={jana}>
        <p className="nota">Sekolah yang mahu mendaftar sendiri perlu satu kod. Setiap kod sekali guna. Sekolah itu masih menunggu kelulusan anda selepas mendaftar.</p>
        <div className="medan">
          <label htmlFor="kod-catatan">Untuk sekolah mana (pilihan)</label>
          <input id="kod-catatan" value={catatan} maxLength={120} onChange={(e) => setCatatan(e.target.value)} />
        </div>
        <div aria-live="polite">
          {mesej && (
            <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : 'status'}>
              {mesej.teks}
            </p>
          )}
        </div>
        <button type="submit" className="butang butang-garis" disabled={sibuk || !dalamTalian}>
          {sibuk ? 'Sebentar…' : 'Jana kod baharu'}
        </button>
      </form>
      {belum.length > 0 && (
        <ul className="senarai-acara">
          {belum.map((k) => (
            <li key={k.id} className="kad kad-makluman">
              <div className="baris-ahli">
                <span className="acara-teks">
                  <strong className="mono kod-besar">{k.kod}</strong>
                  <span className="pecah">
                    {k.catatan || 'Tiada catatan'} · dijana {tarikhPendek(k.dicipta_pada)}
                  </span>
                </span>
              </div>
              <div className="dua-butang">
                {sahPadam === k.id ? (
                  <button type="button" className="butang butang-bahaya butang-kecil" onClick={() => void padam(k.id)}>
                    Sahkan padam
                  </button>
                ) : (
                  <button type="button" className="butang butang-garis butang-kecil" onClick={() => setSahPadam(k.id)}>
                    Padam
                  </button>
                )}
                <button type="button" className="butang butang-utama butang-kecil" onClick={() => void salin(k.kod)}>
                  Salin kod
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ibu pejabat: padam sekolah bersama semua datanya. Tidak boleh dipulihkan, jadi kod sekolah mesti ditaip semula. */
function PadamSekolah({ keahlian, dalamTalian, muatSemula }: { keahlian: Keahlian; dalamTalian: boolean; muatSemula: () => void }) {
  const [buka, setBuka] = useState(false);
  const [id, setId] = useState('');
  const [kod, setKod] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);
  // Sekolah yang ditadbir sendiri tidak boleh dipadam dari sini.
  const sendiri = keahlian.peranan === 'admin' ? keahlian.sekolah?.id : undefined;
  const pilihan = keahlian.semuaSekolah.filter((x) => x.id !== sendiri).sort((a, b) => a.nama.localeCompare(b.nama));
  const dipilih = pilihan.find((x) => x.id === id);
  const bilAhli = dipilih ? keahlian.ahli.filter((a) => a.sekolah_id === dipilih.id && a.status === 'aktif').length : 0;
  const padan = !!dipilih && kod.trim().toUpperCase() === dipilih.kod.toUpperCase();

  const hantar = async (e: FormEvent) => {
    e.preventDefault();
    if (!dipilih || !padan || sibuk) return;
    setSibuk(true);
    setMesej(null);
    const h = await padamSekolah(dipilih.id, kod.trim());
    setSibuk(false);
    if (h.ok) {
      setMesej({ jenis: 'ok', teks: `${dipilih.nama} dan semua datanya telah dipadam.` });
      setId('');
      setKod('');
      setBuka(false);
      muatSemula();
    } else setMesej({ jenis: 'ralat', teks: h.ralat });
  };

  if (pilihan.length === 0) return null;
  return (
    <section className="bahagian" aria-labelledby="tajuk-padam">
      <h2 id="tajuk-padam" className="label-bahagian">
        PADAM SEKOLAH
      </h2>
      {mesej && !buka && (
        <div className="kad">
          <p className={`mesej mesej-${mesej.jenis}`} role="status">
            {mesej.teks}
          </p>
        </div>
      )}
      {!buka ? (
        <button
          type="button"
          className="butang butang-garis"
          disabled={!dalamTalian}
          onClick={() => {
            setBuka(true);
            setMesej(null);
          }}
        >
          Padam sebuah sekolah
        </button>
      ) : (
        <form className="kad borang borang-sekolah kad-garis-merah" onSubmit={hantar}>
          <p className="mesej mesej-ralat">
            <strong>Tidak boleh dipulihkan.</strong> Semua data sekolah itu dipadam: keahlian guru, RPH, dokumen, program, jadual waktu, cuti, makluman, jawatan, kepala surat dan logo. Akaun guru kekal tetapi tidak lagi mempunyai sekolah.
          </p>
          <div className="medan">
            <label htmlFor="padam-sekolah">Sekolah</label>
            <select
              id="padam-sekolah"
              value={id}
              required
              onChange={(e) => {
                setId(e.target.value);
                setKod('');
                setMesej(null);
              }}
            >
              <option value="">Pilih sekolah</option>
              {pilihan.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama} ({NAMA_STATUS[x.status]})
                </option>
              ))}
            </select>
          </div>
          {dipilih && (
            <div className="medan">
              <label htmlFor="padam-kod">
                Taip kod sekolah <span className="mono">{dipilih.kod}</span> untuk mengesahkan
              </label>
              <input id="padam-kod" value={kod} onChange={(e) => setKod(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} required />
              <p className="bantuan">{bilAhli} ahli aktif akan kehilangan akses kepada data sekolah ini.</p>
            </div>
          )}
          <div aria-live="polite">
            {mesej && (
              <p className={`mesej mesej-${mesej.jenis}`} role="alert">
                {mesej.teks}
              </p>
            )}
          </div>
          <button type="submit" className="butang butang-bahaya" disabled={!padan || sibuk}>
            {sibuk ? 'Memadam…' : 'Padam sekolah dan semua datanya'}
          </button>
          <button
            type="button"
            className="butang-teks tengah"
            onClick={() => {
              setBuka(false);
              setId('');
              setKod('');
            }}
          >
            Batal
          </button>
        </form>
      )}
    </section>
  );
}

/** Ibu pejabat: status ringkas setiap sekolah bagi minggu ini (guru, RPH, tindakan lewat). Tekan sekolah untuk membaca RPH. */
function PapanHq({ keahlian, makluman, status, dalamTalian }: { keahlian: Keahlian; makluman: Makluman[]; status: StatusMakluman[]; dalamTalian: boolean }) {
  const mula = mulaMinggu(hariIni(), null);
  const tamat = tambahHari(mula, 6);
  const rph = useRingkasanRph(true, mula, tamat, dalamTalian);
  const kini = hariIni();
  const lewat = makluman.filter((m) => m.jenis === 'tindakan' && m.tarikh_akhir && m.tarikh_akhir < kini);
  const sekolah = [...keahlian.semuaSekolah].sort((a, b) => a.nama.localeCompare(b.nama));
  const guru = (id: string) => keahlian.ahli.filter((a) => a.sekolah_id === id && a.status === 'aktif' && a.peranan === 'guru').map((a) => a.pengguna_id);
  const jumlahGuru = sekolah.filter((x) => x.status === 'aktif').reduce((n, x) => n + guru(x.id).length, 0);
  return (
    <section className="bahagian" aria-labelledby="tajuk-semua-sekolah">
      <div className="baris-tajuk">
        <h2 id="tajuk-semua-sekolah" className="label-bahagian">
          SEMUA SEKOLAH · MINGGU {tarikhMesra(mula, tamat).toUpperCase()}
        </h2>
      </div>
      <p className="nota">
        {sekolah.filter((x) => x.status === 'aktif').length} sekolah aktif · {jumlahGuru} guru
        {!dalamTalian ? ' · sambung internet untuk angka RPH terkini' : ''}
      </p>
      {sekolah.length === 0 ? (
        <p className="nota">Belum ada sekolah.</p>
      ) : (
        <ul className="senarai-acara">
          {sekolah.map((x) => {
            const g = guru(x.id);
            const siap = rph.siap.filter((r) => r.sekolah_id === x.id);
            const disemak = siap.filter((r) => rph.disemak.has(r.id)).length;
            const adaRph = new Set(siap.map((r) => r.guru_id)).size;
            const tertunggak = lewat
              .filter((m) => m.sekolah_id === null || m.sekolah_id === x.id)
              .reduce((n, m) => n + g.filter((id) => !status.some((st) => st.makluman_id === m.id && st.guru_id === id && st.siap_pada)).length, 0);
            const isi = (
              <>
                <span className="kad-pautan-teks">
                  <strong className="pecah">{x.nama}</strong>
                  <span>
                    {x.kod}
                    {x.negeri ? ` · ${x.negeri}` : ''} · {g.length} guru
                  </span>
                  {x.status === 'aktif' && (
                    <span>
                      {rph.sedia ? `RPH: ${siap.length} siap · ${disemak} disemak · ${adaRph}/${g.length} guru` : 'RPH: -'}
                      {' · '}
                      {tertunggak > 0 ? `${tertunggak} tindakan lewat` : 'tiada tindakan lewat'}
                    </span>
                  )}
                </span>
                {x.status !== 'aktif' ? <span className={kelasStatus(x.status)}>● {NAMA_STATUS[x.status]}</span> : tertunggak > 0 ? <span className="lencana-kira">{tertunggak}</span> : null}
              </>
            );
            return (
              <li key={x.id}>
                {x.status === 'aktif' ? (
                  <a href={`#/sekolah/${x.id}`} className={`kad kad-pautan${tertunggak > 0 ? ' kad-garis-emas' : ''}`}>
                    {isi}
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </a>
                ) : (
                  <div className="kad kad-pautan">{isi}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="nota">Tekan sekolah untuk membaca RPH gurunya. "Tindakan lewat" mengira setiap guru yang belum menandakan siap selepas tarikh akhir.</p>
    </section>
  );
}

export function Pengurusan({ keahlian, nama, dalamTalian, muatSemula, makluman, status }: { keahlian: Keahlian; nama: string; dalamTalian: boolean; muatSemula: () => void; makluman: Makluman[]; status: StatusMakluman[] }) {
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
          </section>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && (
          <a href="#/makluman" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Makluman & tindakan</strong>
              <span>Hantar kepada guru sekolah ini; lihat siapa sudah baca dan siap</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && (
          <a href="#/semak" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Semak RPH</strong>
              <span>Baca RPH guru, beri ulasan dan tanda disemak</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && (
          <a href="#/dokumen" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Dokumen guru</strong>
              <span>Baca kertas kerja, surat, minit, OPR dan jobskop guru</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && (
          <a href="#/jawatan" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Jawatan guru</strong>
              <span>Tetapkan portfolio dan jawatankuasa setiap guru</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.ibuPejabat && (
          <a href="#/makluman/semua" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Makluman semua sekolah</strong>
              <span>Daripada ibu pejabat kepada guru semua sekolah</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && (
          <a href="#/templat" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Kepala surat dan logo</strong>
              <span>Dipakai pada dokumen semua guru sekolah ini</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && (
          <a href="#/cuti" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Cuti sekolah</strong>
              <span>Cuti peristiwa dan hari ganti untuk semua guru sekolah ini</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.ibuPejabat && (
          <a href="#/cuti/semua" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>Cuti semua sekolah</strong>
              <span>Ditetapkan ibu pejabat; muncul di takwim semua guru</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {keahlian.peranan === 'admin' && s?.status === 'aktif' && <GuruSekolah dalamTalian={dalamTalian} muatSemula={muatSemula} />}

        {keahlian.ibuPejabat && <SenaraiMenunggu dalamTalian={dalamTalian} muatSemula={muatSemula} />}

        {keahlian.ibuPejabat && <PapanHq keahlian={keahlian} makluman={makluman} status={status} dalamTalian={dalamTalian} />}

        {keahlian.ibuPejabat && <KodPendaftaran dalamTalian={dalamTalian} />}

        {keahlian.ibuPejabat && <CiptaSekolah muatSemula={muatSemula} />}

        {keahlian.ibuPejabat && <PadamSekolah keahlian={keahlian} dalamTalian={dalamTalian} muatSemula={muatSemula} />}
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
