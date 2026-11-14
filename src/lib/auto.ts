import { useEffect, useRef } from 'react';

/**
 * Simpanan automatik: panggil `simpan` sejurus selepas guru berhenti menaip,
 * dan juga apabila skrin ditinggalkan atau aplikasi disorok.
 * `simpan` mesti menyemak sendiri sama ada ada perubahan untuk disimpan.
 */
export function useSimpanAuto(kotor: boolean, simpan: () => void, pencetus: unknown, lengah = 800) {
  const terkini = useRef(simpan);
  terkini.current = simpan;
  useEffect(() => {
    if (!kotor) return;
    const pemasa = window.setTimeout(() => terkini.current(), lengah);
    return () => window.clearTimeout(pemasa);
  }, [kotor, pencetus, lengah]);
  useEffect(() => {
    const f = () => terkini.current();
    window.addEventListener('pagehide', f);
    document.addEventListener('visibilitychange', f);
    return () => {
      window.removeEventListener('pagehide', f);
      document.removeEventListener('visibilitychange', f);
      f();
    };
  }, []);
}
