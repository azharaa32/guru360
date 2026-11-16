// Jana PDF daripada dokumen guru di skrin admin sekolah (baca sahaja), dengan cara yang sama seperti skrin guru.
import { TEMPLAT_SURAT, besarkan, isiKertas, isiMinit, isiSurat, kemasKertas, kemasMinit, kemasSurat, type Dokumen } from './dokumen';
import { bacaGambar } from './gambar';
import { isiJobskop, namaPenuh } from './jobskop';
import { NAMA_BULAN, dariTarikh } from './kalendar';
import { isiOpr, kanvasKeJpeg, kemasOpr, lukisOpr } from './opr';
import type { KepalaSurat } from './pdf';

const NAMA_HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const tarikhRasmi = (t: string) => {
  if (!t) return '';
  const d = dariTarikh(t);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
};
const tarikhBerhari = (t: string) => (t ? `${tarikhRasmi(t)} (${NAMA_HARI[dariTarikh(t).getDay()]})` : '');
const julat = (a: string, b: string) => (a && b && b !== a ? `${tarikhRasmi(a)} hingga ${tarikhRasmi(b)}` : tarikhBerhari(a));
const slug = (awalan: string, teks: string, lalai: string) => `${awalan}-${(teks || lalai).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`;

function blobKeDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => gagal(r.error);
    r.readAsDataURL(blob);
  });
}

export interface DokumenAsing {
  id: string;
  guru_id: string;
  jenis: string;
  tajuk: string;
  isi: Record<string, unknown>;
}

/** Laluan gambar OPR yang sah bagi dokumen ini: <id guru>/opr/<id dokumen>/<fail>.jpg. Laluan lain diabaikan. */
export function gambarOpr(d: DokumenAsing): string[] {
  if (d.jenis !== 'opr') return [];
  const awalan = `${d.guru_id}/opr/${d.id}/`;
  return isiOpr(d as unknown as Dokumen).gambar.filter((g) => g.startsWith(awalan) && /^[A-Za-z0-9_-]+\.jpg$/.test(g.slice(awalan.length)));
}

export interface PelanPdf {
  bina: () => Promise<Uint8Array>;
  namaFail: string;
  tajuk: string;
}

/** Sediakan penjanaan PDF bagi satu dokumen guru; null jika jenisnya tidak dikenali. */
export function pelanPdf(d: DokumenAsing, kepala: KepalaSurat, namaGuru: string): PelanPdf | null {
  const dok = d as unknown as Dokumen;
  const tajuk = besarkan(d.tajuk ?? '');
  if (d.jenis === 'kertas_kerja') {
    const b = kemasKertas(isiKertas(dok));
    return {
      bina: async () => (await import('./pdf')).pdfKertasKerja(kepala, { ...b, tajuk, tarikh: julat(b.tarikh, b.tarikh_tamat) }),
      namaFail: slug('kertas-kerja', tajuk, 'baharu'),
      tajuk: `Kertas kerja ${tajuk}`.trim(),
    };
  }
  if (d.jenis === 'surat' || d.jenis === 'memo') {
    const b = kemasSurat(isiSurat(dok));
    const t = TEMPLAT_SURAT[b.templat];
    const perkara = (d.tajuk ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
    return {
      bina: async () =>
        (await import('./pdf')).pdfSurat(kepala, {
          templat: b.templat,
          rujukan: b.rujukan,
          tarikh: tarikhRasmi(b.tarikh),
          kepada: b.kepada,
          daripada: b.daripada,
          perkara,
          pembuka: b.pembuka,
          butiran: t.adaButiran ? { tarikh: tarikhBerhari(b.acara_tarikh), masa: b.acara_masa, tempat: b.acara_tempat } : null,
          labelSenarai: t.labelSenarai,
          senarai: b.senarai,
          penutup: b.penutup,
          penandatangan: b.penandatangan,
        }),
      namaFail: slug(b.templat === 'memo' ? 'memo' : 'surat', perkara, 'baharu'),
      tajuk: `${t.nama}: ${perkara}`.trim(),
    };
  }
  if (d.jenis === 'minit') {
    const b = kemasMinit(isiMinit(dok));
    return {
      bina: async () =>
        (await import('./pdf')).pdfMinit(kepala, {
          tajuk,
          tarikh: tarikhBerhari(b.tarikh),
          masa: b.masa,
          tempat: b.tempat,
          hadir: b.kehadiran.filter((h) => h.hadir),
          tidakHadir: b.kehadiran.filter((h) => !h.hadir),
          agenda: b.agenda.map((a) => ({
            tajuk: a.tajuk,
            perbincangan: a.perbincangan,
            tindakan: a.jenis === 'tindakan' ? `TINDAKAN: ${a.tindakan_oleh || '-'}${a.tarikh_akhir ? `\nSEBELUM ${tarikhRasmi(a.tarikh_akhir).toUpperCase()}` : ''}` : 'MAKLUMAN',
          })),
          penutup: b.penutup,
          disediakan: b.disediakan,
          disahkan: b.disahkan,
        }),
      namaFail: slug('minit', tajuk, 'mesyuarat'),
      tajuk: `Minit ${tajuk}`.trim(),
    };
  }
  if (d.jenis === 'jobskop') {
    const i = isiJobskop(dok);
    return {
      bina: async () =>
        (await import('./pdf')).pdfJobskop(kepala, {
          tahun: i.tahun,
          nama: namaGuru.toUpperCase(),
          jawatan: i.jawatan.map((j) => ({ kod: j.kod, nama: namaPenuh(j).toUpperCase(), kumpulan: j.kumpulan })),
          disahkan: { nama: i.disahkan.nama.trim().toUpperCase(), jawatan: i.disahkan.jawatan.trim().toUpperCase() },
        }),
      namaFail: `jobskop-${i.tahun}.pdf`,
      tajuk: `Jobskop ${i.tahun} ${namaGuru}`.trim(),
    };
  }
  if (d.jenis === 'opr') {
    const b = kemasOpr(isiOpr(dok));
    const laluan = gambarOpr(d);
    const hbesar = (t: string) => tarikhRasmi(t).toUpperCase();
    return {
      bina: async () => {
        const gambar: string[] = [];
        for (const g of laluan) {
          const blob = await bacaGambar(g);
          if (blob) gambar.push(await blobKeDataUrl(blob));
        }
        const kanvas = await lukisOpr({
          kepala: { nama_sekolah: kepala.nama_sekolah, alamat: kepala.alamat, telefon: kepala.telefon, emel: kepala.emel, logoKiri: kepala.logoKiri, logoKanan: kepala.logoKanan },
          tajuk,
          tarikh: b.tarikh && b.tarikh_tamat && b.tarikh_tamat !== b.tarikh ? `${hbesar(b.tarikh)} HINGGA ${hbesar(b.tarikh_tamat)}` : hbesar(b.tarikh),
          masa: b.masa,
          tempat: b.tempat,
          sasaran: b.sasaran,
          ringkasan: b.ringkasan,
          impak: b.impak,
          penambahbaikan: b.penambahbaikan,
          gambar,
          disediakan: b.disediakan,
        });
        return (await import('./pdf')).pdfGambarPenuh(await kanvasKeJpeg(kanvas), `OPR ${tajuk}`);
      },
      namaFail: slug('opr', tajuk, 'program'),
      tajuk: `OPR ${tajuk}`.trim(),
    };
  }
  return null;
}
