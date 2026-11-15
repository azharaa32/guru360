// OPR (One Page Report): dilukis pada kanvas A4 supaya JPEG dan PDF serupa, dan sentiasa muat satu halaman.
// Teks dilukis oleh pelayar, jadi tulisan Jawi dan Arab keluar dengan betul dalam OPR.
import { besarkan, type Dokumen, type Orang } from './dokumen';
import { muatImej } from './gambar';

export interface IsiOpr {
  tarikh: string;
  tarikh_tamat: string;
  masa: string;
  tempat: string;
  sasaran: string;
  ringkasan: string;
  impak: string;
  penambahbaikan: string;
  gambar: string[]; // laluan dalam simpanan fail, paling banyak 4
  disediakan: Orang;
}

export const MAKS_GAMBAR = 4;

export const OPR_KOSONG: IsiOpr = {
  tarikh: '',
  tarikh_tamat: '',
  masa: '',
  tempat: '',
  sasaran: '',
  ringkasan: '',
  impak: '',
  penambahbaikan: '',
  gambar: [],
  disediakan: { jawatan: '', nama: '' },
};

export function isiOpr(d: Dokumen | undefined): IsiOpr {
  const i = (d?.isi ?? {}) as Partial<IsiOpr>;
  return { ...OPR_KOSONG, ...i, gambar: Array.isArray(i.gambar) ? i.gambar.filter((g) => typeof g === 'string').slice(0, MAKS_GAMBAR) : [], disediakan: { ...OPR_KOSONG.disediakan, ...(i.disediakan ?? {}) } };
}

/** Teks dalam huruf besar; laluan gambar tidak disentuh. */
export function kemasOpr(i: IsiOpr): IsiOpr {
  const { gambar, ...teks } = i;
  return { ...besarkan(teks), gambar };
}

export function oprLengkap(tajuk: string, i: IsiOpr): boolean {
  return tajuk.trim().length > 0 && i.tarikh.length > 0 && i.ringkasan.trim().length > 0 && i.gambar.length > 0;
}

export interface KepalaOpr {
  nama_sekolah: string;
  alamat: string;
  telefon: string;
  emel: string;
  logoKiri: string | null;
  logoKanan: string | null;
}

export interface DataOpr {
  kepala: KepalaOpr;
  tajuk: string;
  tarikh: string; // sudah diformat
  masa: string;
  tempat: string;
  sasaran: string;
  ringkasan: string;
  impak: string;
  penambahbaikan: string;
  gambar: string[]; // URL gambar (blob: atau data:)
  disediakan: Orang;
}

// A4 pada 150 dpi
const L = 1240;
const T = 1754;
const TEPI = 78;
const FON = 'Arial, Helvetica, "Noto Naskh Arabic", "Geeza Pro", sans-serif';
const HIJAU = '#0e5a4a';
const EMAS = '#e8a317';
const HITAM = '#171717';
const KELABU = '#555';

function balut(ctx: CanvasRenderingContext2D, teks: string, lebar: number): string[] {
  const baris: string[] = [];
  for (const perenggan of teks.replace(/\r/g, '').split('\n')) {
    let semasa = '';
    for (const kata of perenggan.split(/\s+/).filter(Boolean)) {
      const cuba = semasa ? `${semasa} ${kata}` : kata;
      if (ctx.measureText(cuba).width <= lebar || !semasa) semasa = cuba;
      else {
        baris.push(semasa);
        semasa = kata;
      }
    }
    baris.push(semasa);
  }
  return baris;
}

/** Laluan segi empat bucu bulat; pelayar lama tanpa roundRect mendapat bucu tajam. */
function bulat(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, t: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, l, t, r);
  else ctx.rect(x, y, l, t);
}

function lukisMuat(ctx: CanvasRenderingContext2D, imej: HTMLImageElement, x: number, y: number, l: number, t: number) {
  const n = Math.min(l / imej.naturalWidth, t / imej.naturalHeight);
  const w = imej.naturalWidth * n;
  const h = imej.naturalHeight * n;
  ctx.drawImage(imej, x + (l - w) / 2, y + (t - h) / 2, w, h);
}

/** Lukis gambar memenuhi kotak (dipangkas di tengah), dengan bucu bulat. */
function lukisPenuh(ctx: CanvasRenderingContext2D, imej: HTMLImageElement, x: number, y: number, l: number, t: number) {
  const n = Math.max(l / imej.naturalWidth, t / imej.naturalHeight);
  const sw = l / n;
  const sh = t / n;
  ctx.save();
  bulat(ctx, x, y, l, t, 10);
  ctx.clip();
  ctx.drawImage(imej, (imej.naturalWidth - sw) / 2, (imej.naturalHeight - sh) / 2, sw, sh, x, y, l, t);
  ctx.restore();
  ctx.strokeStyle = '#c9d2cd';
  ctx.lineWidth = 2;
  bulat(ctx, x, y, l, t, 10);
  ctx.stroke();
}

/**
 * Lukis OPR. `skala` mengecilkan teks dan gambar; fungsi memulangkan `null` jika kandungan
 * tidak muat pada skala itu, supaya pemanggil boleh mencuba skala lebih kecil.
 */
function lukis(d: DataOpr, skala: number, imej: (HTMLImageElement | null)[], logo: (HTMLImageElement | null)[]): HTMLCanvasElement | null {
  const kanvas = document.createElement('canvas');
  kanvas.width = L;
  kanvas.height = T;
  const ctx = kanvas.getContext('2d');
  if (!ctx) throw new Error('OPR tidak dapat dilukis pada telefon ini.');
  const s = (n: number) => Math.round(n * skala);
  const fon = (saiz: number, tebal = false) => {
    ctx.font = `${tebal ? 'bold ' : ''}${s(saiz)}px ${FON}`;
  };
  const lebar = L - TEPI * 2;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, L, T);
  ctx.textBaseline = 'top';
  let y = 64;

  // Kepala surat
  const saizLogo = 120;
  const ruang = logo[0] || logo[1] ? saizLogo + 24 : 0;
  if (logo[0]) lukisMuat(ctx, logo[0], TEPI, y, saizLogo, saizLogo);
  if (logo[1]) lukisMuat(ctx, logo[1], L - TEPI - saizLogo, y, saizLogo, saizLogo);
  ctx.textAlign = 'center';
  ctx.fillStyle = HITAM;
  let yk = y;
  ctx.font = `bold 30px ${FON}`;
  for (const b of balut(ctx, d.kepala.nama_sekolah || 'NAMA SEKOLAH', lebar - ruang * 2)) {
    ctx.fillText(b, L / 2, yk);
    yk += 38;
  }
  ctx.font = `21px ${FON}`;
  const talian = [d.kepala.telefon && `Tel: ${d.kepala.telefon}`, d.kepala.emel && `Emel: ${d.kepala.emel}`].filter(Boolean).join('   |   ');
  for (const b of [...d.kepala.alamat.split('\n').filter(Boolean), ...(talian ? [talian] : [])]) {
    ctx.fillText(b, L / 2, yk);
    yk += 27;
  }
  y = Math.max(yk, ruang ? y + saizLogo : yk) + 14;
  ctx.fillStyle = HIJAU;
  ctx.fillRect(TEPI, y, lebar, 6);
  ctx.fillStyle = EMAS;
  ctx.fillRect(TEPI, y + 8, lebar, 3);
  y += 30;

  // Tajuk
  ctx.fillStyle = HIJAU;
  fon(24, true);
  ctx.fillText('ONE PAGE REPORT (OPR)', L / 2, y);
  y += s(34);
  ctx.fillStyle = HITAM;
  fon(34, true);
  for (const b of balut(ctx, d.tajuk || '(NAMA PROGRAM)', lebar)) {
    ctx.fillText(b, L / 2, y);
    y += s(42);
  }
  y += s(10);

  // Butiran: dua lajur
  ctx.textAlign = 'left';
  const butiran: [string, string][] = [
    ['TARIKH', d.tarikh],
    ['MASA', d.masa],
    ['TEMPAT', d.tempat],
    ['SASARAN', d.sasaran],
  ];
  const lajur = (lebar - 24) / 2;
  fon(22, true);
  const barisButir = butiran.map(([, nilai]) => balut(ctx, nilai || '-', lajur - 32).slice(0, 2));
  const tinggiBaris = [0, 2].map((i) => s(34) + Math.max(barisButir[i].length, barisButir[i + 1].length) * s(28) + s(12));
  ctx.fillStyle = '#eef4f1';
  bulat(ctx, TEPI, y, lebar, tinggiBaris[0] + tinggiBaris[1], 12);
  ctx.fill();
  butiran.forEach(([label], i) => {
    const x = TEPI + (i % 2) * (lajur + 24);
    const yb = y + (i >= 2 ? tinggiBaris[0] : 0);
    fon(17, true);
    ctx.fillStyle = KELABU;
    ctx.fillText(label, x + 16, yb + s(10));
    fon(22, true);
    ctx.fillStyle = HITAM;
    barisButir[i].forEach((t, j) => ctx.fillText(t, x + 16, yb + s(34) + j * s(28)));
  });
  y += tinggiBaris[0] + tinggiBaris[1] + s(20);

  // Gambar
  const ada = imej.filter((i): i is HTMLImageElement => i !== null);
  if (ada.length) {
    const jarak = 16;
    const susun = ada.length === 4 ? [2, 2] : [ada.length];
    let k = 0;
    for (const bil of susun) {
      const l = (lebar - jarak * (bil - 1)) / bil;
      const t = s(ada.length === 1 ? 460 : ada.length === 4 ? 300 : ada.length === 2 ? 360 : 260);
      for (let i = 0; i < bil; i++) lukisPenuh(ctx, ada[k++], TEPI + i * (l + jarak), y, l, t);
      y += t + jarak;
    }
    y += s(8);
  }

  // Tiga bahagian teks
  const bahagian: [string, string][] = [
    ['AKTIVITI / RINGKASAN', d.ringkasan],
    ['IMPAK / KEKUATAN', d.impak],
    ['PENAMBAHBAIKAN', d.penambahbaikan],
  ];
  for (const [label, teks] of bahagian) {
    if (!teks.trim()) continue;
    ctx.fillStyle = HIJAU;
    ctx.fillRect(TEPI, y, 6, s(24));
    fon(19, true);
    ctx.fillText(label, TEPI + 16, y + s(2));
    y += s(32);
    ctx.fillStyle = HITAM;
    fon(22);
    for (const b of balut(ctx, teks.trim(), lebar)) {
      ctx.fillText(b, TEPI, y);
      y += s(30);
    }
    y += s(14);
  }

  // Disediakan oleh, di kaki halaman
  const kaki = T - 96;
  if (y > kaki - s(10)) return null;
  ctx.fillStyle = '#c9d2cd';
  ctx.fillRect(TEPI, kaki, lebar, 2);
  ctx.fillStyle = KELABU;
  ctx.font = `19px ${FON}`;
  const oleh = [d.disediakan.nama, d.disediakan.jawatan].filter(Boolean).join(', ');
  ctx.fillText(oleh ? `Disediakan oleh: ${oleh}` : '', TEPI, kaki + 14);
  ctx.textAlign = 'right';
  ctx.fillText('Guru360', L - TEPI, kaki + 14);
  return kanvas;
}

/** Lukis OPR pada kanvas A4, mengecilkan teks dan gambar sedikit demi sedikit sehingga muat satu halaman. */
export async function lukisOpr(d: DataOpr): Promise<HTMLCanvasElement> {
  const muat = (u: string | null) => (u ? muatImej(u).catch(() => null) : Promise.resolve(null));
  const imej = await Promise.all(d.gambar.slice(0, MAKS_GAMBAR).map(muat));
  const logo = await Promise.all([muat(d.kepala.logoKiri), muat(d.kepala.logoKanan)]);
  for (let skala = 1; skala >= 0.5; skala -= 0.05) {
    const k = lukis(d, skala, imej, logo);
    if (k) return k;
  }
  throw new Error('Teks terlalu panjang untuk satu halaman. Ringkaskan sedikit, kemudian cuba lagi.');
}

export const kanvasKeJpeg = (k: HTMLCanvasElement) =>
  new Promise<Uint8Array>((ok, gagal) => k.toBlob(async (b) => (b ? ok(new Uint8Array(await b.arrayBuffer())) : gagal(new Error('JPEG tidak dapat dijana.'))), 'image/jpeg', 0.9));
