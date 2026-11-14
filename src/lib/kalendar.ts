import { KALENDAR, SESI, hujungMinggu, kumpulan, type EntriKalendar, type JenisCuti } from '../data/kalendar';
import { useSenarai } from './senarai';

// ---- Tarikh: sentiasa "YYYY-MM-DD" dalam waktu tempatan, supaya tiada anjakan zon waktu ----

export const keTarikh = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dariTarikh(t: string): Date {
  const [y, m, d] = t.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const tambahHari = (t: string, n: number) => {
  const d = dariTarikh(t);
  d.setDate(d.getDate() + n);
  return keTarikh(d);
};

export const hariIni = () => keTarikh(new Date());

export const NAMA_BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
export const BULAN_PENDEK = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGOS', 'SEP', 'OKT', 'NOV', 'DIS'];
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
const HARI_PENDEK = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
const NAMA_HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

/** "9 Feb 2027" atau "9 – 12 Feb 2027" */
export function tarikhMesra(mula: string, tamat?: string): string {
  const a = dariTarikh(mula);
  const satu = (d: Date, tahun = true) => `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}${tahun ? ` ${d.getFullYear()}` : ''}`;
  if (!tamat || tamat === mula) return `${satu(a)} · ${HARI_PENDEK[a.getDay()]}`;
  const b = dariTarikh(tamat);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()} – ${satu(b)}`;
  if (a.getFullYear() === b.getFullYear()) return `${satu(a, false)} – ${satu(b)}`;
  return `${satu(a)} – ${satu(b)}`;
}

export const tarikhPenuh = (t: string) => {
  const d = dariTarikh(t);
  return `${NAMA_HARI[d.getDay()]}, ${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

// ---- Cuti sendiri (disimpan dalam Supabase, milik guru) ----

export interface CutiSendiri {
  id: string;
  mula: string;
  tamat: string;
  nama: string;
  jenis: 'cuti' | 'sekolah';
  ikut_hari: number | null;
}

export function useCutiSendiri(uid: string | null, dalamTalian: boolean) {
  const { baris, sedia, tertunda, ralat, simpanBanyak, padamBaris } = useSenarai<CutiSendiri>(
    'cuti_sendiri',
    'id, mula, tamat, nama, jenis, ikut_hari',
    uid,
    dalamTalian,
  );
  return { cuti: baris, sedia, tertunda, ralat, simpanCuti: simpanBanyak, padamCuti: padamBaris };
}

// ---- Kalendar mengikut negeri ----

export function entriUntuk(negeri: string | null, e: EntriKalendar): boolean {
  if (!negeri) return e.untuk === 'semua' && !e.kecuali?.length && e.jenis === 'umum';
  if (e.kecuali?.includes(negeri)) return false;
  if (e.untuk === 'semua') return true;
  if (e.untuk === 'A' || e.untuk === 'B') return kumpulan(negeri) === e.untuk;
  return e.untuk.includes(negeri);
}

export const entriNegeri = (negeri: string | null) => KALENDAR.filter((e) => entriUntuk(negeri, e));

export type StatusHari =
  | { jenis: 'sekolah'; ganti?: CutiSendiri }
  | { jenis: 'hujung-minggu' }
  | { jenis: 'cuti'; sebab: { nama: string; jenis: JenisCuti | 'sendiri'; semak?: string }[] }
  | { jenis: 'luar-sesi' };

export interface Kalendar {
  negeri: string | null;
  status: (tarikh: string) => StatusHari;
  /** Hari persekolahan atau tidak; untuk RPH. */
  hariSekolah: (tarikh: string) => boolean;
  /** Jadual hari mana (0–6) dipakai pada tarikh ini; berbeza pada hari persekolahan ganti. */
  ikutHari: (tarikh: string) => number;
}

/** Bina fungsi semakan hari untuk satu negeri dan senarai cuti sendiri guru. */
export function binaKalendar(negeri: string | null, cutiSendiri: CutiSendiri[]): Kalendar {
  const peta = new Map<string, EntriKalendar[]>();
  for (const e of entriNegeri(negeri)) {
    for (let t = e.mula; t <= (e.tamat ?? e.mula); t = tambahHari(t, 1)) {
      const senarai = peta.get(t);
      if (senarai) senarai.push(e);
      else peta.set(t, [e]);
    }
  }
  const sendiriPada = (t: string) => cutiSendiri.filter((c) => c.mula <= t && t <= c.tamat);
  const rehat = negeri ? hujungMinggu(negeri) : [6, 0];

  const status = (t: string): StatusHari => {
    const sendiri = sendiriPada(t);
    const ganti = sendiri.find((c) => c.jenis === 'sekolah');
    if (ganti) return { jenis: 'sekolah', ganti };
    const sebab = [
      ...sendiri.map((c) => ({ nama: c.nama, jenis: 'sendiri' as const })),
      ...(peta.get(t) ?? []).map((e) => ({ nama: e.nama, jenis: e.jenis, semak: e.semak })),
    ];
    if (sebab.length) return { jenis: 'cuti', sebab };
    if (rehat.includes(dariTarikh(t).getDay())) return { jenis: 'hujung-minggu' };
    if (negeri) {
      const k = kumpulan(negeri);
      const sesi = SESI.find((s) => s.buka[k] <= t && t <= s.tutup[k]);
      if (!sesi && SESI.some((s) => s.tahun === Number(t.slice(0, 4)))) return { jenis: 'luar-sesi' };
    }
    return { jenis: 'sekolah' };
  };

  return {
    negeri,
    status,
    hariSekolah: (t) => status(t).jenis === 'sekolah',
    ikutHari: (t) => {
      const s = status(t);
      return s.jenis === 'sekolah' && s.ganti?.ikut_hari != null ? s.ganti.ikut_hari : dariTarikh(t).getDay();
    },
  };
}

export interface CutiAkanDatang {
  mula: string;
  tamat: string;
  nama: string;
  jenis: JenisCuti | 'sendiri';
  semak?: string;
}

/** Cuti yang berlaku atau akan datang, dicantum supaya cuti berturut-turut dengan nama sama jadi satu baris. */
export function cutiAkanDatang(negeri: string | null, cutiSendiri: CutiSendiri[], dari: string, had = 6): CutiAkanDatang[] {
  const senarai: CutiAkanDatang[] = [
    ...entriNegeri(negeri).map((e) => ({ mula: e.mula, tamat: e.tamat ?? e.mula, nama: e.nama, jenis: e.jenis, semak: e.semak })),
    ...cutiSendiri.filter((c) => c.jenis === 'cuti').map((c) => ({ mula: c.mula, tamat: c.tamat, nama: c.nama, jenis: 'sendiri' as const })),
  ]
    .filter((c) => c.tamat >= dari)
    .sort((a, b) => a.mula.localeCompare(b.mula) || a.nama.localeCompare(b.nama));
  const cantum: CutiAkanDatang[] = [];
  for (const c of senarai) {
    const akhir = cantum.find((x) => x.nama === c.nama && tambahHari(x.tamat, 1) >= c.mula);
    if (akhir) akhir.tamat = c.tamat > akhir.tamat ? c.tamat : akhir.tamat;
    else cantum.push({ ...c });
  }
  return cantum.slice(0, had);
}

export function sesiTahun(negeri: string | null, tahun: number) {
  const s = SESI.find((x) => x.tahun === tahun);
  if (!s || !negeri) return null;
  const k = kumpulan(negeri);
  return { buka: s.buka[k], tutup: s.tutup[k] };
}
