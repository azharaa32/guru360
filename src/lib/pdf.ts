// Enjin PDF Guru360: dokumen A4 dijana dalam telefon, tanpa pelayan.
// Dimuat hanya apabila diperlukan (import dinamik) supaya aplikasi kekal ringan.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';

export interface KepalaSurat {
  nama_sekolah: string;
  alamat: string;
  telefon: string;
  emel: string;
  kod_sekolah: string;
  logoKiri: string | null; // data URL PNG
  logoKanan: string | null;
}

const A4 = { lebar: 595.28, tinggi: 841.89 };
const MM = 72 / 25.4;
const TEPI = { kiri: 25 * MM, kanan: 20 * MM, atas: 15 * MM, bawah: 20 * MM };
const HITAM = rgb(0.09, 0.09, 0.09);
const KELABU = rgb(0.35, 0.35, 0.35);
const KELABU_MUDA = rgb(0.93, 0.94, 0.93);
const SAIZ_LOGO = 22 * MM;

const ganti: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  ' ': ' ',
  '\t': '    ',
};

export class Dokumen {
  private halaman!: PDFPage;
  private y = 0;
  private aksara: Set<number>;

  private constructor(
    private pdf: PDFDocument,
    private biasa: PDFFont,
    private tebal: PDFFont,
  ) {
    this.aksara = new Set(biasa.getCharacterSet());
    this.halamanBaharu();
  }

  static async mula(tajukFail: string): Promise<Dokumen> {
    const pdf = await PDFDocument.create();
    pdf.setTitle(tajukFail);
    pdf.setCreator('Guru360');
    pdf.setProducer('Guru360');
    const biasa = await pdf.embedFont(StandardFonts.Helvetica);
    const tebal = await pdf.embedFont(StandardFonts.HelveticaBold);
    return new Dokumen(pdf, biasa, tebal);
  }

  private get lebarIsi() {
    return A4.lebar - TEPI.kiri - TEPI.kanan;
  }

  /** Fon piawai PDF hanya menyokong huruf Latin; aksara lain (contohnya Jawi) diganti dengan "?". */
  private bersih(teks: string): string {
    let hasil = '';
    for (const huruf of teks.replace(/\r/g, '')) {
      const tukar = ganti[huruf] ?? huruf;
      for (const h of tukar) hasil += h === '\n' || this.aksara.has(h.codePointAt(0)!) ? h : '?';
    }
    return hasil;
  }

  private halamanBaharu() {
    this.halaman = this.pdf.addPage([A4.lebar, A4.tinggi]);
    this.y = A4.tinggi - TEPI.atas;
  }

  private perluRuang(tinggi: number) {
    if (this.y - tinggi < TEPI.bawah) this.halamanBaharu();
  }

  private balut(teks: string, fon: PDFFont, saiz: number, lebar: number): string[] {
    const baris: string[] = [];
    for (const perenggan of this.bersih(teks).split('\n')) {
      let semasa = '';
      for (let kata of perenggan.split(/ +/)) {
        // Kata yang lebih panjang daripada satu baris dipotong.
        while (fon.widthOfTextAtSize(kata, saiz) > lebar && kata.length > 1) {
          let n = kata.length - 1;
          while (n > 1 && fon.widthOfTextAtSize(kata.slice(0, n), saiz) > lebar) n--;
          if (semasa) {
            baris.push(semasa);
            semasa = '';
          }
          baris.push(kata.slice(0, n));
          kata = kata.slice(n);
        }
        const cuba = semasa ? `${semasa} ${kata}` : kata;
        if (fon.widthOfTextAtSize(cuba, saiz) <= lebar) semasa = cuba;
        else {
          baris.push(semasa);
          semasa = kata;
        }
      }
      baris.push(semasa);
    }
    return baris;
  }

  private tulisBaris(
    baris: string[],
    fon: PDFFont,
    saiz: number,
    pilihan: { x?: number; lebar?: number; tengah?: boolean; jarak?: number; warna?: ReturnType<typeof rgb> } = {},
  ) {
    const x = pilihan.x ?? TEPI.kiri;
    const lebar = pilihan.lebar ?? this.lebarIsi;
    const tinggiBaris = saiz * (pilihan.jarak ?? 1.4);
    for (const b of baris) {
      this.perluRuang(tinggiBaris);
      this.y -= tinggiBaris;
      const lebarTeks = fon.widthOfTextAtSize(b, saiz);
      this.halaman.drawText(b, {
        x: pilihan.tengah ? x + (lebar - lebarTeks) / 2 : x,
        y: this.y + tinggiBaris * 0.25,
        size: saiz,
        font: fon,
        color: pilihan.warna ?? HITAM,
      });
    }
  }

  private async lukisLogo(dataUrl: string | null, x: number, yAtas: number): Promise<boolean> {
    if (!dataUrl) return false;
    try {
      const imej: PDFImage = dataUrl.startsWith('data:image/jpeg')
        ? await this.pdf.embedJpg(dataUrl)
        : await this.pdf.embedPng(dataUrl);
      const nisbah = Math.min(SAIZ_LOGO / imej.width, SAIZ_LOGO / imej.height);
      const l = imej.width * nisbah;
      const t = imej.height * nisbah;
      this.halaman.drawImage(imej, { x: x + (SAIZ_LOGO - l) / 2, y: yAtas - SAIZ_LOGO + (SAIZ_LOGO - t) / 2, width: l, height: t });
      return true;
    } catch {
      return false; // logo rosak: dokumen tetap dijana tanpa logo
    }
  }

  /** Kepala surat: logo kiri dan kanan, nama sekolah di tengah, alamat dan talian di bawahnya, kemudian garis. */
  async kepalaSurat(k: KepalaSurat) {
    const yAtas = this.y;
    const adaKiri = await this.lukisLogo(k.logoKiri, TEPI.kiri, yAtas);
    const adaKanan = await this.lukisLogo(k.logoKanan, A4.lebar - TEPI.kanan - SAIZ_LOGO, yAtas);
    // Teks kekal di tengah halaman walaupun hanya satu logo.
    const ruang = adaKiri || adaKanan ? SAIZ_LOGO + 4 * MM : 0;
    const x = TEPI.kiri + ruang;
    const lebar = this.lebarIsi - ruang * 2;

    const nama = k.nama_sekolah.trim() || 'NAMA SEKOLAH';
    this.tulisBaris(this.balut(nama, this.tebal, 13, lebar), this.tebal, 13, { x, lebar, tengah: true, jarak: 1.3 });
    if (k.alamat.trim()) this.tulisBaris(this.balut(k.alamat.trim(), this.biasa, 9.5, lebar), this.biasa, 9.5, { x, lebar, tengah: true });
    const talian = [k.telefon.trim() && `Tel: ${k.telefon.trim()}`, k.emel.trim() && `Emel: ${k.emel.trim()}`].filter(Boolean).join('   |   ');
    if (talian) this.tulisBaris(this.balut(talian, this.biasa, 9.5, lebar), this.biasa, 9.5, { x, lebar, tengah: true });
    if (k.kod_sekolah.trim())
      this.tulisBaris([this.bersih(`Kod sekolah: ${k.kod_sekolah.trim()}`)], this.biasa, 9.5, { x, lebar, tengah: true });

    if (adaKiri || adaKanan) this.y = Math.min(this.y, yAtas - SAIZ_LOGO);
    this.y -= 3 * MM;
    this.halaman.drawLine({ start: { x: TEPI.kiri, y: this.y }, end: { x: A4.lebar - TEPI.kanan, y: this.y }, thickness: 1.6, color: HITAM });
    this.halaman.drawLine({ start: { x: TEPI.kiri, y: this.y - 2.4 }, end: { x: A4.lebar - TEPI.kanan, y: this.y - 2.4 }, thickness: 0.5, color: HITAM });
    this.y -= 6 * MM;
  }

  tajuk(teks: string) {
    this.perluRuang(40);
    this.tulisBaris(this.balut(teks, this.tebal, 12, this.lebarIsi), this.tebal, 12, { tengah: true });
    this.y -= 3 * MM;
  }

  subtajuk(teks: string) {
    this.perluRuang(40);
    this.y -= 2 * MM;
    this.tulisBaris(this.balut(teks, this.tebal, 11, this.lebarIsi), this.tebal, 11);
    this.y -= 1 * MM;
  }

  perenggan(teks: string) {
    this.tulisBaris(this.balut(teks, this.biasa, 11, this.lebarIsi), this.biasa, 11, { jarak: 1.5 });
    this.y -= 3 * MM;
  }

  /** Baris "Label : nilai" dengan nilai yang dibalut dalam lajur sendiri. */
  medan(label: string, nilai: string) {
    const lebarLabel = 38 * MM;
    const barisNilai = this.balut(nilai || '-', this.biasa, 11, this.lebarIsi - lebarLabel - 4 * MM);
    this.perluRuang(11 * 1.5);
    const yMula = this.y;
    const halamanMula = this.halaman;
    this.tulisBaris(barisNilai, this.biasa, 11, { x: TEPI.kiri + lebarLabel + 4 * MM, lebar: this.lebarIsi - lebarLabel - 4 * MM, jarak: 1.5 });
    const yBaris = yMula - 11 * 1.5 + 11 * 1.5 * 0.25;
    halamanMula.drawText(this.bersih(label), { x: TEPI.kiri, y: yBaris, size: 11, font: this.tebal, color: HITAM });
    halamanMula.drawText(':', { x: TEPI.kiri + lebarLabel, y: yBaris, size: 11, font: this.biasa, color: HITAM });
  }

  jarak(mm: number) {
    this.y -= mm * MM;
  }

  /**
   * Baris jadual bersempadan. `lajur` ialah pecahan lebar setiap lajur (jumlah 1).
   * Baris `tebal` dicetak tebal dengan latar kelabu, untuk tajuk lajur.
   */
  grid(lajur: number[], baris: { sel: string[]; tebal?: boolean }[]) {
    const saiz = 9.5;
    const tinggiBaris = saiz * 1.35;
    const pad = 4;
    for (const b of baris) {
      const fon = b.tebal ? this.tebal : this.biasa;
      const lebar = lajur.map((p) => p * this.lebarIsi);
      const teks = b.sel.map((t, i) => this.balut(t || '', fon, saiz, lebar[i] - pad * 2));
      const tinggi = Math.max(...teks.map((t) => t.length)) * tinggiBaris + pad * 2;
      this.perluRuang(tinggi);
      let x = TEPI.kiri;
      teks.forEach((barisTeks, i) => {
        this.halaman.drawRectangle({ x, y: this.y - tinggi, width: lebar[i], height: tinggi, borderColor: HITAM, borderWidth: 0.6, color: b.tebal ? KELABU_MUDA : undefined });
        barisTeks.forEach((t, j) => {
          this.halaman.drawText(t, { x: x + pad, y: this.y - pad - (j + 1) * tinggiBaris + tinggiBaris * 0.28, size: saiz, font: fon, color: HITAM });
        });
        x += lebar[i];
      });
      this.y -= tinggi;
    }
  }

  /**
   * Baris "label | isi" bersempadan. Isi panjang disambung ke halaman seterusnya.
   * `minBaris` memberi ruang kosong untuk ditulis tangan apabila isi pendek atau kosong.
   */
  barisLabel(label: string, teks: string, minBaris = 1) {
    const saiz = 10;
    const tinggiBaris = saiz * 1.4;
    const pad = 5;
    const lebarLabel = 30 * MM;
    const lebarIsi = this.lebarIsi - lebarLabel;
    const semua = teks.trim() ? this.balut(teks.trim(), this.biasa, saiz, lebarIsi - pad * 2) : [];
    while (semua.length < minBaris) semua.push('');
    let pertama = true;
    while (semua.length) {
      const muat = Math.floor((this.y - TEPI.bawah - pad * 2) / tinggiBaris);
      if (muat < Math.min(2, semua.length)) {
        this.halamanBaharu();
        continue;
      }
      const bahagian = semua.splice(0, muat);
      const tinggi = bahagian.length * tinggiBaris + pad * 2;
      this.halaman.drawRectangle({ x: TEPI.kiri, y: this.y - tinggi, width: lebarLabel, height: tinggi, borderColor: HITAM, borderWidth: 0.6, color: KELABU_MUDA });
      this.halaman.drawRectangle({ x: TEPI.kiri + lebarLabel, y: this.y - tinggi, width: lebarIsi, height: tinggi, borderColor: HITAM, borderWidth: 0.6 });
      this.halaman.drawText(this.bersih(pertama ? label : `${label} (samb.)`), { x: TEPI.kiri + pad, y: this.y - pad - tinggiBaris + tinggiBaris * 0.28, size: pertama ? 9.5 : 8, font: this.tebal, color: HITAM });
      bahagian.forEach((t, j) => {
        this.halaman.drawText(t, { x: TEPI.kiri + lebarLabel + pad, y: this.y - pad - (j + 1) * tinggiBaris + tinggiBaris * 0.28, size: saiz, font: this.biasa, color: HITAM });
      });
      this.y -= tinggi;
      pertama = false;
    }
  }

  /** Pastikan sekurang-kurangnya `mm` ruang berbaki; jika tidak, mula halaman baharu. */
  pastikanRuang(mm: number) {
    this.perluRuang(mm * MM);
  }

  /** Dua ruang tandatangan sebelah-menyebelah, dengan nama dan jawatan di bawah garis. */
  tandatangan(kiri: { tajuk: string; nama: string; jawatan?: string }, kanan: { tajuk: string; nama: string; jawatan?: string }) {
    this.perluRuang(36 * MM);
    this.y -= 8 * MM;
    const lebar = this.lebarIsi / 2 - 8 * MM;
    [kiri, kanan].forEach((t, i) => {
      const x = TEPI.kiri + i * (this.lebarIsi / 2 + 8 * MM);
      this.halaman.drawText(this.bersih(t.tajuk), { x, y: this.y, size: 10, font: this.biasa, color: HITAM });
      this.halaman.drawLine({ start: { x, y: this.y - 16 * MM }, end: { x: x + lebar, y: this.y - 16 * MM }, thickness: 0.6, color: HITAM });
      const baris = [...(t.nama ? this.balut(`(${t.nama})`, this.biasa, 9.5, lebar) : []), ...(t.jawatan ? this.balut(t.jawatan, this.biasa, 9.5, lebar) : [])].slice(0, 4);
      baris.forEach((b, j) => {
        this.halaman.drawText(b, { x, y: this.y - 16 * MM - 12 - j * 12, size: 9.5, font: this.biasa, color: HITAM });
      });
    });
    this.y -= 30 * MM;
  }

  /** Senarai bernombor atau berhuruf dengan inden gantung: "i.  teks yang dibalut". */
  senarai(butir: string[], penanda: (i: number) => string) {
    const saiz = 11;
    const tinggiBaris = saiz * 1.5;
    const inden = 10 * MM;
    butir.forEach((teks, i) => {
      const baris = this.balut(teks, this.biasa, saiz, this.lebarIsi - inden);
      baris.forEach((b, j) => {
        this.perluRuang(tinggiBaris);
        this.y -= tinggiBaris;
        if (j === 0) this.halaman.drawText(this.bersih(penanda(i)), { x: TEPI.kiri, y: this.y + tinggiBaris * 0.25, size: saiz, font: this.biasa, color: HITAM });
        this.halaman.drawText(b, { x: TEPI.kiri + inden, y: this.y + tinggiBaris * 0.25, size: saiz, font: this.biasa, color: HITAM });
      });
    });
    this.y -= 3 * MM;
  }

  /** Dua teks pada satu baris: satu di kiri, satu rapat ke kanan (rujukan dan tarikh surat). */
  duaSisi(kiri: string, kanan: string) {
    const saiz = 11;
    this.perluRuang(saiz * 1.5);
    this.y -= saiz * 1.5;
    const k = this.bersih(kiri);
    const n = this.bersih(kanan);
    this.halaman.drawText(k, { x: TEPI.kiri, y: this.y + 4, size: saiz, font: this.biasa, color: HITAM });
    this.halaman.drawText(n, { x: A4.lebar - TEPI.kanan - this.biasa.widthOfTextAtSize(n, saiz), y: this.y + 4, size: saiz, font: this.biasa, color: HITAM });
  }

  /** Baris teks biasa tanpa jarak perenggan (alamat penerima, kata penutup). */
  baris(teks: string, tebal = false) {
    const fon = tebal ? this.tebal : this.biasa;
    this.tulisBaris(this.balut(teks, fon, 11, this.lebarIsi), fon, 11, { jarak: 1.4 });
  }

  /** Tajuk perkara surat: tebal dan bergaris bawah. */
  perkara(teks: string) {
    const saiz = 11;
    const tinggiBaris = saiz * 1.45;
    for (const b of this.balut(teks, this.tebal, saiz, this.lebarIsi)) {
      this.perluRuang(tinggiBaris);
      this.y -= tinggiBaris;
      this.halaman.drawText(b, { x: TEPI.kiri, y: this.y + 4, size: saiz, font: this.tebal, color: HITAM });
      this.halaman.drawLine({ start: { x: TEPI.kiri, y: this.y + 2 }, end: { x: TEPI.kiri + this.tebal.widthOfTextAtSize(b, saiz), y: this.y + 2 }, thickness: 0.7, color: HITAM });
    }
    this.y -= 3 * MM;
  }

  /** Garis putus-putus merentas halaman, untuk keratan jawapan. */
  garisPutus(label: string) {
    this.perluRuang(12 * MM);
    this.y -= 6 * MM;
    this.halaman.drawLine({ start: { x: TEPI.kiri, y: this.y }, end: { x: A4.lebar - TEPI.kanan, y: this.y }, thickness: 0.6, color: HITAM, dashArray: [4, 3] });
    const t = this.bersih(label);
    const l = this.biasa.widthOfTextAtSize(t, 8);
    this.halaman.drawRectangle({ x: (A4.lebar - l) / 2 - 4, y: this.y - 4, width: l + 8, height: 8, color: rgb(1, 1, 1) });
    this.halaman.drawText(t, { x: (A4.lebar - l) / 2, y: this.y - 3, size: 8, font: this.biasa, color: KELABU });
    this.y -= 5 * MM;
  }

  /** Ruang tandatangan tunggal di kiri: garis kosong, kemudian nama dan jawatan. */
  tandatanganKiri(nama: string, jawatan: string) {
    this.perluRuang(26 * MM);
    this.y -= 16 * MM;
    this.halaman.drawLine({ start: { x: TEPI.kiri, y: this.y }, end: { x: TEPI.kiri + 70 * MM, y: this.y }, thickness: 0.6, color: HITAM });
    this.y -= 2;
    if (nama) this.baris(`(${nama})`, true);
    if (jawatan) this.baris(jawatan);
  }

  /** Mula halaman baharu (contohnya satu helaian bagi setiap penerima). */
  halamanBaru() {
    this.halamanBaharu();
  }

  /** Beberapa garis kosong untuk ditulis tangan. */
  garisTulis(bil: number) {
    for (let i = 0; i < bil; i++) {
      this.perluRuang(9 * MM);
      this.y -= 9 * MM;
      this.halaman.drawLine({ start: { x: TEPI.kiri, y: this.y }, end: { x: A4.lebar - TEPI.kanan, y: this.y }, thickness: 0.4, color: KELABU });
    }
    this.y -= 3 * MM;
  }

  /** Tambah nombor halaman dan pulangkan fail PDF. */
  async siap(): Promise<Uint8Array> {
    const semua = this.pdf.getPages();
    semua.forEach((h, i) => {
      const teks = `Halaman ${i + 1} daripada ${semua.length}`;
      h.drawText(teks, {
        x: (A4.lebar - this.biasa.widthOfTextAtSize(teks, 8)) / 2,
        y: 10 * MM,
        size: 8,
        font: this.biasa,
        color: KELABU,
      });
    });
    return this.pdf.save();
  }
}

/** PDF contoh untuk menyemak kepala surat sekolah. */
export async function pdfContoh(k: KepalaSurat, guru: { nama: string; sekolah: string; negeri: string }): Promise<Uint8Array> {
  const d = await Dokumen.mula('Contoh dokumen Guru360');
  await d.kepalaSurat(k);
  d.tajuk('CONTOH DOKUMEN');
  d.perenggan(
    'Dokumen ini dijana oleh Guru360 untuk menyemak kepala surat sekolah anda. Kepala surat yang sama akan dipakai pada RPH, kertas kerja, memo, surat, minit mesyuarat, OPR dan jobskop.',
  );
  d.subtajuk('Maklumat guru');
  d.medan('Nama', guru.nama);
  d.medan('Sekolah', guru.sekolah);
  d.medan('Negeri', guru.negeri);
  d.medan('Tarikh dijana', new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }));
  d.jarak(4);
  d.subtajuk('Perkara untuk disemak');
  d.perenggan('1. Logo jelas dan tidak herot.\n2. Nama sekolah dieja dengan betul dan berada di tengah.\n3. Alamat, nombor telefon dan emel sekolah betul.');
  d.perenggan('Jika ada yang perlu dibetulkan, kembali ke skrin Templat sekolah, ubah maklumat, simpan, dan jana semula contoh ini.');
  return d.siap();
}

export interface RphPdf {
  tarikh: string; // sudah diformat, contohnya "ISNIN, 4 JANUARI 2027"
  masa: string;
  kelas: string;
  subjek: string;
  objektif: string;
  aktiviti: string;
  pentaksiran: string;
  refleksi: string;
}

/** PDF RPH: satu hari atau seminggu. Setiap RPH ialah satu blok jadual; hari baharu bermula dengan tajuk hari. */
export async function pdfRph(
  k: KepalaSurat,
  guru: { nama: string },
  tajukKecil: string,
  hari: { tajuk: string; rph: RphPdf[] }[],
): Promise<Uint8Array> {
  const d = await Dokumen.mula(`RPH ${tajukKecil}`);
  await d.kepalaSurat(k);
  d.tajuk('RANCANGAN PENGAJARAN HARIAN');
  d.medan('Nama guru', guru.nama);
  d.medan(hari.length > 1 ? 'Minggu' : 'Tarikh', tajukKecil);
  d.jarak(3);
  for (const h of hari) {
    if (hari.length > 1) {
      d.pastikanRuang(60);
      d.subtajuk(h.tajuk);
    }
    for (const r of h.rph) {
      d.pastikanRuang(55);
      d.grid(
        [0.36, 0.22, 0.14, 0.28],
        [
          { sel: ['HARI / TARIKH', 'MASA', 'KELAS', 'SUBJEK'], tebal: true },
          { sel: [r.tarikh, r.masa, r.kelas || '-', r.subjek] },
        ],
      );
      d.barisLabel('OBJEKTIF', r.objektif, 2);
      d.barisLabel('AKTIVITI', r.aktiviti, 3);
      d.barisLabel('PENTAKSIRAN', r.pentaksiran, 2);
      d.barisLabel('REFLEKSI', r.refleksi, 2);
      d.jarak(5);
    }
  }
  d.tandatangan({ tajuk: 'Disediakan oleh:', nama: guru.nama }, { tajuk: 'Disemak oleh:', nama: '' });
  return d.siap();
}

export interface KertasKerjaPdf {
  tajuk: string;
  latar: string;
  rasional: string;
  objektif: string[];
  sasaran: string;
  tarikh: string; // sudah diformat
  masa: string;
  tempat: string;
  jawatankuasa: { jawatan: string; nama: string }[];
  aturcara: { masa: string; acara: string }[];
  belanja: { perkara: string; kuantiti: number; harga: number }[];
  tiada_kos: boolean;
  sumber: string;
  penutup: string;
  disediakan: { jawatan: string; nama: string };
  disahkan: { jawatan: string; nama: string };
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];
const wang = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** PDF kertas kerja: sembilan bahagian bernombor, jadual jawatankuasa, aturcara dan anggaran belanja. */
export async function pdfKertasKerja(k: KepalaSurat, kk: KertasKerjaPdf): Promise<Uint8Array> {
  const d = await Dokumen.mula(kk.tajuk || 'Kertas kerja');
  await d.kepalaSurat(k);
  d.tajuk('KERTAS KERJA');
  d.tajuk(kk.tajuk || '(TAJUK BELUM DIISI)');
  let n = 0;
  const bahagian = (nama: string) => {
    n += 1;
    d.pastikanRuang(28);
    d.subtajuk(`${n}.0  ${nama}`);
  };
  const perenggan = (teks: string) => d.perenggan(teks.trim() || '-');

  bahagian('LATAR BELAKANG');
  perenggan(kk.latar);
  bahagian('RASIONAL');
  perenggan(kk.rasional);
  bahagian('OBJEKTIF');
  if (kk.objektif.length) d.senarai(kk.objektif, (i) => `${ROMAN[i] ?? i + 1}.`);
  else perenggan('');
  bahagian('SASARAN');
  perenggan(kk.sasaran);
  bahagian('TARIKH, MASA DAN TEMPAT');
  d.medan('Tarikh', kk.tarikh);
  d.medan('Masa', kk.masa);
  d.medan('Tempat', kk.tempat);
  d.jarak(3);
  bahagian('JAWATANKUASA');
  if (kk.jawatankuasa.length) {
    d.grid([0.4, 0.6], [{ sel: ['JAWATAN', 'NAMA'], tebal: true }, ...kk.jawatankuasa.map((o) => ({ sel: [o.jawatan, o.nama] }))]);
    d.jarak(3);
  } else perenggan('');
  bahagian('ATURCARA');
  if (kk.aturcara.length) {
    d.grid([0.28, 0.72], [{ sel: ['MASA', 'ACARA'], tebal: true }, ...kk.aturcara.map((a) => ({ sel: [a.masa, a.acara] }))]);
    d.jarak(3);
  } else perenggan('');
  bahagian('ANGGARAN PERBELANJAAN');
  if (kk.tiada_kos || !kk.belanja.length) perenggan(kk.tiada_kos ? 'Program ini tidak melibatkan sebarang kos.' : '');
  else {
    const jumlah = kk.belanja.reduce((j, b) => j + b.kuantiti * b.harga, 0);
    d.grid(
      [0.08, 0.42, 0.14, 0.18, 0.18],
      [
        { sel: ['BIL', 'PERKARA', 'KUANTITI', 'HARGA (RM)', 'JUMLAH (RM)'], tebal: true },
        ...kk.belanja.map((b, i) => ({ sel: [String(i + 1), b.perkara, String(b.kuantiti), wang(b.harga), wang(b.kuantiti * b.harga)] })),
        { sel: ['', 'JUMLAH KESELURUHAN', '', '', wang(jumlah)], tebal: true },
      ],
    );
    d.jarak(3);
    if (kk.sumber.trim()) d.medan('Sumber kewangan', kk.sumber);
    d.jarak(2);
  }
  bahagian('PENUTUP');
  perenggan(kk.penutup);
  d.tandatangan(
    { tajuk: 'Disediakan oleh:', nama: kk.disediakan.nama, jawatan: kk.disediakan.jawatan },
    { tajuk: 'Disahkan oleh:', nama: kk.disahkan.nama, jawatan: kk.disahkan.jawatan },
  );
  return d.siap();
}

export interface SuratPdf {
  templat: 'mesyuarat' | 'kebenaran' | 'iringan' | 'memo';
  rujukan: string;
  tarikh: string; // sudah diformat
  kepada: string;
  daripada: string;
  perkara: string;
  pembuka: string;
  butiran: { tarikh: string; masa: string; tempat: string } | null;
  labelSenarai: string | null;
  senarai: string[];
  penutup: string;
  penandatangan: { nama: string; jawatan: string };
}

/** PDF surat rasmi atau memo dalaman, dengan kepala surat sekolah. */
export async function pdfSurat(k: KepalaSurat, s: SuratPdf): Promise<Uint8Array> {
  const d = await Dokumen.mula(s.perkara || (s.templat === 'memo' ? 'Memo' : 'Surat'));
  await d.kepalaSurat(k);
  const perenggan = (teks: string) => teks.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).forEach((x) => d.perenggan(x));

  if (s.templat === 'memo') {
    d.tajuk('MEMO DALAMAN');
    d.grid(
      [0.24, 0.76],
      [
        { sel: ['KEPADA', s.kepada.replace(/\n/g, ', ')] },
        { sel: ['DARIPADA', s.daripada] },
        { sel: ['TARIKH', s.tarikh] },
        ...(s.rujukan ? [{ sel: ['RUJUKAN', s.rujukan] }] : []),
        { sel: ['PERKARA', s.perkara] },
      ],
    );
    d.jarak(6);
    perenggan(s.pembuka);
    perenggan(s.penutup);
    d.baris('Sekian, terima kasih.');
    d.tandatanganKiri(s.penandatangan.nama, s.penandatangan.jawatan);
    return d.siap();
  }

  d.duaSisi(s.rujukan ? `Ruj. Kami : ${s.rujukan}` : '', `Tarikh : ${s.tarikh}`);
  d.jarak(5);
  s.kepada.split('\n').filter((x) => x.trim()).forEach((x) => d.baris(x.trim()));
  d.jarak(5);
  d.baris('Tuan/Puan,');
  d.jarak(3);
  d.perkara(s.perkara || '(PERKARA BELUM DIISI)');
  perenggan(s.pembuka);
  if (s.butiran) {
    d.medan('Tarikh', s.butiran.tarikh);
    d.medan('Masa', s.butiran.masa);
    d.medan('Tempat', s.butiran.tempat);
    d.jarak(4);
  }
  if (s.labelSenarai && s.senarai.length) {
    d.baris(`${s.labelSenarai}:`, true);
    d.jarak(1);
    d.senarai(s.senarai, (i) => `${i + 1}.`);
  }
  perenggan(s.penutup);
  d.baris('Sekian, terima kasih.');
  d.jarak(4);
  d.baris('"BERKHIDMAT UNTUK NEGARA"', true);
  d.jarak(4);
  d.baris('Saya yang menjalankan amanah,');
  d.tandatanganKiri(s.penandatangan.nama, s.penandatangan.jawatan);

  if (s.templat === 'kebenaran') {
    d.pastikanRuang(75);
    d.garisPutus('potong di sini');
    d.tajuk('KERATAN JAWAPAN');
    d.perenggan(`Saya ............................................................ ibu / bapa / penjaga kepada ............................................................ kelas ..................... MEMBENARKAN / TIDAK MEMBENARKAN* anak jagaan saya menyertai ${s.perkara || 'program ini'}${s.butiran?.tarikh ? ` pada ${s.butiran.tarikh}` : ''}.`);
    d.baris('Tandatangan      : ........................................');
    d.jarak(2);
    d.baris('Nama                 : ........................................');
    d.jarak(2);
    d.baris('No. telefon        : ........................................');
    d.jarak(2);
    d.baris('Tarikh                : ........................................');
    d.jarak(3);
    d.baris('* Potong yang tidak berkenaan.');
  }
  return d.siap();
}

export interface MinitPdf {
  tajuk: string;
  tarikh: string; // sudah diformat
  masa: string;
  tempat: string;
  hadir: { nama: string; jawatan: string }[];
  tidakHadir: { nama: string; jawatan: string }[];
  agenda: { tajuk: string; perbincangan: string; tindakan: string }[]; // tindakan: "MAKLUMAN" atau "TINDAKAN: ..."
  penutup: string;
  disediakan: { nama: string; jawatan: string };
  disahkan: { nama: string; jawatan: string };
}

/** PDF minit mesyuarat penuh: butiran, kehadiran, agenda dengan lajur tindakan, dan pengesahan. */
export async function pdfMinit(k: KepalaSurat, m: MinitPdf): Promise<Uint8Array> {
  const d = await Dokumen.mula(m.tajuk || 'Minit mesyuarat');
  await d.kepalaSurat(k);
  d.tajuk('MINIT MESYUARAT');
  d.tajuk(m.tajuk || '(NAMA MESYUARAT BELUM DIISI)');
  d.medan('Tarikh', m.tarikh);
  d.medan('Masa', m.masa);
  d.medan('Tempat', m.tempat);
  d.jarak(3);
  d.subtajuk(`KEHADIRAN (${m.hadir.length} ORANG)`);
  d.grid([0.1, 0.5, 0.4], [{ sel: ['BIL', 'NAMA', 'JAWATAN'], tebal: true }, ...m.hadir.map((h, i) => ({ sel: [String(i + 1), h.nama, h.jawatan] }))]);
  d.jarak(3);
  if (m.tidakHadir.length) {
    d.pastikanRuang(30);
    d.subtajuk(`TIDAK HADIR (${m.tidakHadir.length} ORANG)`);
    d.grid([0.1, 0.5, 0.4], [{ sel: ['BIL', 'NAMA', 'JAWATAN'], tebal: true }, ...m.tidakHadir.map((h, i) => ({ sel: [String(i + 1), h.nama, h.jawatan] }))]);
    d.jarak(3);
  }
  d.pastikanRuang(40);
  d.subtajuk('PERKARA');
  d.grid([0.08, 0.66, 0.26], [{ sel: ['BIL', 'PERKARA DAN PERBINCANGAN', 'TINDAKAN'], tebal: true }]);
  m.agenda.forEach((a, i) => {
    d.grid([0.08, 0.66, 0.26], [{ sel: [String(i + 1), a.perbincangan ? `${a.tajuk}\n${a.perbincangan}` : a.tajuk, a.tindakan] }]);
  });
  d.jarak(4);
  if (m.penutup.trim()) {
    d.pastikanRuang(30);
    d.subtajuk('PENUTUP');
    d.perenggan(m.penutup);
  }
  d.tandatangan({ tajuk: 'Disediakan oleh:', nama: m.disediakan.nama, jawatan: m.disediakan.jawatan }, { tajuk: 'Disahkan oleh:', nama: m.disahkan.nama, jawatan: m.disahkan.jawatan });
  return d.siap();
}

export interface CuraiPdf {
  mesyuarat: string;
  tarikh: string;
  daripada: { nama: string; jawatan: string };
  helaian: { penerima: string; butir: { no: number; tajuk: string; perbincangan: string; tarikhAkhir: string }[] }[];
}

/** PDF minit curai: satu helaian bagi setiap penerima, dengan ruang maklum balas. */
export async function pdfMinitCurai(k: KepalaSurat, c: CuraiPdf): Promise<Uint8Array> {
  const d = await Dokumen.mula(`Minit curai ${c.mesyuarat}`);
  for (const [i, h] of c.helaian.entries()) {
    if (i > 0) d.halamanBaru();
    await d.kepalaSurat(k);
    d.tajuk('MINIT CURAI');
    d.medan('Kepada', h.penerima);
    d.medan('Daripada', [c.daripada.nama, c.daripada.jawatan].filter(Boolean).join(', '));
    d.medan('Mesyuarat', c.mesyuarat);
    d.medan('Tarikh mesyuarat', c.tarikh);
    d.jarak(3);
    d.perenggan('Mesyuarat telah memutuskan perkara berikut untuk tindakan tuan/puan. Sila ambil tindakan dan kemukakan maklum balas sebelum tarikh akhir yang dinyatakan.');
    d.grid(
      [0.1, 0.62, 0.28],
      [{ sel: ['NO.', 'PERKARA DAN KEPUTUSAN MESYUARAT', 'TARIKH AKHIR'], tebal: true }, ...h.butir.map((b) => ({ sel: [String(b.no), b.perbincangan ? `${b.tajuk}\n${b.perbincangan}` : b.tajuk, b.tarikhAkhir || '-'] }))],
    );
    d.jarak(5);
    d.pastikanRuang(70);
    d.subtajuk('MAKLUM BALAS TINDAKAN');
    d.garisTulis(4);
    d.tandatangan({ tajuk: 'Tandatangan penerima:', nama: '', jawatan: 'Tarikh:' }, { tajuk: 'Urus setia:', nama: c.daripada.nama, jawatan: c.daripada.jawatan });
  }
  return d.siap();
}

/** PDF satu halaman A4 daripada gambar JPEG penuh halaman (digunakan oleh OPR). */
export async function pdfGambarPenuh(jpeg: Uint8Array, tajuk: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(tajuk);
  pdf.setCreator('Guru360');
  pdf.setProducer('Guru360');
  const imej = await pdf.embedJpg(jpeg);
  pdf.addPage([A4.lebar, A4.tinggi]).drawImage(imej, { x: 0, y: 0, width: A4.lebar, height: A4.tinggi });
  return pdf.save();
}

export interface JobskopPdf {
  tahun: number;
  nama: string;
  jawatan: { nama: string; kumpulan: { tajuk: string; tugas: string[] }[] }[];
  disahkan: { nama: string; jawatan: string };
}

export async function pdfJobskop(k: KepalaSurat, j: JobskopPdf): Promise<Uint8Array> {
  const d = await Dokumen.mula(`Jobskop ${j.tahun}`);
  await d.kepalaSurat(k);
  d.tajuk(`SENARAI TUGAS (JOBSKOP) TAHUN ${j.tahun}`);
  d.medan('NAMA', j.nama || '-');
  d.medan('JAWATAN', j.jawatan.map((x, i) => `${i + 1}. ${x.nama}`).join('\n') || '-');
  d.jarak(4);
  j.jawatan.forEach((x, i) => {
    d.pastikanRuang(30);
    d.subtajuk(`${i + 1}.0  ${x.nama}`);
    for (const g of x.kumpulan) {
      if (g.tajuk) {
        d.pastikanRuang(20);
        d.baris(g.tajuk, true);
      }
      d.senarai(g.tugas, (n) => `${n + 1}.`);
    }
  });
  d.tandatangan({ tajuk: 'Disediakan oleh:', nama: j.nama }, { tajuk: 'Disahkan oleh:', nama: j.disahkan.nama, jawatan: j.disahkan.jawatan });
  d.jarak(2);
  d.baris('Senarai tugas berpandukan MySG: Garis Panduan Tadbir Urus Sekolah Rendah KPM.');
  return d.siap();
}
