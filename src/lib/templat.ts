import { useCallback, useEffect, useRef, useState } from 'react';
import { bacaStoran, tulisStoran, useBarisSendiri, type HasilSimpan } from './simpanan';
import { supabase } from './supabase';

export interface Templat {
  nama_sekolah: string;
  alamat: string;
  telefon: string;
  emel: string;
  kod_sekolah: string;
  logo_kiri: string | null;
  logo_kanan: string | null;
}

export const TEMPLAT_KOSONG: Templat = {
  nama_sekolah: '',
  alamat: '',
  telefon: '',
  emel: '',
  kod_sekolah: '',
  logo_kiri: null,
  logo_kanan: null,
};

export type Sisi = 'kiri' | 'kanan';
export type Logo = Record<Sisi, string | null>;
type Tertunda = Partial<Record<Sisi, 'muat' | 'padam'>>;

const BALDI = 'fail';
const SAIZ_LOGO = 400;
const laluanLogo = (uid: string, sisi: Sisi) => `${uid}/logo-${sisi}.png`;
const kunciLogo = (uid: string, sisi: Sisi) => `guru360.logo.${uid}.${sisi}`;
const kunciTertunda = (uid: string) => `guru360.logo.${uid}.tertunda`;

/** Kecilkan gambar kepada PNG paling besar 400px supaya ringan disimpan dan dicetak. */
export async function kecilkanGambar(fail: File): Promise<string> {
  if (!fail.type.startsWith('image/')) throw new Error('Sila pilih fail gambar (PNG atau JPG).');
  const url = URL.createObjectURL(fail);
  try {
    const imej = await new Promise<HTMLImageElement>((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => gagal(new Error('Gambar ini tidak dapat dibaca. Cuba gambar lain.'));
      i.src = url;
    });
    const nisbah = Math.min(1, SAIZ_LOGO / Math.max(imej.naturalWidth, imej.naturalHeight));
    const kanvas = document.createElement('canvas');
    kanvas.width = Math.max(1, Math.round(imej.naturalWidth * nisbah));
    kanvas.height = Math.max(1, Math.round(imej.naturalHeight * nisbah));
    const ctx = kanvas.getContext('2d');
    if (!ctx) throw new Error('Gambar tidak dapat diproses pada telefon ini.');
    ctx.drawImage(imej, 0, 0, kanvas.width, kanvas.height);
    return kanvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function dataUrlKeBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

function blobKeDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, gagal) => {
    const pembaca = new FileReader();
    pembaca.onload = () => ok(String(pembaca.result));
    pembaca.onerror = () => gagal(pembaca.error);
    pembaca.readAsDataURL(blob);
  });
}

/**
 * Templat sekolah, dikongsi satu sekolah: teks kepala surat dalam jadual `templat_sekolah` (id = id sekolah),
 * logo dalam simpanan fail di bawah folder bernama id sekolah. Admin sekolah menulis; guru membaca sahaja.
 * Logo juga disimpan dalam telefon supaya PDF boleh dijana tanpa internet.
 */
export function useTemplat(uid: string | null, dalamTalian: boolean) {
  const { data, sedia, belumHantar, simpan } = useBarisSendiri<Templat>(
    'templat_sekolah',
    'nama_sekolah, alamat, telefon, emel, kod_sekolah, logo_kiri, logo_kanan',
    uid,
    dalamTalian,
  );
  const [logo, setLogo] = useState<Logo>({ kiri: null, kanan: null });
  const [logoTertunda, setLogoTertunda] = useState(false);
  const sibuk = useRef(false);

  // Hantar logo yang dipilih semasa tiada talian.
  const segerak = useCallback(async (id: string) => {
    if (sibuk.current || !navigator.onLine) return;
    sibuk.current = true;
    try {
      const tertunda = bacaStoran<Tertunda>(kunciTertunda(id)) ?? {};
      for (const sisi of ['kiri', 'kanan'] as Sisi[]) {
        const tindakan = tertunda[sisi];
        if (!tindakan) continue;
        let ralat: { message: string } | null = null;
        if (tindakan === 'muat') {
          const dataUrl = bacaStoran<string>(kunciLogo(id, sisi));
          if (dataUrl) {
            const hasil = await supabase.storage
              .from(BALDI)
              .upload(laluanLogo(id, sisi), await dataUrlKeBlob(dataUrl), { contentType: 'image/png', upsert: true });
            ralat = hasil.error;
          }
        } else {
          ralat = (await supabase.storage.from(BALDI).remove([laluanLogo(id, sisi)])).error;
        }
        if (ralat) break; // cuba lagi apabila talian kembali
        const baki = bacaStoran<Tertunda>(kunciTertunda(id)) ?? {};
        if (baki[sisi] === tindakan) delete baki[sisi];
        tulisStoran(kunciTertunda(id), Object.keys(baki).length ? baki : null);
      }
      setLogoTertunda(Object.keys(bacaStoran<Tertunda>(kunciTertunda(id)) ?? {}).length > 0);
    } catch {
      /* tiada talian: kekal tertunda */
    } finally {
      sibuk.current = false;
    }
  }, []);

  // Muat logo dari telefon; jika tiada (telefon baharu), ambil dari pelayan.
  useEffect(() => {
    if (!uid) {
      setLogo({ kiri: null, kanan: null });
      setLogoTertunda(false);
      return;
    }
    let hidup = true;
    const tertunda = bacaStoran<Tertunda>(kunciTertunda(uid)) ?? {};
    setLogoTertunda(Object.keys(tertunda).length > 0);
    setLogo({ kiri: bacaStoran<string>(kunciLogo(uid, 'kiri')), kanan: bacaStoran<string>(kunciLogo(uid, 'kanan')) });
    if (!dalamTalian) return;
    (async () => {
      await segerak(uid);
      for (const sisi of ['kiri', 'kanan'] as Sisi[]) {
        const laluan = sisi === 'kiri' ? data?.logo_kiri : data?.logo_kanan;
        if (!laluan || bacaStoran<string>(kunciLogo(uid, sisi)) || tertunda[sisi]) continue;
        const { data: blob, error } = await supabase.storage.from(BALDI).download(laluan);
        if (error || !blob || !hidup) continue;
        const dataUrl = await blobKeDataUrl(blob);
        tulisStoran(kunciLogo(uid, sisi), dataUrl);
        if (hidup) setLogo((l) => ({ ...l, [sisi]: dataUrl }));
      }
    })();
    return () => {
      hidup = false;
    };
  }, [uid, dalamTalian, data?.logo_kiri, data?.logo_kanan, segerak]);

  const tetapLogo = useCallback(
    async (sisi: Sisi, dataUrl: string | null): Promise<HasilSimpan> => {
      if (!uid) return { jenis: 'ralat', mesej: 'Sila log masuk dahulu.' };
      if (!tulisStoran(kunciLogo(uid, sisi), dataUrl))
        return { jenis: 'ralat', mesej: 'Storan telefon penuh. Logo tidak dapat disimpan.' };
      const tertunda = bacaStoran<Tertunda>(kunciTertunda(uid)) ?? {};
      tertunda[sisi] = dataUrl ? 'muat' : 'padam';
      tulisStoran(kunciTertunda(uid), tertunda);
      setLogo((l) => ({ ...l, [sisi]: dataUrl }));
      setLogoTertunda(true);
      const laluan = dataUrl ? laluanLogo(uid, sisi) : null;
      const hasil = await simpan({ ...(data ?? TEMPLAT_KOSONG), [sisi === 'kiri' ? 'logo_kiri' : 'logo_kanan']: laluan });
      await segerak(uid);
      return hasil;
    },
    [uid, data, simpan, segerak],
  );

  return { templat: data, sedia, belumHantar: belumHantar || logoTertunda, simpan, logo, tetapLogo };
}
