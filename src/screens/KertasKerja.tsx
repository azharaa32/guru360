import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { useSimpanAuto } from '../lib/auto';
import { BAHAGIAN_KERTAS, KERTAS_KOSONG, bahagianSiap, besarkan, isiKertas, jumlahBelanja, kemasKertas, rm, type Dokumen, type IsiKertasKerja } from '../lib/dokumen';
import { NAMA_BULAN, dariTarikh, hariIni, tarikhMesra } from '../lib/kalendar';
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
  const d = dariTarikh(t);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
};
function tarikhPdf(mula: string, tamat: string): string {
  if (!mula) return '';
  if (tamat && tamat !== mula) return `${tarikhRasmi(mula)} hingga ${tarikhRasmi(tamat)}`;
  return `${tarikhRasmi(mula)} (${NAMA_HARI[dariTarikh(mula).getDay()]})`;
}

function kertasBaharu(p: Program | undefined, profil: Profil | null): Dokumen {
  const isi: IsiKertasKerja = {
    ...KERTAS_KOSONG,
    tarikh: p?.tarikh ?? '',
    tarikh_tamat: p?.tarikh_tamat ?? '',
    masa: p ? butirProgram({ ...p, tempat: '' }).toUpperCase() : '',
    tempat: p?.tempat ?? '',
    disediakan: { jawatan: '', nama: profil?.nama ?? '' },
  };
  return { id: idBaharu(), jenis: 'kertas_kerja', program_id: p?.id ?? null, tajuk: p?.nama ?? '', isi: isi as unknown as Record<string, unknown>, status: 'draf' };
}

// ---------------------------------------------------------------- Senarai

export function KertasSenarai(p: Asas & { programId?: string }) {
  const kertas = useMemo(() => p.dokumen.filter((d) => d.jenis === 'kertas_kerja'), [p.dokumen]);
  const kini = hariIni();
  const pilihan = useMemo(() => [...p.program].filter((x) => tamatProgram(x) >= kini && !kertas.some((k) => k.program_id === x.id)).sort(ikutTarikh), [p.program, kertas, kini]);
  const [pilih, setPilih] = useState('');

  const cipta = (prog: Program | undefined) => {
    const d = kertasBaharu(prog, p.profil);
    p.simpanDokumen([d]);
    window.location.hash = `#/kertas/${d.id}`;
  };

  // Dari takwim (#/kertas/p/<id program>): buka kertas kerja program itu, atau cipta yang baharu.
  const dibuka = useRef(false);
  useEffect(() => {
    if (!p.programId || dibuka.current || !p.sedia) return;
    dibuka.current = true;
    const ada = kertas.find((k) => k.program_id === p.programId);
    if (ada) window.location.replace(`#/kertas/${ada.id}`);
    else {
      const prog = p.program.find((x) => x.id === p.programId);
      const d = kertasBaharu(prog, p.profil);
      p.simpanDokumen([d]);
      window.location.replace(`#/kertas/${d.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.programId, p.sedia]);

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Kertas Kerja" sub="Cadangan program dengan anggaran belanja" />
      <main className="isi">
        <section className="kad borang kad-garis-biru" aria-labelledby="tajuk-kk-baharu">
          <h2 id="tajuk-kk-baharu">Kertas kerja baharu</h2>
          {pilihan.length > 0 && (
            <div className="medan">
              <label htmlFor="kk-program">Untuk program (pilihan)</label>
              <select id="kk-program" value={pilih} onChange={(e) => setPilih(e.target.value)}>
                <option value="">Tanpa program dalam takwim</option>
                {pilihan.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nama} · {tarikhMesra(x.tarikh, tamatProgram(x))}
                  </option>
                ))}
              </select>
              <span className="bantuan">Tajuk, tarikh, masa dan tempat diisi terus daripada takwim.</span>
            </div>
          )}
          <button type="button" className="butang butang-biru" onClick={() => cipta(p.program.find((x) => x.id === pilih))}>
            Mula kertas kerja
          </button>
        </section>

        <section className="bahagian" aria-labelledby="tajuk-kk-senarai">
          <div className="baris-tajuk">
            <h2 id="tajuk-kk-senarai" className="label-bahagian">
              KERTAS KERJA SAYA
            </h2>
            {p.sedia && (p.tertunda || p.ralat) && (
              <span className={`lencana ${p.ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
                {p.ralat ? 'Gagal dihantar' : 'Menunggu internet'}
              </span>
            )}
          </div>
          {!p.sedia && kertas.length === 0 ? (
            <p className="nota">Memuat…</p>
          ) : kertas.length === 0 ? (
            <p className="nota">Belum ada kertas kerja.</p>
          ) : (
            <ul className="senarai-acara">
              {[...kertas].reverse().map((d) => {
                const siap = bahagianSiap(d.tajuk, isiKertas(d)).filter(Boolean).length;
                const prog = p.program.find((x) => x.id === d.program_id);
                return (
                  <li key={d.id}>
                    <a href={`#/kertas/${d.id}`} className="kad acara acara-butang">
                      <span className="acara-teks">
                        <strong>{d.tajuk || '(Belum bertajuk)'}</strong>
                        <span>{prog ? tarikhMesra(prog.tarikh, tamatProgram(prog)) : isiKertas(d).tarikh ? tarikhMesra(isiKertas(d).tarikh) : 'Tiada tarikh'}</span>
                      </span>
                      <span className={`pil ${siap === 9 ? 'pil-siap' : 'pil-draf'}`}>{siap}/9</span>
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

function Bahagian({ no, nama, siap, buka, tukar, kanan, children }: { no: number; nama: string; siap: boolean; buka: boolean; tukar: () => void; kanan?: ReactNode; children: ReactNode }) {
  return (
    <section className={`kad akordion${buka ? ' akordion-buka' : ''}`}>
      <h2>
        <button type="button" className="akordion-kepala" aria-expanded={buka} aria-controls={`kk-b${no}`} onClick={tukar}>
          <span className={`bulat${siap ? ' bulat-siap' : buka ? ' bulat-aktif' : ''}`} aria-hidden="true">
            {siap ? '✓' : no}
          </span>
          <span className="akordion-nama">
            {no}. {nama}
            <span className="sr">{siap ? ' (siap)' : ' (belum siap)'}</span>
          </span>
          {kanan}
        </button>
      </h2>
      {buka && (
        <div id={`kk-b${no}`} className="akordion-isi">
          {children}
        </div>
      )}
    </section>
  );
}

const JAWATAN_LAZIM = ['PENASIHAT', 'PENGERUSI', 'NAIB PENGERUSI', 'SETIAUSAHA', 'BENDAHARI'];

export function KertasEdit(p: Asas & { id?: string }) {
  const dok = p.dokumen.find((d) => d.id === p.id && d.jenis === 'kertas_kerja');
  const [tajuk, setTajuk] = useState(dok?.tajuk ?? '');
  const [isi, setIsi] = useState<IsiKertasKerja>(() => isiKertas(dok));
  const [kotor, setKotor] = useState(false);
  const [versi, setVersi] = useState(0);
  const dipadam = useRef(false);
  const [buka, setBuka] = useState<number | null>(() => {
    const s = bahagianSiap(dok?.tajuk ?? '', isiKertas(dok));
    const i = s.indexOf(false);
    return i < 0 ? null : i;
  });
  const [sahPadam, setSahPadam] = useState(false);
  const pdf = usePdf();

  // Muat semula hanya apabila dokumen berubah dari luar (peranti lain), bukan selepas simpanan sendiri.
  const cap = (d: Dokumen | undefined) => (d ? JSON.stringify([d.tajuk, d.isi]) : '');
  const terakhir = useRef(cap(dok));
  const capKini = cap(dok);
  useEffect(() => {
    if (capKini === terakhir.current || kotor) return;
    terakhir.current = capKini;
    setTajuk(dok?.tajuk ?? '');
    setIsi(isiKertas(dok));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capKini, kotor]);

  const simpan = () => {
    if (!kotor || !dok || dipadam.current) return;
    const bersih = kemasKertas(isi);
    const tajukBersih = besarkan(tajuk);
    const d: Dokumen = { ...dok, tajuk: tajukBersih, isi: bersih as unknown as Record<string, unknown>, status: bahagianSiap(tajukBersih, bersih).every(Boolean) ? 'siap' : 'draf' };
    terakhir.current = cap(d);
    p.simpanDokumen([d]);
    setKotor(false);
  };
  useSimpanAuto(kotor, simpan, versi);

  if (!dok) {
    return (
      <>
        <KepalaKembali ke="#/kertas" labelKembali="Kembali ke senarai kertas kerja" tajuk="Kertas Kerja" />
        <main className="isi">
          <section className="kad kosong">
            <h2>{p.sedia ? 'Kertas kerja tidak dijumpai' : 'Memuat…'}</h2>
            <a href="#/kertas" className="butang butang-garis">
              Kembali ke senarai
            </a>
          </section>
        </main>
      </>
    );
  }

  const ubah = (tukar: Partial<IsiKertasKerja>) => {
    setIsi((i) => ({ ...i, ...tukar }));
    setKotor(true);
    setVersi((v) => v + 1);
  };
  const siap = bahagianSiap(tajuk, isi);
  const bilSiap = siap.filter(Boolean).length;
  const jumlah = jumlahBelanja(isi.belanja);
  const tukarBuka = (i: number) => setBuka(buka === i ? null : i);
  const seterusnya = (i: number) => (
    <button type="button" className="butang butang-garis" onClick={() => setBuka(i + 1 < 9 ? i + 1 : null)}>
      {i + 1 < 9 ? `Seterusnya: ${BAHAGIAN_KERTAS[i + 1]}` : 'Tutup'}
    </button>
  );
  const teks = (id: string, label: string, nilai: string, set: (v: string) => void, baris = 4, bantuan?: string) => (
    <div className="medan">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="besar" rows={baris} value={nilai} maxLength={6000} autoCapitalize="characters" onChange={(e) => set(e.target.value)} aria-describedby={bantuan ? `${id}-b` : undefined} />
      {bantuan && (
        <span id={`${id}-b`} className="bantuan">
          {bantuan}
        </span>
      )}
    </div>
  );
  const input = (id: string, label: string, nilai: string, set: (v: string) => void, jenis = 'text') => (
    <div className="medan">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={jenis} className={jenis === 'text' ? 'besar' : 'mono'} value={nilai} maxLength={200} autoCapitalize="characters" onChange={(e) => set(e.target.value)} />
    </div>
  );
  const buang = (label: string, tindak: () => void) => (
    <button type="button" className="butang-buang" aria-label={label} onClick={tindak}>
      ×
    </button>
  );

  const janaPdf = () => {
    simpan();
    const b = kemasKertas(isi);
    const t = p.templat ?? TEMPLAT_KOSONG;
    const kepala: KepalaSurat = { nama_sekolah: t.nama_sekolah || p.profil?.sekolah || '', alamat: t.alamat, telefon: t.telefon, emel: t.emel, kod_sekolah: t.kod_sekolah, logoKiri: p.logo.kiri, logoKanan: p.logo.kanan };
    void pdf.jana(
      async () => (await import('../lib/pdf')).pdfKertasKerja(kepala, { ...b, tajuk: besarkan(tajuk), tarikh: tarikhPdf(b.tarikh, b.tarikh_tamat) }),
      `kertas-kerja-${(besarkan(tajuk) || 'baharu').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`,
      `Kertas kerja ${besarkan(tajuk)}`.trim(),
    );
  };

  const padam = () => {
    dipadam.current = true;
    p.padamDokumen(dok.id);
    window.location.hash = '#/kertas';
  };

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/kertas" className="butang-kembali" aria-label="Kembali ke senarai kertas kerja">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>Kertas Kerja</h1>
          <span className="kepala-kecil">{tajuk.trim() ? tajuk.toUpperCase() : 'Belum bertajuk'}</span>
        </div>
        <span className="status-simpan" role="status">
          <i className={kotor || p.tertunda ? 'titik titik-tunggu' : p.ralat ? 'titik titik-gagal' : 'titik'} />
          {kotor ? 'Menyimpan…' : p.ralat ? 'Gagal dihantar' : p.tertunda ? 'Menunggu internet' : 'Disimpan'}
        </span>
      </header>
      <main className="isi">
        <div className="kemajuan">
          <div className="kemajuan-teks">
            <span>Bahagian siap</span>
            <span className="mono">{bilSiap} / 9</span>
          </div>
          <div className="kemajuan-jalur" role="progressbar" aria-label="Bahagian siap" aria-valuemin={0} aria-valuemax={9} aria-valuenow={bilSiap}>
            <div style={{ width: `${(bilSiap / 9) * 100}%` }} />
          </div>
        </div>

        <Bahagian no={1} nama={BAHAGIAN_KERTAS[0]} siap={siap[0]} buka={buka === 0} tukar={() => tukarBuka(0)}>
          {input('kk-tajuk', 'Tajuk program', tajuk, (v) => { setTajuk(v); setKotor(true); setVersi((x) => x + 1); })}
          {teks('kk-latar', 'Latar belakang', isi.latar, (v) => ubah({ latar: v }), 4)}
          {seterusnya(0)}
        </Bahagian>

        <Bahagian no={2} nama={BAHAGIAN_KERTAS[1]} siap={siap[1]} buka={buka === 1} tukar={() => tukarBuka(1)}>
          {teks('kk-rasional', 'Rasional', isi.rasional, (v) => ubah({ rasional: v }), 4, 'Mengapa program ini perlu diadakan.')}
          {seterusnya(1)}
        </Bahagian>

        <Bahagian no={3} nama={BAHAGIAN_KERTAS[2]} siap={siap[2]} buka={buka === 2} tukar={() => tukarBuka(2)}>
          {isi.objektif.map((o, i) => (
            <div className="baris-senarai" key={i}>
              <span className="mono penanda">{i + 1}.</span>
              <input className="besar" aria-label={`Objektif ${i + 1}`} value={o} maxLength={400} autoCapitalize="characters" onChange={(e) => ubah({ objektif: isi.objektif.map((x, j) => (j === i ? e.target.value : x)) })} />
              {isi.objektif.length > 1 && buang(`Buang objektif ${i + 1}`, () => ubah({ objektif: isi.objektif.filter((_, j) => j !== i) }))}
            </div>
          ))}
          <button type="button" className="butang butang-putus-biru" onClick={() => ubah({ objektif: [...isi.objektif, ''] })}>
            + Tambah objektif
          </button>
          {seterusnya(2)}
        </Bahagian>

        <Bahagian no={4} nama={BAHAGIAN_KERTAS[3]} siap={siap[3]} buka={buka === 3} tukar={() => tukarBuka(3)}>
          {teks('kk-sasaran', 'Sasaran', isi.sasaran, (v) => ubah({ sasaran: v }), 3, 'Contoh: semua murid Tahap 2 (180 orang) dan 12 orang guru.')}
          {seterusnya(3)}
        </Bahagian>

        <Bahagian no={5} nama={BAHAGIAN_KERTAS[4]} siap={siap[4]} buka={buka === 4} tukar={() => tukarBuka(4)}>
          <div className="dua-lajur">
            {input('kk-tarikh', 'Tarikh', isi.tarikh, (v) => ubah({ tarikh: v }), 'date')}
            {input('kk-tamat', 'Hingga (pilihan)', isi.tarikh_tamat, (v) => ubah({ tarikh_tamat: v }), 'date')}
          </div>
          {input('kk-masa', 'Masa', isi.masa, (v) => ubah({ masa: v }))}
          {input('kk-tempat', 'Tempat', isi.tempat, (v) => ubah({ tempat: v }))}
          {seterusnya(4)}
        </Bahagian>

        <Bahagian no={6} nama={BAHAGIAN_KERTAS[5]} siap={siap[5]} buka={buka === 5} tukar={() => tukarBuka(5)}>
          {isi.jawatankuasa.map((o, i) => (
            <div className="baris-dua" key={i}>
              <input className="besar" aria-label={`Jawatan ${i + 1}`} placeholder="Jawatan" value={o.jawatan} maxLength={120} autoCapitalize="characters" onChange={(e) => ubah({ jawatankuasa: isi.jawatankuasa.map((x, j) => (j === i ? { ...x, jawatan: e.target.value } : x)) })} />
              <input className="besar" aria-label={`Nama ${i + 1}`} placeholder="Nama" value={o.nama} maxLength={160} autoCapitalize="characters" onChange={(e) => ubah({ jawatankuasa: isi.jawatankuasa.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
              {buang(`Buang ahli ${i + 1}`, () => ubah({ jawatankuasa: isi.jawatankuasa.filter((_, j) => j !== i) }))}
            </div>
          ))}
          <div className="dua-butang">
            <button type="button" className="butang butang-putus-biru" onClick={() => ubah({ jawatankuasa: [...isi.jawatankuasa, { jawatan: '', nama: '' }] })}>
              + Tambah ahli
            </button>
            {isi.jawatankuasa.length === 0 ? (
              <button type="button" className="butang butang-garis" onClick={() => ubah({ jawatankuasa: JAWATAN_LAZIM.map((j) => ({ jawatan: j, nama: '' })) })}>
                Jawatan lazim
              </button>
            ) : (
              <span />
            )}
          </div>
          {seterusnya(5)}
        </Bahagian>

        <Bahagian no={7} nama={BAHAGIAN_KERTAS[6]} siap={siap[6]} buka={buka === 6} tukar={() => tukarBuka(6)}>
          {isi.aturcara.map((a, i) => (
            <div className="baris-dua baris-aturcara" key={i}>
              <input className="besar" aria-label={`Masa acara ${i + 1}`} placeholder="Masa" value={a.masa} maxLength={40} autoCapitalize="characters" onChange={(e) => ubah({ aturcara: isi.aturcara.map((x, j) => (j === i ? { ...x, masa: e.target.value } : x)) })} />
              <input className="besar" aria-label={`Acara ${i + 1}`} placeholder="Acara" value={a.acara} maxLength={300} autoCapitalize="characters" onChange={(e) => ubah({ aturcara: isi.aturcara.map((x, j) => (j === i ? { ...x, acara: e.target.value } : x)) })} />
              {buang(`Buang acara ${i + 1}`, () => ubah({ aturcara: isi.aturcara.filter((_, j) => j !== i) }))}
            </div>
          ))}
          <button type="button" className="butang butang-putus-biru" onClick={() => ubah({ aturcara: [...isi.aturcara, { masa: '', acara: '' }] })}>
            + Tambah acara
          </button>
          {seterusnya(6)}
        </Bahagian>

        <Bahagian no={8} nama={BAHAGIAN_KERTAS[7]} siap={siap[7]} buka={buka === 7} tukar={() => tukarBuka(7)} kanan={<span className="mono jumlah-kecil">{isi.tiada_kos ? 'Tiada kos' : rm(jumlah)}</span>}>
          <label className="tanda">
            <input type="checkbox" checked={isi.tiada_kos} onChange={(e) => ubah({ tiada_kos: e.target.checked })} />
            Program ini tiada kos
          </label>
          {!isi.tiada_kos && (
            <>
              {isi.belanja.map((b, i) => (
                <fieldset className="baris-belanja" key={i}>
                  <legend className="sr">Perkara {i + 1}</legend>
                  <div className="baris-senarai">
                    <input className="besar" aria-label={`Perkara ${i + 1}`} placeholder="Perkara" value={b.perkara} maxLength={200} autoCapitalize="characters" onChange={(e) => ubah({ belanja: isi.belanja.map((x, j) => (j === i ? { ...x, perkara: e.target.value } : x)) })} />
                    {buang(`Buang perkara ${i + 1}`, () => ubah({ belanja: isi.belanja.filter((_, j) => j !== i) }))}
                  </div>
                  <div className="tiga-lajur">
                    <label>
                      <span>Kuantiti</span>
                      <input type="number" inputMode="numeric" min="0" step="1" className="mono" value={b.kuantiti || ''} onChange={(e) => ubah({ belanja: isi.belanja.map((x, j) => (j === i ? { ...x, kuantiti: Number(e.target.value) } : x)) })} />
                    </label>
                    <label>
                      <span>Harga (RM)</span>
                      <input type="number" inputMode="decimal" min="0" step="0.01" className="mono" value={b.harga || ''} onChange={(e) => ubah({ belanja: isi.belanja.map((x, j) => (j === i ? { ...x, harga: Number(e.target.value) } : x)) })} />
                    </label>
                    <span className="jumlah-baris">
                      <span>Jumlah</span>
                      <strong className="mono">{rm((Number(b.kuantiti) || 0) * (Number(b.harga) || 0))}</strong>
                    </span>
                  </div>
                </fieldset>
              ))}
              <button type="button" className="butang butang-putus-biru" onClick={() => ubah({ belanja: [...isi.belanja, { perkara: '', kuantiti: 1, harga: 0 }] })}>
                + Tambah perkara
              </button>
              <div className="jumlah-besar" aria-live="polite">
                <span>Jumlah keseluruhan</span>
                <strong className="mono">{rm(jumlah)}</strong>
              </div>
              {input('kk-sumber', 'Sumber kewangan (pilihan)', isi.sumber, (v) => ubah({ sumber: v }))}
            </>
          )}
          {seterusnya(7)}
        </Bahagian>

        <Bahagian no={9} nama={BAHAGIAN_KERTAS[8]} siap={siap[8]} buka={buka === 8} tukar={() => tukarBuka(8)}>
          {teks('kk-penutup', 'Penutup', isi.penutup, (v) => ubah({ penutup: v }), 3)}
          <span className="label-bahagian">DISEDIAKAN OLEH</span>
          {input('kk-sedia-nama', 'Nama', isi.disediakan.nama, (v) => ubah({ disediakan: { ...isi.disediakan, nama: v } }))}
          {input('kk-sedia-jawatan', 'Jawatan', isi.disediakan.jawatan, (v) => ubah({ disediakan: { ...isi.disediakan, jawatan: v } }))}
          <span className="label-bahagian">DISAHKAN OLEH</span>
          {input('kk-sah-nama', 'Nama (pilihan)', isi.disahkan.nama, (v) => ubah({ disahkan: { ...isi.disahkan, nama: v } }))}
          {input('kk-sah-jawatan', 'Jawatan', isi.disahkan.jawatan, (v) => ubah({ disahkan: { ...isi.disahkan, jawatan: v } }))}
          {seterusnya(8)}
        </Bahagian>

        <section className="kad" aria-label="Tindakan">
          <button type="button" className="butang butang-biru" disabled={pdf.menjana} onClick={janaPdf}>
            {pdf.menjana ? 'Menjana PDF…' : 'Jana PDF'}
          </button>
          {bilSiap < 9 && <p>Bahagian yang belum diisi dicetak sebagai “-”. PDF boleh dijana semula bila-bila masa.</p>}
          <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
        </section>

        <section className="kad" aria-label="Padam kertas kerja">
          {sahPadam ? (
            <>
              <p>Padam kertas kerja ini? Ia tidak boleh dikembalikan.</p>
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
              Padam kertas kerja
            </button>
          )}
        </section>
      </main>
    </>
  );
}
