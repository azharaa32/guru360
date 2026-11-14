import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

// Ralat daripada pautan emel (contohnya pautan luput) tiba dalam alamat; baca sebelum Supabase membersihkannya.
const param = new URLSearchParams(window.location.hash.replace(/^#/, ''));
export const ralatPautan: string | null = param.get('error_description');
if (ralatPautan) window.history.replaceState(null, '', window.location.pathname);

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'guru360.sesi',
  },
});

/** Alamat aplikasi ini, untuk pautan dalam emel pengesahan dan set semula kata laluan. */
export const alamatAplikasi = () => `${window.location.origin}${window.location.pathname}`;

const terjemahan: [RegExp, string][] = [
  [/invalid login credentials/i, 'Emel atau kata laluan salah.'],
  [/email not confirmed/i, 'Emel belum disahkan. Buka emel daripada Guru360 dan tekan pautan pengesahan.'],
  [/already registered|already been registered/i, 'Emel ini sudah berdaftar. Sila log masuk.'],
  [/password should be at least|weak password/i, 'Kata laluan terlalu lemah. Guna sekurang-kurangnya 8 aksara.'],
  [/different from the old password/i, 'Kata laluan baharu mesti berbeza daripada yang lama.'],
  [/rate limit|too many requests|security purposes/i, 'Terlalu banyak cubaan. Tunggu sebentar, kemudian cuba lagi.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'Alamat emel tidak sah.'],
  [/signups? (are |is )?(not allowed|disabled)/i, 'Pendaftaran ditutup buat masa ini.'],
  [/expired|invalid.*link|otp/i, 'Pautan sudah luput atau tidak sah. Minta pautan baharu.'],
  [/failed to fetch|networkerror|load failed|network request failed/i, 'Tiada sambungan internet. Cuba lagi apabila ada talian.'],
];

export function terjemahRalat(mesej: string | undefined | null): string {
  if (!mesej) return 'Sesuatu tidak kena. Cuba lagi.';
  for (const [corak, teks] of terjemahan) if (corak.test(mesej)) return teks;
  return `Tidak berjaya: ${mesej}`;
}

export const ralatRangkaian = (mesej: string | undefined | null) =>
  !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(mesej ?? '');
