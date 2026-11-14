import { hujungMinggu } from '../data/kalendar';
import { ikutMasa, type Waktu } from './jadual';
import { dariTarikh, tambahHari, type Kalendar } from './kalendar';
import { useSenarai } from './senarai';

export interface Rph {
  id: string;
  tarikh: string; // YYYY-MM-DD
  mula: string; // HH:MM
  tamat: string;
  kelas: string;
  subjek: string;
  objektif: string;
  aktiviti: string;
  pentaksiran: string;
  refleksi: string;
  status: 'draf' | 'siap';
}

const LAJUR = 'id, tarikh, mula, tamat, kelas, subjek, objektif, aktiviti, pentaksiran, refleksi, status';
const kemasMasa = (r: Rph): Rph => ({ ...r, mula: r.mula.slice(0, 5), tamat: r.tamat.slice(0, 5) });

export function useRph(uid: string | null, dalamTalian: boolean) {
  const { baris, sedia, tertunda, ralat, simpanBanyak, padamBaris } = useSenarai<Rph>('rph', LAJUR, uid, dalamTalian, kemasMasa);
  return { rph: baris, sedia, tertunda, ralat, simpanRph: simpanBanyak, padamRph: padamBaris };
}

/**
 * id tetap bagi RPH pada (guru, tarikh, masa mula), dalam bentuk UUID.
 * RPH yang sama dicipta di dua telefon mendapat id yang sama, jadi tidak berganda di pelayan.
 */
export function idRph(uid: string, tarikh: string, mula: string): string {
  const teks = `guru360:rph:${uid}:${tarikh}:${mula}`;
  const bahagian: number[] = [];
  for (let benih = 0; benih < 4; benih++) {
    // Cincangan 32-bit (gaya MurmurHash3) dengan benih berbeza bagi setiap bahagian.
    let h = 0x9e3779b9 ^ Math.imul(benih + 1, 0x85ebca6b);
    for (let i = 0; i < teks.length; i++) {
      h = Math.imul(h ^ teks.charCodeAt(i), 0xcc9e2d51);
      h = (h << 13) | (h >>> 19);
      h = (Math.imul(h, 5) + 0xe6546b64) | 0;
    }
    h ^= teks.length;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    bahagian.push((h ^ (h >>> 16)) >>> 0);
  }
  const hex = bahagian.map((n) => n.toString(16).padStart(8, '0')).join('').split('');
  hex[12] = '5'; // versi
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16); // varian
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export type Keadaan = 'kosong' | 'draf' | 'siap';

export const adaIsi = (r: Rph) => Boolean(r.objektif.trim() || r.aktiviti.trim() || r.pentaksiran.trim() || r.refleksi.trim());

export function keadaan(r: Rph | undefined): Keadaan {
  if (!r) return 'kosong';
  if (r.status === 'siap') return 'siap';
  return adaIsi(r) ? 'draf' : 'kosong';
}

/** Waktu dalam jadual pada satu tarikh, mengambil kira cuti dan hari persekolahan ganti. */
export function waktuPada(kal: Kalendar, waktu: Waktu[], tarikh: string): Waktu[] {
  if (!kal.hariSekolah(tarikh)) return [];
  const hari = kal.ikutHari(tarikh);
  return waktu.filter((w) => w.hari === hari).sort(ikutMasa);
}

/** Hari pertama minggu persekolahan yang mengandungi tarikh ini: Ahad bagi Kumpulan A, Isnin bagi yang lain. */
export function mulaMinggu(tarikh: string, negeri: string | null): string {
  const pertama = negeri && hujungMinggu(negeri).includes(5) ? 0 : 1;
  const beza = (dariTarikh(tarikh).getDay() - pertama + 7) % 7;
  return tambahHari(tarikh, -beza);
}

export interface HariMinggu {
  tarikh: string;
  waktu: Waktu[];
  /** Waktu yang perlu RPH pada hari ini. */
  perluRph: Waktu[];
}

/** Tujuh hari bermula dari `mula`, dengan waktu jadual masing-masing. */
export function hariDalamMinggu(kal: Kalendar, waktu: Waktu[], mula: string): HariMinggu[] {
  return Array.from({ length: 7 }, (_, i) => {
    const tarikh = tambahHari(mula, i);
    const w = waktuPada(kal, waktu, tarikh);
    return { tarikh, waktu: w, perluRph: w.filter((x) => x.perlu_rph) };
  });
}

export const kunciMasa = (masa: string) => masa.replace(':', '');
export const dariKunci = (k: string) => `${k.slice(0, 2)}:${k.slice(2, 4)}`;

/** Rekod RPH baharu yang kosong bagi satu waktu jadual pada satu tarikh. */
export function rphKosong(uid: string, tarikh: string, w: Waktu): Rph {
  return {
    id: idRph(uid, tarikh, w.mula),
    tarikh,
    mula: w.mula,
    tamat: w.tamat,
    kelas: w.kelas,
    subjek: w.subjek,
    objektif: '',
    aktiviti: '',
    pentaksiran: '',
    refleksi: '',
    status: 'draf',
  };
}
