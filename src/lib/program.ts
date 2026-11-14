import { masa12 } from './jadual';
import { tambahHari } from './kalendar';
import { useSenarai } from './senarai';

export interface Program {
  id: string;
  nama: string;
  tarikh: string; // YYYY-MM-DD
  tarikh_tamat: string | null; // untuk program lebih sehari
  masa_mula: string | null; // HH:MM
  masa_tamat: string | null;
  tempat: string;
  catatan: string;
}

const LAJUR = 'id, nama, tarikh, tarikh_tamat, masa_mula, masa_tamat, tempat, catatan';
const kemas = (p: Program): Program => ({ ...p, masa_mula: p.masa_mula?.slice(0, 5) ?? null, masa_tamat: p.masa_tamat?.slice(0, 5) ?? null });

export function useProgram(uid: string | null, dalamTalian: boolean) {
  const { baris, sedia, tertunda, ralat, simpanBanyak, padamBaris } = useSenarai<Program>('program', LAJUR, uid, dalamTalian, kemas);
  return { program: baris, sedia, tertunda, ralat, simpanProgram: simpanBanyak, padamProgram: padamBaris };
}

export const tamatProgram = (p: Program) => p.tarikh_tamat ?? p.tarikh;
export const ikutTarikh = (a: Program, b: Program) => a.tarikh.localeCompare(b.tarikh) || (a.masa_mula ?? '').localeCompare(b.masa_mula ?? '') || a.nama.localeCompare(b.nama);
export const programPada = (program: Program[], tarikh: string) => program.filter((p) => p.tarikh <= tarikh && tarikh <= tamatProgram(p)).sort(ikutTarikh);

/** Program yang sedang atau akan berlangsung, terdekat dahulu. */
export const programAkanDatang = (program: Program[], dari: string) => program.filter((p) => tamatProgram(p) >= dari).sort(ikutTarikh);
export const programLepas = (program: Program[], dari: string) => program.filter((p) => tamatProgram(p) < dari).sort((a, b) => ikutTarikh(b, a));

/** Semua tarikh yang ada program, untuk titik pada kalendar. */
export function tarikhBerprogram(program: Program[]): Set<string> {
  const set = new Set<string>();
  for (const p of program) for (let t = p.tarikh; t <= tamatProgram(p); t = tambahHari(t, 1)) set.add(t);
  return set;
}

function waktu(masa: string): string {
  const j = Number(masa.slice(0, 2));
  return `${masa12(masa)} ${j < 12 ? 'pagi' : j < 14 ? 'tengah hari' : j < 19 ? 'petang' : 'malam'}`;
}

/** "Dewan Sekolah · 8:00 pagi – 12:00 tengah hari" */
export function butirProgram(p: Program): string {
  const masa = p.masa_mula ? (p.masa_tamat ? `${waktu(p.masa_mula)} – ${waktu(p.masa_tamat)}` : waktu(p.masa_mula)) : '';
  return [p.tempat, masa].filter(Boolean).join(' · ');
}
