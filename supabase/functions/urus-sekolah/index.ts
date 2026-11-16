// Tindakan ibu pejabat: senarai permohonan, lulus, tolak, cipta dan padam sekolah. Pemanggil mesti akaun ibu pejabat.
import { balas, ciptaSekolah, klienAdmin, praterbang, ralat, semak } from './cipta.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return praterbang();
  if (req.method !== 'POST') return balas({ ok: false, ralat: 'Kaedah tidak dibenarkan.' }, 405);
  const admin = klienAdmin();
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const pengguna = token ? await admin.auth.getUser(token) : null;
  const uid = pengguna?.data.user?.id;
  if (!uid) return balas({ ok: false, ralat: 'Sila log masuk semula.' }, 401);
  const hq = await admin.from('ibu_pejabat').select('pengguna_id').eq('pengguna_id', uid).maybeSingle();
  if (hq.error) return balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
  if (!hq.data) return balas({ ok: false, ralat: 'Hanya ibu pejabat boleh melakukan ini.' }, 403);

  let badan: Record<string, unknown>;
  try {
    badan = await req.json();
  } catch {
    return ralat('Permintaan tidak sah.');
  }
  const aksi = badan.aksi;

  if (aksi === 'menunggu') {
    const s = await admin
      .from('sekolah')
      .select('id, nama, kod, negeri, dicipta_pada, ahli(pengguna_id, peranan, status)')
      .eq('status', 'menunggu')
      .order('dicipta_pada');
    if (s.error) return balas({ ok: false, ralat: 'Senarai tidak dapat dimuat.' }, 500);
    const senarai = [];
    for (const x of s.data ?? []) {
      const a = ((x as { ahli: { pengguna_id: string; peranan: string; status: string }[] }).ahli ?? []).find((y) => y.peranan === 'admin' && y.status === 'aktif');
      let admin_nama = '';
      let admin_emel = '';
      if (a) {
        const u = await admin.auth.admin.getUserById(a.pengguna_id);
        admin_emel = u.data.user?.email ?? '';
        const p = await admin.from('profil').select('nama').eq('id', a.pengguna_id).maybeSingle();
        admin_nama = (p.data as { nama?: string } | null)?.nama ?? '';
      }
      senarai.push({ id: x.id, nama: x.nama, kod: x.kod, negeri: x.negeri, dicipta_pada: x.dicipta_pada, admin_nama, admin_emel });
    }
    return balas({ ok: true, senarai });
  }

  if (aksi === 'lulus' || aksi === 'tolak') {
    const id = typeof badan.sekolah_id === 'string' ? badan.sekolah_id : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return ralat('Sekolah tidak sah.');
    const baharu = aksi === 'lulus' ? 'aktif' : 'ditolak';
    const dibenarkan = aksi === 'lulus' ? ['menunggu', 'ditolak'] : ['menunggu'];
    const r = await admin
      .from('sekolah')
      .update({ status: baharu, diputuskan_pada: new Date().toISOString(), diputuskan_oleh: uid })
      .eq('id', id)
      .in('status', dibenarkan)
      .select('id');
    if (r.error) return balas({ ok: false, ralat: 'Tidak berjaya. Cuba lagi.' }, 500);
    if ((r.data ?? []).length === 0) return ralat('Status sekolah ini sudah berubah. Muat semula senarai.');
    return balas({ ok: true });
  }

  if (aksi === 'cipta') {
    const d = semak(badan);
    if (typeof d === 'string') return ralat(d);
    return await ciptaSekolah(admin, d, 'aktif', 'ibu_pejabat', uid);
  }

  if (aksi === 'padam') {
    // Memadam sekolah bersama semua datanya. Tidak boleh dipulihkan, jadi kod sekolah mesti ditaip semula.
    const id = typeof badan.sekolah_id === 'string' ? badan.sekolah_id : '';
    const kod = typeof badan.kod === 'string' ? badan.kod.trim().toUpperCase() : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return ralat('Sekolah tidak sah.');
    const s = await admin.from('sekolah').select('id, kod').eq('id', id).maybeSingle();
    if (s.error) return balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
    if (!s.data) return ralat('Sekolah ini sudah tiada. Muat semula senarai.');
    if (!kod || kod !== String((s.data as { kod: string }).kod).toUpperCase()) return ralat('Kod sekolah yang ditaip tidak sepadan.');
    const saya = await admin.from('ahli').select('id').eq('sekolah_id', id).eq('pengguna_id', uid).eq('status', 'aktif').maybeSingle();
    if (saya.error) return balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
    if (saya.data) return ralat('Anda admin sekolah ini. Sekolah sendiri tidak boleh dipadam dari sini.');

    // Fail dalam folder sekolah (logo). Kegagalan di sini tidak menghalang pemadaman data.
    const fail = await admin.storage.from('fail').list(id, { limit: 100 });
    if (!fail.error && fail.data.length) await admin.storage.from('fail').remove(fail.data.map((f) => `${id}/${f.name}`));

    // Semua jadual yang merujuk sekolah (ahli, RPH, dokumen, program, cuti, makluman, jawatan, templat) ikut terpadam.
    const r = await admin.from('sekolah').delete().eq('id', id).select('id');
    if (r.error) return balas({ ok: false, ralat: 'Sekolah tidak dapat dipadam. Cuba lagi.' }, 500);
    if ((r.data ?? []).length === 0) return ralat('Sekolah ini sudah tiada. Muat semula senarai.');
    return balas({ ok: true });
  }

  return ralat('Tindakan tidak dikenali.');
});
