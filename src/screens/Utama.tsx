import { useMemo } from 'react';
import { Ikon, type NamaIkon } from '../components/Ikon';
import { Kepala } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { jenisPeranti, usePasang } from '../lib/hooks';
import { label, masa12, type Waktu } from '../lib/jadual';
import { hariIni, tarikhMesra, type Kalendar } from '../lib/kalendar';
import { hariDalamMinggu, keadaan, kunciMasa, mulaMinggu, type Rph } from '../lib/rph';
import { hariSekolahSeterusnya, susunHari, useMasaKini } from './HariIni';

const modul: { nama: string; ikon: NamaIkon; warna: 'hijau' | 'biru' | 'emas' | 'merah'; ke?: string }[] = [
  { nama: 'RPH', ikon: 'rph', warna: 'hijau', ke: '#/rph' },
  { nama: 'Jadual', ikon: 'jadual', warna: 'hijau', ke: '#/jadual' },
  { nama: 'Kertas Kerja', ikon: 'kertas', warna: 'biru', ke: '#/kertas' },
  { nama: 'Minit', ikon: 'minit', warna: 'biru', ke: '#/minit' },
  { nama: 'Memo', ikon: 'memo', warna: 'emas', ke: '#/surat' },
  { nama: 'Surat', ikon: 'surat', warna: 'emas', ke: '#/surat' },
  { nama: 'OPR', ikon: 'opr', warna: 'merah', ke: '#/opr' },
  { nama: 'Jobskop', ikon: 'jobskop', warna: 'merah' },
];

function KadPasang() {
  const { bolehPasang, dipasang, pasang } = usePasang();
  if (dipasang) return null;
  const ios = jenisPeranti() === 'ios';
  return (
    <section className="kad kad-pasang" aria-labelledby="tajuk-pasang">
      <h2 id="tajuk-pasang">Pasang Guru360 di telefon</h2>
      {bolehPasang ? (
        <>
          <p>Tambah ke skrin utama supaya Guru360 dibuka seperti aplikasi biasa, walaupun tanpa internet.</p>
          <button type="button" className="butang butang-utama" onClick={pasang}>
            <Ikon nama="pasang" saiz={20} />
            Pasang aplikasi
          </button>
        </>
      ) : ios ? (
        <ol className="langkah">
          <li>Buka halaman ini dalam Safari.</li>
          <li>Tekan butang Kongsi di bar bawah.</li>
          <li>Pilih “Add to Home Screen”, kemudian tekan Add.</li>
        </ol>
      ) : (
        <ol className="langkah">
          <li>Buka menu pelayar (⋮) di penjuru atas.</li>
          <li>Pilih “Pasang aplikasi” atau “Tambah ke skrin utama”.</li>
          <li>Sahkan dengan menekan Pasang.</li>
        </ol>
      )}
    </section>
  );
}

function ucapan(): string {
  const jam = new Date().getHours();
  if (jam < 12) return 'Selamat pagi,';
  if (jam < 14) return 'Selamat tengah hari,';
  if (jam < 19) return 'Selamat petang,';
  return 'Selamat malam,';
}

interface Props {
  profil: Profil | null;
  sedia: boolean;
  kal: Kalendar;
  waktu: Waktu[];
  rph: Rph[];
}

/** Ringkasan minggu persekolahan semasa: RPH siap, draf, belum. */
function useRingkasanMinggu(kal: Kalendar, waktu: Waktu[], rph: Rph[]) {
  const kini = hariIni();
  return useMemo(() => {
    const minggu = hariDalamMinggu(kal, waktu, mulaMinggu(kini, kal.negeri));
    let siap = 0;
    let draf = 0;
    let belum = 0;
    const perluDiisi: { tarikh: string; w: Waktu }[] = [];
    for (const h of minggu) {
      for (const w of h.perluRph) {
        const k = keadaan(rph.find((r) => r.tarikh === h.tarikh && r.mula === w.mula));
        if (k === 'siap') siap++;
        else if (k === 'draf') draf++;
        else belum++;
        if (k !== 'siap' && h.tarikh >= kini) perluDiisi.push({ tarikh: h.tarikh, w });
      }
    }
    return { jumlah: siap + draf + belum, siap, draf, belum, perluDiisi: perluDiisi.slice(0, 3) };
  }, [kal, waktu, rph, kini]);
}

function KadHariIni({ kal, waktu, rph }: Pick<Props, 'kal' | 'waktu' | 'rph'>) {
  const kini = useMasaKini();
  const tarikh = hariIni();
  const baris = useMemo(() => susunHari(kal, waktu, rph, tarikh, kini), [kal, waktu, rph, tarikh, kini]);
  const kelas = baris.filter((b) => b.jenis === 'waktu' && b.w.perlu_rph);
  const fokus = baris.find((b) => b.jenis === 'waktu' && b.fasa === 'sekarang') ?? baris.find((b) => b.jenis === 'waktu' && b.fasa === 'akan' && b.w.perlu_rph);
  const status = kal.status(tarikh);
  const seterusnya = useMemo(() => (kelas.length ? null : hariSekolahSeterusnya(kal, waktu, tarikh)), [kelas.length, kal, waktu, tarikh]);

  let isi;
  if (fokus && fokus.jenis === 'waktu') {
    const k = keadaan(fokus.r);
    isi = (
      <a href={`#/rph/e/${tarikh}/${kunciMasa(fokus.w.mula)}`} className="fokus-kelas">
        <span className="mono masa-dua">
          {masa12(fokus.w.mula)}
          <br />
          {masa12(fokus.w.tamat)}
        </span>
        <span className="nama-waktu">
          <span className="label-sekarang">{fokus.fasa === 'sekarang' ? 'SEKARANG' : 'SETERUSNYA'}</span>
          {label(fokus.w)}
          <span className="butir-kecil">{k === 'kosong' ? 'RPH belum diisi' : k === 'draf' ? 'RPH dalam draf' : 'RPH siap'}</span>
        </span>
        <span className={`pil pil-${k === 'kosong' ? 'belum' : k}`}>{k === 'kosong' ? '● Belum' : k === 'draf' ? '● Draf' : '● Siap'}</span>
      </a>
    );
  } else if (kelas.length) {
    isi = <p>Semua kelas hari ini sudah selesai. Jangan lupa refleksi.</p>;
  } else {
    isi = (
      <p>
        {status.jenis === 'cuti' ? `Cuti: ${status.sebab.map((s) => s.nama).join(' · ')}.` : status.jenis === 'hujung-minggu' ? 'Hujung minggu.' : waktu.length ? 'Tiada kelas hari ini.' : 'Jadual waktu belum diisi.'}
        {seterusnya ? ` Sekolah semula ${tarikhMesra(seterusnya)}.` : ''}
      </p>
    );
  }

  return (
    <section className="kad kad-garis-hijau" aria-labelledby="tajuk-hari-ini">
      <div className="baris-tajuk">
        <h2 id="tajuk-hari-ini">Hari ini</h2>
        <a href="#/hariini" className="pautan-kecil">
          Jadual hari ini
        </a>
      </div>
      {isi}
    </section>
  );
}

export function Utama({ profil, sedia, kal, waktu, rph }: Props) {
  const nama = profil?.nama ?? '';
  const ringkasan = useRingkasanMinggu(kal, waktu, rph);
  return (
    <>
      {nama ? (
        <Kepala
          kecil={ucapan()}
          tajuk={nama}
          sub={profil?.sekolah || undefined}
          kanan={
            <a href="#/profil" className="avatar" aria-label="Buka profil">
              {nama.charAt(0)}
            </a>
          }
        />
      ) : (
        <Kepala kecil="Selamat datang ke" tajuk="Guru360" sub="Kerja harian guru dalam satu aplikasi" />
      )}
      <main className="isi">
        {sedia && !nama && (
          <section className="kad kad-pasang" aria-labelledby="tajuk-lengkap">
            <h2 id="tajuk-lengkap">Lengkapkan profil anda</h2>
            <p>Nama dan sekolah anda akan dicetak pada RPH, surat dan dokumen lain.</p>
            <a href="#/profil" className="butang butang-utama">
              Isi profil
            </a>
          </section>
        )}
        {waktu.length > 0 && <KadHariIni kal={kal} waktu={waktu} rph={rph} />}
        {waktu.length > 0 && ringkasan.jumlah > 0 && (
          <section className="kad" aria-labelledby="tajuk-minggu">
            <div className="baris-tajuk">
              <h2 id="tajuk-minggu">RPH minggu ini</h2>
              <a href="#/rph" className="pautan-kecil">
                Semua RPH
              </a>
            </div>
            <div className="grid-statistik">
              <div className="statistik statistik-hijau">
                <span>SIAP</span>
                <strong className="mono">
                  {ringkasan.siap}/{ringkasan.jumlah}
                </strong>
              </div>
              <div className="statistik statistik-emas">
                <span>DRAF</span>
                <strong className="mono">{ringkasan.draf}</strong>
              </div>
              <div className="statistik statistik-merah">
                <span>BELUM</span>
                <strong className="mono">{ringkasan.belum}</strong>
              </div>
            </div>
            {ringkasan.perluDiisi.length > 0 && (
              <ul className="senarai-ringkas">
                {ringkasan.perluDiisi.map(({ tarikh, w }) => (
                  <li key={tarikh + w.mula}>
                    <a href={`#/rph/e/${tarikh}/${kunciMasa(w.mula)}`}>
                      <span>{label(w)}</span>
                      <span className="mono">{tarikhMesra(tarikh)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {sedia && waktu.length === 0 && (
          <section className="kad kad-pasang" aria-labelledby="tajuk-jadual-kosong">
            <h2 id="tajuk-jadual-kosong">Mula dengan jadual waktu</h2>
            <p>Isi jadual seminggu sekali. Selepas itu, kelas hari ini dan templat RPH disediakan secara automatik.</p>
            <a href="#/jadual" className="butang butang-utama">
              Isi jadual waktu
            </a>
          </section>
        )}
        <KadPasang />
        <section className="bahagian" aria-labelledby="tajuk-modul">
          <h2 id="tajuk-modul" className="label-bahagian">
            MODUL
          </h2>
          <ul className="grid-modul">
            {modul.map((m) =>
              m.ke ? (
                <li key={m.nama}>
                  <a href={m.ke} className="jubin jubin-aktif">
                    <span className={`jubin-ikon warna-${m.warna}`}>
                      <Ikon nama={m.ikon} />
                    </span>
                    <span className="jubin-nama">{m.nama}</span>
                    <span className="jubin-status">{m.nama === 'Jadual' ? (waktu.length ? `${waktu.length} waktu` : 'Isi sekarang') : m.nama === 'RPH' && ringkasan.jumlah ? `${ringkasan.siap}/${ringkasan.jumlah} siap` : 'Buka'}</span>
                  </a>
                </li>
              ) : (
                <li key={m.nama} className="jubin" aria-label={`${m.nama}, akan datang`}>
                  <span className={`jubin-ikon warna-${m.warna}`}>
                    <Ikon nama={m.ikon} />
                  </span>
                  <span className="jubin-nama">{m.nama}</span>
                  <span className="jubin-status">Akan datang</span>
                </li>
              ),
            )}
          </ul>
          <p className="nota">Modul dibuka satu demi satu. Kemas kini sampai sendiri apabila aplikasi dibuka semula.</p>
        </section>
      </main>
    </>
  );
}
