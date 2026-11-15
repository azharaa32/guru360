import type { Dokumen, Orang } from './dokumen';
import { idBaharu } from './senarai';

export interface KumpulanTugas {
  tajuk: string;
  tugas: string[];
}

export type JenisPortfolio = 'berjawatan' | 'tanpa_jawatan' | 'jawatankuasa';

/** Satu portfolio atau jawatankuasa dalam MySG, dengan senarai tugasnya. */
export interface PortfolioMysg {
  kod: string;
  nama: string;
  jenis: JenisPortfolio;
  kumpulan: KumpulanTugas[];
  /** Kod portfolio lain yang berkongsi senarai tugas yang sama dalam MySG. */
  kongsi?: string;
}

export interface DataMysg {
  sumber: string;
  peringkat: 'rendah' | 'menengah';
  portfolio: PortfolioMysg[];
}

/** Senarai tugas MySG Sekolah Rendah; dimuat hanya apabila skrin Jobskop dibuka. */
export async function muatMysg(): Promise<DataMysg> {
  return (await import('../data/mysg-rendah.json')).default as unknown as DataMysg;
}

export const NAMA_JENIS: Record<JenisPortfolio, string> = {
  berjawatan: 'Berjawatan',
  tanpa_jawatan: 'Tanpa jawatan',
  jawatankuasa: 'J/kuasa',
};

/** Satu jawatan yang dipegang guru: salinan tugas MySG yang boleh diedit sendiri. */
export interface Jawatan {
  id: string;
  kod: string;
  nama: string;
  /** Butiran sendiri, cth. "Bahasa Melayu" bagi Ketua Panitia atau "4 Adnan" bagi Guru Kelas. */
  butiran: string;
  kumpulan: KumpulanTugas[];
}

export interface IsiJobskop {
  tahun: number;
  jawatan: Jawatan[];
  disahkan: Orang;
}

const teks = (x: unknown) => (typeof x === 'string' ? x : '');

export function isiJobskop(d: Dokumen | undefined): IsiJobskop {
  const i = (d?.isi ?? {}) as Partial<IsiJobskop>;
  return {
    tahun: typeof i.tahun === 'number' ? i.tahun : new Date().getFullYear(),
    jawatan: Array.isArray(i.jawatan)
      ? i.jawatan.map((j) => ({
          id: teks(j.id) || idBaharu(),
          kod: teks(j.kod),
          nama: teks(j.nama),
          butiran: teks(j.butiran),
          kumpulan: Array.isArray(j.kumpulan) ? j.kumpulan.map((k) => ({ tajuk: teks(k.tajuk), tugas: Array.isArray(k.tugas) ? k.tugas.map(teks) : [] })) : [],
        }))
      : [],
    disahkan: { nama: teks(i.disahkan?.nama), jawatan: teks(i.disahkan?.jawatan) || 'GURU BESAR' },
  };
}

export const bilTugas = (k: KumpulanTugas[]) => k.reduce((n, g) => n + g.tugas.length, 0);

export const namaPenuh = (j: Pick<Jawatan, 'nama' | 'butiran'>) => (j.butiran.trim() ? `${j.nama.trim()} ${j.butiran.trim()}` : j.nama.trim());

const rapi = (s: string) =>
  s
    .split('\n')
    .map((b) => b.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

export function kemasJawatan(j: Jawatan): Jawatan {
  return {
    ...j,
    nama: j.nama.replace(/\s+/g, ' ').trim(),
    butiran: j.butiran.replace(/\s+/g, ' ').trim(),
    kumpulan: j.kumpulan.map((k) => ({ tajuk: k.tajuk.replace(/\s+/g, ' ').trim(), tugas: k.tugas.map(rapi).filter(Boolean) })).filter((k) => k.tugas.length),
  };
}

/** Salin portfolio MySG (kumpulan yang dipilih sahaja) menjadi jawatan guru. */
export function dariMysg(p: PortfolioMysg, kumpulanDipilih: number[]): Jawatan {
  return {
    id: idBaharu(),
    kod: p.kod,
    nama: p.nama,
    butiran: '',
    kumpulan: p.kumpulan.filter((_, i) => kumpulanDipilih.includes(i)).map((k) => ({ tajuk: k.tajuk, tugas: [...k.tugas] })),
  };
}

export function jobskopKosong(): Dokumen {
  const isi: IsiJobskop = { tahun: new Date().getFullYear(), jawatan: [], disahkan: { nama: '', jawatan: 'GURU BESAR' } };
  return { id: idBaharu(), jenis: 'jobskop', program_id: null, tajuk: 'JOBSKOP', isi: isi as unknown as Record<string, unknown>, status: 'draf' };
}
