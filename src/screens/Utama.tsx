import { Ikon, type NamaIkon } from '../components/Ikon';
import { Kepala } from '../components/Rangka';
import { jenisPeranti, usePasang } from '../lib/hooks';

const modul: { nama: string; ikon: NamaIkon; warna: 'hijau' | 'biru' | 'emas' | 'merah' }[] = [
  { nama: 'RPH', ikon: 'rph', warna: 'hijau' },
  { nama: 'Jadual', ikon: 'jadual', warna: 'hijau' },
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

export function Utama() {
  return (
    <>
      <Kepala kecil="Selamat datang ke" tajuk="Guru360" sub="Kerja harian guru dalam satu aplikasi" />
      <main className="isi">
        <KadPasang />
        <section className="bahagian" aria-labelledby="tajuk-modul">
          <h2 id="tajuk-modul" className="label-bahagian">
            MODUL
          </h2>
          <ul className="grid-modul">
            {modul.map((m) => (
              <li key={m.nama} className="jubin" aria-label={`${m.nama}, akan datang`}>
                <span className={`jubin-ikon warna-${m.warna}`}>
                  <Ikon nama={m.ikon} />
                </span>
                <span className="jubin-nama">{m.nama}</span>
                <span className="jubin-status">Akan datang</span>
              </li>
            ))}
          </ul>
          <p className="nota">Modul dibuka satu demi satu. Kemas kini sampai sendiri apabila aplikasi dibuka semula.</p>
        </section>
      </main>
    </>
  );
}
