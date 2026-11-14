import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ralatRangkaian, supabase, terjemahRalat } from './supabase';

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

interface Simpanan {
  data: Profil;
  belumHantar: boolean;
}

const kunci = (uid: string) => `guru360.profil.${uid}`;

function bacaTempatan(uid: string): Simpanan | null {
  try {
    const mentah = localStorage.getItem(kunci(uid));
    return mentah ? (JSON.parse(mentah) as Simpanan) : null;
  } catch {
    return null;
  }
}

function tulisTempatan(uid: string, s: Simpanan) {
  try {
    localStorage.setItem(kunci(uid), JSON.stringify(s));
  } catch {
    /* storan penuh atau disekat: data masih ada dalam ingatan */
  }
}

export type HasilSimpan = { jenis: 'disimpan' } | { jenis: 'menunggu' } | { jenis: 'ralat'; mesej: string };

/**
 * Profil guru. Salinan disimpan dalam telefon supaya boleh dibaca dan diubah tanpa internet;
 * perubahan yang belum sampai ke pelayan dihantar sendiri apabila talian kembali.
 */
export function useProfil(uid: string | null, dalamTalian: boolean) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [sedia, setSedia] = useState(false);
  const [belumHantar, setBelumHantar] = useState(false);
  const sedangHantar = useRef(false);

  const hantar = useCallback(async (id: string, data: Profil): Promise<HasilSimpan> => {
    if (sedangHantar.current) return { jenis: 'menunggu' };
    sedangHantar.current = true;
    try {
      const { error } = await supabase.from('profil').upsert({ id, ...data });
      if (!error) {
        // Jangan tindih jika guru sudah mengubah lagi semasa penghantaran.
        const kini = bacaTempatan(id);
        if (!kini || JSON.stringify(kini.data) === JSON.stringify(data)) {
          tulisTempatan(id, { data, belumHantar: false });
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
  }, []);

  useEffect(() => {
    if (!uid) {
      setProfil(null);
      setSedia(false);
      setBelumHantar(false);
      return;
    }
    let hidup = true;
    const tempatan = bacaTempatan(uid);
    setProfil(tempatan?.data ?? null);
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
        const { data, error } = await supabase.from('profil').select('nama, sekolah, negeri, gred').eq('id', uid).maybeSingle();
        if (hidup && !error && data) {
          const p = data as Profil;
          tulisTempatan(uid, { data: p, belumHantar: false });
          setProfil(p);
        }
      }
      if (hidup) setSedia(true);
    })();
    return () => {
      hidup = false;
    };
  }, [uid, dalamTalian, hantar]);

  const simpan = useCallback(
    async (data: Profil): Promise<HasilSimpan> => {
      if (!uid) return { jenis: 'ralat', mesej: 'Sila log masuk dahulu.' };
      tulisTempatan(uid, { data, belumHantar: true });
      setProfil(data);
      setBelumHantar(true);
      if (!navigator.onLine) return { jenis: 'menunggu' };
      return hantar(uid, data);
    },
    [uid, hantar],
  );

  return { profil, sedia, belumHantar, simpan };
}
