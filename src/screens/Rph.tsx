import { useEffect, useMemo, useRef, useState } from 'react';
import { HasilPdf, usePdf } from '../components/Pdf';
import { KepalaKembali } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { HARI_PENDEK, NAMA_HARI, julat, label, type Waktu } from '../lib/jadual';
import { dariTarikh, hariIni, tambahHari, tarikhMesra, tarikhPenuh, type Kalendar } from '../lib/kalendar';
import type { KepalaSurat, RphPdf } from '../lib/pdf';
import { adaIsi, dariKunci, hariDalamMinggu, keadaan, kunciMasa, mulaMinggu, rphKosong, waktuPada, type Keadaan, type Rph } from '../lib/rph';
import { TEMPLAT_KOSONG, type Logo, type Templat } from '../lib/templat';

interface Asas {
  uid: string;
  profil: Profil | null;
  kal: Kalendar;
  waktu: Waktu[];
  rph: Rph[];
  sedia: boolean;
  tertunda: boolean;
  ralat: string | null;
  simpanRph: (r: Rph[]) => void;
  templat: Templat | null;
  logo: Logo;
}

const TEKS_KEADAAN: Record<Keadaan, string> = { kosong: '○ Kosong', draf: '● Draf', siap: '● Siap' };
const tarikhValid = (t: string | undefined): t is string => !!t && /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(dariTarikh(t).getTime());

function kepalaSurat(p: Asas): KepalaSurat {
  const t = p.templat ?? TEMPLAT_KOSONG;
  return {
    nama_sekolah: t.nama_sekolah || p.profil?.sekolah || '',
    alamat: t.alamat,
    telefon: t.telefon,
    emel: t.emel,
    kod_sekolah: t.kod_sekolah,
    logoKiri: p.logo.kiri,
    logoKanan: p.logo.kanan,
  };
}

const untukPdf = (r: Rph): RphPdf => ({
  tarikh: tarikhPenuh(r.tarikh).toUpperCase(),
  masa: julat(r),
  kelas: r.kelas,
  subjek: r.subjek,
  objektif: r.objektif,
  aktiviti: r.aktiviti,
  pentaksiran: r.pentaksiran,
  refleksi: r.refleksi,
});

/** RPH bagi satu tarikh: rekod sedia ada, atau rekod kosong bagi waktu jadual yang belum ada RPH. */
function rphHari(p: Asas, tarikh: string): Rph[] {
  const ada = p.rph.filter((r) => r.tarikh === tarikh);
  const perlu = waktuPada(p.kal, p.waktu, tarikh).filter((w) => w.perlu_rph);
  const kosong = perlu.filter((w) => !ada.some((r) => r.mula === w.mula)).map((w) => rphKosong(p.uid, tarikh, w));
  return [...ada, ...kosong].sort((a, b) => a.mula.localeCompare(b.mula));
}

function teksStatusSimpan(p: Pick<Asas, 'ralat' | 'tertunda'>) {
  return p.ralat ? 'Gagal dihantar' : p.tertunda ? 'Menunggu internet' : 'Disimpan';
}

// ---------------------------------------------------------------- Minggu

export function RphMinggu(p: Asas & { tarikh?: string }) {
  const negeri = p.profil?.negeri ?? null;
  const kini = hariIni();
  const mulaAsal = useMemo(() => {
    if (tarikhValid(p.tarikh)) return mulaMinggu(p.tarikh, negeri);
    // Jika minggu ini sudah tiada hari persekolahan berbaki, buka minggu depan.
    const m = mulaMinggu(kini, negeri);
    const baki = hariDalamMinggu(p.kal, p.waktu, m).some((h) => h.tarikh >= kini && p.kal.hariSekolah(h.tarikh));
    return baki ? m : tambahHari(m, 7);
  }, [p.tarikh, negeri, kini, p.kal, p.waktu]);

  const minggu = useMemo(() => hariDalamMinggu(p.kal, p.waktu, mulaAsal), [p.kal, p.waktu, mulaAsal]);
  // Papar hari persekolahan, serta hari biasa bersekolah yang jatuh cuti (supaya sebab cuti kelihatan).
  const tab = useMemo(() => {
    const rehat = minggu.filter((h) => p.kal.status(h.tarikh).jenis === 'hujung-minggu').map((h) => h.tarikh);
    return minggu.filter((h) => !rehat.includes(h.tarikh));
  }, [minggu, p.kal]);

  const pilihAsal = tarikhValid(p.tarikh) && tab.some((h) => h.tarikh === p.tarikh) ? p.tarikh : (tab.find((h) => h.tarikh >= kini) ?? tab[0])?.tarikh;
  const pilih = pilihAsal ?? mulaAsal;
  const hari = minggu.find((h) => h.tarikh === pilih) ?? minggu[0];
  const status = p.kal.status(pilih);
  const pdf = usePdf();
  const [mesej, setMesej] = useState<string | null>(null);

  const rekod = (tarikh: string, mula: string) => p.rph.find((r) => r.tarikh === tarikh && r.mula === mula);
  const yatim = p.rph.filter((r) => r.tarikh === pilih && !hari.waktu.some((w) => w.mula === r.mula));
  const belumAda = minggu.flatMap((h) => h.perluRph.filter((w) => !rekod(h.tarikh, w.mula)).map((w) => rphKosong(p.uid, h.tarikh, w)));
  const jumlahPerlu = minggu.reduce((n, h) => n + h.perluRph.length, 0);
  const akhir = tab.at(-1)?.tarikh ?? tambahHari(mulaAsal, 6);
  const julatMinggu = tarikhMesra(tab[0]?.tarikh ?? mulaAsal, akhir);

  const jana = () => {
    if (!belumAda.length) return;
    p.simpanRph(belumAda);
    setMesej(`${belumAda.length} templat RPH dijana untuk minggu ini.`);
  };

  const janaPdf = (skop: 'hari' | 'minggu') => {
    const senarai = (skop === 'hari' ? [hari] : minggu)
      .map((h) => ({ tajuk: tarikhPenuh(h.tarikh).toUpperCase(), rph: rphHari(p, h.tarikh).map(untukPdf) }))
      .filter((h) => h.rph.length);
    const tajuk = skop === 'hari' ? tarikhPenuh(pilih) : julatMinggu;
    void pdf.jana(
      async () => (await import('../lib/pdf')).pdfRph(kepalaSurat(p), { nama: p.profil?.nama ?? '' }, tajuk, senarai),
      skop === 'hari' ? `rph-${pilih}.pdf` : `rph-minggu-${mulaAsal}.pdf`,
      `RPH ${tajuk}`,
    );
  };

  const adaRphHari = rphHari(p, pilih).length > 0;

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href="#/" className="butang-kembali" aria-label="Kembali ke Utama">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>RPH</h1>
          <span className="kepala-kecil" aria-live="polite">
            {julatMinggu}
          </span>
        </div>
        <a href={`#/rph/m/${tambahHari(mulaAsal, -7)}`} className="butang-kembali" aria-label="Minggu sebelum">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <a href={`#/rph/m/${tambahHari(mulaAsal, 7)}`} className="butang-kembali" aria-label="Minggu seterusnya">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </a>
      </header>
      <main className="isi">
        <a href="#/jadual" className="kad kad-pautan kad-pasang">
          <span className="kad-pautan-teks">
            <strong>Jadual waktu saya</strong>
            <span>
              {p.waktu.length ? `${p.waktu.filter((w) => w.perlu_rph).length} waktu perlu RPH seminggu` : 'Belum diisi. RPH dijana daripada jadual waktu.'}
            </span>
          </span>
          <span className="pautan-kecil">{p.waktu.length ? 'Edit' : 'Isi'}</span>
        </a>

        <div className="tab-hari" role="group" aria-label="Pilih hari" style={{ gridTemplateColumns: `repeat(${Math.max(tab.length, 1)}, minmax(0, 1fr))` }}>
          {tab.map((h) => {
            const d = dariTarikh(h.tarikh);
            return (
              <a key={h.tarikh} href={`#/rph/m/${h.tarikh}`} role="button" aria-pressed={h.tarikh === pilih} aria-label={`${tarikhPenuh(h.tarikh)}, ${h.perluRph.length} RPH`}>
                {HARI_PENDEK[d.getDay()]}
                <span className="mono">{p.kal.hariSekolah(h.tarikh) ? h.perluRph.length : '–'}</span>
              </a>
            );
          })}
        </div>

        <section className="kad kad-senarai" aria-labelledby="tajuk-hari">
          <div className="kad-kepala">
            <h2 id="tajuk-hari">{tarikhPenuh(pilih)}</h2>
            {p.sedia && (p.tertunda || p.ralat) && (
              <span className={`lencana ${p.ralat ? 'lencana-gagal' : 'lencana-menyemak'}`} role="status">
                {teksStatusSimpan(p)}
              </span>
            )}
          </div>
          {status.jenis !== 'sekolah' ? (
            <p className="senarai-kosong">
              {status.jenis === 'cuti' ? `Cuti: ${status.sebab.map((s) => s.nama).join(' · ')}.` : status.jenis === 'luar-sesi' ? 'Di luar sesi persekolahan.' : 'Hujung minggu.'} Tiada RPH pada hari ini.
            </p>
          ) : hari.waktu.length === 0 && yatim.length === 0 ? (
            <p className="senarai-kosong">
              Tiada waktu dalam jadual pada hari {NAMA_HARI[p.kal.ikutHari(pilih)]}.
              {status.ganti ? ` (Hari ganti: ${status.ganti.nama})` : ''}
            </p>
          ) : (
            <ul>
              {[...hari.waktu.map((w) => ({ w, r: rekod(pilih, w.mula) })), ...yatim.map((r) => ({ w: null, r }))]
                .sort((a, b) => (a.w?.mula ?? a.r!.mula).localeCompare(b.w?.mula ?? b.r!.mula))
                .map(({ w, r }) => {
                  const butir = r ?? w!;
                  if (w && !w.perlu_rph && !r)
                    return (
                      <li key={w.id} className="jalur-waktu mono">
                        {julat(w)} · {label(w)}
                      </li>
                    );
                  const k = keadaan(r);
                  return (
                    <li key={r?.id ?? w!.id}>
                      <a href={`#/rph/e/${pilih}/${kunciMasa(butir.mula)}`} className="baris-waktu">
                        <span className="mono masa">{julat(butir)}</span>
                        <span className="nama-waktu">
                          {label(butir)}
                          <span className="butir-kecil">{k === 'kosong' ? 'Belum diisi' : r?.objektif.trim() ? 'Objektif diisi' : 'Sebahagian diisi'}</span>
                        </span>
                        <span className={`pil pil-${k}`}>{TEKS_KEADAAN[k]}</span>
                      </a>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        <section className="kad" aria-label="Tindakan">
          <div className="dua-butang">
            <button type="button" className="butang butang-garis" disabled={pdf.menjana || !adaRphHari} onClick={() => janaPdf('hari')}>
              PDF hari ini
            </button>
            <button type="button" className="butang butang-garis" disabled={pdf.menjana || jumlahPerlu === 0} onClick={() => janaPdf('minggu')}>
              PDF minggu ini
            </button>
          </div>
          {belumAda.length > 0 && (
            <button type="button" className="butang butang-utama" onClick={jana}>
              Jana {belumAda.length} templat
            </button>
          )}
          <div aria-live="polite">
            {pdf.menjana && <p className="mesej mesej-tunggu">Menjana PDF…</p>}
            {mesej && <p className="mesej mesej-ok">{mesej}</p>}
          </div>
          <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
        </section>
        <p className="nota">Hari, masa, kelas dan subjek diisi automatik dari jadual waktu. Hari cuti dilangkau.</p>
      </main>
    </>
  );
}

// ---------------------------------------------------------------- Satu RPH

type Isi = Pick<Rph, 'objektif' | 'aktiviti' | 'pentaksiran' | 'refleksi'>;
const MEDAN: { id: keyof Isi; label: string; baris: number; maks: number; bantuan?: string }[] = [
  { id: 'objektif', label: 'Objektif', baris: 3, maks: 4000 },
  { id: 'aktiviti', label: 'Aktiviti', baris: 5, maks: 6000 },
  { id: 'pentaksiran', label: 'Pentaksiran', baris: 3, maks: 4000 },
  { id: 'refleksi', label: 'Refleksi', baris: 3, maks: 4000, bantuan: 'Diisi selepas kelas. Contoh: 20/24 murid mencapai objektif.' },
];
const kemasIsi = (s: string) => s.replace(/[ \t]+\n/g, '\n').trim().toUpperCase();

export function RphEdit(p: Asas & { tarikh?: string; kunci?: string }) {
  const tarikh = tarikhValid(p.tarikh) ? p.tarikh : null;
  const mula = p.kunci && /^\d{4}$/.test(p.kunci) ? dariKunci(p.kunci) : null;
  const sediaAda = tarikh && mula ? p.rph.find((r) => r.tarikh === tarikh && r.mula === mula) : undefined;
  const slot = tarikh && mula ? waktuPada(p.kal, p.waktu, tarikh).find((w) => w.mula === mula) : undefined;
  const asas: Rph | null = sediaAda ?? (tarikh && slot ? rphKosong(p.uid, tarikh, slot) : null);

  const [isi, setIsi] = useState<Isi>(() => ({ objektif: asas?.objektif ?? '', aktiviti: asas?.aktiviti ?? '', pentaksiran: asas?.pentaksiran ?? '', refleksi: asas?.refleksi ?? '' }));
  const [kotor, setKotor] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null);
  const [salinDari, setSalinDari] = useState('');
  const [sahSalin, setSahSalin] = useState(false);
  const pdf = usePdf();

  // Muat isi dari pelayan apabila ia sampai, selagi guru belum menaip.
  const idAsas = asas?.id;
  useEffect(() => {
    if (!kotor && sediaAda) setIsi({ objektif: sediaAda.objektif, aktiviti: sediaAda.aktiviti, pentaksiran: sediaAda.pentaksiran, refleksi: sediaAda.refleksi });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAsas, sediaAda?.objektif, sediaAda?.aktiviti, sediaAda?.pentaksiran, sediaAda?.refleksi]);

  // Simpanan automatik: sejurus selepas guru berhenti menaip, dan apabila skrin ditinggalkan.
  const terkini = useRef({ isi, kotor, asas, status: sediaAda?.status ?? 'draf' });
  terkini.current = { isi, kotor, asas, status: sediaAda?.status ?? 'draf' };
  const simpanRph = p.simpanRph;
  const simpanSekarang = useRef(() => {});
  simpanSekarang.current = () => {
    const t = terkini.current;
    if (!t.kotor || !t.asas) return;
    simpanRph([{ ...t.asas, objektif: kemasIsi(t.isi.objektif), aktiviti: kemasIsi(t.isi.aktiviti), pentaksiran: kemasIsi(t.isi.pentaksiran), refleksi: kemasIsi(t.isi.refleksi), status: t.status }]);
    setKotor(false);
  };
  useEffect(() => {
    if (!kotor) return;
    const pemasa = window.setTimeout(() => simpanSekarang.current(), 800);
    return () => window.clearTimeout(pemasa);
  }, [isi, kotor]);
  useEffect(() => {
    const simpan = () => simpanSekarang.current();
    window.addEventListener('pagehide', simpan);
    document.addEventListener('visibilitychange', simpan);
    return () => {
      window.removeEventListener('pagehide', simpan);
      document.removeEventListener('visibilitychange', simpan);
      simpan();
    };
  }, []);

  const sumber = useMemo(
    () =>
      asas
        ? p.rph
            .filter((r) => r.id !== asas.id && r.subjek === asas.subjek && (r.objektif.trim() || r.aktiviti.trim()))
            .sort((a, b) => b.tarikh.localeCompare(a.tarikh) || b.mula.localeCompare(a.mula))
            .slice(0, 12)
        : [],
    [p.rph, asas?.id, asas?.subjek], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!asas || !tarikh) {
    return (
      <>
        <KepalaKembali ke="#/rph" labelKembali="Kembali ke RPH" tajuk="RPH" sub="Rancangan Pengajaran Harian" />
        <main className="isi">
          <section className="kad kosong">
            <h2>{p.sedia ? 'RPH tidak dijumpai' : 'Memuat RPH…'}</h2>
            {p.sedia && <p>Waktu ini tiada dalam jadual pada tarikh tersebut, atau hari itu cuti.</p>}
            <a href="#/rph" className="butang butang-garis">
              Kembali ke senarai RPH
            </a>
          </section>
        </main>
      </>
    );
  }

  const status = sediaAda?.status ?? 'draf';
  const tukar = (medan: keyof Isi, nilai: string) => {
    setMesej(null);
    setSahSalin(false);
    setKotor(true);
    setIsi((i) => ({ ...i, [medan]: nilai }));
  };

  const tetapStatus = (baharu: 'draf' | 'siap') => {
    const bersih: Isi = { objektif: kemasIsi(isi.objektif), aktiviti: kemasIsi(isi.aktiviti), pentaksiran: kemasIsi(isi.pentaksiran), refleksi: kemasIsi(isi.refleksi) };
    if (baharu === 'siap' && (!bersih.objektif || !bersih.aktiviti)) return setMesej({ jenis: 'ralat', teks: 'Isi objektif dan aktiviti dahulu sebelum menanda siap.' });
    p.simpanRph([{ ...asas, ...bersih, status: baharu }]);
    setKotor(false);
    setMesej({ jenis: 'ok', teks: baharu === 'siap' ? 'RPH ditanda siap. Refleksi masih boleh diisi selepas kelas.' : 'RPH dikembalikan kepada draf.' });
  };

  const salin = () => {
    const s = sumber.find((r) => r.id === salinDari);
    if (!s) return;
    if (adaIsi({ ...asas, ...isi }) && !sahSalin) return setSahSalin(true);
    setIsi((i) => ({ ...i, objektif: s.objektif, aktiviti: s.aktiviti, pentaksiran: s.pentaksiran }));
    setKotor(true);
    setSahSalin(false);
    setSalinDari('');
    setMesej({ jenis: 'ok', teks: `Disalin dari ${label(s)}, ${tarikhMesra(s.tarikh)}. Refleksi tidak disalin.` });
  };

  const janaPdf = () => {
    simpanSekarang.current();
    const r: Rph = { ...asas, objektif: kemasIsi(isi.objektif), aktiviti: kemasIsi(isi.aktiviti), pentaksiran: kemasIsi(isi.pentaksiran), refleksi: kemasIsi(isi.refleksi) };
    const tajuk = `${label(r)}, ${tarikhMesra(r.tarikh)}`;
    void pdf.jana(
      async () => (await import('../lib/pdf')).pdfRph(kepalaSurat(p), { nama: p.profil?.nama ?? '' }, tarikhPenuh(r.tarikh), [{ tajuk: '', rph: [untukPdf(r)] }]),
      `rph-${r.tarikh}-${kunciMasa(r.mula)}.pdf`,
      `RPH ${tajuk}`,
    );
  };

  const teksSimpan = kotor ? 'Menyimpan…' : !sediaAda ? 'Belum disimpan' : teksStatusSimpan(p);

  return (
    <>
      <header className="kepala kepala-kembali">
        <a href={`#/rph/m/${tarikh}`} className="butang-kembali" aria-label="Kembali ke senarai RPH">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="kepala-teks">
          <h1>RPH</h1>
          <span className="kepala-kecil">Rancangan Pengajaran Harian</span>
        </div>
        <span className="status-simpan" role="status">
          <i className={kotor || p.tertunda ? 'titik titik-tunggu' : p.ralat ? 'titik titik-gagal' : 'titik'} />
          {teksSimpan}
        </span>
      </header>
      <main className="isi">
        <section className="kad kad-auto" aria-label="Diisi dari jadual waktu">
          <span className="label-bahagian">DIISI DARI JADUAL WAKTU</span>
          <dl className="grid-auto">
            <div>
              <dt>Hari</dt>
              <dd>{tarikhPenuh(asas.tarikh)}</dd>
            </div>
            <div>
              <dt>Masa</dt>
              <dd className="mono">{julat(asas)}</dd>
            </div>
            <div>
              <dt>Kelas</dt>
              <dd>{asas.kelas || '–'}</dd>
            </div>
            <div>
              <dt>Subjek</dt>
              <dd>{asas.subjek}</dd>
            </div>
          </dl>
          <span className={`pil pil-${keadaan(sediaAda ? { ...sediaAda, ...isi } : { ...asas, ...isi })} pil-sudut`}>{TEKS_KEADAAN[keadaan(sediaAda ? { ...sediaAda, ...isi } : { ...asas, ...isi })]}</span>
        </section>

        <form className="kad borang" onSubmit={(e) => e.preventDefault()}>
          {MEDAN.map((m) => (
            <div className="medan" key={m.id}>
              <label htmlFor={`rph-${m.id}`}>{m.label}</label>
              <textarea
                id={`rph-${m.id}`}
                className="besar"
                rows={m.baris}
                value={isi[m.id]}
                maxLength={m.maks}
                autoCapitalize="characters"
                onChange={(e) => tukar(m.id, e.target.value)}
                aria-describedby={m.bantuan ? `rph-${m.id}-bantuan` : undefined}
              />
              {m.bantuan && (
                <span id={`rph-${m.id}-bantuan`} className="bantuan">
                  {m.bantuan}
                </span>
              )}
            </div>
          ))}
          <div aria-live="polite">
            {mesej && (
              <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : undefined}>
                {mesej.teks}
              </p>
            )}
          </div>
          <div className="dua-butang">
            {status === 'siap' ? (
              <button type="button" className="butang butang-garis" onClick={() => tetapStatus('draf')}>
                Kembali ke draf
              </button>
            ) : (
              <button type="button" className="butang butang-utama" onClick={() => tetapStatus('siap')}>
                Tanda siap
              </button>
            )}
            <button type="button" className="butang butang-garis" disabled={pdf.menjana} onClick={janaPdf}>
              {pdf.menjana ? 'Menjana…' : 'Jana PDF'}
            </button>
          </div>
          <HasilPdf pdf={pdf.pdf} ralat={pdf.ralat} />
        </form>

        {sumber.length > 0 && (
          <section className="kad" aria-labelledby="tajuk-salin-rph">
            <h2 id="tajuk-salin-rph">Salin dari RPH lain</h2>
            <div className="medan">
              <label htmlFor="salin-rph">RPH {asas.subjek} yang lepas</label>
              <select
                id="salin-rph"
                value={salinDari}
                onChange={(e) => {
                  setSalinDari(e.target.value);
                  setSahSalin(false);
                }}
              >
                <option value="">Pilih RPH</option>
                {sumber.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.kelas || r.subjek} · {tarikhMesra(r.tarikh)} · {(r.objektif || r.aktiviti).slice(0, 40)}
                  </option>
                ))}
              </select>
            </div>
            {sahSalin && <p className="mesej mesej-tunggu">Objektif, aktiviti dan pentaksiran sedia ada akan diganti. Tekan sekali lagi untuk sahkan.</p>}
            <button type="button" className={`butang ${sahSalin ? 'butang-bahaya' : 'butang-garis'}`} disabled={!salinDari} onClick={salin}>
              {sahSalin ? 'Ya, ganti isi' : 'Salin objektif, aktiviti dan pentaksiran'}
            </button>
          </section>
        )}
      </main>
    </>
  );
}
