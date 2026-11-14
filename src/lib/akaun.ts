import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useBarisSendiri } from './simpanan';
import { supabase } from './supabase';

export type KeadaanSesi = { status: 'memuat' } | { status: 'tiada' } | { status: 'ada'; sesi: Session };

/** Sesi log masuk. Disimpan dalam telefon, jadi guru kekal log masuk walaupun tanpa internet. */
export function useSesi(): { keadaan: KeadaanSesi; pemulihan: boolean; tamatPemulihan: () => void } {
  const [keadaan, setKeadaan] = useState<KeadaanSesi>({ status: 'memuat' });
  const [pemulihan, setPemulihan] = useState(false);
  useEffect(() => {
    let hidup = true;
    const tetap = (sesi: Session | null) => hidup && setKeadaan(sesi ? { status: 'ada', sesi } : { status: 'tiada' });
    supabase.auth
      .getSession()
      .then(({ data }) => tetap(data.session))
      .catch(() => tetap(null));
    const { data } = supabase.auth.onAuthStateChange((acara, sesi) => {
      if (acara === 'PASSWORD_RECOVERY') setPemulihan(true);
      if (acara === 'SIGNED_OUT') setPemulihan(false);
      tetap(sesi);
    });
    return () => {
      hidup = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return { keadaan, pemulihan, tamatPemulihan: () => setPemulihan(false) };
}

export const NEGERI = [
  'JOHOR',
  'KEDAH',
  'KELANTAN',
  'MELAKA',
  'NEGERI SEMBILAN',
  'PAHANG',
  'PERAK',
  'PERLIS',
  'PULAU PINANG',
  'SABAH',
  'SARAWAK',
  'SELANGOR',
  'TERENGGANU',
  'WP KUALA LUMPUR',
  'WP LABUAN',
  'WP PUTRAJAYA',
] as const;

export interface Profil {
  nama: string;
  sekolah: string;
  negeri: string | null;
  gred: string;
}

export const PROFIL_KOSONG: Profil = { nama: '', sekolah: '', negeri: null, gred: '' };

export type { HasilSimpan } from './simpanan';

/** Profil guru: disimpan dalam telefon dan dihantar ke pelayan apabila ada talian. */
export function useProfil(uid: string | null, dalamTalian: boolean) {
  const { data, sedia, belumHantar, simpan } = useBarisSendiri<Profil>('profil', 'nama, sekolah, negeri, gred', uid, dalamTalian);
  return { profil: data, sedia, belumHantar, simpan };
}
