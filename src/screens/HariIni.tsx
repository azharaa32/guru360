import { useEffect, useMemo, useState } from 'react';
import { KepalaKembali } from '../components/Rangka';
import { julat, label, masa12, minit, type Waktu } from '../lib/jadual';
import { cutiAkanDatang, hariIni, tambahHari, tarikhMesra, tarikhPenuh, type CutiSendiri, type Kalendar } from '../lib/kalendar';
import { keadaan, kunciMasa, waktuPada, type Rph } from '../lib/rph';

/** Masa sekarang, dikemas kini setiap 30 saat supaya "Sekarang" bergerak sendiri. */
export function useMasaKini() {
  const [kini, setKini] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setKini(new Date()), 30000);
    const nampak = () => document.visibilityState === 'visible' && setKini(new Date());
    document.addEventListener('visibilitychange', nampak);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', nampak);
    };
  }, []);
  return kini;
}

export type Baris =
  | { jenis: 'waktu'; w: Waktu; r: Rph | undefined; fasa: 'lepas' | 'sekarang' | 'akan' }
  | { jenis: 'lapang'; mula: string; tamat: string; fasa: 'lepas' | 'sekarang' | 'akan' };

const LAPANG_MIN = 15; // minit

/** Susunan hari: waktu jadual dan ruang lapang di antaranya, ditanda lepas / sekarang / akan datang. */
export function susunHari(kal: Kalendar, waktu: Waktu[], rph: Rph[], tarikh: string, kini: Date): Baris[] {
  const senarai = waktuPada(kal, waktu, tarikh);
  const hariIniJuga = tarikh === hariIni();
  const m = kini.getHours() * 60 + kini.getMinutes();
  const fasa = (mula: string, tamat: string) => (!hariIniJuga ? (tarikh < hariIni() ? 'lepas' : 'akan') : m >= minit(tamat) ? 'lepas' : m >= minit(mula) ? 'sekarang' : 'akan');
  const hasil: Baris[] = [];
  senarai.forEach((w, i) => {
    const sebelum = senarai[i - 1];
    if (sebelum && minit(w.mula) - minit(sebelum.tamat) >= LAPANG_MIN) hasil.push({ jenis: 'lapang', mula: sebelum.tamat, tamat: w.mula, fasa: fasa(sebelum.tamat, w.mula) });
    hasil.push({ jenis: 'waktu', w, r: rph.find((r) => r.tarikh === tarikh && r.mula === w.mula), fasa: fasa(w.mula, w.tamat) });
  });
  return hasil;
}

export function hariSekolahSeterusnya(kal: Kalendar, waktu: Waktu[], dari: string): string | null {
  for (let i = 1; i <= 60; i++) {
    const t = tambahHari(dari, i);
    if (waktuPada(kal, waktu, t).length) return t;
  }
  return null;
}

const TEKS = { kosong: '● Belum', draf: '● Draf', siap: '● Siap' } as const;

interface Props {
  kal: Kalendar;
  waktu: Waktu[];
  rph: Rph[];
  cuti: CutiSendiri[];
  sedia: boolean;
}

export function HariIni({ kal, waktu, rph, cuti, sedia }: Props) {
  const kini = useMasaKini();
  const tarikh = hariIni();
  const status = kal.status(tarikh);
  const baris = useMemo(() => susunHari(kal, waktu, rph, tarikh, kini), [kal, waktu, rph, tarikh, kini]);
  const kelas = baris.filter((b): b is Extract<Baris, { jenis: 'waktu' }> => b.jenis === 'waktu');
  const perlu = kelas.filter((b) => b.w.perlu_rph);
  const siap = perlu.filter((b) => keadaan(b.r) === 'siap').length;
  const lapang = baris.filter((b) => b.jenis === 'lapang').length;
  const seterusnya = useMemo(() => (kelas.length ? null : hariSekolahSeterusnya(kal, waktu, tarikh)), [kelas.length, kal, waktu, tarikh]);
  const cutiDekat = useMemo(() => cutiAkanDatang(kal.negeri, cuti, tambahHari(tarikh, 1), 1)[0], [kal.negeri, cuti, tarikh]);
  const bilHari = cutiDekat ? Math.round((new Date(`${cutiDekat.mula}T00:00`).getTime() - new Date(`${tarikh}T00:00`).getTime()) / 86400000) : 0;

  const pautan = (w: Waktu, medan?: string) => `#/rph/e/${tarikh}/${kunciMasa(w.mula)}${medan ? `/${medan}` : ''}`;

  return (
    <>
      <KepalaKembali ke="#/" labelKembali="Kembali ke Utama" tajuk="Jadual Hari Ini" sub={tarikhPenuh(tarikh)} />
      <main className="isi">
        {kelas.length > 0 && (
          <div className="grid-statistik">
            <div className="statistik statistik-hijau">
              <span>KELAS</span>
              <strong className="mono">{kelas.length}</strong>
            </div>
            <div className="statistik statistik-emas">
              <span>RPH SIAP</span>
              <strong className="mono">
                {siap}/{perlu.length}
              </strong>
            </div>
            <div className="statistik statistik-biru">
              <span>LAPANG</span>
              <strong className="mono">{lapang}</strong>
            </div>
          </div>
        )}

        {!sedia && waktu.length === 0 ? (
          <section className="kad kosong">
            <p>Memuat jadual…</p>
          </section>
        ) : waktu.length === 0 ? (
          <section className="kad kosong">
            <h2>Jadual waktu belum diisi</h2>
            <p>Isi jadual seminggu sekali, kemudian kelas hari ini dipaparkan di sini.</p>
            <a href="#/jadual" className="butang butang-utama">
              Isi jadual waktu
            </a>
          </section>
        ) : kelas.length === 0 ? (
          <section className="kad kosong">
            <h2>{status.jenis === 'cuti' ? 'Hari ini cuti' : status.jenis === 'hujung-minggu' ? 'Hujung minggu' : status.jenis === 'luar-sesi' ? 'Di luar sesi persekolahan' : 'Tiada kelas hari ini'}</h2>
            {status.jenis === 'cuti' && <p>{status.sebab.map((s) => s.nama).join(' · ')}</p>}
            {seterusnya && (
              <>
                <p>Hari persekolahan seterusnya: {tarikhPenuh(seterusnya)}.</p>
                <a href={`#/rph/m/${seterusnya}`} className="butang butang-garis">
                  Lihat RPH hari itu
                </a>
              </>
            )}
          </section>
        ) : (
          <section className="kad kad-senarai" aria-label="Kelas hari ini">
            <ul>
              {baris.map((b) => {
                if (b.jenis === 'lapang')
                  return (
                    <li key={`l${b.mula}`} className={`baris-hari baris-lapang${b.fasa === 'lepas' ? ' pudar' : ''}`}>
                      <span className="mono masa-dua">
                        {masa12(b.mula)}
                        <br />
                        {masa12(b.tamat)}
                      </span>
                      <span className="nama-waktu pudar">
                        Waktu lapang
                        <span className="butir-kecil">{minit(b.tamat) - minit(b.mula)} minit tiada kelas</span>
                      </span>
                      {b.fasa === 'sekarang' && <span className="pil pil-biru">Sekarang</span>}
                    </li>
                  );
                const { w, r, fasa } = b;
                if (!w.perlu_rph)
                  return (
                    <li key={w.id} className={`jalur-waktu mono${fasa === 'sekarang' ? ' jalur-sekarang' : ''}`}>
                      {julat(w)} · {label(w)}
                      {fasa === 'sekarang' ? ' · sekarang' : ''}
                    </li>
                  );
                const k = keadaan(r);
                if (fasa === 'sekarang')
                  return (
                    <li key={w.id} className="baris-sekarang">
                      <div className="baris-hari">
                        <span className="mono masa-dua">
                          {masa12(w.mula)}
                          <br />
                          {masa12(w.tamat)}
                        </span>
                        <span className="nama-waktu">
                          <span className="label-sekarang">SEKARANG</span>
                          {label(w)}
                          <span className="butir-kecil">{r?.objektif.trim() ? r.objektif.slice(0, 80) : 'RPH belum diisi'}</span>
                        </span>
                        <span className={`pil pil-${k}`}>{TEKS[k]}</span>
                      </div>
                      <div className="dua-butang">
                        <a href={pautan(w)} className="butang butang-utama">
                          Buka RPH
                        </a>
                        <a href={pautan(w, 'refleksi')} className="butang butang-garis">
                          Tulis refleksi
                        </a>
                      </div>
                    </li>
                  );
                const ringkas =
                  fasa === 'lepas'
                    ? r?.refleksi.trim()
                      ? 'Selesai · refleksi diisi'
                      : 'Selesai · refleksi belum diisi'
                    : k === 'kosong'
                      ? 'RPH belum diisi'
                      : k === 'draf'
                        ? 'RPH dalam draf'
                        : 'RPH siap';
                return (
                  <li key={w.id}>
                    <a href={pautan(w, fasa === 'lepas' && !r?.refleksi.trim() ? 'refleksi' : undefined)} className={`baris-waktu${fasa === 'lepas' ? ' baris-lepas' : ''}`}>
                      <span className="mono masa-dua">
                        {masa12(w.mula)}
                        <br />
                        {masa12(w.tamat)}
                      </span>
                      <span className="nama-waktu">
                        {label(w)}
                        <span className="butir-kecil">{ringkas}</span>
                      </span>
                      <span className={`pil pil-${k === 'kosong' ? 'belum' : k}`}>{TEKS[k]}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {cutiDekat && (
          <a href="#/takwim" className="kad kad-pautan">
            <span className="kad-pautan-teks">
              <span className="label-bahagian">CUTI TERDEKAT</span>
              <strong>{cutiDekat.nama}</strong>
              <span>{tarikhMesra(cutiDekat.mula, cutiDekat.tamat)}</span>
            </span>
            <span className="pautan-kecil">{bilHari === 1 ? 'Esok' : `${bilHari} hari lagi`}</span>
          </a>
        )}
      </main>
    </>
  );
}
