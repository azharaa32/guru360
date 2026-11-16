import { useCallback, useEffect, useState } from 'react';
import type { Waktu } from './jadual';
import type { CutiSendiri } from './kalendar';
import type { Rph } from './rph';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase, terjemahRalat } from './supabase';

export interface Semakan {
  rph_id: string;
  guru_id: string;
  sekolah_id: string;
  ulasan: string;
  disemak_pada: string;
}

export type RphGuru = Rph & { guru_id: string };

const LAJUR_SEMAKAN = 'rph_id, guru_id, sekolah_id, ulasan, disemak_pada';
const LAJUR_RPH = 'id, guru_id, tarikh, mula, tamat, kelas, subjek, objektif, aktiviti, pentaksiran, refleksi, status';

/** Guru: tanda "Disemak" dan ulasan admin pada RPH sendiri. Salinan terakhir disimpan dalam telefon. */
export function useSemakanSaya(uid: string | null, dalamTalian: boolean): Record<string, Semakan> {
  const [peta, setPeta] = useState<Record<string, Semakan>>({});
  useEffect(() => {
    if (!uid) return setPeta({});
    const kunci = `guru360.rph_semakan.${uid}`;
    setPeta(bacaStoran<Record<string, Semakan>>(kunci) ?? {});
    if (!dalamTalian) return;
    let hidup = true;
    void supabase
      .from('rph_semakan')
      .select(LAJUR_SEMAKAN)
      .eq('guru_id', uid)
      .then(({ data, error }) => {
        if (error || !hidup) return;
        const baharu = Object.fromEntries(((data ?? []) as unknown as Semakan[]).map((s) => [s.rph_id, s]));
        tulisStoran(kunci, baharu);
        setPeta(baharu);
      });
    return () => {
      hidup = false;
    };
  }, [uid, dalamTalian]);
  return peta;
}

/** Admin sekolah: RPH semua guru sekolah dalam satu minggu, bersama semakannya. Perlu internet. */
export function useSemakRph(sekolahId: string | null, mula: string, tamat: string, dalamTalian: boolean) {
  const [rph, setRph] = useState<RphGuru[]>([]);
  const [semakan, setSemakan] = useState<Semakan[]>([]);
  const [sedia, setSedia] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);

  const muat = useCallback(async () => {
    if (!sekolahId) return;
    const r = await supabase.from('rph').select(LAJUR_RPH).eq('sekolah_id', sekolahId).gte('tarikh', mula).lte('tarikh', tamat);
    if (r.error) return setRalat(terjemahRalat(r.error.message));
    const s = await supabase.from('rph_semakan').select(LAJUR_SEMAKAN).eq('sekolah_id', sekolahId);
    if (s.error) return setRalat(terjemahRalat(s.error.message));
    const baris = ((r.data ?? []) as unknown as RphGuru[]).map((x) => ({ ...x, mula: x.mula.slice(0, 5), tamat: x.tamat.slice(0, 5) }));
    const id = new Set(baris.map((x) => x.id));
    setRph(baris.sort((a, b) => a.tarikh.localeCompare(b.tarikh) || a.mula.localeCompare(b.mula)));
    setSemakan(((s.data ?? []) as unknown as Semakan[]).filter((x) => id.has(x.rph_id)));
    setRalat(null);
    setSedia(true);
  }, [sekolahId, mula, tamat]);

  useEffect(() => {
    setSedia(false);
    setRph([]);
    setSemakan([]);
    if (dalamTalian) void muat();
  }, [dalamTalian, muat]);

  const semak = useCallback(
    async (r: RphGuru, ulasan: string) => {
      if (!sekolahId) return;
      if (!navigator.onLine) return setRalat('Tiada sambungan internet. Cuba lagi apabila ada talian.');
      const { error } = await supabase
        .from('rph_semakan')
        .upsert({ rph_id: r.id, guru_id: r.guru_id, sekolah_id: sekolahId, ulasan: ulasan.trim().slice(0, 1000), disemak_pada: new Date().toISOString() }, { onConflict: 'rph_id' });
      if (error) setRalat(/row-level security/i.test(error.message) ? 'RPH ini sudah berubah atau belum siap. Muat semula senarai.' : terjemahRalat(error.message));
      await muat();
    },
    [sekolahId, muat],
  );

  const batal = useCallback(
    async (rphId: string) => {
      if (!navigator.onLine) return setRalat('Tiada sambungan internet. Cuba lagi apabila ada talian.');
      const { error } = await supabase.from('rph_semakan').delete().in('rph_id', [rphId]);
      if (error) setRalat(terjemahRalat(error.message));
      await muat();
    },
    [muat],
  );

  return { rph, semakan, sedia, ralat, semak, batal };
}

export interface RingkasanRph {
  /** RPH berstatus siap pada minggu ini, semua sekolah. */
  siap: { id: string; guru_id: string; sekolah_id: string }[];
  /** id RPH yang sudah disemak. */
  disemak: Set<string>;
  sedia: boolean;
}

/** Ibu pejabat: ringkasan RPH siap dan disemak bagi satu minggu, merentas semua sekolah. Perlu internet. */
export function useRingkasanRph(aktif: boolean, mula: string, tamat: string, dalamTalian: boolean): RingkasanRph {
  const [r, setR] = useState<RingkasanRph>({ siap: [], disemak: new Set(), sedia: false });
  useEffect(() => {
    if (!aktif || !dalamTalian) return;
    let hidup = true;
    void (async () => {
      const a = await supabase.from('rph').select('id, guru_id, sekolah_id').eq('status', 'siap').gte('tarikh', mula).lte('tarikh', tamat);
      if (a.error || !hidup) return;
      const siap = (a.data ?? []) as unknown as RingkasanRph['siap'];
      const id = siap.map((x) => x.id);
      const b = id.length ? await supabase.from('rph_semakan').select('rph_id').in('rph_id', id.slice(0, 1000)) : { data: [], error: null };
      if (!hidup) return;
      setR({ siap, disemak: new Set(((b.data ?? []) as unknown as { rph_id: string }[]).map((x) => x.rph_id)), sedia: true });
    })();
    return () => {
      hidup = false;
    };
  }, [aktif, mula, tamat, dalamTalian]);
  return r;
}

export type WaktuGuru = Waktu & { guru_id: string };

/**
 * Admin sekolah atau ibu pejabat: jadual waktu semua guru sebuah sekolah, cuti yang ditetapkan sekolah dan ibu pejabat,
 * dan peringatan yang sudah dihantar bagi minggu ini (id guru -> masa dihantar). Perlu internet.
 */
export function useJadualSekolah(sekolahId: string | null, minggu: string, dalamTalian: boolean) {
  const [waktu, setWaktu] = useState<WaktuGuru[]>([]);
  const [cuti, setCuti] = useState<CutiSendiri[]>([]);
  const [diingatkan, setDiingatkan] = useState<Map<string, string>>(new Map());
  const [versi, setVersi] = useState(0);

  useEffect(() => {
    if (!sekolahId || !dalamTalian) return;
    let hidup = true;
    void (async () => {
      const j = await supabase.from('jadual_waktu').select('id, guru_id, hari, mula, tamat, subjek, kelas, perlu_rph').eq('sekolah_id', sekolahId);
      const c = await supabase.from('cuti_bersama').select('id, sekolah_id, mula, tamat, nama, jenis, ikut_hari');
      if (!hidup) return;
      if (!j.error) setWaktu(((j.data ?? []) as unknown as WaktuGuru[]).map((w) => ({ ...w, mula: w.mula.slice(0, 5), tamat: w.tamat.slice(0, 5) })));
      if (!c.error) setCuti(((c.data ?? []) as unknown as (CutiSendiri & { sekolah_id: string | null })[]).filter((x) => x.sekolah_id === null || x.sekolah_id === sekolahId));
    })();
    return () => {
      hidup = false;
    };
  }, [sekolahId, dalamTalian]);

  useEffect(() => {
    if (!sekolahId || !dalamTalian) return;
    let hidup = true;
    void supabase
      .from('peringatan')
      .select('guru_id, minggu, dihantar_pada')
      .eq('sekolah_id', sekolahId)
      .eq('minggu', minggu)
      .then(({ data, error }) => {
        if (error || !hidup) return;
        const peta = new Map<string, string>();
        for (const p of (data ?? []) as unknown as { guru_id: string; dihantar_pada: string }[]) if ((peta.get(p.guru_id) ?? '') < p.dihantar_pada) peta.set(p.guru_id, p.dihantar_pada);
        setDiingatkan(peta);
      });
    return () => {
      hidup = false;
    };
  }, [sekolahId, minggu, dalamTalian, versi]);

  const muatSemula = useCallback(() => setVersi((v) => v + 1), []);
  return { waktu, cuti, diingatkan, muatSemula };
}
