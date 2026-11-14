import { useCallback, useEffect, useRef, useState } from 'react';
import { ralatRangkaian, supabase, terjemahRalat } from './supabase';

export type HasilSimpan = { jenis: 'disimpan' } | { jenis: 'menunggu' } | { jenis: 'ralat'; mesej: string };

interface Simpanan<T> {
  data: T;
  belumHantar: boolean;
}

export function bacaStoran<T>(kunci: string): T | null {
  try {
    const mentah = localStorage.getItem(kunci);
    return mentah ? (JSON.parse(mentah) as T) : null;
  } catch {
    return null;
  }
}

export function tulisStoran(kunci: string, nilai: unknown): boolean {
  try {
    if (nilai === null) localStorage.removeItem(kunci);
    else localStorage.setItem(kunci, JSON.stringify(nilai));
    return true;
  } catch {
    return false; // storan penuh atau disekat
  }
}

/**
 * Satu baris milik guru (id = id akaun) dalam jadual Supabase, contohnya profil atau templat.
 * Salinan disimpan dalam telefon supaya boleh dibaca dan diubah tanpa internet;
 * perubahan yang belum sampai ke pelayan dihantar sendiri apabila talian kembali.
 */
export function useBarisSendiri<T extends object>(jadual: string, lajur: string, uid: string | null, dalamTalian: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [sedia, setSedia] = useState(false);
  const [belumHantar, setBelumHantar] = useState(false);
  const sedangHantar = useRef(false);
  const kunci = uid ? `guru360.${jadual}.${uid}` : null;

  const hantar = useCallback(
    async (id: string, baris: T): Promise<HasilSimpan> => {
      if (sedangHantar.current) return { jenis: 'menunggu' };
      sedangHantar.current = true;
      const k = `guru360.${jadual}.${id}`;
      try {
        const { error } = await supabase.from(jadual).upsert({ id, ...baris });
        if (!error) {
          // Jangan tindih jika guru sudah mengubah lagi semasa penghantaran.
          const kini = bacaStoran<Simpanan<T>>(k);
          if (!kini || JSON.stringify(kini.data) === JSON.stringify(baris)) {
            tulisStoran(k, { data: baris, belumHantar: false });
            setBelumHantar(false);
          }
          return { jenis: 'disimpan' };
        }
        if (ralatRangkaian(error.message)) return { jenis: 'menunggu' };
        return { jenis: 'ralat', mesej: terjemahRalat(error.message) };
      } catch (e) {
        return ralatRangkaian(String(e)) ? { jenis: 'menunggu' } : { jenis: 'ralat', mesej: terjemahRalat(String(e)) };
      } finally {
        sedangHantar.current = false;
      }
    },
    [jadual],
  );

  useEffect(() => {
    if (!uid || !kunci) {
      setData(null);
      setSedia(false);
      setBelumHantar(false);
      return;
    }
    let hidup = true;
    const tempatan = bacaStoran<Simpanan<T>>(kunci);
    setData(tempatan?.data ?? null);
    setBelumHantar(tempatan?.belumHantar ?? false);
    if (tempatan) setSedia(true);

    if (!dalamTalian) {
      setSedia(true);
      return;
    }
    (async () => {
      if (tempatan?.belumHantar) {
        await hantar(uid, tempatan.data);
      } else {
        const { data: baris, error } = await supabase.from(jadual).select(lajur).eq('id', uid).maybeSingle();
        if (hidup && !error && baris) {
          tulisStoran(kunci, { data: baris, belumHantar: false });
          setData(baris as unknown as T);
        }
      }
      if (hidup) setSedia(true);
    })();
    return () => {
      hidup = false;
    };
  }, [uid, kunci, jadual, lajur, dalamTalian, hantar]);

  const simpan = useCallback(
    async (baris: T): Promise<HasilSimpan> => {
      if (!uid || !kunci) return { jenis: 'ralat', mesej: 'Sila log masuk dahulu.' };
      tulisStoran(kunci, { data: baris, belumHantar: true });
      setData(baris);
      setBelumHantar(true);
      if (!navigator.onLine) return { jenis: 'menunggu' };
      return hantar(uid, baris);
    },
    [uid, kunci, hantar],
  );

  return { data, sedia, belumHantar, simpan };
}
