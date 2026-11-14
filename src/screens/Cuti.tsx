import { useMemo, useState, type FormEvent } from 'react';
import { KepalaKembali } from '../components/Rangka';
import { KALENDAR, TAHUN_ADA, kumpulan, type EntriKalendar } from '../data/kalendar';
import { NAMA_HARI, hariSekolah } from '../lib/jadual';
import { entriUntuk, hariIni, sesiTahun, tambahHari, tarikhMesra, type CutiSendiri } from '../lib/kalendar';
import { idBaharu } from '../lib/senarai';

interface Props {
  negeri: string | null;
  cuti: CutiSendiri[];
  sedia: boolean;
  tertunda: boolean;
  simpanCuti: (c: CutiSendiri[]) => void;
  padamCuti: (id: string) => void;
}

interface Borang {
  jenis: 'cuti' | 'sekolah';
  nama: string;
  mula: string;
  tamat: string;
  ikut_hari: string;
}

const besar = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

function Baris({ e }: { e: { nama: string; mula: string; tamat?: string; semak?: string } }) {
  return (
    <li className="baris-cuti">
      <span>
        {e.nama}
        {e.semak ? ' *' : ''}
      </span>
      <span className="mono">{tarikhMesra(e.mula, e.tamat)}</span>
    </li>
  );
}

export function Cuti({ negeri, cuti, sedia, tertunda, simpanCuti, padamCuti }: Props) {
  const tahunKini = Number(hariIni().slice(0, 4));
  const [tahun, setTahun] = useState(() => (TAHUN_ADA.includes(tahunKini + 1) && new Date().getMonth() >= 9 ? tahunKini + 1 : tahunKini));
  const kosong = (): Borang => ({ jenis: 'cuti', nama: '', mula: hariIni(), tamat: hariIni(), ikut_hari: '1' });
  const [borang, setBorang] = useState<Borang | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [sahPadam, setSahPadam] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);

  const dalamTahun = (e: { mula: string; tamat?: string }) => e.mula.slice(0, 4) === String(tahun) || (e.tamat ?? e.mula).slice(0, 4) === String(tahun);
  const senarai = useMemo(() => KALENDAR.filter((e) => entriUntuk(negeri, e) && dalamTahun(e)), [negeri, tahun]); // eslint-disable-line react-hooks/exhaustive-deps
  const sekolah = senarai.filter((e) => e.jenis === 'sekolah');
  const umum = senarai.filter((e) => e.jenis === 'umum' || e.jenis === 'ganti');
  const tambahan = senarai.filter((e) => e.jenis === 'tambahan');
  const sendiri = cuti.filter(dalamTahun).sort((a, b) => a.mula.localeCompare(b.mula));
  const sesi = sesiTahun(negeri, tahun);
  const adaSemak = senarai.some((e) => e.semak);

  const penggal = useMemo(() => {
    if (!sesi) return [];
    const tengah = sekolah.find((e) => e.nama === 'Cuti Pertengahan Tahun');
    if (!tengah) return [{ nama: 'Sesi persekolahan', mula: sesi.buka, tamat: sesi.tutup }];
    return [
      { nama: 'Penggal 1', mula: sesi.buka, tamat: tambahHari(tengah.mula, -1) },
      { nama: 'Penggal 2', mula: tambahHari(tengah.tamat!, 1), tamat: sesi.tutup },
    ];
  }, [sesi, sekolah]);

  const hariPilihan = hariSekolah(negeri);

  const buka = (c?: CutiSendiri) => {
    setMesej(null);
    setSahPadam(false);
    if (c) {
      setEdit(c.id);
      setBorang({ jenis: c.jenis, nama: c.nama, mula: c.mula, tamat: c.tamat, ikut_hari: String(c.ikut_hari ?? hariPilihan[0]) });
    } else {
      setEdit(null);
      setBorang({ ...kosong(), ikut_hari: String(hariPilihan[0]) });
    }
    requestAnimationFrame(() => document.getElementById('borang-cuti')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const tutup = () => {
    setBorang(null);
    setEdit(null);
    setSahPadam(false);
  };

  const tukar = <K extends keyof Borang>(k: K, v: Borang[K]) => {
    setMesej(null);
    setBorang((b) => {
      if (!b) return b;
      const baharu = { ...b, [k]: v };
      if (k === 'mula' && (b.tamat < (v as string) || b.tamat === b.mula)) baharu.tamat = v as string;
      if (k === 'jenis' && v === 'sekolah') baharu.tamat = baharu.mula;
      return baharu;
    });
  };

  const hantar = (e: FormEvent) => {
    e.preventDefault();
    if (!borang) return;
    const nama = besar(borang.nama);
    if (!nama) return setMesej({ jenis: 'ralat', teks: borang.jenis === 'cuti' ? 'Sila isi nama cuti, contohnya HARI SUKAN.' : 'Sila isi sebab, contohnya GANTI CUTI PERISTIWA 12 APRIL.' });
    if (!borang.mula || !borang.tamat) return setMesej({ jenis: 'ralat', teks: 'Sila isi tarikh.' });
    if (borang.tamat < borang.mula) return setMesej({ jenis: 'ralat', teks: 'Tarikh tamat mesti pada atau selepas tarikh mula.' });
    const rekod: CutiSendiri = {
      id: edit ?? idBaharu(),
      jenis: borang.jenis,
      nama,
      mula: borang.mula,
      tamat: borang.jenis === 'sekolah' ? borang.mula : borang.tamat,
      ikut_hari: borang.jenis === 'sekolah' ? Number(borang.ikut_hari) : null,
    };
    simpanCuti([rekod]);
    setMesej({ jenis: 'ok', teks: edit ? 'Dikemas kini.' : 'Ditambah.' });
    setTahun(Number(rekod.mula.slice(0, 4)));
    tutup();
  };

  const padam = () => {
    if (!edit) return;
    padamCuti(edit);
    setMesej({ jenis: 'ok', teks: 'Dipadam.' });
    tutup();
  };

  return (
    <>
      <KepalaKembali ke="#/takwim" labelKembali="Kembali ke Takwim" tajuk="Cuti & Kalendar KPM" sub={`Sesi akademik ${tahun}`} />
      <main className="isi">
        {negeri ? (
          <a href="#/profil" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <strong>
                {negeri} · Kumpulan {kumpulan(negeri)}
              </strong>
              <span>Tukar negeri di Profil</span>
            </span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        ) : (
          <a href="#/profil" className="kad kad-pautan kad-amaran">
            <span className="kad-pautan-teks">
              <strong>Pilih negeri di Profil</strong>
              <span>Tarikh penggal dan cuti negeri dipaparkan selepas negeri dipilih.</span>
            </span>
          </a>
        )}

        {TAHUN_ADA.length > 1 && (
          <div className="tab" role="group" aria-label="Pilih tahun">
            {TAHUN_ADA.map((t) => (
              <button key={t} type="button" aria-pressed={t === tahun} onClick={() => setTahun(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        {negeri && (
          <section className="kad kad-senarai kad-garis-biru" aria-labelledby="tajuk-penggal">
            <div className="kad-kepala">
              <h2 id="tajuk-penggal">Penggal & cuti sekolah</h2>
              <span className="pil pil-biru">KPM</span>
            </div>
            <ul>
              {penggal.map((p) => (
                <li key={p.nama} className="baris-cuti baris-tebal">
                  <span>{p.nama}</span>
                  <span className="mono">{tarikhMesra(p.mula, p.tamat)}</span>
                </li>
              ))}
              {sekolah.map((e) => (
                <Baris key={e.mula + e.nama} e={e} />
              ))}
            </ul>
          </section>
        )}

        <section className="kad kad-senarai kad-garis-merah" aria-labelledby="tajuk-umum">
          <div className="kad-kepala">
            <h2 id="tajuk-umum">Cuti umum</h2>
            <span className="pil pil-tiada">{umum.length}</span>
          </div>
          {umum.length ? (
            <ul>
              {umum.map((e: EntriKalendar) => (
                <Baris key={e.mula + e.nama} e={e} />
              ))}
            </ul>
          ) : (
            <p className="senarai-kosong">Tiada data cuti umum bagi {tahun}.</p>
          )}
        </section>

        {negeri && tambahan.length > 0 && (
          <section className="kad kad-senarai kad-garis-merah" aria-labelledby="tajuk-tambahan">
            <div className="kad-kepala">
              <h2 id="tajuk-tambahan">Cuti tambahan perayaan KPM</h2>
            </div>
            <ul>
              {tambahan.map((e) => (
                <Baris key={e.mula + e.nama} e={e} />
              ))}
            </ul>
            <p className="senarai-kosong">Cuti tambahan ini tidak perlu diganti.</p>
          </section>
        )}

        <section className="kad kad-senarai kad-garis-emas" aria-labelledby="tajuk-sendiri">
          <div className="kad-kepala">
            <h2 id="tajuk-sendiri">Cuti sekolah saya</h2>
            {sedia && tertunda && (
              <span className="lencana lencana-menyemak" role="status">
                Menunggu internet
              </span>
            )}
          </div>
          {sendiri.length > 0 ? (
            <ul>
              {sendiri.map((c) => (
                <li key={c.id}>
                  <button type="button" className="baris-cuti baris-butang" aria-pressed={edit === c.id} onClick={() => buka(c)}>
                    <span>
                      <span className={`pil ${c.jenis === 'cuti' ? 'pil-emas' : 'pil-rph'}`}>{c.jenis === 'cuti' ? 'Cuti' : 'Ganti'}</span> {c.nama}
                      {c.jenis === 'sekolah' && c.ikut_hari != null && <span className="bantuan"> · jadual {NAMA_HARI[c.ikut_hari]}</span>}
                    </span>
                    <span className="mono">{tarikhMesra(c.mula, c.tamat)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="senarai-kosong">Belum ada cuti peristiwa atau hari ganti bagi {tahun}.</p>
          )}
          <div aria-live="polite">{mesej && !borang && <p className={`mesej mesej-${mesej.jenis} mesej-dalam`}>{mesej.teks}</p>}</div>
          {!borang && (
            <div className="kad-kaki">
              <button type="button" className="butang butang-putus" onClick={() => buka()}>
                + Tambah cuti peristiwa atau hari ganti
              </button>
            </div>
          )}
        </section>

        {borang && (
          <form id="borang-cuti" className="kad borang kad-pasang" onSubmit={hantar} noValidate>
            <h2>{edit ? 'Edit' : 'Tambah'}</h2>
            <div className="tab" role="group" aria-label="Jenis">
              <button type="button" aria-pressed={borang.jenis === 'cuti'} onClick={() => tukar('jenis', 'cuti')}>
                Cuti peristiwa
              </button>
              <button type="button" aria-pressed={borang.jenis === 'sekolah'} onClick={() => tukar('jenis', 'sekolah')}>
                Hari ganti
              </button>
            </div>
            <p>
              {borang.jenis === 'cuti'
                ? 'Sekolah ditutup pada tarikh ini. RPH tidak dijana.'
                : 'Hari persekolahan tambahan, contohnya Sabtu bagi menggantikan cuti peristiwa. RPH dijana ikut jadual hari yang dipilih.'}
            </p>
            <div className="medan">
              <label htmlFor="nama-cuti">{borang.jenis === 'cuti' ? 'Nama cuti' : 'Sebab'}</label>
              <input id="nama-cuti" className="besar" value={borang.nama} onChange={(e) => tukar('nama', e.target.value)} autoCapitalize="characters" maxLength={120} />
            </div>
            {borang.jenis === 'cuti' ? (
              <div className="dua-lajur">
                <div className="medan">
                  <label htmlFor="mula-cuti">Dari</label>
                  <input id="mula-cuti" type="date" className="mono" value={borang.mula} onChange={(e) => tukar('mula', e.target.value)} />
                </div>
                <div className="medan">
                  <label htmlFor="tamat-cuti">Hingga</label>
                  <input id="tamat-cuti" type="date" className="mono" value={borang.tamat} min={borang.mula} onChange={(e) => tukar('tamat', e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="dua-lajur">
                <div className="medan">
                  <label htmlFor="mula-cuti">Tarikh</label>
                  <input id="mula-cuti" type="date" className="mono" value={borang.mula} onChange={(e) => tukar('mula', e.target.value)} />
                </div>
                <div className="medan">
                  <label htmlFor="ikut-hari">Ikut jadual</label>
                  <select id="ikut-hari" value={borang.ikut_hari} onChange={(e) => tukar('ikut_hari', e.target.value)}>
                    {hariPilihan.map((h) => (
                      <option key={h} value={h}>
                        {NAMA_HARI[h]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div aria-live="polite">
              {mesej && (
                <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : undefined}>
                  {mesej.teks}
                </p>
              )}
            </div>
            <button type="submit" className="butang butang-utama">
              {edit ? 'Simpan perubahan' : 'Simpan'}
            </button>
            {sahPadam ? (
              <div className="dua-butang">
                <button type="button" className="butang butang-garis" onClick={() => setSahPadam(false)}>
                  Jangan padam
                </button>
                <button type="button" className="butang butang-bahaya" onClick={padam}>
                  Ya, padam
                </button>
              </div>
            ) : (
              <div className={edit ? 'dua-butang' : undefined}>
                <button type="button" className="butang butang-garis" onClick={tutup}>
                  Batal
                </button>
                {edit && (
                  <button type="button" className="butang butang-garis teks-bahaya" onClick={() => setSahPadam(true)}>
                    Padam
                  </button>
                )}
              </div>
            )}
          </form>
        )}

        {adaSemak && (
          <p className="nota">
            * Tarikh ini dikumpul daripada laman kedua dan perlu disahkan dengan surat siaran KPM atau jadual hari kelepasan am JPM. Jika berbeza, guna “Hari ganti” atau “Cuti peristiwa” untuk membetulkannya.
          </p>
        )}
      </main>
    </>
  );
}
