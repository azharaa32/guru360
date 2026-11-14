import { Ikon, type NamaIkon } from '../components/Ikon';
import { Kepala } from '../components/Rangka';
import type { Profil } from '../lib/akaun';
import { jenisPeranti, usePasang } from '../lib/hooks';

const modul: { nama: string; ikon: NamaIkon; warna: 'hijau' | 'biru' | 'emas' | 'merah'; ke?: string }[] = [
  { nama: 'RPH', ikon: 'rph', warna: 'hijau', ke: '#/rph' },
  { nama: 'Jadual', ikon: 'jadual', warna: 'hijau', ke: '#/jadual' },
  { nama: 'Kertas Kerja', ikon: 'kertas', warna: 'biru' },
  { nama: 'Minit', ikon: 'minit', warna: 'biru' },
  { nama: 'Memo', ikon: 'memo', warna: 'emas' },
  { nama: 'Surat', ikon: 'surat', warna: 'emas' },
  { nama: 'OPR', ikon: 'opr', warna: 'merah' },
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

export function Utama({ profil, sedia, bilWaktu }: { profil: Profil | null; sedia: boolean; bilWaktu: number }) {
  const nama = profil?.nama ?? '';
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
                    <span className="jubin-status">{m.nama === 'Jadual' ? (bilWaktu ? `${bilWaktu} waktu` : 'Isi sekarang') : 'Buka'}</span>
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
