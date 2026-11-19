import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Kunci awam VAPID pelayan notifikasi. Kunci awam boleh didedahkan; kunci peribadi hanya dalam Supabase Vault.
const VAPID_AWAM = 'BCh9ChL8NUcTcFFYmsswcM_8N64mcPjrvZn7fn7PNZQfmh376rDlRwj_qsXZAsUNEVR_AWqbaN_UX7t1OIv0nWU';

export type StatusNotis = 'memuat' | 'tidak-disokong' | 'perlu-pasang' | 'disekat' | 'mati' | 'hidup';

const iPhone = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const dipasang = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const disokong = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keBait(b64: string): Uint8Array {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function daftar(sub: PushSubscription): Promise<boolean> {
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return false;
  const { error } = await supabase.rpc('daftar_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
  return !error;
}

/** Notifikasi telefon bagi peranti ini dan akaun yang log masuk. */
export function useNotifikasi(uid: string | null) {
  const [status, setStatus] = useState<StatusNotis>('memuat');
  const [ralat, setRalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (!uid) return;
    if (!disokong()) return setStatus(iPhone() && !dipasang() ? 'perlu-pasang' : 'tidak-disokong');
    if (Notification.permission === 'denied') return setStatus('disekat');
    let hidup = true;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!hidup) return;
        // Peranti yang sudah melanggan didaftar semula untuk akaun ini (log masuk mungkin bertukar).
        if (sub && Notification.permission === 'granted') {
          setStatus('hidup');
          if (navigator.onLine) await daftar(sub);
        } else setStatus('mati');
      })
      .catch(() => hidup && setStatus('tidak-disokong'));
    return () => {
      hidup = false;
    };
  }, [uid]);

  const hidupkan = useCallback(async () => {
    if (!navigator.onLine) return setRalat('Perlu internet untuk menghidupkan notifikasi.');
    setSibuk(true);
    setRalat(null);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== 'granted') {
        setStatus(izin === 'denied' ? 'disekat' : 'mati');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keBait(VAPID_AWAM) }));
      if (await daftar(sub)) setStatus('hidup');
      else setRalat('Notifikasi tidak dapat didaftarkan. Cuba lagi.');
    } catch {
      setRalat('Notifikasi tidak dapat dihidupkan pada pelayar ini.');
    } finally {
      setSibuk(false);
    }
  }, []);

  const matikan = useCallback(async () => {
    setSibuk(true);
    setRalat(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_langganan').delete().in('endpoint', [sub.endpoint]);
        await sub.unsubscribe();
      }
      setStatus('mati');
    } catch {
      setRalat('Notifikasi tidak dapat dimatikan. Cuba lagi.');
    } finally {
      setSibuk(false);
    }
  }, []);

  return { status, ralat, sibuk, hidupkan, matikan };
}

/** Buang langganan peranti ini sebelum log keluar, supaya notifikasi akaun ini tidak lagi sampai ke sini. */
export async function lupakanPeranti(): Promise<void> {
  try {
    if (!disokong()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from('push_langganan').delete().in('endpoint', [sub.endpoint]);
    await sub.unsubscribe();
  } catch {
    /* tiada talian: langganan dipindahkan apabila akaun lain menghidupkan notifikasi pada peranti ini */
  }
}

/** Minta pelayan menghantar notifikasi bagi tindakan admin yang baru berlaku. Senyap jika gagal. */
export function maklumkan(badan: { aksi: 'makluman'; makluman_id: string } | { aksi: 'peringatan' } | { aksi: 'semakan'; rph_id: string } | { aksi: 'jawatan'; guru_id: string }): void {
  if (!navigator.onLine) return;
  void supabase.functions.invoke('notifikasi', { body: badan }).catch(() => undefined);
}
