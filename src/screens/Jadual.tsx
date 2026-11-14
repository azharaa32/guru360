import { useMemo, useState, type FormEvent } from 'react';
import { KepalaKembali } from '../components/Rangka';
import {
  BUKAN_MENGAJAR,
  HARI_PENDEK,
  NAMA_HARI,
  SUBJEK_AKADEMIK,
  SUBJEK_DINIAH,
  bertindih,
  hariSekolah,
  ikutMasa,
  julat,
  keMasa,
  label,
  minit,
  type Waktu,
} from '../lib/jadual';
import { idBaharu } from '../lib/senarai';

interface Props {
  negeri: string | null;
  waktu: Waktu[];
  sedia: boolean;
  tertunda: boolean;
  ralat: string | null;
  simpanWaktu: (w: Waktu[]) => void;
  padamWaktu: (id: string) => void;
}

interface Borang {
  mula: string;
  tamat: string;
  subjek: string;
  subjekLain: string;
  kelas: string;
  perlu_rph: boolean;
}

const LAIN = '__lain__';
const SEMUA_TETAP = [...SUBJEK_AKADEMIK, ...SUBJEK_DINIAH, ...BUKAN_MENGAJAR];
const besar = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

export function Jadual({ negeri, waktu, sedia, tertunda, ralat, simpanWaktu, padamWaktu }: Props) {
  const hari = useMemo(() => {
    // Hari sekolah ikut negeri, serta mana-mana hari lain yang sudah ada waktu.
    const asas = hariSekolah(negeri);
    const lain = [...new Set(waktu.map((w) => w.hari))].filter((h) => !asas.includes(h));
    return [...asas, ...lain].sort((a, b) => a - b);
  }, [negeri, waktu]);
  const hariIni = new Date().getDay();
  const [pilih, setPilih] = useState(() => (hari.includes(hariIni) ? hariIni : hari[0]));
  const [edit, setEdit] = useState<string | null>(null);
  const [mesej, setMesej] = useState<{ jenis: 'ralat' | 'ok'; teks: string } | null>(null);
  const [sahPadam, setSahPadam] = useState(false);
  const [salinDari, setSalinDari] = useState('');

  const senarai = useMemo(() => waktu.filter((w) => w.hari === pilih).sort(ikutMasa), [waktu, pilih]);
  const subjekSaya = useMemo(() => [...new Set(waktu.map((w) => w.subjek))].filter((s) => !SEMUA_TETAP.includes(s)).sort(), [waktu]);

  const borangBaharu = (h: number): Borang => {
    const akhir = waktu.filter((w) => w.hari === h).sort(ikutMasa).at(-1);
    const mula = akhir ? akhir.tamat : '07:30';
    return { mula, tamat: keMasa(Math.min(minit(mula) + 30, 23 * 60 + 59)), subjek: akhir?.subjek ?? '', subjekLain: '', kelas: '', perlu_rph: true };
  };
  const [borang, setBorang] = useState<Borang>(() => borangBaharu(pilih));

  const tukarHari = (h: number) => {
    setPilih(h);
    setEdit(null);
    setSahPadam(false);
    setMesej(null);
    setSalinDari('');
    setBorang(borangBaharu(h));
  };

  const mulaEdit = (w: Waktu) => {
    setEdit(w.id);
    setSahPadam(false);
    setMesej(null);
    setBorang({ mula: w.mula, tamat: w.tamat, subjek: w.subjek, subjekLain: '', kelas: w.kelas, perlu_rph: w.perlu_rph });
    document.getElementById('borang-waktu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const batalEdit = () => {
    setEdit(null);
    setSahPadam(false);
    setMesej(null);
    setBorang(borangBaharu(pilih));
  };

  const tukar = <K extends keyof Borang>(medan: K, nilai: Borang[K]) => {
    setMesej(null);
    setBorang((b) => {
      const baharu = { ...b, [medan]: nilai };
      // Waktu bukan mengajar lazimnya tiada RPH; guru masih boleh menanda semula.
      if (medan === 'subjek') baharu.perlu_rph = !BUKAN_MENGAJAR.includes(nilai as string);
      // Bila masa mula berubah, kekalkan tempoh yang sama.
      if (medan === 'mula' && b.mula && b.tamat && nilai) {
        const tempoh = Math.max(minit(b.tamat) - minit(b.mula), 5);
        baharu.tamat = keMasa(Math.min(minit(nilai as string) + tempoh, 23 * 60 + 59));
      }
      return baharu;
    });
  };

  const hantar = (e: FormEvent) => {
    e.preventDefault();
    const subjek = borang.subjek === LAIN ? besar(borang.subjekLain) : borang.subjek;
    if (!borang.mula || !borang.tamat) return setMesej({ jenis: 'ralat', teks: 'Sila isi masa mula dan tamat.' });
    if (minit(borang.tamat) <= minit(borang.mula)) return setMesej({ jenis: 'ralat', teks: 'Masa tamat mesti selepas masa mula.' });
    if (!subjek) return setMesej({ jenis: 'ralat', teks: 'Sila pilih atau taip subjek.' });
    const tindih = senarai.find((w) => w.id !== edit && bertindih(w, borang));
    if (tindih) return setMesej({ jenis: 'ralat', teks: `Bertindih dengan ${label(tindih)} (${julat(tindih)}).` });

    const rekod: Waktu = { id: edit ?? idBaharu(), hari: pilih, mula: borang.mula, tamat: borang.tamat, subjek, kelas: besar(borang.kelas), perlu_rph: borang.perlu_rph };
    simpanWaktu([rekod]);
    setEdit(null);
    setSahPadam(false);
    setMesej({ jenis: 'ok', teks: edit ? 'Waktu dikemas kini.' : `Ditambah: ${label(rekod)}, ${julat(rekod)}.` });
    // Sedia untuk waktu seterusnya: sambung dari masa tamat, tempoh dan subjek yang sama.
    const tempoh = minit(rekod.tamat) - minit(rekod.mula);
    setBorang({ mula: rekod.tamat, tamat: keMasa(Math.min(minit(rekod.tamat) + tempoh, 23 * 60 + 59)), subjek: borang.subjek === LAIN ? subjek : borang.subjek, subjekLain: '', kelas: '', perlu_rph: rekod.perlu_rph });
  };

  const padam = () => {
    if (!edit) return;
    padamWaktu(edit);
    setEdit(null);
    setSahPadam(false);
    setMesej({ jenis: 'ok', teks: 'Waktu dipadam.' });
    setBorang(borangBaharu(pilih));
  };

  const hariLainBerisi = hari.filter((h) => h !== pilih && waktu.some((w) => w.hari === h));
  const salin = () => {
    const dari = Number(salinDari);
    const sumber = waktu.filter((w) => w.hari === dari).sort(ikutMasa);
    const boleh = sumber.filter((s) => !senarai.some((w) => bertindih(w, s)));
    if (boleh.length) simpanWaktu(boleh.map((s) => ({ ...s, id: idBaharu(), hari: pilih })));
    const langkau = sumber.length - boleh.length;
    setSalinDari('');
    setMesej({
      jenis: boleh.length ? 'ok' : 'ralat',
      teks: `${boleh.length} waktu disalin dari ${NAMA_HARI[dari]}.${langkau ? ` ${langkau} dilangkau kerana bertindih.` : ''}`,
    });
  };

  const jumlah = waktu.length;
  const jumlahRph = waktu.filter((w) => w.perlu_rph).length;
  const status = ralat ? 'Gagal dihantar' : tertunda ? 'Menunggu internet' : 'Disimpan';

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Jadual Waktu" sub="Isi sekali, dipakai sepanjang tahun" />
      <main className="isi">
        <div className="baris-status">
          <span>
            <strong className="mono">{jumlah}</strong> waktu seminggu · <strong className="mono">{jumlahRph}</strong> perlu RPH
          </span>
          {sedia && jumlah > 0 && (
            <span className={`lencana ${ralat ? 'lencana-gagal' : tertunda ? 'lencana-menyemak' : 'lencana-ok'}`} role="status">
              {status}
            </span>
          )}
        </div>
        {ralat && (
          <p className="mesej mesej-ralat kad" role="alert">
            Perubahan disimpan dalam telefon tetapi belum sampai ke pelayan. Ia dicuba lagi apabila aplikasi dibuka semula.
          </p>
        )}

        <div className="tab-hari" role="group" aria-label="Pilih hari" style={{ gridTemplateColumns: `repeat(${hari.length}, minmax(0, 1fr))` }}>
          {hari.map((h) => {
            const bil = waktu.filter((w) => w.hari === h).length;
            return (
              <button key={h} type="button" aria-pressed={h === pilih} aria-label={`${NAMA_HARI[h]}, ${bil} waktu`} onClick={() => tukarHari(h)}>
                {HARI_PENDEK[h]}
                <span className="mono">{bil}</span>
              </button>
            );
          })}
        </div>

        <section className="kad kad-senarai" aria-label={`Waktu hari ${NAMA_HARI[pilih]}`}>
          {!sedia ? (
            <p className="senarai-kosong">Memuat jadual…</p>
          ) : senarai.length === 0 ? (
            <p className="senarai-kosong">Belum ada waktu pada hari {NAMA_HARI[pilih]}. Tambah di bawah.</p>
          ) : (
            <ul>
              {senarai.map((w) => (
                <li key={w.id}>
                  <button type="button" className="baris-waktu" aria-pressed={edit === w.id} aria-label={`Edit ${label(w)}, ${julat(w)}`} onClick={() => mulaEdit(w)}>
                    <span className="mono masa">{julat(w)}</span>
                    <span className={`nama-waktu${w.perlu_rph ? '' : ' pudar'}`}>{label(w)}</span>
                    <span className={`pil ${w.perlu_rph ? 'pil-rph' : 'pil-tiada'}`}>{w.perlu_rph ? 'RPH' : 'Tiada RPH'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {senarai.length > 0 && <p className="nota">Tekan mana-mana waktu untuk mengubah atau memadamnya.</p>}

        <form id="borang-waktu" className="kad borang kad-pasang" onSubmit={hantar} noValidate>
          <h2>
            {edit ? 'Edit waktu' : 'Tambah waktu'} · {NAMA_HARI[pilih]}
          </h2>
          <div className="dua-lajur">
            <div className="medan">
              <label htmlFor="mula">Mula</label>
              <input id="mula" type="time" className="mono" value={borang.mula} onChange={(e) => tukar('mula', e.target.value)} required />
            </div>
            <div className="medan">
              <label htmlFor="tamat">Tamat</label>
              <input id="tamat" type="time" className="mono" value={borang.tamat} onChange={(e) => tukar('tamat', e.target.value)} required />
            </div>
          </div>
          <div className="medan">
            <label htmlFor="subjek">Subjek</label>
            <select id="subjek" value={borang.subjek} onChange={(e) => tukar('subjek', e.target.value)} required>
              <option value="">Pilih subjek</option>
              {subjekSaya.length > 0 && (
                <optgroup label="Subjek saya">
                  {subjekSaya.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Diniah">
                {SUBJEK_DINIAH.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </optgroup>
              <optgroup label="Akademik">
                {SUBJEK_AKADEMIK.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </optgroup>
              <optgroup label="Bukan mengajar">
                {BUKAN_MENGAJAR.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </optgroup>
              <option value={LAIN}>+ Subjek lain</option>
            </select>
          </div>
          {borang.subjek === LAIN && (
            <div className="medan">
              <label htmlFor="subjek-lain">Nama subjek atau aktiviti</label>
              <input id="subjek-lain" className="besar" value={borang.subjekLain} onChange={(e) => tukar('subjekLain', e.target.value)} autoCapitalize="characters" maxLength={80} aria-describedby="subjek-lain-bantuan" />
              <span id="subjek-lain-bantuan" className="bantuan">
                Akan muncul dalam senarai “Subjek saya” selepas ini.
              </span>
            </div>
          )}
          <div className="medan">
            <label htmlFor="kelas">Kelas</label>
            <input id="kelas" className="besar" value={borang.kelas} onChange={(e) => tukar('kelas', e.target.value)} autoCapitalize="characters" maxLength={40} aria-describedby="kelas-bantuan" />
            <span id="kelas-bantuan" className="bantuan">
              Contoh: 5F. Biarkan kosong untuk waktu tanpa kelas.
            </span>
          </div>
          <label className="tanda">
            <input type="checkbox" checked={borang.perlu_rph} onChange={(e) => tukar('perlu_rph', e.target.checked)} />
            Waktu ini perlu RPH
          </label>
          <div aria-live="polite">
            {mesej && (
              <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : undefined}>
                {mesej.teks}
              </p>
            )}
          </div>
          <button type="submit" className="butang butang-utama">
            {edit ? 'Simpan perubahan' : 'Tambah waktu'}
          </button>
          {edit &&
            (sahPadam ? (
              <div className="dua-butang">
                <button type="button" className="butang butang-garis" onClick={() => setSahPadam(false)}>
                  Jangan padam
                </button>
                <button type="button" className="butang butang-bahaya" onClick={padam}>
                  Ya, padam
                </button>
              </div>
            ) : (
              <div className="dua-butang">
                <button type="button" className="butang butang-garis" onClick={batalEdit}>
                  Batal
                </button>
                <button type="button" className="butang butang-garis teks-bahaya" onClick={() => setSahPadam(true)}>
                  Padam waktu
                </button>
              </div>
            ))}
        </form>

        {!edit && hariLainBerisi.length > 0 && (
          <section className="kad" aria-labelledby="tajuk-salin">
            <h2 id="tajuk-salin">Salin dari hari lain</h2>
            <div className="medan">
              <label htmlFor="salin-dari">Salin ke {NAMA_HARI[pilih]} dari</label>
              <select id="salin-dari" value={salinDari} onChange={(e) => setSalinDari(e.target.value)}>
                <option value="">Pilih hari</option>
                {hariLainBerisi.map((h) => (
                  <option key={h} value={h}>
                    {NAMA_HARI[h]} ({waktu.filter((w) => w.hari === h).length} waktu)
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="butang butang-garis" disabled={!salinDari} onClick={salin}>
              Salin waktu
            </button>
          </section>
        )}
      </main>
    </>
  );
}
