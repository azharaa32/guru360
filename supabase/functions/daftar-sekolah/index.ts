// Pendaftaran sekolah oleh pengurusan sekolah (terbuka kepada orang awam; menunggu kelulusan ibu pejabat).
// Hanya diterima bersama kod pendaftaran sekali guna yang dijana ibu pejabat.
import { balas, ciptaSekolah, klienAdmin, praterbang, ralat, semak } from './cipta.ts';

const HAD_MENUNGGU = 10;
const KOD_TIDAK_SAH = 'Kod pendaftaran tidak sah atau sudah digunakan. Minta kod baharu daripada ibu pejabat.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return praterbang();
  if (req.method !== 'POST') return balas({ ok: false, ralat: 'Kaedah tidak dibenarkan.' }, 405);
  let badan: Record<string, unknown>;
  try {
    badan = await req.json();
  } catch {
    return ralat('Permintaan tidak sah.');
  }
  // Kod disemak dahulu, sebelum apa-apa emel dihantar atau akaun dicipta.
  const kod = typeof badan.kod_daftar === 'string' ? badan.kod_daftar.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  if (!/^[A-Z2-9]{8}$/.test(kod)) return ralat(KOD_TIDAK_SAH);
  const d = semak(badan);
  if (typeof d === 'string') return ralat(d);
  const admin = klienAdmin();

  // Tuntut kod secara atomik: hanya satu permintaan boleh menang.
  const tuntut = await admin.from('kod_daftar').update({ digunakan_pada: new Date().toISOString() }).eq('kod', kod).is('digunakan_pada', null).select('id');
  if (tuntut.error) return balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
  const idKod = (tuntut.data ?? [])[0]?.id as string | undefined;
  if (!idKod) return ralat(KOD_TIDAK_SAH);
  const lepas = () => admin.from('kod_daftar').update({ digunakan_pada: null }).eq('id', idKod);

  const menunggu = await admin.from('sekolah').select('id', { count: 'exact', head: true }).eq('status', 'menunggu');
  if (menunggu.error || (menunggu.count ?? 0) >= HAD_MENUNGGU) {
    await lepas();
    return menunggu.error
      ? balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500)
      : ralat('Terlalu banyak permohonan sedang menunggu. Cuba lagi kemudian atau hubungi ibu pejabat.');
  }

  const hasil = await ciptaSekolah(admin, d, 'menunggu', 'sendiri', null);
  const isi = (await hasil.clone().json().catch(() => null)) as { ok?: boolean; sekolah_id?: string } | null;
  if (isi?.ok && isi.sekolah_id) await admin.from('kod_daftar').update({ sekolah_id: isi.sekolah_id }).eq('id', idKod);
  else await lepas(); // pendaftaran gagal: kod boleh dicuba semula
  return hasil;
});
