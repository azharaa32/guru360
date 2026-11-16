import { useCallback, useEffect, useState } from 'react';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase } from './supabase';

/** Peringatan RPH daripada admin sekolah kepada seorang guru bagi satu minggu. */
export interface Peringatan {
  id: string;
  sekolah_id: string;
  guru_id: string;
  /** Hari pertama minggu persekolahan yang dimaksudkan. */
  minggu: string;
  dihantar_pada: string;
  dibaca_pada: string | null;
}

const LAJUR = 'id, sekolah_id, guru_id, minggu, dihantar_pada, dibaca_pada';

/** Guru: peringatan yang belum ditanda faham. Salinan terakhir disimpan dalam telefon. */
export function usePeringatanSaya(uid: string | null, dalamTalian: boolean) {
  const [senarai, setSenarai] = useState<Peringatan[]>([]);
  const kunci = uid ? `guru360.peringatan.${uid}` : null;
  useEffect(() => {
    if (!uid || !kunci) return setSenarai([]);
    setSenarai(bacaStoran<Peringatan[]>(kunci) ?? []);
    if (!dalamTalian) return;
    let hidup = true;
    void supabase
      .from('peringatan')
      .select(LAJUR)
      .eq('guru_id', uid)
      .then(({ data, error }) => {
        if (error || !hidup) return;
        const baharu = ((data ?? []) as unknown as Peringatan[]).filter((p) => !p.dibaca_pada);
        tulisStoran(kunci, baharu);
        setSenarai(baharu);
      });
    return () => {
      hidup = false;
    };
  }, [uid, kunci, dalamTalian]);

  /** Tanda semua peringatan sebagai sudah dibaca. Perlu internet; jika tiada, kad kekal sehingga ada talian. */
  const tandaBaca = useCallback(async () => {
    if (!kunci || senarai.length === 0 || !navigator.onLine) return;
    const { error } = await supabase
      .from('peringatan')
      .update({ dibaca_pada: new Date().toISOString() })
      .in('id', senarai.map((p) => p.id));
    if (error) return;
    tulisStoran(kunci, []);
    setSenarai([]);
  }, [kunci, senarai]);

  return { peringatan: senarai, tandaBaca };
}
