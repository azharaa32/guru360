import { useCallback, useEffect, useState } from 'react';
import { idBaharu } from './senarai';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase, terjemahRalat } from './supabase';

export type Kategori = 'utama' | 'kurikulum' | 'kokurikulum' | 'hem';
export const KATEGORI: { id: Kategori; nama: string }[] = [
  { id: 'utama', nama: 'Utama' },
  { id: 'kurikulum', nama: 'Kurikulum' },
  { id: 'kokurikulum', nama: 'Kokurikulum' },
  { id: 'hem', nama: 'HEM' },
];

/** sekolah_id kosong bermaksud diletak ibu pejabat untuk semua sekolah. */
export interface Pautan {
  id: string;
  sekolah_id: string | null;
  kategori: Kategori;
  tajuk: string;
  url: string;
  susunan: number;
}

export interface PautanBaharu {
  kategori: Kategori;
  tajuk: string;
  url: string;
}

const TIADA_TALIAN = 'Tiada sambungan internet. Cuba lagi apabila ada talian.';

/**
 * Bersihkan alamat yang ditaip: tambah https:// jika tiada. Pulangkan null jika alamat tidak sah atau bukan https
 * (pautan http, javascript: dan seumpamanya tidak diterima).
 */
export function bersihUrl(teks: string): string | null {
  let t = teks.trim().replace(/\s+/g, '');
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t.replace(/^\/+/, '')}`;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:' || !u.hostname.includes('.') || t.length > 500) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Nama laman untuk dipaparkan di bawah tajuk, contohnya "delima.edu.my". */
export function namaLaman(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Susunan paparan: ikut kategori, pautan ibu pejabat dahulu, kemudian ikut susunan yang ditetapkan admin. */
export function susunPautan(senarai: Pautan[]): Pautan[] {
  const k = (x: Pautan) => KATEGORI.findIndex((c) => c.id === x.kategori);
  return [...senarai].sort((a, b) => k(a) - k(b) || Number(a.sekolah_id !== null) - Number(b.sekolah_id !== null) || a.susunan - b.susunan || a.tajuk.localeCompare(b.tajuk));
}

/**
 * Pautan yang boleh dilihat akaun ini (peraturan pelayan menentukan barisnya): guru nampak pautan sekolahnya dan
 * ibu pejabat; ibu pejabat nampak semua. Salinan terakhir disimpan dalam telefon. Menulis memerlukan internet.
 */
export function usePautan(uid: string | null, dalamTalian: boolean) {
  const [pautan, setPautan] = useState<Pautan[]>([]);
  const [sedia, setSedia] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const kunci = uid ? `guru360.pautan.${uid}` : null;

  const muat = useCallback(async () => {
    if (!kunci) return;
    const { data, error } = await supabase.from('pautan').select('id, sekolah_id, kategori, tajuk, url, susunan');
    if (error) return;
    const baharu = susunPautan((data ?? []) as unknown as Pautan[]);
    tulisStoran(kunci, baharu);
    setPautan(baharu);
    setSedia(true);
  }, [kunci]);

  useEffect(() => {
    if (!kunci) {
      setPautan([]);
      setSedia(false);
      return;
    }
    const tempatan = bacaStoran<Pautan[]>(kunci);
    setPautan(tempatan ?? []);
    setSedia(tempatan !== null);
    if (dalamTalian) void muat();
  }, [kunci, dalamTalian, muat]);

  const tulis = useCallback(
    async (kerja: () => PromiseLike<{ error: { message: string } | null }>): Promise<boolean> => {
      if (!navigator.onLine) {
        setRalat(TIADA_TALIAN);
        return false;
      }
      setRalat(null);
      const { error } = await kerja();
      if (error) setRalat(terjemahRalat(error.message));
      await muat();
      return !error;
    },
    [muat],
  );

  /** Admin (skop = id sekolah) atau ibu pejabat (skop = null): tambah pautan di hujung kategorinya. */
  const tambah = useCallback(
    (skop: string | null, p: PautanBaharu) => {
      const akhir = Math.max(0, ...pautan.filter((x) => x.sekolah_id === skop && x.kategori === p.kategori).map((x) => x.susunan));
      return tulis(() => supabase.from('pautan').insert({ id: idBaharu(), sekolah_id: skop, kategori: p.kategori, tajuk: p.tajuk, url: p.url, susunan: akhir + 1 }));
    },
    [pautan, tulis],
  );

  const ubah = useCallback(
    (id: string, p: PautanBaharu) => {
      const lama = pautan.find((x) => x.id === id);
      const susunan = lama && lama.kategori !== p.kategori ? Math.max(0, ...pautan.filter((x) => x.sekolah_id === lama.sekolah_id && x.kategori === p.kategori).map((x) => x.susunan)) + 1 : lama?.susunan;
      return tulis(() => supabase.from('pautan').update({ kategori: p.kategori, tajuk: p.tajuk, url: p.url, susunan }).in('id', [id]));
    },
    [pautan, tulis],
  );

  const padam = useCallback((id: string) => tulis(() => supabase.from('pautan').delete().in('id', [id])), [tulis]);

  /** Tukar kedudukan dua pautan dalam kategori yang sama. */
  const tukarTempat = useCallback(
    async (a: Pautan, b: Pautan) => {
      const sa = a.susunan === b.susunan ? b.susunan + 1 : b.susunan;
      const ok = await tulis(() => supabase.from('pautan').update({ susunan: sa }).in('id', [a.id]));
      if (ok) await tulis(() => supabase.from('pautan').update({ susunan: a.susunan }).in('id', [b.id]));
    },
    [tulis],
  );

  return { pautan, sedia, ralat, muat, tambah, ubah, padam, tukarTempat };
}
