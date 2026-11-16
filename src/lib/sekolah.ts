import { useEffect, useState } from 'react';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase } from './supabase';

export interface Sekolah {
  id: string;
  nama: string;
  kod: string;
  negeri: string | null;
  status: 'menunggu' | 'aktif' | 'ditolak';
}

export interface AhliSekolah {
  sekolah_id: string;
  pengguna_id: string;
  peranan: 'admin' | 'guru';
  status: 'aktif' | 'keluar';
  minta_keluar_pada?: string | null;
}

export interface Keahlian {
  /** Peranan dalam sekolah sendiri; null jika akaun tidak berada di bawah mana-mana sekolah. */
  peranan: 'admin' | 'guru' | null;
  sekolah: Sekolah | null;
  ibuPejabat: boolean;
  /** Untuk admin: ahli sekolahnya. Untuk ibu pejabat: semua sekolah dan ahlinya. */
  semuaSekolah: Sekolah[];
  ahli: AhliSekolah[];
  /** Guru ini sudah meminta admin mengeluarkannya dari sekolah. */
  mintaKeluar?: boolean;
}

const KOSONG: Keahlian = { peranan: null, sekolah: null, ibuPejabat: false, semuaSekolah: [], ahli: [] };
const LAJUR_SEKOLAH = 'id, nama, kod, negeri, status';
const LAJUR_AHLI = 'sekolah_id, pengguna_id, peranan, status, minta_keluar_pada';

async function muat(uid: string): Promise<Keahlian> {
  const [saya, hq] = await Promise.all([
    supabase.from('ahli').select(LAJUR_AHLI).eq('pengguna_id', uid),
    supabase.from('ibu_pejabat').select('pengguna_id').eq('pengguna_id', uid).maybeSingle(),
  ]);
  if (saya.error) throw new Error(saya.error.message);
  if (hq.error) throw new Error(hq.error.message);
  const aktif = ((saya.data ?? []) as unknown as AhliSekolah[]).find((a) => a.status === 'aktif') ?? null;
  const ibuPejabat = hq.data !== null;
  const pengurusan = ibuPejabat || aktif?.peranan === 'admin';

  // Peraturan akses di pelayan menentukan baris yang pulang: sekolah sendiri bagi guru dan admin, semua sekolah bagi ibu pejabat.
  const sekolah = await supabase.from('sekolah').select(LAJUR_SEKOLAH);
  if (sekolah.error) throw new Error(sekolah.error.message);
  const semuaSekolah = ((sekolah.data ?? []) as unknown as Sekolah[]).sort((x, y) => x.nama.localeCompare(y.nama));
  let ahli: AhliSekolah[] = [];
  if (pengurusan) {
    const semua = await supabase.from('ahli').select(LAJUR_AHLI);
    if (semua.error) throw new Error(semua.error.message);
    ahli = (semua.data ?? []) as unknown as AhliSekolah[];
  }
  return { peranan: aktif?.peranan ?? null, sekolah: semuaSekolah.find((s) => s.id === aktif?.sekolah_id) ?? null, ibuPejabat, semuaSekolah, ahli, mintaKeluar: !!aktif?.minta_keluar_pada };
}

/** Sekolah dan peranan pengguna. Salinan terakhir disimpan dalam telefon supaya aplikasi dibuka tanpa internet. */
export function useKeahlian(uid: string | null, dalamTalian: boolean) {
  const [keahlian, setKeahlian] = useState<Keahlian>(KOSONG);
  const [sedia, setSedia] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const [pusingan, setPusingan] = useState(0);

  useEffect(() => {
    if (!uid) {
      setKeahlian(KOSONG);
      setSedia(false);
      return;
    }
    const kunci = `guru360.keahlian.${uid}`;
    const tempatan = bacaStoran<Keahlian>(kunci);
    if (tempatan) {
      setKeahlian(tempatan);
      setSedia(true);
    } else {
      setSedia(false);
    }
    if (!dalamTalian) {
      if (!tempatan) setRalat('Sambung internet sekali untuk mengesahkan sekolah anda.');
      return;
    }
    let hidup = true;
    setRalat(null);
    muat(uid).then(
      (k) => {
        if (!hidup) return;
        tulisStoran(kunci, k);
        setKeahlian(k);
        setSedia(true);
      },
      () => {
        if (hidup && !tempatan) setRalat('Maklumat sekolah tidak dapat dimuat. Cuba lagi.');
      },
    );
    return () => {
      hidup = false;
    };
  }, [uid, dalamTalian, pusingan]);

  return { keahlian, sedia, ralat, cubaLagi: () => setPusingan((n) => n + 1) };
}

export const NAMA_STATUS: Record<Sekolah['status'], string> = { aktif: 'Aktif', menunggu: 'Menunggu kelulusan', ditolak: 'Ditolak' };

export function namaPeranan(k: Keahlian): string {
  const p: string[] = [];
  if (k.ibuPejabat) p.push('Ibu pejabat');
  if (k.peranan === 'admin') p.push('Admin sekolah');
  if (k.peranan === 'guru') p.push('Guru');
  return p.join(' · ') || 'Tiada';
}

export interface DataSekolahBaru {
  nama: string;
  kod: string;
  negeri: string;
  admin_nama: string;
  emel: string;
}

export interface Permohonan {
  id: string;
  nama: string;
  kod: string;
  negeri: string | null;
  dicipta_pada: string;
  admin_nama: string;
  admin_emel: string;
}

export type Hasil<T extends object = object> = ({ ok: true } & T) | { ok: false; ralat: string };

/** Panggil fungsi pelayan; pulangkan hasil atau teks ralat yang boleh dipaparkan kepada pengguna. */
async function panggil<T extends object = object>(fungsi: string, badan: object): Promise<Hasil<T>> {
  if (!navigator.onLine) return { ok: false, ralat: 'Tiada sambungan internet. Cuba lagi apabila ada talian.' };
  try {
    const { data, error } = await supabase.functions.invoke(fungsi, { body: badan });
    if (data && typeof data === 'object' && 'ok' in data) return data as Hasil<T>;
    const konteks = (error as { context?: Response } | null)?.context;
    if (konteks && typeof konteks.json === 'function') {
      const j = (await konteks.json().catch(() => null)) as { ralat?: string } | null;
      if (j?.ralat) return { ok: false, ralat: j.ralat };
    }
    return { ok: false, ralat: 'Pelayan tidak menjawab. Cuba lagi sebentar.' };
  } catch {
    return { ok: false, ralat: 'Tiada sambungan internet. Cuba lagi apabila ada talian.' };
  }
}

/** Orang awam mendaftar sekolah; sekolah menunggu kelulusan ibu pejabat. */
export const daftarSekolah = (d: DataSekolahBaru) => panggil('daftar-sekolah', d);
export const senaraiMenunggu = () => panggil<{ senarai: Permohonan[] }>('urus-sekolah', { aksi: 'menunggu' });
export const putusSekolah = (aksi: 'lulus' | 'tolak', sekolahId: string) => panggil('urus-sekolah', { aksi, sekolah_id: sekolahId });
export const ciptaSekolah = (d: DataSekolahBaru) => panggil('urus-sekolah', { aksi: 'cipta', ...d });

export interface ButiranAhli {
  id: string;
  pengguna_id: string;
  peranan: 'admin' | 'guru';
  status: 'aktif' | 'keluar';
  masuk_pada: string;
  keluar_pada: string | null;
  minta_keluar_pada: string | null;
  nama: string;
  emel: string;
  /** Guru sudah membuka pautan jemputan dan menetapkan kata laluan. */
  diterima: boolean;
}

export const senaraiAhli = () => panggil<{ senarai: ButiranAhli[] }>('urus-ahli', { aksi: 'senarai' });
export const jemputGuru = (emel: string) => panggil<{ emel_dihantar: boolean }>('urus-ahli', { aksi: 'jemput', emel });
export const hantarSemulaJemputan = (ahliId: string) => panggil('urus-ahli', { aksi: 'hantar_semula', ahli_id: ahliId });
export const keluarkanGuru = (ahliId: string) => panggil('urus-ahli', { aksi: 'keluarkan', ahli_id: ahliId });
export const mintaKeluar = (minta: boolean) => panggil('urus-ahli', { aksi: minta ? 'minta_keluar' : 'batal_minta' });

/** Ibu pejabat: ahli mana-mana sekolah bersama nama dan emel. */
export async function ahliSekolahHq(sekolahId: string): Promise<Hasil<{ senarai: ButiranAhli[] }>> {
  const { data, error } = await supabase.rpc('butiran_sekolah_hq', { p_sekolah: sekolahId });
  if (error) return { ok: false, ralat: 'Senarai guru tidak dapat dimuat.' };
  return { ok: true, senarai: (data ?? []) as unknown as ButiranAhli[] };
}
