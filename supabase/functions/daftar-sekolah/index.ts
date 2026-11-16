// Pendaftaran sekolah oleh pengurusan sekolah (terbuka kepada orang awam; menunggu kelulusan ibu pejabat).
import { balas, ciptaSekolah, klienAdmin, praterbang, ralat, semak } from './cipta.ts';

const HAD_MENUNGGU = 10;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return praterbang();
  if (req.method !== 'POST') return balas({ ok: false, ralat: 'Kaedah tidak dibenarkan.' }, 405);
  let badan: Record<string, unknown>;
  try {
    badan = await req.json();
  } catch {
    return ralat('Permintaan tidak sah.');
  }
  const d = semak(badan);
  if (typeof d === 'string') return ralat(d);
  const admin = klienAdmin();
  const menunggu = await admin.from('sekolah').select('id', { count: 'exact', head: true }).eq('status', 'menunggu');
  if (menunggu.error) return balas({ ok: false, ralat: 'Pelayan sibuk. Cuba lagi sebentar.' }, 500);
  if ((menunggu.count ?? 0) >= HAD_MENUNGGU) return ralat('Terlalu banyak permohonan sedang menunggu. Cuba lagi kemudian atau hubungi ibu pejabat.');
  return await ciptaSekolah(admin, d, 'menunggu', 'sendiri', null);
});
