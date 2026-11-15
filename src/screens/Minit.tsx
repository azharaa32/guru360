import { useEffect, useMemo, useRef, useState } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { useSimpanAuto } from '../lib/auto';
import { AGENDA_KOSONG, AGENDA_LAZIM, MINIT_KOSONG, besarkan, isiMinit, isiSurat, kemasMinit, minitLengkap, senaraiCurai, type Agenda, type Dokumen, type IsiMinit } from '../lib/dokumen';
import { NAMA_BULAN, dariTarikh, tarikhMesra } from '../lib/kalendar';
import type { KepalaSurat } from '../lib/pdf';
import { butirProgram, ikutTarikh, tamatProgram, type Program } from '../lib/program';
import { idBaharu } from '../lib/senarai';
import { TEMPLAT_KOSONG, type Logo, type Templat } from '../lib/templat';

interface Asas {
  dokumen: Dokumen[];
  sedia: boolean;
  tertunda: boolean;
  ralat: string | null;
  simpanDokumen: (d: Dokumen[]) => void;
  padamDokumen: (id: string) => void;
  program: Program[];
  profil: Profil | null;
  templat: Templat | null;
  logo: Logo;
}

const NAMA_HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const tarikhRasmi = (t: string) => {
  if (!t) return '';
  const d = dariTarikh(t);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
};
const tarikhBerhari = (t: string) => (t ? `${tarikhRasmi(t)} (${NAMA_HARI[dariTarikh(t).getDay()]})` : '');

/** Minit baharu; jika program ada surat panggilan, agendanya dibawa masuk. */
function minitBaharu(semua: Dokumen[], profil: Profil | null, prog?: Program): Dokumen {
  const surat = prog ? semua.find((d) => d.jenis === 'surat' && d.program_id === prog.id && isiSurat(d).templat === 'mesyuarat') : undefined;
  const agenda: Agenda[] = surat ? isiSurat(surat).senarai.filter((s) => s.trim()).map((s) => ({ ...AGENDA_KOSONG, tajuk: s.toUpperCase() })) : [];
  const isi: IsiMinit = {
    ...MINIT_KOSONG,
    tarikh: prog?.tarikh ?? '',
    masa: prog ? butirProgram({ ...prog, tempat: '' }).toUpperCase() : '',
    tempat: prog?.tempat ?? '',
    agenda,
    disediakan: { jawatan: 'SETIAUSAHA', nama: profil?.nama ?? '' },
  };
  return { id: idBaharu(), jenis: 'minit', program_id: prog?.id ?? null, tajuk: prog?.nama ?? '', isi: isi as unknown as Record<string, unknown>, status: 'draf' };
}

// ---------------------------------------------------------------- Senarai

export function MinitSenarai(p: Asas & { programId?: string }) {
  const minit = useMemo(() => p.dokumen.filter((d) => d.jenis === 'minit'), [p.dokumen]);
  const pilihan = useMemo(() => [...p.program].filter((x) => !minit.some((m) => m.program_id === x.id)).sort((a, b) => ikutTarikh(b, a)).slice(0, 15), [p.program, minit]);
  const [pilih, setPilih] = useState('');

  const cipta = (prog: Program | undefined, ganti = false) => {
    const d = minitBaharu(p.dokumen, p.profil, prog);
    p.simpanDokumen([d]);
    if (ganti) window.location.replace(`#/minit/${d.id}`);
    else window.location.hash = `#/minit/${d.id}`;
  };

  const dibuka = useRef(false);
  useEffect(() => {
    if (!p.programId || dibuka.current || !p.sedia) return;
    dibuka.current = true;
    const ada = minit.find((d) => d.program_id === p.programId);
    if (ada) window.location.replace(`#/minit/${ada.id}`);
    else cipta(p.program.find((x) => x.id === p.programId), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.programId, p.sedia]);

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Minit Mesyuarat" sub="Minit penuh dan minit curai" />
      <main className="isi">
        <section className="kad borang kad-garis-hijau" aria-labelledby="tajuk-minit-baharu">
          <h2 id="tajuk-minit-baharu">Minit baharu</h2>
          {pilihan.length > 0 && (
            <div className="medan">
              <label htmlFor="minit-program">Mesyuarat dalam takwim (pilihan)</label>
              <select id="minit-program" value={pilih} onChange={(e) => setPilih(e.target.value)}>
                <option value="">Tanpa program dalam takwim</option>
                {pilihan.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nama} · {tarikhMesra(x.tarikh, tamatProgram(x))}
                  </option>
                ))}
              </select>
              <span className="bantuan">Tarikh, masa dan tempat diisi daripada takwim; agenda diambil daripada surat panggilan jika ada.</span>
            </div>
          )}
          <button type="button" className="butang butang-utama" onClick={() => cipta(p.program.find((x) => x.id === pilih))}>
            Mula minit
          </button>
        </section>

        <section className="bahagian" aria-labelledby="tajuk-minit-senarai">
          <div className="baris-tajuk">
            <h2 id="tajuk-minit-senarai" className="label-bahagian">
              MINIT SAYA
            </h2>
            {p.sedia && (p.tertunda || p.ralat) && (
              <span className={`lencana ${p.ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
                {p.ralat ? 'Gagal dihantar' : 'Menunggu internet'}
              </span>
            )}
          </div>
          {!p.sedia && minit.length === 0 ? (
            <p className="nota">Memuat…</p>
          ) : minit.length === 0 ? (
            <p className="nota">Belum ada minit mesyuarat.</p>
          ) : (
            <ul className="senarai-acara">
              {[...minit].reverse().map((d) => {
                const i = isiMinit(d);
                const tindakan = i.agenda.filter((a) => a.jenis === 'tindakan').length;
                return (
                  <li key={d.id}>
                    <a href={`#/minit/${d.id}`} className="kad acara acara-butang">
                      <span className="acara-teks">
                        <strong>{d.tajuk || '(Belum bernama)'}</strong>
                        <span>
                          {i.tarikh ? tarikhMesra(i.tarikh) : 'Tiada tarikh'} · {i.agenda.length} agenda{tindakan ? ` · ${tindakan} tindakan` : ''}
                        </span>
                      </span>
                      <span className={`pil ${d.status === 'siap' ? 'pil-siap' : 'pil-draf'}`}>{d.status === 'siap' ? '● Siap' : '● Draf'}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------- Editor

export function MinitEdit(p: Asas & { id?: string }) {
  const dok = p.dokumen.find((d) => d.id === p.id && d.jenis === 'minit');
  const [tajuk, setTajuk] = useState(dok?.tajuk ?? '');
  const [isi, setIsi] = useState<IsiMinit>(() => isiMinit(dok));
  const [kotor, setKotor] = useState(false);
  const [versi, setVersi] = useState(0);
  const [paparan, setPaparan] = useState<'penuh' | 'curai'>('penuh');
  const [sahPadam, setSahPadam] = useState(false);
  const dipadam = useRef(false);
  const pdf = usePdf();

  const cap = (d: Dokumen | undefined) => (d ? JSON.stringify([d.tajuk, d.isi]) : '');
  const terakhir = useRef(cap(dok));
  const capKini = cap(dok);
  useEffect(() => {
    if (capKini === terakhir.current || kotor) return;
    terakhir.current = capKini;
    setTajuk(dok?.tajuk ?? '');
    setIsi(isiMinit(dok));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capKini, kotor]);

  const simpan = () => {
    if (!kotor || !dok || dipadam.current) return;
    const bersih = kemasMinit(isi);
    const nama = besarkan(tajuk);
    const d: Dokumen = { ...dok, tajuk: nama, isi: bersih as unknown as Record<string, unknown>, status: minitLengkap(nama, bersih) ? 'siap' : 'draf' };
    terakhir.current = cap(d);
    p.simpanDokumen([d]);
    setKotor(false);
  };
  useSimpanAuto(kotor, simpan, versi);

  const curai = useMemo(() => senaraiCurai(isi), [isi]);

  if (!dok) {
    return (
      <>
        <KepalaKembali ke="#/minit" labelKembali="Kembali ke senarai minit" tajuk="Minit Mesyuarat" />
        <main className="isi">
          <section className="kad kosong">
            <h2>{p.sedia ? 'Minit tidak dijumpai' : 'Memuat…'}</h2>
            <a href="#/minit" className="butang butang-garis">
              Kembali ke senarai
            </a>
          </section>
        </main>
      </>
    );
  }

  const sentuh = () => {
    setKotor(true);
    setVersi((v) => v + 1);
  };
  const ubah = (tukar: Partial<IsiMinit>) => {
    setIsi((i) => ({ ...i, ...tukar }));
    sentuh();
  };
  const ubahAgenda = (i: number, tukar: Partial<Agenda>) => ubah({ agenda: isi.agenda.map((a, j) => (j === i ? { ...a, ...tukar } : a)) });
  const hadir = isi.kehadiran.filter((h) => h.hadir && h.nama.trim()).length;
  const jumlahAhli = isi.kehadiran.filter((h) => h.nama.trim()).length;
  const prog = p.program.find((x) => x.id === dok.program_id);

  const kepala = (): KepalaSurat => {
    const t = p.templat ?? TEMPLAT_KOSONG;
    return { nama_sekolah: t.nama_sekolah || p.profil?.sekolah || '', alamat: t.alamat, telefon: t.telefon, emel: t.emel, kod_sekolah: t.kod_sekolah, logoKiri: p.logo.kiri, logoKanan: p.logo.kanan };
  };
  const namaFail = (awalan: string) => `${awalan}-${(besarkan(tajuk) || 'mesyuarat').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`;

  const janaPenuh = () => {
    simpan();
    const b = kemasMinit(isi);
    void pdf.jana(
      async () =>
        (await import('../lib/pdf')).pdfMinit(kepala(), {
          tajuk: besarkan(tajuk),
          tarikh: tarikhBerhari(b.tarikh),
          masa: b.masa,
          tempat: b.tempat,
          hadir: b.kehadiran.filter((h) => h.hadir),
          tidakHadir: b.kehadiran.filter((h) => !h.hadir),
          agenda: b.agenda.map((a) => ({
            tajuk: a.tajuk,
            perbincangan: a.perbincangan,
            tindakan: a.jenis === 'tindakan' ? `TINDAKAN: ${a.tindakan_oleh || '-'}${a.tarikh_akhir ? `\nSEBELUM ${tarikhRasmi(a.tarikh_akhir).toUpperCase()}` : ''}` : 'MAKLUMAN',
          })),
          penutup: b.penutup,
          disediakan: b.disediakan,
          disahkan: b.disahkan,
        }),
      namaFail('minit'),
      `Minit ${besarkan(tajuk)}`.trim(),
    );
  };

  const janaCurai = () => {
    simpan();
    const b = kemasMinit(isi);
    void pdf.jana(
      async () =>
        (await import('../lib/pdf')).pdfMinitCurai(kepala(), {
          mesyuarat: besarkan(tajuk),
          tarikh: tarikhBerhari(b.tarikh),
          daripada: b.disediakan,
          helaian: senaraiCurai(b).map((c) => ({ penerima: c.penerima, butir: c.butir.map((x) => ({ no: x.no, tajuk: x.tajuk, perbincangan: x.perbincangan, tarikhAkhir: tarikhRasmi(x.tarikh_akhir) })) })),
        }),
      namaFail('minit-curai'),
      `Minit curai ${besarkan(tajuk)} (${curai.length} helaian)`.trim(),
    );
  };

  const padam = () => {
    dipadam.current = true;
    p.padamDokumen(dok.id);
    window.location.hash = '#/minit';
  };

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/minit" className="butang-kembali" aria-label="Kembali ke senarai minit">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>Minit Mesyuarat</h1>
          <span className="kepala-kecil">{tajuk.trim() ? tajuk.toUpperCase() : 'Belum bernama'}</span>
        </div>
        <span className="status-simpan" role="status">
          <i className={kotor || p.tertunda ? 'titik titik-tunggu' : p.ralat ? 'titik titik-gagal' : 'titik'} />
          {kotor ? 'Menyimpan…' : p.ralat ? 'Gagal dihantar' : p.tertunda ? 'Menunggu internet' : 'Disimpan'}
        </span>
      </header>
      <main className="isi">
        <div className="tab" role="group" aria-label="Pilih paparan">
          <button type="button" aria-pressed={paparan === 'penuh'} onClick={() => { setPaparan('penuh'); pdf.buang(); }}>
            Minit penuh
          </button>
          <button type="button" aria-pressed={paparan === 'curai'} onClick={() => { setPaparan('curai'); pdf.buang(); }}>
            Minit curai ({curai.length})
          </button>
        </div>

        {paparan === 'penuh' ? (
          <>
            <section className="kad borang" aria-labelledby="tajuk-butiran-minit">
              <h2 id="tajuk-butiran-minit">Butiran mesyuarat</h2>
              {prog && <p>Dari takwim: {prog.nama}.</p>}
              <div className="medan">
                <label htmlFor="m-tajuk">Nama mesyuarat</label>
                <input id="m-tajuk" className="besar" value={tajuk} maxLength={200} autoCapitalize="characters" onChange={(e) => { setTajuk(e.target.value); sentuh(); }} />
              </div>
              <div className="medan">
                <label htmlFor="m-tarikh">Tarikh</label>
                <input id="m-tarikh" type="date" className="mono" value={isi.tarikh} onChange={(e) => ubah({ tarikh: e.target.value })} />
              </div>
              <div className="dua-lajur">
                <div className="medan">
                  <label htmlFor="m-masa">Masa</label>
                  <input id="m-masa" className="besar" value={isi.masa} maxLength={80} autoCapitalize="characters" onChange={(e) => ubah({ masa: e.target.value })} />
                </div>
                <div className="medan">
                  <label htmlFor="m-tempat">Tempat</label>
                  <input id="m-tempat" className="besar" value={isi.tempat} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ tempat: e.target.value })} />
                </div>
              </div>
            </section>

            <section className="kad borang" aria-labelledby="tajuk-kehadiran">
              <div className="baris-tajuk">
                <h2 id="tajuk-kehadiran">Kehadiran</h2>
                <span className="mono jumlah-kecil" aria-live="polite">
                  {hadir} / {jumlahAhli} hadir
                </span>
              </div>
              {isi.kehadiran.map((h, i) => (
                <fieldset className="baris-hadir" key={i}>
                  <legend className="sr">Ahli {i + 1}</legend>
                  <div className="baris-senarai">
                    <input className="besar" aria-label={`Nama ahli ${i + 1}`} placeholder="Nama" value={h.nama} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ kehadiran: isi.kehadiran.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
                    <button type="button" className="butang-buang" aria-label={`Buang ahli ${i + 1}`} onClick={() => ubah({ kehadiran: isi.kehadiran.filter((_, j) => j !== i) })}>
                      ×
                    </button>
                  </div>
                  <div className="baris-senarai">
                    <input className="besar" aria-label={`Jawatan ahli ${i + 1}`} placeholder="Jawatan" value={h.jawatan} maxLength={120} autoCapitalize="characters" onChange={(e) => ubah({ kehadiran: isi.kehadiran.map((x, j) => (j === i ? { ...x, jawatan: e.target.value } : x)) })} />
                    <label className="tanda tanda-kecil">
                      <input type="checkbox" checked={h.hadir} onChange={(e) => ubah({ kehadiran: isi.kehadiran.map((x, j) => (j === i ? { ...x, hadir: e.target.checked } : x)) })} />
                      Hadir
                    </label>
                  </div>
                </fieldset>
              ))}
              <button type="button" className="butang butang-putus-hijau" onClick={() => ubah({ kehadiran: [...isi.kehadiran, { nama: '', jawatan: isi.kehadiran.length === 0 ? 'PENGERUSI' : 'AHLI', hadir: true }] })}>
                + Tambah ahli
              </button>
            </section>

            {isi.agenda.map((a, i) => (
              <section className={`kad borang ${a.jenis === 'tindakan' ? 'kad-garis-emas' : 'kad-garis-hijau'}`} key={i} aria-label={`Agenda ${i + 1}`}>
                <div className="baris-senarai">
                  <span className="mono penanda">{i + 1}.</span>
                  <input className="besar" aria-label={`Tajuk agenda ${i + 1}`} placeholder="Tajuk agenda" value={a.tajuk} maxLength={200} autoCapitalize="characters" onChange={(e) => ubahAgenda(i, { tajuk: e.target.value })} />
                  <button type="button" className="butang-buang" aria-label={`Buang agenda ${i + 1}`} onClick={() => ubah({ agenda: isi.agenda.filter((_, j) => j !== i) })}>
                    ×
                  </button>
                </div>
                <div className="tab" role="group" aria-label={`Jenis agenda ${i + 1}`}>
                  <button type="button" aria-pressed={a.jenis === 'makluman'} onClick={() => ubahAgenda(i, { jenis: 'makluman' })}>
                    Makluman
                  </button>
                  <button type="button" aria-pressed={a.jenis === 'tindakan'} onClick={() => ubahAgenda(i, { jenis: 'tindakan' })}>
                    Tindakan
                  </button>
                </div>
                <div className="medan">
                  <label htmlFor={`m-bincang-${i}`}>Perbincangan</label>
                  <textarea id={`m-bincang-${i}`} className="besar" rows={3} value={a.perbincangan} maxLength={2000} autoCapitalize="characters" onChange={(e) => ubahAgenda(i, { perbincangan: e.target.value })} />
                </div>
                {a.jenis === 'tindakan' && (
                  <div className="dua-lajur">
                    <div className="medan">
                      <label htmlFor={`m-oleh-${i}`}>Tindakan oleh</label>
                      <input id={`m-oleh-${i}`} className="besar" value={a.tindakan_oleh} maxLength={200} autoCapitalize="characters" onChange={(e) => ubahAgenda(i, { tindakan_oleh: e.target.value })} />
                    </div>
                    <div className="medan">
                      <label htmlFor={`m-akhir-${i}`}>Tarikh akhir</label>
                      <input id={`m-akhir-${i}`} type="date" className="mono" value={a.tarikh_akhir} onChange={(e) => ubahAgenda(i, { tarikh_akhir: e.target.value })} />
                    </div>
                  </div>
                )}
              </section>
            ))}
            <div className={isi.agenda.length === 0 ? 'dua-butang' : 'satu-butang'}>
              <button type="button" className="butang butang-putus-hijau" onClick={() => ubah({ agenda: [...isi.agenda, { ...AGENDA_KOSONG }] })}>
                + Tambah agenda
              </button>
              {isi.agenda.length === 0 && (
                <button type="button" className="butang butang-garis" onClick={() => ubah({ agenda: AGENDA_LAZIM.map((t) => ({ ...AGENDA_KOSONG, tajuk: t })) })}>
                  Agenda lazim
                </button>
              )}
            </div>
            <p className="nota">Untuk beberapa penerima, asingkan nama dengan koma pada “Tindakan oleh”. Setiap penerima mendapat helaian minit curai sendiri.</p>

            <section className="kad borang" aria-labelledby="tajuk-penutup-minit">
              <h2 id="tajuk-penutup-minit">Penutup & pengesahan</h2>
              <div className="medan">
                <label htmlFor="m-penutup">Penutup (pilihan)</label>
                <textarea id="m-penutup" className="besar" rows={2} value={isi.penutup} maxLength={1000} autoCapitalize="characters" onChange={(e) => ubah({ penutup: e.target.value })} aria-describedby="m-penutup-b" />
                <span id="m-penutup-b" className="bantuan">
                  Contoh: Mesyuarat ditangguhkan pada jam 4.00 petang.
                </span>
              </div>
              <div className="dua-lajur">
                <div className="medan">
                  <label htmlFor="m-sedia-nama">Disediakan oleh</label>
                  <input id="m-sedia-nama" className="besar" value={isi.disediakan.nama} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ disediakan: { ...isi.disediakan, nama: e.target.value } })} />
                </div>
                <div className="medan">
                  <label htmlFor="m-sedia-jawatan">Jawatan</label>
                  <input id="m-sedia-jawatan" className="besar" value={isi.disediakan.jawatan} maxLength={120} autoCapitalize="characters" onChange={(e) => ubah({ disediakan: { ...isi.disediakan, jawatan: e.target.value } })} />
                </div>
              </div>
              <div className="dua-lajur">
                <div className="medan">
                  <label htmlFor="m-sah-nama">Disahkan oleh</label>
                  <input id="m-sah-nama" className="besar" value={isi.disahkan.nama} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ disahkan: { ...isi.disahkan, nama: e.target.value } })} />
                </div>
                <div className="medan">
                  <label htmlFor="m-sah-jawatan">Jawatan</label>
                  <input id="m-sah-jawatan" className="besar" value={isi.disahkan.jawatan} maxLength={120} autoCapitalize="characters" onChange={(e) => ubah({ disahkan: { ...isi.disahkan, jawatan: e.target.value } })} />
                </div>
              </div>
            </section>

            <section className="kad" aria-label="Jana PDF minit">
              <button type="button" className="butang butang-utama" disabled={pdf.menjana} onClick={janaPenuh}>
                {pdf.menjana ? 'Menjana PDF…' : 'Jana PDF minit penuh'}
              </button>
              <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
            </section>

            <section className="kad" aria-label="Padam minit">
              {sahPadam ? (
                <>
                  <p>Padam minit ini? Ia tidak boleh dikembalikan.</p>
                  <div className="dua-butang">
                    <button type="button" className="butang butang-garis" onClick={() => setSahPadam(false)}>
                      Jangan padam
                    </button>
                    <button type="button" className="butang butang-bahaya" onClick={padam}>
                      Ya, padam
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="butang butang-garis teks-bahaya" onClick={() => setSahPadam(true)}>
                  Padam minit
                </button>
              )}
            </section>
          </>
        ) : (
          <>
            {curai.length === 0 ? (
              <section className="kad kosong">
                <h2>Tiada minit curai</h2>
                <p>Minit curai dijana daripada agenda bertanda Tindakan. Tandakan sekurang-kurangnya satu agenda sebagai Tindakan dalam minit penuh.</p>
              </section>
            ) : (
              <>
                {curai.map((c) => (
                  <section className="kad kad-garis-emas" key={c.penerima} aria-label={`Minit curai untuk ${c.penerima}`}>
                    <span className="label-bahagian">KEPADA</span>
                    <h2>{c.penerima}</h2>
                    <ul className="senarai-curai">
                      {c.butir.map((b) => (
                        <li key={b.no}>
                          <strong>
                            {b.no}. {b.tajuk}
                          </strong>
                          {b.perbincangan && <span>{b.perbincangan}</span>}
                          <span className="mono">{b.tarikh_akhir ? `Tarikh akhir: ${tarikhMesra(b.tarikh_akhir)}` : 'Tiada tarikh akhir'}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                <section className="kad" aria-label="Jana PDF minit curai">
                  <button type="button" className="butang butang-utama" disabled={pdf.menjana} onClick={janaCurai}>
                    {pdf.menjana ? 'Menjana PDF…' : `Jana PDF minit curai (${curai.length} helaian)`}
                  </button>
                  <p>Satu helaian bagi setiap penerima, dengan ruang maklum balas.</p>
                  <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
                </section>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
