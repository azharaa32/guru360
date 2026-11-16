import { useEffect, useState } from 'react';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase } from './supabase';

/** Jawatan (portfolio MySG) yang ditetapkan admin sekolah kepada seorang guru bagi satu tahun. */
export interface JawatanDitetapkan {
  id: string;
  sekolah_id: string;
  guru_id: string;
  tahun: number;
  kod: string;
  nama: string;
  butiran: string;
}

export const LAJUR_JAWATAN = 'id, sekolah_id, guru_id, tahun, kod, nama, butiran';

/** Guru: jawatan yang ditetapkan admin kepada saya. Salinan terakhir disimpan dalam telefon. */
export function useJawatanSaya(uid: string | null, dalamTalian: boolean): JawatanDitetapkan[] {
  const [senarai, setSenarai] = useState<JawatanDitetapkan[]>([]);
  useEffect(() => {
    if (!uid) return setSenarai([]);
    const kunci = `guru360.jawatan_guru.${uid}`;
    setSenarai(bacaStoran<JawatanDitetapkan[]>(kunci) ?? []);
    if (!dalamTalian) return;
    let hidup = true;
    void supabase
      .from('jawatan_guru')
      .select(LAJUR_JAWATAN)
      .eq('guru_id', uid)
      .then(({ data, error }) => {
        if (error || !hidup) return;
        const baharu = (data ?? []) as unknown as JawatanDitetapkan[];
        tulisStoran(kunci, baharu);
        setSenarai(baharu);
      });
    return () => {
      hidup = false;
    };
  }, [uid, dalamTalian]);
  return senarai;
}
