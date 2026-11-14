import { useSenarai } from './senarai';

export type JenisDokumen = 'kertas_kerja' | 'memo' | 'surat' | 'minit' | 'opr';

export interface Dokumen<T = Record<string, unknown>> {
  id: string;
  jenis: JenisDokumen;
  program_id: string | null;
  tajuk: string;
  isi: T;
  status: 'draf' | 'siap';
}

const LAJUR = 'id, jenis, program_id, tajuk, isi, status';

/** Semua dokumen guru (kertas kerja, memo, surat, minit, OPR) dalam satu senarai luar talian. */
export function useDokumen(uid: string | null, dalamTalian: boolean) {
  const { baris, sedia, tertunda, ralat, simpanBanyak, padamBaris } = useSenarai<Dokumen>('dokumen', LAJUR, uid, dalamTalian);
  return { dokumen: baris, sedia, tertunda, ralat, simpanDokumen: simpanBanyak, padamDokumen: padamBaris };
}

/** Tukar semua teks dalam isi dokumen kepada huruf besar yang kemas; nombor dan nilai lain kekal. */
export function besarkan<T>(nilai: T): T {
  if (typeof nilai === 'string') return nilai.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim().toUpperCase() as unknown as T;
  if (Array.isArray(nilai)) return nilai.map(besarkan) as unknown as T;
  if (nilai && typeof nilai === 'object') return Object.fromEntries(Object.entries(nilai).map(([k, v]) => [k, besarkan(v)])) as T;
  return nilai;
}

export const rm = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------- Kertas kerja

export interface Orang {
  jawatan: string;
  nama: string;
}

export interface BarisAturcara {
  masa: string;
  acara: string;
}

export interface BarisBelanja {
  perkara: string;
  kuantiti: number;
  harga: number;
}

export interface IsiKertasKerja {
  latar: string;
  rasional: string;
  objektif: string[];
  sasaran: string;
  tarikh: string; // YYYY-MM-DD
  tarikh_tamat: string;
  masa: string;
  tempat: string;
  jawatankuasa: Orang[];
  aturcara: BarisAturcara[];
  belanja: BarisBelanja[];
  tiada_kos: boolean;
  sumber: string;
  penutup: string;
  disediakan: Orang;
  disahkan: Orang;
}

export const KERTAS_KOSONG: IsiKertasKerja = {
  latar: '',
  rasional: '',
  objektif: [''],
  sasaran: '',
  tarikh: '',
  tarikh_tamat: '',
  masa: '',
  tempat: '',
  jawatankuasa: [],
  aturcara: [],
  belanja: [],
  tiada_kos: false,
  sumber: '',
  penutup: '',
  disediakan: { jawatan: '', nama: '' },
  disahkan: { jawatan: 'GURU BESAR', nama: '' },
};

/** Isi yang disimpan mungkin daripada versi lama; lengkapkan medan yang tiada. */
export function isiKertas(d: Dokumen | undefined): IsiKertasKerja {
  const i = (d?.isi ?? {}) as Partial<IsiKertasKerja>;
  return {
    ...KERTAS_KOSONG,
    ...i,
    objektif: Array.isArray(i.objektif) && i.objektif.length ? i.objektif : [''],
    jawatankuasa: Array.isArray(i.jawatankuasa) ? i.jawatankuasa : [],
    aturcara: Array.isArray(i.aturcara) ? i.aturcara : [],
    belanja: Array.isArray(i.belanja) ? i.belanja : [],
    disediakan: { ...KERTAS_KOSONG.disediakan, ...(i.disediakan ?? {}) },
    disahkan: { ...KERTAS_KOSONG.disahkan, ...(i.disahkan ?? {}) },
  };
}

export const BAHAGIAN_KERTAS = [
  'Tajuk & latar belakang',
  'Rasional',
  'Objektif',
  'Sasaran',
  'Tarikh, masa & tempat',
  'Jawatankuasa',
  'Aturcara',
  'Anggaran perbelanjaan',
  'Penutup & pengesahan',
] as const;

export const jumlahBelanja = (b: BarisBelanja[]) => b.reduce((n, x) => n + (Number(x.kuantiti) || 0) * (Number(x.harga) || 0), 0);

/** Bahagian mana yang sudah cukup diisi (9 nilai benar/palsu, ikut susunan BAHAGIAN_KERTAS). */
export function bahagianSiap(tajuk: string, i: IsiKertasKerja): boolean[] {
  const ada = (s: string) => s.trim().length > 0;
  return [
    ada(tajuk) && ada(i.latar),
    ada(i.rasional),
    i.objektif.some(ada),
    ada(i.sasaran),
    ada(i.tarikh) && ada(i.tempat),
    i.jawatankuasa.some((o) => ada(o.jawatan) && ada(o.nama)),
    i.aturcara.some((a) => ada(a.acara)),
    i.tiada_kos || i.belanja.some((b) => ada(b.perkara)),
    ada(i.penutup) && ada(i.disediakan.nama),
  ];
}

/** Buang baris kosong sebelum disimpan atau dicetak. */
export function kemasKertas(i: IsiKertasKerja): IsiKertasKerja {
  const ada = (s: string) => s.trim().length > 0;
  return besarkan({
    ...i,
    objektif: i.objektif.filter(ada),
    jawatankuasa: i.jawatankuasa.filter((o) => ada(o.jawatan) || ada(o.nama)),
    aturcara: i.aturcara.filter((a) => ada(a.masa) || ada(a.acara)),
    belanja: i.belanja.filter((b) => ada(b.perkara)).map((b) => ({ perkara: b.perkara, kuantiti: Number(b.kuantiti) || 0, harga: Number(b.harga) || 0 })),
  });
}
