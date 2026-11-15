import { useEffect, useState } from 'react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

export type Laluan = 'utama' | 'takwim' | 'profil' | 'templat' | 'jadual' | 'cuti' | 'rph' | 'hariini' | 'kertas' | 'surat' | 'minit' | 'opr' | 'jobskop' | 'panduan';
const SEMUA: Laluan[] = ['utama', 'takwim', 'profil', 'templat', 'jadual', 'cuti', 'rph', 'hariini', 'kertas', 'surat', 'minit', 'opr', 'jobskop', 'panduan'];

export interface Lokasi {
  nama: Laluan;
  /** Bahagian selepas nama, contohnya #/rph/2027-01-04/1000 memberi ["2027-01-04", "1000"]. */
  param: string[];
}

function bacaLaluan(): Lokasi {
  const [nama = '', ...param] = window.location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  return SEMUA.includes(nama as Laluan) ? { nama: nama as Laluan, param } : { nama: 'utama', param: [] };
}

/** Navigasi guna hash (#/takwim) supaya berfungsi di GitHub Pages tanpa tetapan pelayan. */
export function useLaluan(): Lokasi {
  const [lokasi, setLokasi] = useState<Lokasi>(bacaLaluan);
  useEffect(() => {
    const tukar = () => {
      setLokasi(bacaLaluan());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', tukar);
    return () => window.removeEventListener('hashchange', tukar);
  }, []);
  return lokasi;
}

export function useDalamTalian(): boolean {
  const [ok, setOk] = useState(() => navigator.onLine);
  useEffect(() => {
    const ya = () => setOk(true);
    const tidak = () => setOk(false);
    window.addEventListener('online', ya);
    window.addEventListener('offline', tidak);
    return () => {
      window.removeEventListener('online', ya);
      window.removeEventListener('offline', tidak);
    };
  }, []);
  return ok;
}

export function sudahDipasang(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

interface AcaraPasang extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Peranti = 'ios' | 'lain';

export function jenisPeranti(): Peranti {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'lain';
}

/** Butang "Pasang" Android/Chrome: pelayar memberi isyarat bila aplikasi boleh dipasang. */
export function usePasang() {
  const [acara, setAcara] = useState<AcaraPasang | null>(null);
  const [dipasang, setDipasang] = useState(sudahDipasang);
  useEffect(() => {
    const sedia = (e: Event) => {
      e.preventDefault();
      setAcara(e as AcaraPasang);
    };
    const siap = () => {
      setDipasang(true);
      setAcara(null);
    };
    window.addEventListener('beforeinstallprompt', sedia);
    window.addEventListener('appinstalled', siap);
    return () => {
      window.removeEventListener('beforeinstallprompt', sedia);
      window.removeEventListener('appinstalled', siap);
    };
  }, []);
  const pasang = async () => {
    if (!acara) return;
    await acara.prompt();
    const pilihan = await acara.userChoice;
    if (pilihan.outcome === 'accepted') setDipasang(true);
    setAcara(null);
  };
  return { bolehPasang: acara !== null, dipasang, pasang };
}

export type StatusPelayan = 'menyemak' | 'ok' | 'gagal' | 'luar-talian';

/** Semak sama ada projek Supabase boleh dihubungi. */
export function usePelayan(dalamTalian: boolean): { status: StatusPelayan; semak: () => void } {
  const [status, setStatus] = useState<StatusPelayan>('menyemak');
  const [pusingan, setPusingan] = useState(0);
  useEffect(() => {
    if (!dalamTalian) {
      setStatus('luar-talian');
      return;
    }
    let batal = false;
    setStatus('menyemak');
    const pengawal = new AbortController();
    const masa = window.setTimeout(() => pengawal.abort(), 10000);
    fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      signal: pengawal.signal,
    })
      .then((res) => {
        if (!batal) setStatus(res.ok ? 'ok' : 'gagal');
      })
      .catch(() => {
        if (!batal) setStatus('gagal');
      })
      .finally(() => window.clearTimeout(masa));
    return () => {
      batal = true;
      pengawal.abort();
      window.clearTimeout(masa);
    };
  }, [dalamTalian, pusingan]);
  return { status, semak: () => setPusingan((n) => n + 1) };
}
