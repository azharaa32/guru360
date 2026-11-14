import type { ReactNode } from 'react';
import type { Laluan } from '../lib/hooks';
import { Ikon } from './Ikon';

const tab: { id: Laluan; label: string; href: string }[] = [
  { id: 'utama', label: 'Utama', href: '#/' },
  { id: 'takwim', label: 'Takwim', href: '#/takwim' },
  { id: 'profil', label: 'Profil', href: '#/profil' },
];

export function NavBawah({ aktif }: { aktif: Laluan }) {
  return (
    <nav className="nav-bawah" aria-label="Navigasi utama">
      {tab.map((t) => (
        <a key={t.id} href={t.href} className="nav-tab" aria-current={t.id === aktif ? 'page' : undefined}>
          <Ikon nama={t.id} />
          {t.label}
        </a>
      ))}
    </nav>
  );
}

export function Kepala({ kecil, tajuk, sub, kanan }: { kecil?: string; tajuk: string; sub?: string; kanan?: ReactNode }) {
  return (
    <header className="kepala">
      <div className="kepala-teks">
        {kecil && <span className="kepala-kecil">{kecil}</span>}
        <h1>{tajuk}</h1>
        {sub && <span className="kepala-kecil">{sub}</span>}
      </div>
      {kanan}
    </header>
  );
}

export function Kosong({ ikon, tajuk, children }: { ikon: 'takwim' | 'profil'; tajuk: string; children: ReactNode }) {
  return (
    <section className="kad kosong">
      <span className="kosong-ikon">
        <Ikon nama={ikon} saiz={28} />
      </span>
      <h2>{tajuk}</h2>
      <p>{children}</p>
    </section>
  );
}
