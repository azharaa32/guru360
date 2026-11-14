import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BULAN_PENDEK, dariTarikh, hariIni, tarikhMesra } from '../lib/kalendar';
import { butirProgram, programAkanDatang, programLepas, tamatProgram, type Program } from '../lib/program';
import { idBaharu } from '../lib/senarai';

interface Props {
  program: Program[];
  sedia: boolean;
  tertunda: boolean;
  ralat: string | null;
  /** Tarikh yang dipilih pada kalendar; program baharu bermula dengan tarikh ini. */
  pilih: string;
  simpanProgram: (p: Program[]) => void;
  padamProgram: (id: string) => void;
}

interface Borang {
  nama: string;
  tarikh: string;
  tarikh_tamat: string;
  masa_mula: string;
  masa_tamat: string;
  tempat: string;
  catatan: string;
}

const besar = (s: string) => s.trim().replace(/[ \t]+/g, ' ').toUpperCase();
const HAD = 5;

export function ProgramTakwim({ program, sedia, tertunda, ralat, pilih, simpanProgram, padamProgram }: Props) {
  const kini = hariIni();
  const [borang, setBorang] = useState<Borang | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [sahPadam, setSahPadam] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);
  const [semua, setSemua] = useState(false);
  const [lepas, setLepas] = useState(false);

  const akan = useMemo(() => programAkanDatang(program, kini), [program, kini]);
  const dahulu = useMemo(() => programLepas(program, kini), [program, kini]);
  const papar = semua ? akan : akan.slice(0, HAD);

  // Selepas borang dibuka, bawa ia ke dalam paparan.
  const terbuka = borang !== null;
  useEffect(() => {
    if (terbuka) document.getElementById('borang-program')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [terbuka, edit]);

  const buka = (p?: Program) => {
    setMesej(null);
    setSahPadam(false);
    if (p) {
      setEdit(p.id);
      setBorang({ nama: p.nama, tarikh: p.tarikh, tarikh_tamat: p.tarikh_tamat ?? '', masa_mula: p.masa_mula ?? '', masa_tamat: p.masa_tamat ?? '', tempat: p.tempat, catatan: p.catatan });
    } else {
      setEdit(null);
      setBorang({ nama: '', tarikh: pilih, tarikh_tamat: '', masa_mula: '', masa_tamat: '', tempat: '', catatan: '' });
    }
  };

  const tutup = () => {
    setBorang(null);
    setEdit(null);
    setSahPadam(false);
  };

  const tukar = (k: keyof Borang, v: string) => {
    setMesej(null);
    setBorang((b) => (b ? { ...b, [k]: v } : b));
  };

  const hantar = (e: FormEvent) => {
    e.preventDefault();
    if (!borang) return;
    const nama = besar(borang.nama);
    const tamat = borang.tarikh_tamat && borang.tarikh_tamat !== borang.tarikh ? borang.tarikh_tamat : null;
    if (!nama) return setMesej({ jenis: 'ralat', teks: 'Sila isi nama program.' });
    if (!borang.tarikh) return setMesej({ jenis: 'ralat', teks: 'Sila isi tarikh program.' });
    if (tamat && tamat < borang.tarikh) return setMesej({ jenis: 'ralat', teks: 'Tarikh tamat mesti pada atau selepas tarikh mula.' });
    if (borang.masa_tamat && !borang.masa_mula) return setMesej({ jenis: 'ralat', teks: 'Isi masa mula dahulu, atau kosongkan masa tamat.' });
    if (!tamat && borang.masa_mula && borang.masa_tamat && borang.masa_tamat <= borang.masa_mula) return setMesej({ jenis: 'ralat', teks: 'Masa tamat mesti selepas masa mula.' });
    const rekod: Program = {
      id: edit ?? idBaharu(),
      nama,
      tarikh: borang.tarikh,
      tarikh_tamat: tamat,
      masa_mula: borang.masa_mula || null,
      masa_tamat: borang.masa_tamat || null,
      tempat: besar(borang.tempat),
      catatan: borang.catatan.trim().toUpperCase(),
    };
    simpanProgram([rekod]);
    setMesej({ jenis: 'ok', teks: edit ? `Dikemas kini: ${nama}.` : `Ditambah: ${nama}, ${tarikhMesra(rekod.tarikh, tamatProgram(rekod))}.` });
    if (tamatProgram(rekod) < kini) setLepas(true);
    tutup();
  };

  const padam = () => {
    if (!edit) return;
    padamProgram(edit);
    setMesej({ jenis: 'ok', teks: 'Program dipadam.' });
    tutup();
  };

  const baris = (p: Program, pudar = false) => {
    const d = dariTarikh(p.tarikh);
    const butir = butirProgram(p);
    return (
      <li key={p.id}>
        <button type="button" className={`kad acara acara-butang${pudar ? ' baris-lepas' : ''}`} aria-pressed={edit === p.id} aria-label={`Edit ${p.nama}, ${tarikhMesra(p.tarikh, tamatProgram(p))}`} onClick={() => buka(p)}>
          <span className={`acara-tarikh ${pudar ? 'warna-kelabu' : 'warna-biru'}`}>
            <span className="mono">{d.getDate()}</span>
            <span>{BULAN_PENDEK[d.getMonth()]}</span>
          </span>
          <span className="acara-teks">
            <strong>{p.nama}</strong>
            <span>
              {p.tarikh_tamat ? `${tarikhMesra(p.tarikh, p.tarikh_tamat)}${butir ? ' · ' : ''}` : ''}
              {butir || (p.tarikh_tamat ? '' : tarikhMesra(p.tarikh))}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <section className="bahagian" aria-labelledby="tajuk-program">
      <div className="baris-tajuk">
        <h2 id="tajuk-program" className="label-bahagian">
          PROGRAM AKAN DATANG
        </h2>
        {sedia && (tertunda || ralat) && (
          <span className={`lencana ${ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
            {ralat ? 'Gagal dihantar' : 'Menunggu internet'}
          </span>
        )}
      </div>

      {!sedia && program.length === 0 ? (
        <p className="nota">Memuat program…</p>
      ) : akan.length === 0 ? (
        <p className="nota">Belum ada program akan datang. Tambah program sekolah atau mesyuarat di sini.</p>
      ) : (
        <ul className="senarai-acara">{papar.map((p) => baris(p))}</ul>
      )}
      {akan.length > HAD && (
        <button type="button" className="butang-teks tengah" onClick={() => setSemua(!semua)}>
          {semua ? 'Tunjuk lebih sedikit' : `Tunjuk semua ${akan.length} program`}
        </button>
      )}

      <div aria-live="polite">{mesej && !borang && <p className={`mesej mesej-${mesej.jenis} kad`}>{mesej.teks}</p>}</div>

      {borang ? (
        <form id="borang-program" className="kad borang kad-garis-biru" onSubmit={hantar} noValidate>
          <h2>{edit ? 'Edit program' : 'Tambah program'}</h2>
          <div className="medan">
            <label htmlFor="nama-program">Nama program</label>
            <input id="nama-program" className="besar" value={borang.nama} onChange={(e) => tukar('nama', e.target.value)} autoCapitalize="characters" maxLength={160} />
          </div>
          <div className="dua-lajur">
            <div className="medan">
              <label htmlFor="tarikh-program">Tarikh</label>
              <input id="tarikh-program" type="date" className="mono" value={borang.tarikh} onChange={(e) => tukar('tarikh', e.target.value)} />
            </div>
            <div className="medan">
              <label htmlFor="tamat-program">Hingga (pilihan)</label>
              <input id="tamat-program" type="date" className="mono" value={borang.tarikh_tamat} min={borang.tarikh} onChange={(e) => tukar('tarikh_tamat', e.target.value)} />
            </div>
          </div>
          <div className="dua-lajur">
            <div className="medan">
              <label htmlFor="mula-program">Masa mula (pilihan)</label>
              <input id="mula-program" type="time" className="mono" value={borang.masa_mula} onChange={(e) => tukar('masa_mula', e.target.value)} />
            </div>
            <div className="medan">
              <label htmlFor="akhir-program">Masa tamat (pilihan)</label>
              <input id="akhir-program" type="time" className="mono" value={borang.masa_tamat} onChange={(e) => tukar('masa_tamat', e.target.value)} />
            </div>
          </div>
          <div className="medan">
            <label htmlFor="tempat-program">Tempat (pilihan)</label>
            <input id="tempat-program" className="besar" value={borang.tempat} onChange={(e) => tukar('tempat', e.target.value)} autoCapitalize="characters" maxLength={160} />
          </div>
          <div className="medan">
            <label htmlFor="catatan-program">Catatan (pilihan)</label>
            <textarea id="catatan-program" className="besar" rows={2} value={borang.catatan} onChange={(e) => tukar('catatan', e.target.value)} autoCapitalize="characters" maxLength={1000} />
          </div>
          <div aria-live="polite">
            {mesej && (
              <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : undefined}>
                {mesej.teks}
              </p>
            )}
          </div>
          <button type="submit" className="butang butang-utama">
            {edit ? 'Simpan perubahan' : 'Simpan program'}
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
            <div className={edit ? 'dua-butang' : 'satu-butang'}>
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
      ) : (
        <button type="button" className="butang butang-biru" onClick={() => buka()}>
          + Tambah program pada {tarikhMesra(pilih)}
        </button>
      )}

      {dahulu.length > 0 && (
        <>
          <button type="button" className="butang-teks tengah" aria-expanded={lepas} onClick={() => setLepas(!lepas)}>
            {lepas ? 'Sorok program lepas' : `Tunjuk ${dahulu.length} program lepas`}
          </button>
          {lepas && <ul className="senarai-acara">{dahulu.slice(0, 20).map((p) => baris(p, true))}</ul>}
        </>
      )}
    </section>
  );
}
