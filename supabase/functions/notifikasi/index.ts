// Notifikasi telefon (Web Push) untuk guru.
// Dipanggil oleh aplikasi selepas admin bertindak (makluman, peringatan, semakan RPH, jawatan), dan oleh pg_cron
// setiap petang untuk program dan cuti esok. Setiap peristiwa dihantar sekali sahaja (jadual notis_dihantar).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import cuti from './cuti.json' with { type: 'json' };

const APL = 'https://azharaa32.github.io/guru360/';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const balas = (badan: unknown, status = 200) => new Response(JSON.stringify(badan), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const ralat = (teks: string, status = 200) => balas({ ok: false, ralat: teks }, status);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const potong = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

interface Notis {
  tajuk: string;
  isi: string;
  url: string;
  tag: string;
}

/** Tandakan peristiwa sebagai dihantar. false jika sudah pernah dihantar. */
async function sekaliSahaja(admin: SupabaseClient, kunci: string): Promise<boolean> {
  const r = await admin.from('notis_dihantar').insert({ kunci });
  return !r.error;
}

/** Hantar notis kepada semua peranti pengguna yang dinyatakan. Langganan yang mati dibuang. */
async function hantar(admin: SupabaseClient, penerima: string[], notis: Notis | ((uid: string) => Notis | null)): Promise<number> {
  const unik = [...new Set(penerima)];
  if (unik.length === 0) return 0;
  const langganan: { id: string; pengguna_id: string; endpoint: string; p256dh: string; auth: string }[] = [];
  for (let i = 0; i < unik.length; i += 200) {
    const r = await admin.from('push_langganan').select('id, pengguna_id, endpoint, p256dh, auth').in('pengguna_id', unik.slice(i, i + 200));
    if (!r.error) langganan.push(...((r.data ?? []) as typeof langganan));
  }
  let berjaya = 0;
  const mati: string[] = [];
  for (let i = 0; i < langganan.length; i += 20) {
    await Promise.all(
      langganan.slice(i, i + 20).map(async (l) => {
        const n = typeof notis === 'function' ? notis(l.pengguna_id) : notis;
        if (!n) return;
        try {
          await webpush.sendNotification({ endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } }, JSON.stringify(n), { TTL: 60 * 60 * 24, urgency: 'normal' });
          berjaya += 1;
        } catch (e) {
          const kod = (e as { statusCode?: number }).statusCode;
          if (kod === 404 || kod === 410) mati.push(l.id);
        }
      }),
    );
  }
  if (mati.length) await admin.from('push_langganan').delete().in('id', mati);
  return berjaya;
}

/** Guru aktif di sekolah aktif: satu sekolah, atau semua sekolah jika sekolahId null. */
async function guruAktif(admin: SupabaseClient, sekolahId: string | null): Promise<string[]> {
  let q = admin.from('ahli').select('pengguna_id, sekolah!inner(status)').eq('peranan', 'guru').eq('status', 'aktif').eq('sekolah.status', 'aktif');
  if (sekolahId) q = q.eq('sekolah_id', sekolahId);
  const r = await q;
  return r.error ? [] : ((r.data ?? []) as { pengguna_id: string }[]).map((x) => x.pengguna_id);
}

// ---- Cuti esok (sama seperti entriUntuk dalam src/lib/kalendar.ts) ----
type Entri = { mula: string; tamat: string; nama: string; jenis: string; untuk: string | string[]; kecuali: string[] };
const DATA = cuti as { kumpulanA: string[]; entri: Entri[] };
function untukNegeri(negeri: string, e: Entri): boolean {
  if (e.kecuali.includes(negeri)) return false;
  if (e.untuk === 'semua') return true;
  if (e.untuk === 'A' || e.untuk === 'B') return (DATA.kumpulanA.includes(negeri) ? 'A' : 'B') === e.untuk;
  return Array.isArray(e.untuk) && e.untuk.includes(negeri);
}
const tarikhMy = (tambah: number) => new Date(Date.now() + 8 * 3600 * 1000 + tambah * 86400 * 1000).toISOString().slice(0, 10);

async function harian(admin: SupabaseClient): Promise<Response> {
  const esok = tarikhMy(1);
  const l = await admin.from('push_langganan').select('pengguna_id');
  if (l.error) return ralat('Pelayan sibuk.', 500);
  const pengguna = [...new Set(((l.data ?? []) as { pengguna_id: string }[]).map((x) => x.pengguna_id))];
  if (pengguna.length === 0) return balas({ ok: true, dihantar: 0 });

  const ahli = await admin.from('ahli').select('pengguna_id, sekolah_id, sekolah!inner(status, negeri)').in('pengguna_id', pengguna).eq('peranan', 'guru').eq('status', 'aktif').eq('sekolah.status', 'aktif');
  const guru = new Map<string, { sekolah_id: string; negeri: string }>();
  for (const a of (ahli.data ?? []) as unknown as { pengguna_id: string; sekolah_id: string; sekolah: { negeri: string | null } }[]) guru.set(a.pengguna_id, { sekolah_id: a.sekolah_id, negeri: a.sekolah.negeri ?? '' });
  const ids = [...guru.keys()];
  if (ids.length === 0) return balas({ ok: true, dihantar: 0 });

  const [prog, sendiri, bersama] = await Promise.all([
    admin.from('program').select('guru_id, nama, masa_mula, tempat').in('guru_id', ids).eq('tarikh', esok),
    admin.from('cuti_sendiri').select('guru_id, nama').in('guru_id', ids).eq('jenis', 'cuti').eq('mula', esok),
    admin.from('cuti_bersama').select('sekolah_id, nama').eq('jenis', 'cuti').eq('mula', esok),
  ]);
  // Cuti umum, cuti sekolah dan cuti tambahan yang bermula esok.
  const cutiEsok = DATA.entri.filter((e) => e.mula === esok);

  const isi = new Map<string, string[]>();
  const tambah = (uid: string, t: string) => isi.set(uid, [...(isi.get(uid) ?? []), t]);
  for (const [uid, g] of guru) {
    for (const e of cutiEsok) if (untukNegeri(g.negeri, e)) tambah(uid, `Cuti: ${e.nama}`);
    for (const c of (bersama.data ?? []) as { sekolah_id: string | null; nama: string }[]) if (c.sekolah_id === null || c.sekolah_id === g.sekolah_id) tambah(uid, `Cuti: ${c.nama}`);
  }
  for (const c of (sendiri.data ?? []) as { guru_id: string; nama: string }[]) tambah(c.guru_id, `Cuti: ${c.nama}`);
  for (const p of (prog.data ?? []) as { guru_id: string; nama: string; masa_mula: string | null; tempat: string }[])
    tambah(p.guru_id, `Program: ${p.nama}${p.masa_mula ? `, ${p.masa_mula.slice(0, 5)}` : ''}${p.tempat ? ` di ${p.tempat}` : ''}`);

  const penerima: string[] = [];
  for (const uid of isi.keys()) if (await sekaliSahaja(admin, `harian:${uid}:${esok}`)) penerima.push(uid);
  const n = await hantar(admin, penerima, (uid) => {
    const baris = [...new Set(isi.get(uid) ?? [])];
    if (!baris.length) return null;
    const adaProgram = baris.some((b) => b.startsWith('Program'));
    return { tajuk: 'Esok', isi: potong(baris.join(' · '), 240), url: adaProgram ? `${APL}#/takwim` : `${APL}#/cuti`, tag: `harian-${esok}` };
  });
  return balas({ ok: true, dihantar: n, esok });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return ralat('Kaedah tidak dibenarkan.', 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

  const r = await admin.rpc('rahsia_notifikasi');
  const rahsia = ((r.data ?? []) as { vapid_awam: string; vapid_privat: string; cron_kunci: string }[])[0];
  if (r.error || !rahsia?.vapid_awam || !rahsia.vapid_privat) return ralat('Notifikasi belum disediakan.', 500);
  webpush.setVapidDetails(APL, rahsia.vapid_awam, rahsia.vapid_privat);

  let badan: Record<string, unknown>;
  try {
    badan = await req.json();
  } catch {
    return ralat('Permintaan tidak sah.');
  }
  const aksi = badan.aksi;

  // Peringatan harian: hanya pg_cron yang memegang token ini.
  if (aksi === 'harian') {
    const kunci = req.headers.get('x-kunci-cron') ?? '';
    if (!rahsia.cron_kunci || kunci.length !== rahsia.cron_kunci.length || kunci !== rahsia.cron_kunci) return ralat('Tidak dibenarkan.', 403);
    return await harian(admin);
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const pengguna = token ? await admin.auth.getUser(token) : null;
  const uid = pengguna?.data.user?.id;
  if (!uid) return ralat('Sila log masuk semula.', 401);
  const baruSahaja = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Admin sekolah atau ibu pejabat baru sahaja menghantar makluman.
  if (aksi === 'makluman') {
    const id = typeof badan.makluman_id === 'string' && UUID.test(badan.makluman_id) ? badan.makluman_id : '';
    if (!id) return ralat('Makluman tidak sah.');
    const m = await admin.from('makluman').select('id, sekolah_id, jenis, tajuk, dicipta_oleh, dicipta_pada').eq('id', id).maybeSingle();
    const mk = m.data as { id: string; sekolah_id: string | null; jenis: string; tajuk: string; dicipta_oleh: string; dicipta_pada: string } | null;
    if (!mk || mk.dicipta_oleh !== uid || mk.dicipta_pada < baruSahaja) return ralat('Makluman tidak dijumpai.');
    if (!(await sekaliSahaja(admin, `makluman:${id}`))) return balas({ ok: true, dihantar: 0 });
    const n = await hantar(admin, await guruAktif(admin, mk.sekolah_id), {
      tajuk: mk.jenis === 'tindakan' ? 'Tindakan baharu' : 'Makluman baharu',
      isi: potong(mk.tajuk, 200),
      url: `${APL}#/makluman`,
      tag: `makluman-${id}`,
    });
    return balas({ ok: true, dihantar: n });
  }

  // Admin sekolah baru sahaja menghantar peringatan RPH (rekod dicipta oleh urus-ahli).
  if (aksi === 'peringatan') {
    const p = await admin.from('peringatan').select('id, guru_id, minggu').eq('dihantar_oleh', uid).gte('dihantar_pada', baruSahaja);
    const senarai = (p.data ?? []) as { id: string; guru_id: string; minggu: string }[];
    const penerima: { guru_id: string; minggu: string }[] = [];
    for (const x of senarai) if (await sekaliSahaja(admin, `peringatan:${x.id}`)) penerima.push(x);
    const minggu = new Map(penerima.map((x) => [x.guru_id, x.minggu]));
    const n = await hantar(admin, [...minggu.keys()], (g) => ({
      tajuk: 'Peringatan RPH',
      isi: 'Admin sekolah meminta anda melengkapkan RPH minggu ini.',
      url: `${APL}#/rph/m/${minggu.get(g)}`,
      tag: `peringatan-${minggu.get(g)}`,
    }));
    return balas({ ok: true, dihantar: n });
  }

  // Admin sekolah baru sahaja menyemak atau mengulas RPH.
  if (aksi === 'semakan') {
    const id = typeof badan.rph_id === 'string' && UUID.test(badan.rph_id) ? badan.rph_id : '';
    if (!id) return ralat('RPH tidak sah.');
    const s = await admin.from('rph_semakan').select('rph_id, guru_id, ulasan, disemak_oleh, disemak_pada').eq('rph_id', id).maybeSingle();
    const sm = s.data as { guru_id: string; ulasan: string; disemak_oleh: string; disemak_pada: string } | null;
    if (!sm || sm.disemak_oleh !== uid || sm.disemak_pada < baruSahaja) return ralat('Semakan tidak dijumpai.');
    if (!(await sekaliSahaja(admin, `semakan:${id}:${sm.disemak_pada}`))) return balas({ ok: true, dihantar: 0 });
    const rp = await admin.from('rph').select('tarikh, subjek, kelas').eq('id', id).maybeSingle();
    const r2 = rp.data as { tarikh: string; subjek: string; kelas: string } | null;
    const n = await hantar(admin, [sm.guru_id], {
      tajuk: sm.ulasan ? 'Ulasan RPH daripada admin' : 'RPH anda sudah disemak',
      isi: potong(`${r2 ? `${r2.subjek} ${r2.kelas}, ${r2.tarikh}` : 'RPH'}${sm.ulasan ? `: ${sm.ulasan}` : ''}`, 200),
      url: r2 ? `${APL}#/rph/m/${r2.tarikh}` : `${APL}#/rph`,
      tag: `semakan-${id}`,
    });
    return balas({ ok: true, dihantar: n });
  }

  // Admin sekolah baru sahaja menetapkan, mengesahkan atau menolak jawatan seorang guru.
  if (aksi === 'jawatan') {
    const guru = typeof badan.guru_id === 'string' && UUID.test(badan.guru_id) ? badan.guru_id : '';
    if (!guru) return ralat('Guru tidak sah.');
    const saya = await admin.from('ahli').select('sekolah_id').eq('pengguna_id', uid).eq('peranan', 'admin').eq('status', 'aktif').maybeSingle();
    const sekolahId = (saya.data as { sekolah_id: string } | null)?.sekolah_id;
    if (!sekolahId) return ralat('Hanya admin sekolah boleh melakukan ini.', 403);
    const j = await admin.from('jawatan_guru').select('nama, butiran, status').eq('sekolah_id', sekolahId).eq('guru_id', guru).gte('dicipta_pada', baruSahaja).order('dicipta_pada', { ascending: false }).limit(1);
    const jw = ((j.data ?? []) as { nama: string; butiran: string; status: string }[])[0];
    if (!jw) return ralat('Tiada perubahan jawatan baharu.');
    // Satu notis setiap 10 minit bagi setiap guru, walaupun admin menukar beberapa jawatan berturut-turut.
    if (!(await sekaliSahaja(admin, `jawatan:${guru}:${Math.floor(Date.now() / 600000)}`))) return balas({ ok: true, dihantar: 0 });
    const nama = jw.butiran ? `${jw.nama} ${jw.butiran}` : jw.nama;
    const n = await hantar(admin, [guru], {
      tajuk: jw.status === 'ditolak' ? 'Jawatan ditolak admin sekolah' : 'Jawatan anda dikemas kini',
      isi: potong(nama, 200),
      url: `${APL}#/jobskop`,
      tag: `jawatan-${guru}`,
    });
    return balas({ ok: true, dihantar: n });
  }

  return ralat('Tindakan tidak dikenali.');
});
