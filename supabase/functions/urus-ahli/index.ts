// Keahlian sekolah: admin menjemput, mengeluarkan dan mengingatkan guru; guru meminta dikeluarkan.
// Semua penulisan jadual ahli berlaku di sini dengan kunci perkhidmatan, selepas pemanggil disemak.
import { createClient } from 'npm:@supabase/supabase-js@2';

const APL = 'https://azharaa32.github.io/guru360/';
const HAD_AHLI = 300;
const HAD_INGAT = 60;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const balas = (badan: unknown, status = 200) => new Response(JSON.stringify(badan), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const ralat = (teks: string) => balas({ ok: false, ralat: teks });
const sibuk = () => balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return balas({ ok: false, ralat: 'Kaedah tidak dibenarkan.' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const pengguna = token ? await admin.auth.getUser(token) : null;
  const uid = pengguna?.data.user?.id;
  if (!uid) return balas({ ok: false, ralat: 'Sila log masuk semula.' }, 401);

  let badan: Record<string, unknown>;
  try {
    badan = await req.json();
  } catch {
    return ralat('Permintaan tidak sah.');
  }
  const aksi = badan.aksi;

  // Keahlian aktif pemanggil dan sekolahnya.
  const saya = await admin.from('ahli').select('id, sekolah_id, peranan, sekolah(id, nama, negeri, status)').eq('pengguna_id', uid).eq('status', 'aktif').maybeSingle();
  if (saya.error) return sibuk();
  const ahliSaya = saya.data as { id: string; sekolah_id: string; peranan: string; sekolah: { id: string; nama: string; negeri: string | null; status: string } } | null;
  if (!ahliSaya) return balas({ ok: false, ralat: 'Akaun ini tiada sekolah.' }, 403);

  // --- Guru: minta dikeluarkan atau batalkan permintaan ---
  if (aksi === 'minta_keluar' || aksi === 'batal_minta') {
    if (ahliSaya.peranan !== 'guru') return ralat('Hanya guru boleh meminta dikeluarkan. Admin sekolah perlu menghubungi ibu pejabat.');
    const r = await admin.from('ahli').update({ minta_keluar_pada: aksi === 'minta_keluar' ? new Date().toISOString() : null }).eq('id', ahliSaya.id).eq('status', 'aktif');
    if (r.error) return sibuk();
    return balas({ ok: true });
  }

  // --- Selepas ini: admin sekolah sahaja ---
  if (ahliSaya.peranan !== 'admin') return balas({ ok: false, ralat: 'Hanya admin sekolah boleh melakukan ini.' }, 403);
  const sekolah = ahliSaya.sekolah;

  if (aksi === 'senarai') {
    const s = await admin.rpc('ahli_sekolah_butiran', { p_sekolah: sekolah.id });
    if (s.error) return sibuk();
    return balas({ ok: true, senarai: s.data ?? [] });
  }

  if (sekolah.status !== 'aktif') return ralat('Sekolah anda belum diluluskan oleh ibu pejabat.');

  if (aksi === 'jemput') {
    const emel = typeof badan.emel === 'string' ? badan.emel.trim().toLowerCase() : '';
    if (emel.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emel)) return ralat('Alamat emel tidak sah.');
    const bil = await admin.from('ahli').select('id', { count: 'exact', head: true }).eq('sekolah_id', sekolah.id).eq('status', 'aktif');
    if (bil.error) return sibuk();
    if ((bil.count ?? 0) >= HAD_AHLI) return ralat('Had bilangan ahli sekolah telah dicapai. Hubungi ibu pejabat.');

    const cari = await admin.rpc('cari_pengguna_emel', { p_emel: emel });
    if (cari.error) return sibuk();
    const sedia = ((cari.data ?? []) as { id: string; disahkan: boolean }[])[0] ?? null;

    if (sedia) {
      const hq = await admin.from('ibu_pejabat').select('pengguna_id').eq('pengguna_id', sedia.id).maybeSingle();
      if (hq.error) return sibuk();
      if (hq.data) return ralat('Emel ini akaun ibu pejabat dan tidak boleh dijemput sebagai guru.');
      const lain = await admin.from('ahli').select('sekolah_id').eq('pengguna_id', sedia.id).eq('status', 'aktif').maybeSingle();
      if (lain.error) return sibuk();
      if (lain.data) {
        return ralat(
          (lain.data as { sekolah_id: string }).sekolah_id === sekolah.id
            ? 'Emel ini sudah menjadi ahli sekolah anda.'
            : 'Emel ini masih ahli sekolah lain. Guru itu perlu dikeluarkan dari sekolah lamanya dahulu.',
        );
      }
    }

    let uidGuru = sedia?.id ?? null;
    let emelDihantar = false;
    if (!sedia || !sedia.disahkan) {
      // Akaun baharu, atau akaun yang belum pernah menerima jemputan: hantar (semula) emel jemputan.
      const j = await admin.auth.admin.inviteUserByEmail(emel, { redirectTo: APL });
      if (j.error || !j.data.user) {
        const m = j.error?.message ?? '';
        if (/rate|limit|security/i.test(m)) return ralat('Terlalu banyak emel dihantar. Tunggu sebentar, kemudian cuba lagi.');
        if (/invalid|valid/i.test(m)) return ralat('Alamat emel tidak sah.');
        return balas({ ok: false, ralat: 'Emel jemputan tidak dapat dihantar. Cuba lagi nanti.' }, 500);
      }
      uidGuru = j.data.user.id;
      emelDihantar = true;
    }

    const masuk = await admin.from('ahli').insert({ sekolah_id: sekolah.id, pengguna_id: uidGuru, peranan: 'guru', status: 'aktif' });
    if (masuk.error) {
      if (!sedia && uidGuru) await admin.auth.admin.deleteUser(uidGuru);
      if (masuk.error.code === '23505') return ralat('Emel ini sudah menjadi ahli sebuah sekolah.');
      return sibuk();
    }
    // Profil: tetapkan sekolah baharu; nama sedia ada dikekalkan.
    const ada = await admin.from('profil').select('id').eq('id', uidGuru).maybeSingle();
    const sek = { sekolah: sekolah.nama.slice(0, 160), negeri: sekolah.negeri };
    if (ada.data) await admin.from('profil').update(sek).eq('id', uidGuru);
    else await admin.from('profil').insert({ id: uidGuru, ...sek });
    return balas({ ok: true, emel_dihantar: emelDihantar });
  }

  if (aksi === 'ingatkan') {
    // Peringatan RPH: satu baris dalam jadual peringatan (muncul dalam aplikasi guru) dan satu emel pautan masuk.
    const minggu = typeof badan.minggu === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(badan.minggu) && !Number.isNaN(Date.parse(badan.minggu)) ? badan.minggu : '';
    const diminta = Array.isArray(badan.guru_ids) ? [...new Set(badan.guru_ids.filter((x): x is string => typeof x === 'string' && UUID.test(x)))] : [];
    if (!minggu) return ralat('Minggu tidak sah.');
    if (diminta.length === 0 || diminta.length > HAD_INGAT) return ralat(`Pilih antara 1 hingga ${HAD_INGAT} guru.`);
    const a = await admin.from('ahli').select('pengguna_id').eq('sekolah_id', sekolah.id).eq('peranan', 'guru').eq('status', 'aktif').in('pengguna_id', diminta);
    if (a.error) return sibuk();
    const sah = ((a.data ?? []) as { pengguna_id: string }[]).map((x) => x.pengguna_id);
    if (sah.length === 0) return ralat('Guru ini tidak lagi aktif di sekolah anda. Muat semula senarai.');
    // Guru yang sudah diingatkan dalam 20 jam lepas dilangkau, supaya butang tidak boleh membanjiri guru dengan emel.
    const baru = await admin.from('peringatan').select('guru_id').eq('sekolah_id', sekolah.id).in('guru_id', sah).gte('dihantar_pada', new Date(Date.now() - 20 * 3600 * 1000).toISOString());
    if (baru.error) return sibuk();
    const sudah = new Set(((baru.data ?? []) as { guru_id: string }[]).map((x) => x.guru_id));
    const hantar = sah.filter((id) => !sudah.has(id));
    if (hantar.length === 0) return balas({ ok: true, dihantar: 0, emel: 0, dilangkau: sudah.size });
    const masuk = await admin.from('peringatan').insert(hantar.map((id) => ({ sekolah_id: sekolah.id, guru_id: id, minggu, dihantar_oleh: uid })));
    if (masuk.error) return sibuk();
    let emel = 0;
    for (const id of hantar) {
      const u = await admin.auth.admin.getUserById(id);
      const p = u.data.user;
      // Guru yang belum menerima jemputan tidak dihantar emel peringatan; peringatan menunggunya dalam aplikasi.
      if (u.error || !p?.email || !p.email_confirmed_at) continue;
      const e = await admin.auth.signInWithOtp({ email: p.email, options: { shouldCreateUser: false, emailRedirectTo: APL } });
      if (!e.error) emel += 1;
    }
    return balas({ ok: true, dihantar: hantar.length, emel, dilangkau: sudah.size });
  }

  if (aksi === 'hantar_semula' || aksi === 'keluarkan') {
    const id = typeof badan.ahli_id === 'string' ? badan.ahli_id : '';
    if (!UUID.test(id)) return ralat('Ahli tidak sah.');
    const t = await admin.from('ahli').select('id, pengguna_id, peranan, status').eq('id', id).eq('sekolah_id', sekolah.id).maybeSingle();
    if (t.error) return sibuk();
    const sasaran = t.data as { id: string; pengguna_id: string; peranan: string; status: string } | null;
    if (!sasaran || sasaran.status !== 'aktif' || sasaran.peranan !== 'guru') return ralat('Guru ini tidak lagi aktif di sekolah anda. Muat semula senarai.');

    if (aksi === 'keluarkan') {
      const r = await admin.from('ahli').update({ status: 'keluar', keluar_pada: new Date().toISOString(), minta_keluar_pada: null }).eq('id', id).eq('status', 'aktif');
      if (r.error) return sibuk();
      return balas({ ok: true });
    }

    const u = await admin.auth.admin.getUserById(sasaran.pengguna_id);
    const pengguna = u.data.user;
    if (u.error || !pengguna?.email) return sibuk();
    if (pengguna.email_confirmed_at) return ralat('Guru ini sudah menerima jemputan dan boleh log masuk.');
    const j = await admin.auth.admin.inviteUserByEmail(pengguna.email, { redirectTo: APL });
    if (j.error) {
      if (/rate|limit|security/i.test(j.error.message)) return ralat('Terlalu banyak emel dihantar. Tunggu sebentar, kemudian cuba lagi.');
      return balas({ ok: false, ralat: 'Emel jemputan tidak dapat dihantar. Cuba lagi nanti.' }, 500);
    }
    return balas({ ok: true });
  }

  return ralat('Tindakan tidak dikenali.');
});
