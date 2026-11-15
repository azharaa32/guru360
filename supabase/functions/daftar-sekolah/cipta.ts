import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const APL = 'https://azharaa32.github.io/guru360/';
export const NEGERI = [
  'JOHOR', 'KEDAH', 'KELANTAN', 'MELAKA', 'NEGERI SEMBILAN', 'PAHANG', 'PERAK', 'PERLIS', 'PULAU PINANG',
  'SABAH', 'SARAWAK', 'SELANGOR', 'TERENGGANU', 'WP KUALA LUMPUR', 'WP LABUAN', 'WP PUTRAJAYA',
];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const balas = (badan: unknown, status = 200) =>
  new Response(JSON.stringify(badan), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
export const praterbang = () => new Response('ok', { headers: CORS });
export const ralat = (teks: string) => balas({ ok: false, ralat: teks });

/** Klien dengan kunci perkhidmatan; kunci ini hanya wujud di dalam fungsi pelayan. */
export function klienAdmin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface DataSekolah {
  nama: string;
  kod: string;
  negeri: string;
  admin_nama: string;
  emel: string;
}

/** Semak dan bersihkan input; pulangkan teks ralat atau data bersih. */
export function semak(masuk: Record<string, unknown>): DataSekolah | string {
  const t = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
  const nama = t(masuk.nama).toUpperCase();
  const kod = t(masuk.kod).toUpperCase().replace(/\s/g, '');
  const negeri = t(masuk.negeri).toUpperCase();
  const admin_nama = t(masuk.admin_nama).toUpperCase();
  const emel = t(masuk.emel).toLowerCase();
  if (nama.length < 3 || nama.length > 200) return 'Nama sekolah mesti antara 3 hingga 200 aksara.';
  if (!/^[A-Z0-9-]{3,20}$/.test(kod)) return 'Kod sekolah mesti 3 hingga 20 huruf atau nombor.';
  if (!NEGERI.includes(negeri)) return 'Pilih negeri.';
  if (admin_nama.length < 2 || admin_nama.length > 120) return 'Nama admin mesti antara 2 hingga 120 aksara.';
  if (emel.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emel)) return 'Alamat emel tidak sah.';
  return { nama, kod, negeri, admin_nama, emel };
}

/**
 * Cipta sekolah dan jemput admin melalui emel (emel jemputan juga mengesahkan emel itu).
 * Jika langkah selepas jemputan gagal, semuanya digulung balik.
 */
export async function ciptaSekolah(
  admin: SupabaseClient,
  d: DataSekolah,
  status: 'menunggu' | 'aktif',
  cara: 'sendiri' | 'ibu_pejabat',
  penciptaId: string | null,
): Promise<Response> {
  const sama = await admin.from('sekolah').select('id').ilike('kod', d.kod).limit(1);
  if (sama.error) return balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
  if ((sama.data ?? []).length > 0) return ralat('Kod sekolah ini sudah didaftarkan. Hubungi ibu pejabat jika ia sekolah anda.');

  const jemput = await admin.auth.admin.inviteUserByEmail(d.emel, { data: { nama: d.admin_nama }, redirectTo: APL });
  if (jemput.error || !jemput.data.user) {
    const m = jemput.error?.message ?? '';
    if (/already|registered|exists/i.test(m)) return ralat('Emel ini sudah berdaftar. Guna emel lain untuk admin sekolah, atau log masuk.');
    if (/rate|limit|security/i.test(m)) return ralat('Terlalu banyak permintaan. Tunggu sebentar, kemudian cuba lagi.');
    if (/invalid|valid/i.test(m)) return ralat('Alamat emel tidak sah.');
    return balas({ ok: false, ralat: 'Emel jemputan tidak dapat dihantar. Cuba lagi nanti.' }, 500);
  }
  const uid = jemput.data.user.id;

  const gulung = async (sekolahId: string | null) => {
    if (sekolahId) await admin.from('sekolah').delete().eq('id', sekolahId);
    await admin.auth.admin.deleteUser(uid);
  };

  const sek = await admin
    .from('sekolah')
    .insert({
      nama: d.nama,
      kod: d.kod,
      negeri: d.negeri,
      status,
      cara,
      dicipta_oleh: penciptaId ?? uid,
      ...(status === 'aktif' ? { diputuskan_pada: new Date().toISOString(), diputuskan_oleh: penciptaId } : {}),
    })
    .select('id')
    .single();
  if (sek.error || !sek.data) {
    await gulung(null);
    if (sek.error?.code === '23505') return ralat('Kod sekolah ini sudah didaftarkan.');
    return balas({ ok: false, ralat: 'Sekolah tidak dapat didaftarkan. Cuba lagi.' }, 500);
  }
  const sekolahId = sek.data.id as string;

  const ahli = await admin.from('ahli').insert({ sekolah_id: sekolahId, pengguna_id: uid, peranan: 'admin', status: 'aktif' });
  if (ahli.error) {
    await gulung(sekolahId);
    return balas({ ok: false, ralat: 'Sekolah tidak dapat didaftarkan. Cuba lagi.' }, 500);
  }
  const profil = await admin.from('profil').upsert({ id: uid, nama: d.admin_nama.slice(0, 120), sekolah: d.nama.slice(0, 160), negeri: d.negeri });
  if (profil.error) {
    await gulung(sekolahId);
    return balas({ ok: false, ralat: 'Sekolah tidak dapat didaftarkan. Cuba lagi.' }, 500);
  }
  return balas({ ok: true, sekolah_id: sekolahId });
}
