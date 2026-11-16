// Kalendar persekolahan KPM dan hari kelepasan am, mengikut negeri.
//
// Sumber:
// - Kalendar akademik dan cuti tambahan perayaan 2027: Surat Siaran Kementerian Pendidikan Bilangan 1 Tahun 2026,
//   "Kalendar Akademik Tahun 2027", ruj. KPM.100-1/3/2 JLD 14 (11), bertarikh 2 Oktober 2026 (Lampiran A, B dan C).
//   Disemak dengan dokumen rasmi pada 16 November 2026. Surat itu juga menetapkan sesi 2028 bermula 3 Januari 2028.
// - Hari kelepasan am 2027: Jadual Hari Kelepasan Am Persekutuan dan Negeri 2027 (BKPP, JPM), seperti disiarkan semula
//   oleh cutisekolah.com.my dan Human Resources Online (25 Ogos 2026). Belum disemak dengan dokumen rasmi JPM.
// - Cuti akhir persekolahan 2026: daripada laman kedua; belum disemak dengan surat siaran Kalendar Akademik 2026.
// Entri bertanda `semak` belum disahkan dengan dokumen rasmi.
//
// Kemas kini setahun sekali apabila surat siaran KPM dan jadual JPM tahun baharu dikeluarkan.

export type Kumpulan = 'A' | 'B';
export type JenisCuti = 'sekolah' | 'umum' | 'tambahan' | 'ganti';

export interface EntriKalendar {
  mula: string; // YYYY-MM-DD
  tamat?: string; // YYYY-MM-DD; tiada = sehari
  nama: string;
  jenis: JenisCuti;
  /** Siapa yang terlibat: 'semua', satu kumpulan, atau senarai negeri. */
  untuk: 'semua' | Kumpulan | string[];
  kecuali?: string[];
  semak?: string;
}

export interface Sesi {
  tahun: number;
  buka: Record<Kumpulan, string>;
  tutup: Record<Kumpulan, string>;
}

export const KUMPULAN_A = ['KEDAH', 'KELANTAN', 'TERENGGANU'];

export function kumpulan(negeri: string): Kumpulan {
  return KUMPULAN_A.includes(negeri) ? 'A' : 'B';
}

/** Hari hujung minggu (0 = Ahad ... 6 = Sabtu). Kumpulan A: Jumaat dan Sabtu. Kumpulan B: Sabtu dan Ahad. */
export function hujungMinggu(negeri: string): number[] {
  return kumpulan(negeri) === 'A' ? [5, 6] : [6, 0];
}

export const SESI: Sesi[] = [
  { tahun: 2026, buka: { A: '2026-01-11', B: '2026-01-12' }, tutup: { A: '2026-12-03', B: '2026-12-04' } },
  { tahun: 2027, buka: { A: '2027-01-04', B: '2027-01-04' }, tutup: { A: '2027-12-02', B: '2027-12-03' } },
];

const B_SEMUA = 'B' as const;
const SUMBER_KPM = 'Tarikh daripada laman kedua; sahkan dengan surat siaran Kalendar Akademik 2026.';
const SUMBER_JPM = 'Sumber berbeza tentang tarikh atau negeri; sahkan dengan jadual JPM.';

export const KALENDAR: EntriKalendar[] = [
  // ---- 2026 (baki tahun semasa) ----
  { mula: '2026-12-04', tamat: '2026-12-31', nama: 'Cuti Akhir Persekolahan 2026', jenis: 'sekolah', untuk: 'A', semak: SUMBER_KPM },
  { mula: '2026-12-05', tamat: '2026-12-31', nama: 'Cuti Akhir Persekolahan 2026', jenis: 'sekolah', untuk: 'B', semak: SUMBER_KPM },
  { mula: '2026-12-25', nama: 'Hari Krismas', jenis: 'umum', untuk: 'semua' },

  // ---- Cuti persekolahan 2027 ----
  { mula: '2027-03-05', tamat: '2027-03-13', nama: 'Cuti Penggal 1', jenis: 'sekolah', untuk: 'A' },
  { mula: '2027-03-06', tamat: '2027-03-14', nama: 'Cuti Penggal 1', jenis: 'sekolah', untuk: 'B' },
  { mula: '2027-05-21', tamat: '2027-06-05', nama: 'Cuti Pertengahan Tahun', jenis: 'sekolah', untuk: 'A' },
  { mula: '2027-05-22', tamat: '2027-06-06', nama: 'Cuti Pertengahan Tahun', jenis: 'sekolah', untuk: 'B' },
  { mula: '2027-08-27', tamat: '2027-09-04', nama: 'Cuti Penggal 2', jenis: 'sekolah', untuk: 'A' },
  { mula: '2027-08-28', tamat: '2027-09-05', nama: 'Cuti Penggal 2', jenis: 'sekolah', untuk: 'B' },
  { mula: '2027-12-03', tamat: '2027-12-31', nama: 'Cuti Akhir Persekolahan', jenis: 'sekolah', untuk: 'A' },
  { mula: '2027-12-04', tamat: '2027-12-31', nama: 'Cuti Akhir Persekolahan', jenis: 'sekolah', untuk: 'B' },

  // ---- Cuti tambahan perayaan KPM 2027 (Lampiran C; tidak perlu diganti) ----
  { mula: '2027-02-09', tamat: '2027-02-11', nama: 'Cuti tambahan KPM: Tahun Baharu Cina', jenis: 'tambahan', untuk: ['KEDAH'] },
  { mula: '2027-02-08', tamat: '2027-02-11', nama: 'Cuti tambahan KPM: Tahun Baharu Cina', jenis: 'tambahan', untuk: ['KELANTAN', 'TERENGGANU'] },
  { mula: '2027-02-05', nama: 'Cuti tambahan KPM: Tahun Baharu Cina', jenis: 'tambahan', untuk: B_SEMUA },
  { mula: '2027-02-09', tamat: '2027-02-12', nama: 'Cuti tambahan KPM: Tahun Baharu Cina', jenis: 'tambahan', untuk: B_SEMUA },
  { mula: '2027-03-14', nama: 'Cuti tambahan KPM: Hari Raya Aidilfitri', jenis: 'tambahan', untuk: 'A' },
  { mula: '2027-05-16', nama: 'Cuti tambahan KPM: Hari Raya Aidiladha', jenis: 'tambahan', untuk: 'A' },
  { mula: '2027-05-18', nama: 'Cuti tambahan KPM: Hari Raya Aidiladha', jenis: 'tambahan', untuk: ['KEDAH'] },
  { mula: '2027-05-19', nama: 'Cuti tambahan KPM: Hari Raya Aidiladha', jenis: 'tambahan', untuk: 'A' },
  { mula: '2027-05-18', tamat: '2027-05-19', nama: 'Cuti tambahan KPM: Hari Raya Aidiladha', jenis: 'tambahan', untuk: B_SEMUA },
  { mula: '2027-05-21', nama: 'Cuti tambahan KPM: Hari Wesak', jenis: 'tambahan', untuk: B_SEMUA },
  { mula: '2027-10-27', nama: 'Cuti tambahan KPM: Hari Deepavali', jenis: 'tambahan', untuk: 'semua', kecuali: ['SARAWAK'] },
  { mula: '2027-10-29', nama: 'Cuti tambahan KPM: Hari Deepavali', jenis: 'tambahan', untuk: B_SEMUA, kecuali: ['SARAWAK'] },
  { mula: '2027-10-28', nama: 'Cuti tambahan KPM: Hari Deepavali', jenis: 'tambahan', untuk: ['SARAWAK'] },

  // ---- Hari kelepasan am 2027 ----
  { mula: '2027-01-01', nama: 'Tahun Baharu', jenis: 'umum', untuk: 'semua', kecuali: ['JOHOR', 'KEDAH', 'KELANTAN', 'PERLIS', 'TERENGGANU'] },
  { mula: '2027-01-06', nama: 'Israk dan Mikraj', jenis: 'umum', untuk: ['KEDAH', 'NEGERI SEMBILAN', 'PERLIS', 'TERENGGANU'] },
  { mula: '2027-01-14', nama: 'Hari Keputeraan Yang di-Pertuan Besar Negeri Sembilan', jenis: 'umum', untuk: ['NEGERI SEMBILAN'] },
  { mula: '2027-01-22', nama: 'Thaipusam', jenis: 'umum', untuk: ['JOHOR', 'KEDAH', 'NEGERI SEMBILAN', 'PERAK', 'PULAU PINANG', 'SELANGOR', 'WP KUALA LUMPUR', 'WP PUTRAJAYA'], semak: SUMBER_JPM },
  { mula: '2027-02-01', nama: 'Hari Wilayah Persekutuan', jenis: 'umum', untuk: ['WP KUALA LUMPUR', 'WP LABUAN', 'WP PUTRAJAYA'] },
  { mula: '2027-02-06', tamat: '2027-02-07', nama: 'Tahun Baharu Cina', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-02-08', nama: 'Cuti ganti Tahun Baharu Cina', jenis: 'ganti', untuk: B_SEMUA },
  { mula: '2027-02-08', nama: 'Awal Ramadan', jenis: 'umum', untuk: ['JOHOR', 'KEDAH'] },
  { mula: '2027-02-20', nama: 'Hari Pengisytiharan Kemerdekaan', jenis: 'umum', untuk: ['MELAKA'] },
  { mula: '2027-02-24', nama: 'Nuzul Al-Quran', jenis: 'umum', untuk: 'semua', kecuali: ['JOHOR', 'KEDAH', 'MELAKA', 'NEGERI SEMBILAN', 'SABAH', 'SARAWAK'], semak: SUMBER_JPM },
  { mula: '2027-03-04', nama: 'Ulang Tahun Pertabalan Sultan Terengganu', jenis: 'umum', untuk: ['TERENGGANU'] },
  { mula: '2027-03-10', tamat: '2027-03-11', nama: 'Hari Raya Aidilfitri', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-03-12', nama: 'Hari Raya Aidilfitri (hari ketiga)', jenis: 'umum', untuk: ['MELAKA'], semak: SUMBER_JPM },
  { mula: '2027-03-23', nama: 'Hari Keputeraan Sultan Johor', jenis: 'umum', untuk: ['JOHOR'] },
  { mula: '2027-03-26', nama: 'Good Friday', jenis: 'umum', untuk: ['SABAH', 'SARAWAK'] },
  { mula: '2027-04-26', nama: 'Hari Keputeraan Sultan Terengganu', jenis: 'umum', untuk: ['TERENGGANU'] },
  { mula: '2027-05-01', nama: 'Hari Pekerja', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-05-16', nama: 'Hari Arafah', jenis: 'umum', untuk: ['KELANTAN', 'TERENGGANU'] },
  { mula: '2027-05-17', nama: 'Hari Raya Aidiladha', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-05-17', nama: 'Hari Keputeraan Raja Perlis', jenis: 'umum', untuk: ['PERLIS'] },
  { mula: '2027-05-18', nama: 'Hari Raya Aidiladha (hari kedua)', jenis: 'umum', untuk: ['KEDAH', 'KELANTAN', 'PERLIS', 'TERENGGANU'] },
  { mula: '2027-05-20', nama: 'Hari Wesak', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-05-22', nama: 'Hari Hol Pahang', jenis: 'umum', untuk: ['PAHANG'], semak: SUMBER_JPM },
  { mula: '2027-05-30', tamat: '2027-05-31', nama: 'Pesta Kaamatan', jenis: 'umum', untuk: ['SABAH', 'WP LABUAN'] },
  { mula: '2027-06-01', tamat: '2027-06-02', nama: 'Hari Gawai Dayak', jenis: 'umum', untuk: ['SARAWAK'] },
  { mula: '2027-06-06', nama: 'Awal Muharram', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-06-07', nama: 'Hari Keputeraan Yang di-Pertuan Agong', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-06-08', nama: 'Cuti ganti Awal Muharram', jenis: 'ganti', untuk: B_SEMUA, semak: 'Dikira mengikut Akta Hari Kelepasan 1951 (cuti pada Ahad diganti hari bekerja berikutnya); sahkan dengan jadual JPM.' },
  { mula: '2027-06-20', nama: 'Hari Keputeraan Sultan Kedah', jenis: 'umum', untuk: ['KEDAH'] },
  { mula: '2027-07-07', nama: 'Hari Ulang Tahun George Town Tapak Warisan Dunia', jenis: 'umum', untuk: ['PULAU PINANG'] },
  { mula: '2027-07-10', nama: 'Hari Jadi Yang di-Pertua Negeri Pulau Pinang', jenis: 'umum', untuk: ['PULAU PINANG'] },
  { mula: '2027-07-11', nama: 'Hari Hol Almarhum Sultan Iskandar', jenis: 'umum', untuk: ['JOHOR'], semak: 'Sumber menyebut 10 atau 11 Julai; sahkan dengan jadual JPM.' },
  { mula: '2027-07-22', nama: 'Hari Sarawak', jenis: 'umum', untuk: ['SARAWAK'] },
  { mula: '2027-07-30', nama: 'Hari Keputeraan Sultan Pahang', jenis: 'umum', untuk: ['PAHANG'] },
  { mula: '2027-08-15', nama: 'Maulidur Rasul', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-08-16', nama: 'Cuti ganti Maulidur Rasul', jenis: 'ganti', untuk: B_SEMUA, semak: 'Dikira mengikut Akta Hari Kelepasan 1951 (cuti pada Ahad diganti hari berikutnya); sahkan dengan jadual JPM.' },
  { mula: '2027-08-24', nama: 'Hari Jadi Yang di-Pertua Negeri Melaka', jenis: 'umum', untuk: ['MELAKA'] },
  { mula: '2027-08-31', nama: 'Hari Kebangsaan', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-09-16', nama: 'Hari Malaysia', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-09-29', tamat: '2027-09-30', nama: 'Hari Keputeraan Sultan Kelantan', jenis: 'umum', untuk: ['KELANTAN'] },
  { mula: '2027-10-02', nama: 'Hari Jadi Yang di-Pertua Negeri Sabah', jenis: 'umum', untuk: ['SABAH'], semak: SUMBER_JPM },
  { mula: '2027-10-09', nama: 'Hari Jadi Yang di-Pertua Negeri Sarawak', jenis: 'umum', untuk: ['SARAWAK'] },
  { mula: '2027-10-28', nama: 'Hari Deepavali', jenis: 'umum', untuk: 'semua', kecuali: ['SARAWAK'] },
  { mula: '2027-11-05', nama: 'Hari Keputeraan Sultan Perak', jenis: 'umum', untuk: ['PERAK'] },
  { mula: '2027-12-11', nama: 'Hari Keputeraan Sultan Selangor', jenis: 'umum', untuk: ['SELANGOR'] },
  { mula: '2027-12-24', nama: 'Hari Sebelum Krismas', jenis: 'umum', untuk: ['SABAH'] },
  { mula: '2027-12-25', nama: 'Hari Krismas', jenis: 'umum', untuk: 'semua' },
  { mula: '2027-12-26', nama: 'Israk dan Mikraj', jenis: 'umum', untuk: ['KEDAH', 'NEGERI SEMBILAN', 'PERLIS', 'TERENGGANU'] },
];

/** Tahun yang ada kalendar lengkap dalam aplikasi. */
export const TAHUN_ADA = SESI.map((s) => s.tahun);
