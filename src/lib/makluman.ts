import { maklumkan } from './notifikasi';
import { useCallback, useEffect, useState } from 'react';
import { idBaharu } from './senarai';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase, terjemahRalat } from './supabase';

/** sekolah_id kosong bermaksud dihantar ibu pejabat kepada semua sekolah. */
export interface Makluman {
  id: string;
  sekolah_id: string | null;
  jenis: 'makluman' | 'tindakan';
  tajuk: string;
  tarikh_akhir: string | null;
  dicipta_pada: string;
}

export interface StatusMakluman {
  makluman_id: string;
  guru_id: string;
  sekolah_id: string;
  dibaca_pada: string;
  siap_pada: string | null;
}

export interface MaklumanBaharu {
  jenis: 'makluman' | 'tindakan';
  tajuk: string;
  tarikh_akhir: string | null;
}

interface Simpanan {
  makluman: Makluman[];
  status: StatusMakluman[];
}

const TIADA_TALIAN = 'Tiada sambungan internet. Cuba lagi apabila ada talian.';

/**
 * Makluman dan status yang boleh dilihat akaun ini (peraturan pelayan menentukan barisnya):
 * guru nampak makluman sekolahnya dan ibu pejabat serta status sendiri; admin nampak status guru sekolahnya;
 * ibu pejabat nampak semua. Salinan terakhir disimpan dalam telefon. Menulis memerlukan internet.
 */
export function useMakluman(uid: string | null, dalamTalian: boolean) {
  const [data, setData] = useState<Simpanan>({ makluman: [], status: [] });
  const [sedia, setSedia] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const kunci = uid ? `guru360.makluman.${uid}` : null;

  const muat = useCallback(async () => {
    if (!kunci) return;
    const [m, s] = await Promise.all([
      supabase.from('makluman').select('id, sekolah_id, jenis, tajuk, tarikh_akhir, dicipta_pada'),
      supabase.from('makluman_status').select('makluman_id, guru_id, sekolah_id, dibaca_pada, siap_pada'),
    ]);
    if (m.error || s.error) return;
    const baharu: Simpanan = {
      makluman: ((m.data ?? []) as unknown as Makluman[]).sort((a, b) => b.dicipta_pada.localeCompare(a.dicipta_pada)),
      status: (s.data ?? []) as unknown as StatusMakluman[],
    };
    tulisStoran(kunci, baharu);
    setData(baharu);
    setSedia(true);
  }, [kunci]);

  useEffect(() => {
    if (!kunci) {
      setData({ makluman: [], status: [] });
      setSedia(false);
      return;
    }
    const tempatan = bacaStoran<Simpanan>(kunci);
    setData(tempatan ?? { makluman: [], status: [] });
    setSedia(tempatan !== null);
    if (dalamTalian) void muat();
  }, [kunci, dalamTalian, muat]);

  /** Guru: tanda makluman sebagai sudah dibaca. Senyap jika tiada talian; dicuba lagi apabila skrin dibuka semula. */
  const tandaBaca = useCallback(
    async (ids: string[], sekolahId: string) => {
      if (!uid || !ids.length || !navigator.onLine) return;
      const { error } = await supabase
        .from('makluman_status')
        .upsert(ids.map((id) => ({ makluman_id: id, guru_id: uid, sekolah_id: sekolahId })), { onConflict: 'makluman_id,guru_id,sekolah_id', ignoreDuplicates: true });
      if (!error) await muat();
    },
    [uid, muat],
  );

  /** Guru: tanda tindakan siap, atau batalkan tanda itu. */
  const tandaSiap = useCallback(
    async (id: string, sekolahId: string, siap: boolean) => {
      if (!uid) return;
      if (!navigator.onLine) return setRalat(TIADA_TALIAN);
      setRalat(null);
      const { error } = await supabase
        .from('makluman_status')
        .upsert({ makluman_id: id, guru_id: uid, sekolah_id: sekolahId, siap_pada: siap ? new Date().toISOString() : null }, { onConflict: 'makluman_id,guru_id,sekolah_id' });
      if (error) setRalat(terjemahRalat(error.message));
      await muat();
    },
    [uid, muat],
  );

  /** Admin (skop = id sekolah) atau ibu pejabat (skop = null): hantar makluman atau tindakan. */
  const hantar = useCallback(
    async (skop: string | null, m: MaklumanBaharu): Promise<boolean> => {
      if (!navigator.onLine) {
        setRalat(TIADA_TALIAN);
        return false;
      }
      setRalat(null);
      const id = idBaharu();
      const { error } = await supabase.from('makluman').insert({ id, sekolah_id: skop, jenis: m.jenis, tajuk: m.tajuk, tarikh_akhir: m.tarikh_akhir });
      if (error) setRalat(terjemahRalat(error.message));
      else maklumkan({ aksi: 'makluman', makluman_id: id });
      await muat();
      return !error;
    },
    [muat],
  );

  const padam = useCallback(
    async (id: string) => {
      if (!navigator.onLine) return setRalat(TIADA_TALIAN);
      setRalat(null);
      const { error } = await supabase.from('makluman').delete().in('id', [id]);
      if (error) setRalat(terjemahRalat(error.message));
      await muat();
    },
    [muat],
  );

  return { ...data, sedia, ralat, muat, tandaBaca, tandaSiap, hantar, padam };
}
