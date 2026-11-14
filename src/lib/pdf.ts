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
