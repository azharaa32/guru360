import { useCallback, useEffect, useRef, useState } from 'react';

// Perakam suara: pengecaman pertuturan pelayar (Web Speech API), Bahasa Melayu.
// Chrome dan Safari menghantar audio ke pelayan pengecaman pelayar itu sendiri, jadi ia perlukan internet.
// Tiada audio disimpan oleh Guru360; hanya teks yang dikembalikan.

interface HasilPengecaman {
  isFinal: boolean;
  0: { transcript: string };
}
interface PeristiwaPengecaman {
  resultIndex: number;
  results: ArrayLike<HasilPengecaman>;
}
interface Pengecam {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: PeristiwaPengecaman) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type BinaPengecam = new () => Pengecam;

function cariPengecam(): BinaPengecam | null {
  const w = window as unknown as { SpeechRecognition?: BinaPengecam; webkitSpeechRecognition?: BinaPengecam };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** true jika pelayar ini menyokong pengecaman pertuturan. */
export const suaraDisokong = () => typeof window !== 'undefined' && cariPengecam() !== null;

const RALAT: Record<string, string> = {
  'not-allowed': 'Kebenaran mikrofon ditolak. Benarkan mikrofon untuk laman ini dalam tetapan pelayar.',
  'service-not-allowed': 'Kebenaran mikrofon ditolak. Benarkan mikrofon untuk laman ini dalam tetapan pelayar.',
  'audio-capture': 'Mikrofon tidak dijumpai.',
  network: 'Perakam suara perlukan internet. Cuba lagi apabila ada talian.',
  'language-not-supported': 'Pelayar ini tidak menyokong Bahasa Melayu untuk perakam suara.',
};

/**
 * Rakam pertuturan. `onAkhir` dipanggil bagi setiap ayat yang sudah dimuktamadkan; `sementara` ialah teks yang
 * sedang didengar (belum muktamad), untuk dipaparkan sahaja.
 */
export function useSuara(onAkhir: (teks: string) => void) {
  const [merakam, setMerakam] = useState(false);
  const [sementara, setSementara] = useState('');
  const [ralat, setRalat] = useState<string | null>(null);
  const rujuk = useRef<Pengecam | null>(null);
  const panggil = useRef(onAkhir);
  panggil.current = onAkhir;

  const henti = useCallback(() => rujuk.current?.stop(), []);

  const mula = useCallback(() => {
    const Bina = cariPengecam();
    if (!Bina || rujuk.current) return;
    if (!navigator.onLine) return setRalat(RALAT.network);
    setRalat(null);
    setSementara('');
    const p = new Bina();
    p.lang = 'ms-MY';
    p.continuous = true;
    p.interimResults = true;
    p.onresult = (e) => {
      let baru = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) panggil.current(r[0].transcript);
        else baru += r[0].transcript;
      }
      setSementara(baru);
    };
    p.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setRalat(RALAT[e.error] ?? 'Perakam suara terhenti. Cuba lagi.');
    };
    p.onend = () => {
      rujuk.current = null;
      setMerakam(false);
      setSementara('');
    };
    rujuk.current = p;
    try {
      p.start();
      setMerakam(true);
    } catch {
      rujuk.current = null;
      setRalat('Perakam suara tidak dapat dimulakan. Cuba lagi.');
    }
  }, []);

  useEffect(() => () => rujuk.current?.abort(), []);
  return { merakam, sementara, ralat, mula, henti };
}

export type MedanRph = 'objektif' | 'aktiviti' | 'pentaksiran' | 'refleksi';

// Kata kunci yang disebut guru untuk berpindah medan. "Penilaian" diterima sebagai pentaksiran.
const KATA_KUNCI: [RegExp, MedanRph][] = [
  [/^objektif(nya)?$/, 'objektif'],
  [/^aktiviti(nya)?$/, 'aktiviti'],
  [/^(pentaksiran|penilaian)(nya)?$/, 'pentaksiran'],
  [/^refleksi(nya)?$/, 'refleksi'],
];

/**
 * Agihkan ucapan kepada medan RPH ikut kata kunci yang disebut, contohnya
 * "objektif murid dapat membaca aktiviti bacaan berkumpulan". Teks sebelum kata kunci pertama masuk ke `semasa`.
 * Dipulangkan: teks bagi setiap medan, dan medan terakhir (supaya ayat seterusnya bersambung di situ).
 */
export function agihUcapan(teks: string, semasa: MedanRph): { bahagian: Partial<Record<MedanRph, string>>; akhir: MedanRph } {
  const bahagian: Partial<Record<MedanRph, string>> = {};
  let medan = semasa;
  for (const perkataan of teks.trim().split(/\s+/)) {
    if (!perkataan) continue;
    const bersih = perkataan.toLowerCase().replace(/[.,:;!?]+$/, '');
    const padan = KATA_KUNCI.find(([r]) => r.test(bersih));
    if (padan) {
      medan = padan[1];
      continue;
    }
    bahagian[medan] = bahagian[medan] ? `${bahagian[medan]} ${perkataan}` : perkataan;
  }
  return { bahagian, akhir: medan };
}

/**
 * Sambung teks baharu di hujung teks lama. Pengecam jarang meletak tanda baca, jadi setiap ayat (dipisahkan oleh
 * jeda guru) ditamatkan dengan noktah sebelum ayat seterusnya disambung.
 */
export const sambung = (lama: string, baharu: string) => {
  const b = baharu.trim().toUpperCase();
  if (!b) return lama;
  const l = lama.replace(/\s+$/, '');
  if (!l) return b;
  return /[\p{L}\p{N})]$/u.test(l) ? `${l}. ${b}` : `${l} ${b}`;
};
