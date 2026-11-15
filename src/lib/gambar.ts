// Gambar guru (contohnya gambar OPR): disimpan dalam telefon (IndexedDB) supaya boleh dilihat dan dicetak
// tanpa internet, dan dihantar ke simpanan fail peribadi di Supabase apabila ada talian.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

const BALDI = 'fail';
const NAMA_DB = 'guru360';
const STOR = 'gambar';

interface Rekod {
  laluan: string; // <id guru>/opr/<id dokumen>/<id gambar>.jpg
  blob: Blob | null;
  belumHantar: boolean;
  padam: boolean;
}

let dbJanji: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  dbJanji ??= new Promise((ok, gagal) => {
    const buka = indexedDB.open(NAMA_DB, 1);
    buka.onupgradeneeded = () => buka.result.createObjectStore(STOR, { keyPath: 'laluan' });
    buka.onsuccess = () => ok(buka.result);
    buka.onerror = () => {
      dbJanji = null;
      gagal(buka.error ?? new Error('Storan telefon tidak dapat dibuka.'));
    };
  });
  return dbJanji;
}

function urus<T>(mod: IDBTransactionMode, kerja: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((ok, gagal) => {
        const t = d.transaction(STOR, mod);
        const r = kerja(t.objectStore(STOR));
        t.oncomplete = () => ok(r.result);
        t.onerror = () => gagal(t.error);
        t.onabort = () => gagal(t.error ?? new Error('Storan telefon penuh.'));
      }),
  );
}

const baca = (laluan: string) => urus<Rekod | undefined>('readonly', (s) => s.get(laluan));
const tulis = (r: Rekod) => urus('readwrite', (s) => s.put(r));
const buang = (laluan: string) => urus('readwrite', (s) => s.delete(laluan));
const semua = () => urus<Rekod[]>('readonly', (s) => s.getAll());

const pendengar = new Set<() => void>();
const maklum = () => pendengar.forEach((f) => f());

/** Kecilkan gambar kamera kepada JPEG paling besar 1280px: cukup tajam untuk cetakan A4, ringan untuk dihantar. */
export async function kecilkanFoto(fail: File, maks = 1280): Promise<Blob> {
  if (!fail.type.startsWith('image/')) throw new Error('Sila pilih fail gambar.');
  const url = URL.createObjectURL(fail);
  try {
    const imej = await muatImej(url);
    const nisbah = Math.min(1, maks / Math.max(imej.naturalWidth, imej.naturalHeight));
    const kanvas = document.createElement('canvas');
    kanvas.width = Math.max(1, Math.round(imej.naturalWidth * nisbah));
    kanvas.height = Math.max(1, Math.round(imej.naturalHeight * nisbah));
    const ctx = kanvas.getContext('2d');
    if (!ctx) throw new Error('Gambar tidak dapat diproses pada telefon ini.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, kanvas.width, kanvas.height);
    ctx.drawImage(imej, 0, 0, kanvas.width, kanvas.height);
    return await new Promise<Blob>((ok, gagal) => kanvas.toBlob((b) => (b ? ok(b) : gagal(new Error('Gambar tidak dapat diproses.'))), 'image/jpeg', 0.82));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function muatImej(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, gagal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => gagal(new Error('Gambar ini tidak dapat dibaca. Cuba gambar lain.'));
    i.src = url;
  });
}

export async function simpanGambar(laluan: string, blob: Blob): Promise<void> {
  await tulis({ laluan, blob, belumHantar: true, padam: false });
  maklum();
  void segerakGambar();
}

export async function padamGambar(laluan: string): Promise<void> {
  const r = await baca(laluan);
  // Gambar yang belum pernah sampai ke pelayan boleh dibuang terus.
  if (r?.belumHantar && !r.padam) await buang(laluan);
  else await tulis({ laluan, blob: null, belumHantar: false, padam: true });
  maklum();
  void segerakGambar();
}

/** Gambar dari telefon; jika tiada (telefon baharu), muat turun dari pelayan dan simpan salinannya. */
export async function bacaGambar(laluan: string): Promise<Blob | null> {
  const r = await baca(laluan).catch(() => undefined);
  if (r?.padam) return null;
  if (r?.blob) return r.blob;
  if (!navigator.onLine) return null;
  const { data, error } = await supabase.storage.from(BALDI).download(laluan);
  if (error || !data) return null;
  await tulis({ laluan, blob: data, belumHantar: false, padam: false }).catch(() => {});
  return data;
}

let sibuk = false;
/** Hantar gambar yang menunggu dan padam yang ditanda, apabila ada talian. */
export async function segerakGambar(): Promise<void> {
  if (sibuk || !navigator.onLine) return;
  sibuk = true;
  try {
    for (const r of await semua()) {
      if (r.padam) {
        const { error } = await supabase.storage.from(BALDI).remove([r.laluan]);
        if (error) break;
        await buang(r.laluan);
      } else if (r.belumHantar && r.blob) {
        const { error } = await supabase.storage.from(BALDI).upload(r.laluan, r.blob, { contentType: 'image/jpeg', upsert: true });
        if (error) break;
        const kini = await baca(r.laluan);
        if (kini && !kini.padam) await tulis({ ...kini, belumHantar: false });
      }
    }
  } catch {
    /* tiada talian atau storan sibuk: dicuba lagi kemudian */
  } finally {
    sibuk = false;
    maklum();
  }
}

export async function bilGambarTertunda(): Promise<number> {
  try {
    return (await semua()).filter((r) => r.padam || r.belumHantar).length;
  } catch {
    return 0;
  }
}

/** URL paparan bagi senarai laluan gambar; dibebaskan sendiri apabila senarai berubah. */
export function useGambar(laluan: string[]): Record<string, string | null> {
  const [url, setUrl] = useState<Record<string, string | null>>({});
  const kunci = laluan.join('|');
  useEffect(() => {
    let hidup = true;
    const dicipta: string[] = [];
    (async () => {
      const hasil: Record<string, string | null> = {};
      for (const l of laluan) {
        const blob = await bacaGambar(l);
        if (!hidup) return;
        if (blob) {
          const u = URL.createObjectURL(blob);
          dicipta.push(u);
          hasil[l] = u;
        } else hasil[l] = null;
      }
      if (hidup) setUrl(hasil);
    })();
    return () => {
      hidup = false;
      dicipta.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);
  return url;
}

/** Bilangan gambar yang belum sampai ke pelayan; cuba hantar apabila talian kembali. */
export function useGambarTertunda(dalamTalian: boolean): number {
  const [bil, setBil] = useState(0);
  const kira = useCallback(() => void bilGambarTertunda().then(setBil), []);
  useEffect(() => {
    pendengar.add(kira);
    kira();
    return () => void pendengar.delete(kira);
  }, [kira]);
  useEffect(() => {
    if (dalamTalian) void segerakGambar();
  }, [dalamTalian]);
  return bil;
}
