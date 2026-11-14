import { useSenarai } from './senarai';

export interface Waktu {
  id: string;
  hari: number; // 0 = Ahad ... 6 = Sabtu (sama seperti Date.getDay)
  mula: string; // "HH:MM"
  tamat: string;
  subjek: string;
  kelas: string;
  perlu_rph: boolean;
}

export const NAMA_HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
export const HARI_PENDEK = ['AHD', 'ISN', 'SEL', 'RAB', 'KHA', 'JUM', 'SAB'];

/** Kedah, Kelantan dan Terengganu bersekolah Ahad hingga Khamis; negeri lain Isnin hingga Jumaat. */
export function hariSekolah(negeri: string | null | undefined): number[] {
  return negeri && ['KEDAH', 'KELANTAN', 'TERENGGANU'].includes(negeri) ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5];
}

export const SUBJEK_AKADEMIK = [
  'BAHASA MELAYU',
  'BAHASA INGGERIS',
  'MATEMATIK',
  'SAINS',
  'SEJARAH',
  'PENDIDIKAN ISLAM',
  'PENDIDIKAN MORAL',
  'PENDIDIKAN JASMANI DAN KESIHATAN',
  'PENDIDIKAN SENI VISUAL',
  'PENDIDIKAN MUZIK',
  'REKA BENTUK DAN TEKNOLOGI',
];

export const SUBJEK_DINIAH = ['TAUHID', 'FEQAH', 'AKHLAK', 'SIRAH', 'JAWI', 'IMLAK', 'KHAT', 'BAHASA ARAB', 'TAJWID', 'TILAWAH', 'HAFAZAN'];

/** Waktu bukan mengajar: lazimnya tidak perlu RPH. */
export const BUKAN_MENGAJAR = ['PERHIMPUNAN', 'KOKURIKULUM', 'MESYUARAT'];

const LAJUR = 'id, hari, mula, tamat, subjek, kelas, perlu_rph';
// Pelayan memulangkan masa sebagai "08:30:00"; aplikasi guna "08:30".
const kemasMasa = (w: Waktu): Waktu => ({ ...w, mula: w.mula.slice(0, 5), tamat: w.tamat.slice(0, 5) });

export function useJadual(uid: string | null, dalamTalian: boolean) {
  const { baris, sedia, tertunda, ralat, simpanBanyak, padamBaris } = useSenarai<Waktu>('jadual_waktu', LAJUR, uid, dalamTalian, kemasMasa);
  return { waktu: baris, sedia, tertunda, ralat, simpanWaktu: simpanBanyak, padamWaktu: padamBaris };
}

export const minit = (masa: string) => Number(masa.slice(0, 2)) * 60 + Number(masa.slice(3, 5));
export const keMasa = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** "14:15" menjadi "2:15", mengikut cara jadual sekolah ditulis. */
export function masa12(masa: string): string {
  const j = Number(masa.slice(0, 2));
  return `${j % 12 === 0 ? 12 : j % 12}:${masa.slice(3, 5)}`;
}

export const julat = (w: Pick<Waktu, 'mula' | 'tamat'>) => `${masa12(w.mula)} – ${masa12(w.tamat)}`;
export const label = (w: Pick<Waktu, 'kelas' | 'subjek'>) => (w.kelas ? `${w.kelas} · ${w.subjek}` : w.subjek);
export const ikutMasa = (a: Waktu, b: Waktu) => a.mula.localeCompare(b.mula);

export function bertindih(a: Pick<Waktu, 'mula' | 'tamat'>, b: Pick<Waktu, 'mula' | 'tamat'>): boolean {
  return minit(a.mula) < minit(b.tamat) && minit(b.mula) < minit(a.tamat);
}
