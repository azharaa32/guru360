import { supabase, terjemahRalat } from './supabase';

const JADUAL = ['profil', 'jadual_waktu', 'cuti_sendiri', 'rph', 'program', 'dokumen'] as const;
const BALDI = 'fail';

/** Semua laluan fail guru dalam storan (logo dan gambar OPR), termasuk dalam subfolder. */
async function senaraiFail(folder: string, dalam = 0): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BALDI).list(folder, { limit: 1000 });
  if (error) throw new Error(error.message);
  const hasil: string[] = [];
  for (const f of data ?? []) {
    const laluan = `${folder}/${f.name}`;
    // Folder tiada id; fail ada.
    if (f.id === null && dalam < 4) hasil.push(...(await senaraiFail(laluan, dalam + 1)));
    else hasil.push(laluan);
  }
  return hasil;
}

/** Salinan semua data guru di pelayan, sebagai fail JSON. */
export async function muatTurunData(uid: string, emel: string): Promise<Blob> {
  const data: Record<string, unknown> = { aplikasi: 'Guru360', dieksport_pada: new Date().toISOString(), emel };
  for (const j of JADUAL) {
    const { data: baris, error } = await supabase.from(j).select('*').eq(j === 'profil' ? 'id' : 'guru_id', uid);
    if (error) throw new Error(terjemahRalat(error.message));
    data[j] = baris;
  }
  data.fail = await senaraiFail(uid);
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}
