import { KepalaKembali } from '../components/Rangka';

type Langkah = { tajuk: string; isi: string; ke: string; label: string };
type Modul = { nama: string; isi: string; ke: string };
export type PerananPanduan = 'guru' | 'admin' | 'hq';

const MULA: Langkah[] = [
  { tajuk: 'Isi profil', isi: 'Nama anda. Sekolah dan negeri sudah ditetapkan semasa anda dijemput.', ke: '#/profil', label: 'Buka Profil' },
  { tajuk: 'Semak templat sekolah', isi: 'Kepala surat dan logo ditetapkan oleh admin sekolah dan dipakai dalam semua PDF anda.', ke: '#/templat', label: 'Lihat Templat' },
  { tajuk: 'Masukkan jadual waktu', isi: 'Sekali sahaja. RPH dan skrin Hari Ini dibina daripada jadual ini.', ke: '#/jadual', label: 'Buka Jadual' },
];

const MODUL: Modul[] = [
  { nama: 'Makluman & tindakan', isi: 'Makluman daripada sekolah dan ibu pejabat. Tanda siap pada tindakan yang diminta.', ke: '#/makluman' },
  { nama: 'Hari Ini', isi: 'Kelas hari ini ikut jadual. Tekan satu kelas untuk menulis RPHnya.', ke: '#/hariini' },
  { nama: 'RPH', isi: 'Pilih minggu, isi RPH setiap kelas, kemudian jana PDF mingguan. Admin sekolah menyemak RPH yang siap.', ke: '#/rph' },
  { nama: 'Takwim', isi: 'Cuti KPM, cuti sekolah dan ibu pejabat, cuti sendiri dan program. Dari satu program, terus buat surat, kertas kerja, minit atau OPR.', ke: '#/takwim' },
  { nama: 'Kertas Kerja', isi: 'Isi bahagian demi bahagian. Jumlah belanja dikira sendiri.', ke: '#/kertas' },
  { nama: 'Memo & Surat', isi: 'Empat templat: panggilan mesyuarat, kebenaran ibu bapa, surat iringan dan memo.', ke: '#/surat' },
  { nama: 'Minit Mesyuarat', isi: 'Catat kehadiran, perkara dan tindakan. Minit curai dijana sekali.', ke: '#/minit' },
  { nama: 'OPR', isi: 'Laporan satu halaman dengan sehingga empat gambar. Boleh dikongsi sebagai PDF atau JPEG.', ke: '#/opr' },
  { nama: 'Jobskop', isi: 'Masukkan jawatan yang ditetapkan admin, atau tambah sendiri daripada MySG Sekolah Rendah atau Menengah. Admin mengesahkan jawatan anda.', ke: '#/jobskop' },
];

const MULA_ADMIN: Langkah[] = [
  { tajuk: 'Isi kepala surat dan logo', isi: 'Sekali sahaja. Dipakai dalam dokumen semua guru sekolah anda.', ke: '#/templat', label: 'Buka Kepala surat' },
  { tajuk: 'Jemput guru', isi: 'Taip emel guru di skrin Pengurusan. Guru menerima pautan untuk menetapkan kata laluan.', ke: '#/', label: 'Buka Pengurusan' },
  { tajuk: 'Tetapkan cuti sekolah', isi: 'Cuti peristiwa dan hari ganti. Muncul dalam takwim semua guru.', ke: '#/cuti', label: 'Buka Cuti sekolah' },
];

const MODUL_ADMIN: Modul[] = [
  { nama: 'Makluman & tindakan', isi: 'Hantar kepada semua guru. Lihat siapa sudah baca dan siapa belum siap.', ke: '#/makluman' },
  { nama: 'Semak RPH', isi: 'Baca RPH guru mengikut minggu, beri ulasan dan tanda disemak. Hanya RPH yang siap boleh disemak.', ke: '#/semak' },
  { nama: 'Dokumen guru', isi: 'Baca kertas kerja, surat, minit, OPR dan jobskop guru. Baca sahaja.', ke: '#/dokumen' },
  { nama: 'Jawatan guru', isi: 'Tetapkan portfolio MySG setiap guru, dan sahkan jawatan yang guru tambah sendiri.', ke: '#/jawatan' },
];

const MODUL_HQ: Modul[] = [
  { nama: 'Kelulusan dan cipta sekolah', isi: 'Jana kod pendaftaran untuk sekolah yang mahu mendaftar sendiri, luluskan atau tolak permohonannya, atau cipta sekolah dan jemput adminnya.', ke: '#/' },
  { nama: 'Papan semua sekolah', isi: 'Status ringkas setiap sekolah minggu ini. Tekan sekolah untuk membaca RPH gurunya.', ke: '#/' },
  { nama: 'Makluman semua sekolah', isi: 'Makluman dan tindakan kepada guru di semua sekolah.', ke: '#/makluman/semua' },
  { nama: 'Cuti semua sekolah', isi: 'Cuti yang muncul dalam takwim semua guru di semua sekolah.', ke: '#/cuti/semua' },
];

export function Panduan({ peranan = 'guru', adminSekolah = false }: { peranan?: PerananPanduan; adminSekolah?: boolean }) {
  const pengurusan = peranan !== 'guru';
  const mula = pengurusan ? (adminSekolah ? MULA_ADMIN : []) : MULA;
  const modul = pengurusan ? [...(adminSekolah ? MODUL_ADMIN : []), ...(peranan === 'hq' ? MODUL_HQ : [])] : MODUL;
  return (
    <>
      <KepalaKembali ke="#/profil" labelKembali="Kembali ke Profil" tajuk={pengurusan ? 'Panduan pengurusan' : 'Panduan ringkas'} sub={pengurusan ? (peranan === 'hq' ? 'Untuk ibu pejabat dan admin sekolah' : 'Untuk admin sekolah') : 'Lima minit untuk mula'} />
      <main className="isi">
        {mula.length > 0 && (
        <section className="kad kad-garis-emas" aria-labelledby="p-mula">
          <h2 id="p-mula" className="kad-tajuk">
            Mula di sini
          </h2>
          <ol className="panduan-langkah">
            {mula.map((m, i) => (
              <li key={m.tajuk}>
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
        )}

        <section className="kad" aria-labelledby="p-modul">
          <h2 id="p-modul" className="kad-tajuk">
            Apa yang boleh dibuat
          </h2>
          <ul className="senarai-ringkas panduan-modul">
            {modul.map((m) => (
              <li key={m.nama}>
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
          {pengurusan ? (
          <ul className="panduan-nota">
            <li>
              <strong>Akaun pengurusan tidak mengajar.</strong> Tiada jadual waktu, RPH atau dokumen sendiri pada akaun ini.
            </li>
            <li>
              <strong>Perlu internet.</strong> Menjemput guru, menghantar makluman, menyemak RPH dan menetapkan cuti memerlukan talian.
            </li>
            <li>
              <strong>Jemputan.</strong> Pautan jemputan sekali guna. Jika guru tidak menerimanya, semak folder spam atau tekan “Hantar semula”.
            </li>
            <li>
              <strong>Mengeluarkan guru.</strong> Guru yang dikeluarkan tidak lagi boleh membuka datanya di sekolah ini. Rekodnya kekal dengan sekolah.
            </li>
            <li>
              <strong>Baca sahaja.</strong> Anda boleh membaca RPH dan dokumen guru tetapi tidak boleh mengubah atau memadamnya.
            </li>
            <li>
              <strong>Belum ada.</strong> Peringatan automatik kepada guru, peratus RPH mengikut jadual, dan gambar OPR di skrin admin belum disediakan.
            </li>
          </ul>
          ) : (
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
              <strong>Takwim 2027</strong> mengikut Surat Siaran KPM Bil. 1 Tahun 2026. Tarikh bertanda * ialah cuti umum negeri yang belum disahkan dengan jadual rasmi JPM.
            </li>
            <li>
              <strong>Semakan admin.</strong> RPH yang disemak bertanda “Disemak” bersama ulasan. Jika isinya diubah, tanda itu gugur.
            </li>
            <li>
              <strong>Apa yang admin nampak.</strong> Admin sekolah boleh membaca RPH dan dokumen anda, tetapi tidak boleh mengubahnya.
            </li>
            <li>
              <strong>Berpindah sekolah.</strong> Tekan “Minta dikeluarkan dari sekolah” di Profil. Rekod anda kekal dengan sekolah; muat turun salinan dahulu.
            </li>
            <li>
              <strong>Pasang di telefon.</strong> Dari skrin Utama, ikut kad “Pasang Guru360 di telefon”.
            </li>
          </ul>
          )}
        </section>
      </main>
    </>
  );
}
