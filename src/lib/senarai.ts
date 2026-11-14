import { useCallback, useEffect, useRef, useState } from 'react';
import { bacaStoran, tulisStoran } from './simpanan';
import { supabase } from './supabase';

export interface Rekod {
  id: string;
}

interface Stor<T> {
  baris: T[];
  ubah: string[]; // id yang belum dihantar ke pelayan
  padam: string[]; // id yang belum dipadam di pelayan
}

const kosong = <T,>(): Stor<T> => ({ baris: [], ubah: [], padam: [] });

export function idBaharu(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Pelayar lama: bina UUID v4 daripada bait rawak.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Senarai rekod milik guru (lajur guru_id) dalam satu jadual Supabase.
 * Setiap perubahan disimpan dalam telefon serta-merta, kemudian dihantar ke pelayan;
 * tanpa internet ia menunggu dalam giliran dan dihantar sendiri apabila talian kembali.
 */
export function useSenarai<T extends Rekod>(
  jadual: string,
  lajur: string,
  uid: string | null,
  dalamTalian: boolean,
  dariPelayan: (baris: T) => T = (b) => b,
) {
  const [baris, setBaris] = useState<T[]>([]);
  const [sedia, setSedia] = useState(false);
  const [tertunda, setTertunda] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const sibuk = useRef(false);
  const lagi = useRef<null | boolean>(null);
  const pemeta = useRef(dariPelayan);
  pemeta.current = dariPelayan;
  const kunci = uid ? `guru360.${jadual}.${uid}` : null;

  const papar = useCallback((s: Stor<T>) => {
    setBaris(s.baris);
    setTertunda(s.ubah.length > 0 || s.padam.length > 0);
  }, []);

  const segerak = useCallback(
    // tarik = false: hantar perubahan sahaja, tanpa memuat semula semua baris (untuk simpanan automatik yang kerap).
    async (id: string, tarik = true) => {
      const k = `guru360.${jadual}.${id}`;
      if (!navigator.onLine) return;
      if (sibuk.current) {
        lagi.current = lagi.current === true ? true : tarik;
        return;
      }
      sibuk.current = true;
      try {
        let s = bacaStoran<Stor<T>>(k) ?? kosong<T>();
        if (s.ubah.length) {
          const hantar = s.baris.filter((b) => s.ubah.includes(b.id));
          const cap = new Map(hantar.map((b) => [b.id, JSON.stringify(b)]));
          const { error } = await supabase.from(jadual).upsert(hantar.map((b) => ({ ...b, guru_id: id })));
          if (error) throw new Error(error.message);
          s = bacaStoran<Stor<T>>(k) ?? kosong<T>();
          // Baris yang diubah lagi semasa penghantaran kekal dalam giliran.
          const kini = new Map(s.baris.map((b) => [b.id, JSON.stringify(b)]));
          s.ubah = s.ubah.filter((u) => !cap.has(u) || kini.get(u) !== cap.get(u));
          tulisStoran(k, s);
        }
        if (s.padam.length) {
          const buang = [...s.padam];
          const { error } = await supabase.from(jadual).delete().in('id', buang);
          if (error) throw new Error(error.message);
          s = bacaStoran<Stor<T>>(k) ?? kosong<T>();
          s.padam = s.padam.filter((p) => !buang.includes(p));
          tulisStoran(k, s);
        }
        if (tarik) {
          const { data, error } = await supabase.from(jadual).select(lajur).eq('guru_id', id);
          if (error) throw new Error(error.message);
          s = bacaStoran<Stor<T>>(k) ?? kosong<T>();
          const tempatan = new Map(s.baris.map((b) => [b.id, b]));
          const pelayan = ((data ?? []) as unknown as T[]).map((b) => pemeta.current(b));
          const gabung = pelayan.filter((b) => !s.padam.includes(b.id)).map((b) => (s.ubah.includes(b.id) ? (tempatan.get(b.id) ?? b) : b));
          const adaDiPelayan = new Set(pelayan.map((b) => b.id));
          for (const u of s.ubah) if (!adaDiPelayan.has(u) && tempatan.has(u)) gabung.push(tempatan.get(u)!);
          s.baris = gabung;
          tulisStoran(k, s);
          papar(s);
        } else {
          papar(s);
        }
        setRalat(null);
      } catch (e) {
        const mesej = String(e);
        // Gangguan talian bukan ralat: perubahan kekal dalam giliran.
        setRalat(/fetch|network|load failed/i.test(mesej) || !navigator.onLine ? null : mesej);
      } finally {
        sibuk.current = false;
        setSedia(true);
        if (lagi.current !== null) {
          const semula = lagi.current;
          lagi.current = null;
          void segerak(id, semula);
        }
      }
    },
    [jadual, lajur, papar],
  );

  useEffect(() => {
    if (!uid || !kunci) {
      setBaris([]);
      setSedia(false);
      setTertunda(false);
      return;
    }
    const s = bacaStoran<Stor<T>>(kunci);
    if (s) {
      papar(s);
      setSedia(true);
    }
    if (dalamTalian) void segerak(uid);
    else setSedia(true);
  }, [uid, kunci, dalamTalian, segerak, papar]);

  const ubahStor = useCallback(
    (tukar: (s: Stor<T>) => void) => {
      if (!uid || !kunci) return;
      const s = bacaStoran<Stor<T>>(kunci) ?? kosong<T>();
      tukar(s);
      tulisStoran(kunci, s);
      papar(s);
      void segerak(uid, false);
    },
    [uid, kunci, papar, segerak],
  );

  const simpanBanyak = useCallback(
    (rekod: T[]) =>
      ubahStor((s) => {
        for (const r of rekod) {
          const i = s.baris.findIndex((b) => b.id === r.id);
          if (i >= 0) s.baris[i] = r;
          else s.baris.push(r);
          if (!s.ubah.includes(r.id)) s.ubah.push(r.id);
          s.padam = s.padam.filter((p) => p !== r.id);
        }
      }),
    [ubahStor],
  );

  const padamBaris = useCallback(
    (id: string) =>
      ubahStor((s) => {
        s.baris = s.baris.filter((b) => b.id !== id);
        s.ubah = s.ubah.filter((u) => u !== id);
        if (!s.padam.includes(id)) s.padam.push(id);
      }),
    [ubahStor],
  );

  return { baris, sedia, tertunda, ralat, simpanBanyak, padamBaris };
}
