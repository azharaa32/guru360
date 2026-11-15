import { useSenarai } from './senarai';

export type JenisDokumen = 'kertas_kerja' | 'memo' | 'surat' | 'minit' | 'opr' | 'jobskop';

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

// ---------------------------------------------------------------- Memo dan surat

export type TemplatSurat = 'mesyuarat' | 'kebenaran' | 'iringan' | 'memo';

export interface IsiSurat {
  templat: TemplatSurat;
  rujukan: string;
  tarikh: string; // tarikh surat, YYYY-MM-DD
  kepada: string; // satu baris bagi setiap baris alamat penerima
  daripada: string; // memo sahaja
  pembuka: string;
  acara_tarikh: string; // YYYY-MM-DD
  acara_masa: string;
  acara_tempat: string;
  senarai: string[]; // agenda mesyuarat, atau dokumen yang disertakan
  penutup: string;
  penandatangan: Orang;
}

export const TEMPLAT_SURAT: Record<TemplatSurat, { nama: string; ringkas: string; jenis: JenisDokumen; adaButiran: boolean; labelSenarai: string | null; kepada: string; pembuka: string; penutup: string }> = {
  mesyuarat: {
    nama: 'Panggilan Mesyuarat',
    ringkas: 'Jemput ahli ke mesyuarat, dengan agenda',
    jenis: 'surat',
    adaButiran: true,
    labelSenarai: 'Agenda',
    kepada: '',
    pembuka: 'Dengan segala hormatnya perkara di atas dirujuk.\n\nTuan/puan dijemput hadir ke mesyuarat seperti butiran berikut:',
    penutup: 'Kehadiran dan kerjasama tuan/puan amat dihargai.',
  },
  kebenaran: {
    nama: 'Kebenaran Ibu Bapa',
    ringkas: 'Mohon kebenaran penjaga, dengan keratan jawapan',
    jenis: 'surat',
    adaButiran: true,
    labelSenarai: null,
    kepada: 'Ibu bapa / penjaga murid',
    pembuka: 'Dengan segala hormatnya perkara di atas dirujuk.\n\nSukacita dimaklumkan bahawa anak jagaan tuan/puan telah dipilih untuk menyertai program seperti butiran berikut:',
    penutup: 'Sehubungan itu, pihak sekolah memohon kebenaran tuan/puan. Sila lengkapkan keratan jawapan di bawah dan kembalikannya kepada guru kelas.',
  },
  iringan: {
    nama: 'Surat Iringan',
    ringkas: 'Iringi dokumen yang dihantar',
    jenis: 'surat',
    adaButiran: false,
    labelSenarai: 'Dokumen disertakan',
    kepada: '',
    pembuka: 'Dengan segala hormatnya perkara di atas dirujuk.\n\nBersama-sama ini disertakan dokumen berikut untuk makluman dan tindakan tuan/puan selanjutnya:',
    penutup: 'Kerjasama dan perhatian tuan/puan amat dihargai.',
  },
  memo: {
    nama: 'Memo Dalaman',
    ringkas: 'Makluman ringkas dalam sekolah',
    jenis: 'memo',
    adaButiran: false,
    labelSenarai: null,
    kepada: 'Semua guru',
    pembuka: '',
    penutup: '',
  },
};

export function suratKosong(templat: TemplatSurat, tarikh: string, rujukan: string, penandatangan: Orang): IsiSurat {
  const t = TEMPLAT_SURAT[templat];
  return {
    templat,
    rujukan,
    tarikh,
    kepada: t.kepada,
    daripada: templat === 'memo' ? penandatangan.nama : '',
    pembuka: t.pembuka,
    acara_tarikh: '',
    acara_masa: '',
    acara_tempat: '',
    senarai: t.labelSenarai ? [''] : [],
    penutup: t.penutup,
    penandatangan,
  };
}

export function isiSurat(d: Dokumen | undefined): IsiSurat {
  const i = (d?.isi ?? {}) as Partial<IsiSurat>;
  const templat: TemplatSurat = i.templat && i.templat in TEMPLAT_SURAT ? i.templat : d?.jenis === 'memo' ? 'memo' : 'mesyuarat';
  const asas = suratKosong(templat, '', '', { jawatan: '', nama: '' });
  return { ...asas, ...i, templat, senarai: Array.isArray(i.senarai) ? i.senarai : asas.senarai, penandatangan: { ...asas.penandatangan, ...(i.penandatangan ?? {}) } };
}

/** Rujukan seterusnya: nombor dalam kurungan terakhir ditambah satu, contohnya "SRIB/600-1/4 (12)" menjadi "(13)". */
export function rujukanSeterusnya(terakhir: string | undefined): string {
  if (!terakhir) return '';
  const padan = terakhir.match(/^(.*\()(\d+)(\)\s*)$/);
  return padan ? `${padan[1]}${Number(padan[2]) + 1}${padan[3]}` : terakhir;
}

/** Surat sedia dicetak apabila ada penerima, perkara dan penandatangan. */
export function suratLengkap(tajuk: string, i: IsiSurat): boolean {
  const ada = (s: string) => s.trim().length > 0;
  return ada(tajuk) && ada(i.kepada) && ada(i.tarikh) && ada(i.penandatangan.nama) && (!TEMPLAT_SURAT[i.templat].adaButiran || (ada(i.acara_tarikh) && ada(i.acara_tempat)));
}

const rapi = (s: string) => s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** Kemaskan sebelum simpan: isi surat kekal seperti ditaip; rujukan, tempat dan nama dalam huruf besar. */
export function kemasSurat(i: IsiSurat): IsiSurat {
  return {
    ...i,
    rujukan: i.rujukan.trim().toUpperCase(),
    kepada: rapi(i.kepada),
    daripada: i.daripada.trim().toUpperCase(),
    pembuka: rapi(i.pembuka),
    acara_masa: i.acara_masa.trim(),
    acara_tempat: i.acara_tempat.trim(),
    senarai: i.senarai.map((s) => s.trim()).filter(Boolean),
    penutup: rapi(i.penutup),
    penandatangan: besarkan(i.penandatangan),
  };
}

// ---------------------------------------------------------------- Minit mesyuarat dan minit curai

export interface Hadirin {
  nama: string;
  jawatan: string;
  hadir: boolean;
}

export interface Agenda {
  tajuk: string;
  jenis: 'makluman' | 'tindakan';
  perbincangan: string;
  tindakan_oleh: string;
  tarikh_akhir: string; // YYYY-MM-DD atau kosong
}

export interface IsiMinit {
  tarikh: string;
  masa: string;
  tempat: string;
  kehadiran: Hadirin[];
  agenda: Agenda[];
  penutup: string;
  disediakan: Orang;
  disahkan: Orang;
}

export const AGENDA_KOSONG: Agenda = { tajuk: '', jenis: 'makluman', perbincangan: '', tindakan_oleh: '', tarikh_akhir: '' };
export const AGENDA_LAZIM = ['UCAPAN PENGERUSI', 'PENGESAHAN MINIT MESYUARAT YANG LALU', 'PERKARA-PERKARA BERBANGKIT', 'HAL-HAL LAIN', 'PENANGGUHAN'];

export const MINIT_KOSONG: IsiMinit = {
  tarikh: '',
  masa: '',
  tempat: '',
  kehadiran: [],
  agenda: [],
  penutup: '',
  disediakan: { jawatan: 'SETIAUSAHA', nama: '' },
  disahkan: { jawatan: 'PENGERUSI', nama: '' },
};

export function isiMinit(d: Dokumen | undefined): IsiMinit {
  const i = (d?.isi ?? {}) as Partial<IsiMinit>;
  return {
    ...MINIT_KOSONG,
    ...i,
    kehadiran: Array.isArray(i.kehadiran) ? i.kehadiran.map((h) => ({ nama: h.nama ?? '', jawatan: h.jawatan ?? '', hadir: h.hadir !== false })) : [],
    agenda: Array.isArray(i.agenda) ? i.agenda.map((a) => ({ ...AGENDA_KOSONG, ...a, jenis: String(a.jenis).toLowerCase() === 'tindakan' ? 'tindakan' : 'makluman' })) : [],
    disediakan: { ...MINIT_KOSONG.disediakan, ...(i.disediakan ?? {}) },
    disahkan: { ...MINIT_KOSONG.disahkan, ...(i.disahkan ?? {}) },
  };
}

export function kemasMinit(i: IsiMinit): IsiMinit {
  const ada = (s: string) => s.trim().length > 0;
  const bersih = besarkan({
    ...i,
    kehadiran: i.kehadiran.filter((h) => ada(h.nama)),
    agenda: i.agenda.filter((a) => ada(a.tajuk) || ada(a.perbincangan)).map((a) => (a.jenis === 'tindakan' ? a : { ...a, tindakan_oleh: '', tarikh_akhir: '' })),
  });
  // `jenis` ialah nilai sistem, bukan teks guru: jangan biar ia ditukar kepada huruf besar.
  return { ...bersih, agenda: bersih.agenda.map((a) => ({ ...a, jenis: String(a.jenis).toLowerCase() === 'tindakan' ? 'tindakan' : 'makluman' })) };
}

export function minitLengkap(tajuk: string, i: IsiMinit): boolean {
  const ada = (s: string) => s.trim().length > 0;
  return ada(tajuk) && ada(i.tarikh) && i.kehadiran.some((h) => h.hadir && ada(h.nama)) && i.agenda.some((a) => ada(a.tajuk));
}

export interface Curai {
  penerima: string;
  butir: { no: number; tajuk: string; perbincangan: string; tarikh_akhir: string }[];
}

/**
 * Minit curai: agenda bertanda tindakan, dikumpul mengikut penerima.
 * "ALI, SITI" atau "ALI DAN SITI" pada medan Tindakan oleh memberi dua penerima.
 */
export function senaraiCurai(i: IsiMinit): Curai[] {
  const peta = new Map<string, Curai>();
  i.agenda.forEach((a, idx) => {
    if (a.jenis !== 'tindakan' || !a.tajuk.trim()) return;
    const nama = a.tindakan_oleh.toUpperCase().split(/,|;|\n|\s+DAN\s+/).map((s) => s.trim()).filter(Boolean);
    for (const n of nama.length ? nama : ['(PENERIMA BELUM DIISI)']) {
      const c = peta.get(n) ?? { penerima: n, butir: [] };
      c.butir.push({ no: idx + 1, tajuk: a.tajuk.trim().toUpperCase(), perbincangan: a.perbincangan.trim().toUpperCase(), tarikh_akhir: a.tarikh_akhir });
      peta.set(n, c);
    }
  });
  return [...peta.values()];
}
