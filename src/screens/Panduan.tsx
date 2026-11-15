import { KepalaKembali } from '../components/Rangka';

const MULA: { tajuk: string; isi: string; ke: string; label: string }[] = [
  { tajuk: 'Isi profil', isi: 'Nama, sekolah dan negeri. Negeri menentukan hari minggu persekolahan dan cuti.', ke: '#/profil', label: 'Buka Profil' },
  { tajuk: 'Isi templat sekolah', isi: 'Kepala surat dan logo. Dipakai dalam semua PDF.', ke: '#/templat', label: 'Buka Templat' },
  { tajuk: 'Masukkan jadual waktu', isi: 'Sekali sahaja. RPH dan skrin Hari Ini dibina daripada jadual ini.', ke: '#/jadual', label: 'Buka Jadual' },
];

const MODUL: { nama: string; isi: string; ke: string }[] = [
  { nama: 'Hari Ini', isi: 'Kelas hari ini ikut jadual. Tekan satu kelas untuk menulis RPHnya.', ke: '#/hariini' },
  { nama: 'RPH', isi: 'Pilih minggu, isi RPH setiap kelas, kemudian jana PDF mingguan.', ke: '#/rph' },
  { nama: 'Takwim', isi: 'Cuti KPM, cuti sekolah sendiri dan program. Dari satu program, terus buat surat, kertas kerja, minit atau OPR.', ke: '#/takwim' },
  { nama: 'Kertas Kerja', isi: 'Isi bahagian demi bahagian. Jumlah belanja dikira sendiri.', ke: '#/kertas' },
  { nama: 'Memo & Surat', isi: 'Empat templat: panggilan mesyuarat, kebenaran ibu bapa, surat iringan dan memo.', ke: '#/surat' },
  { nama: 'Minit Mesyuarat', isi: 'Catat kehadiran, perkara dan tindakan. Minit curai dijana sekali.', ke: '#/minit' },
  { nama: 'OPR', isi: 'Laporan satu halaman dengan sehingga empat gambar. Boleh dikongsi sebagai PDF atau JPEG.', ke: '#/opr' },
  { nama: 'Jobskop', isi: 'Pilih jawatan anda daripada MySG Sekolah Rendah, edit tugas, jana PDF.', ke: '#/jobskop' },
];

export function Panduan() {
  return (
    <>
      <KepalaKembali ke="#/profil" labelKembali="Kembali ke Profil" tajuk="Panduan ringkas" sub="Lima minit untuk mula" />
      <main className="isi">
        <section className="kad kad-garis-emas" aria-labelledby="p-mula">
          <h2 id="p-mula" className="kad-tajuk">
            Mula di sini
          </h2>
          <ol className="panduan-langkah">
            {MULA.map((m, i) => (
              <li key={m.ke}>
                <span className="bulat bulat-siap" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="panduan-teks">
                  <strong>{m.tajuk}</strong>
                  <span>{m.isi}</span>
                  <a href={m.ke}>{m.label}</a>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="kad" aria-labelledby="p-modul">
          <h2 id="p-modul" className="kad-tajuk">
            Apa yang boleh dibuat
          </h2>
          <ul className="senarai-ringkas panduan-modul">
            {MODUL.map((m) => (
              <li key={m.ke}>
                <a href={m.ke}>
                  <span>
                    <strong>{m.nama}</strong>
                    <br />
                    {m.isi}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="kad" aria-labelledby="p-tahu">
          <h2 id="p-tahu" className="kad-tajuk">
            Perlu tahu
          </h2>
          <ul className="panduan-nota">
            <li>
              <strong>Simpanan automatik.</strong> Tiada butang simpan pada dokumen. Lihat tanda “Disimpan” di penjuru atas.
            </li>
            <li>
              <strong>Tanpa internet.</strong> Guru360 masih boleh dibuka dan diisi. Perubahan dihantar apabila internet ada semula. Jangan log keluar sebelum itu.
            </li>
            <li>
              <strong>Kongsi PDF.</strong> Selepas “Jana PDF”, tekan “Kongsi” untuk WhatsApp, Telegram atau e-mel, atau “Buka PDF” untuk cetak.
            </li>
            <li>
              <strong>Tulisan Jawi dan Arab</strong> belum boleh dicetak dalam PDF. Ia muncul sebagai tanda soal.
            </li>
            <li>
              <strong>Tarikh bertanda *</strong> dalam takwim belum disahkan dengan dokumen rasmi KPM. Semak dengan takwim sekolah.
            </li>
            <li>
              <strong>Pasang di telefon.</strong> Dari skrin Utama, ikut kad “Pasang Guru360 di telefon”.
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
