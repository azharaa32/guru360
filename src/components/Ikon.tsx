import type { ReactNode } from 'react';

const laluan: Record<string, ReactNode> = {
  utama: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  takwim: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  rph: (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  jadual: <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />,
  kertas: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v3h6V3M9 12l2 2 4-4" />
    </>
  ),
  minit: <path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />,
  memo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  surat: (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M8 17c2-3 3 1 5-1" />
    </>
  ),
  opr: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 16l-5-5-9 9" />
    </>
  ),
  jobskop: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18" />
    </>
  ),
  pasang: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  tiadaTalian: <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.6M19 13a10 10 0 0 0-5-2.8M12 20h.01" />,
};

export type NamaIkon = keyof typeof laluan;

export function Ikon({ nama, saiz = 22 }: { nama: NamaIkon; saiz?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={saiz}
      height={saiz}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {laluan[nama]}
    </svg>
  );
}
