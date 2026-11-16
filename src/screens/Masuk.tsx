import { useState, type FormEvent, type ReactNode } from 'react';
import { daftarSekolah } from '../lib/sekolah';
import { alamatAplikasi, buangPautanEmel, ralatPautan, supabase, terjemahRalat } from '../lib/supabase';
import { DaftarSekolah } from './DaftarSekolah';

type Mod = 'masuk' | 'daftar' | 'lupa';
type Mesej = { jenis: 'ralat' | 'ok'; teks: string } | null;

const PANJANG_MIN = 8;

function Jenama({ children }: { children: ReactNode }) {
  return (
    <div className="masuk">
      <header className="masuk-kepala">
        <img src="./icons/icon-192.png" alt="" width="64" height="64" />
        <h1>Guru360</h1>
        <p>Kerja harian guru dalam satu aplikasi</p>
      </header>
      <main className="masuk-isi">{children}</main>
    </div>
  );
}

function MedanKataLaluan({
  id,
  label,
  nilai,
  tukar,
  baharu,
}: {
  id: string;
  label: string;
  nilai: string;
  tukar: (v: string) => void;
  baharu: boolean;
}) {
  const [nampak, setNampak] = useState(false);
  return (
    <div className="medan">
      <label htmlFor={id}>{label}</label>
      <div className="medan-berbutang">
        <input
          id={id}
          type={nampak ? 'text' : 'password'}
          value={nilai}
          onChange={(e) => tukar(e.target.value)}
          autoComplete={baharu ? 'new-password' : 'current-password'}
          minLength={baharu ? PANJANG_MIN : undefined}
          aria-describedby={baharu ? `${id}-bantuan` : undefined}
          required
        />
        <button type="button" className="butang-teks" onClick={() => setNampak(!nampak)} aria-pressed={nampak}>
          {nampak ? 'Sorok' : 'Tunjuk'}
        </button>
      </div>
      {baharu && (
        <span id={`${id}-bantuan`} className="bantuan">
          Sekurang-kurangnya {PANJANG_MIN} aksara.
        </span>
      )}
    </div>
  );
}

function PetakMesej({ mesej }: { mesej: Mesej }) {
  return (
    <div aria-live="polite">
      {mesej && (
        <p className={`mesej mesej-${mesej.jenis}`} role={mesej.jenis === 'ralat' ? 'alert' : undefined}>
          {mesej.teks}
        </p>
      )}
    </div>
  );
}

function TabMasuk({ mod, tukar }: { mod: Mod; tukar: (m: Mod) => void }) {
  return (
    <div className="tab" role="group" aria-label="Pilih tindakan">
      <button type="button" aria-pressed={mod === 'masuk'} onClick={() => tukar('masuk')}>
        Log masuk
      </button>
      <button type="button" aria-pressed={mod === 'daftar'} onClick={() => tukar('daftar')}>
        Daftar sekolah
      </button>
    </div>
  );
}

export function Masuk() {
  const [mod, setMod] = useState<Mod>('masuk');
  const [emel, setEmel] = useState('');
  const [kata, setKata] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<Mesej>(ralatPautan ? { jenis: 'ralat', teks: terjemahRalat(ralatPautan) } : null);

  const tukarMod = (m: Mod) => {
    setMod(m);
    setMesej(null);
    setKata('');
  };

  const hantar = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    const alamat = emel.trim().toLowerCase();
    setMesej(null);
    if (!navigator.onLine) {
      setMesej({ jenis: 'ralat', teks: 'Tiada sambungan internet. Log masuk memerlukan talian.' });
      return;
    }
    setSibuk(true);
    try {
      if (mod === 'masuk') {
        const { error } = await supabase.auth.signInWithPassword({ email: alamat, password: kata });
        if (error) setMesej({ jenis: 'ralat', teks: terjemahRalat(error.message) });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(alamat, { redirectTo: alamatAplikasi() });
        if (error) setMesej({ jenis: 'ralat', teks: terjemahRalat(error.message) });
        else {
          setMod('masuk');
          setMesej({
            jenis: 'ok',
            teks: `Jika ${alamat} berdaftar, emel untuk set semula kata laluan sudah dihantar. Semak juga folder spam.`,
          });
        }
      }
    } catch (ralat) {
      setMesej({ jenis: 'ralat', teks: terjemahRalat(String(ralat)) });
    } finally {
      setSibuk(false);
    }
  };

  const butang = mod === 'lupa' ? 'Hantar pautan' : 'Log masuk';

  if (mod === 'daftar')
    return (
      <Jenama>
        <DaftarSekolah kepala={<TabMasuk mod={mod} tukar={tukarMod} />} daftar={daftarSekolah} kembali={() => tukarMod('masuk')} />
      </Jenama>
    );

  return (
    <Jenama>
      <form className="kad borang" onSubmit={hantar} noValidate={false}>
        {mod === 'lupa' ? (
          <>
            <h2>Lupa kata laluan</h2>
            <p>Masukkan emel akaun anda. Kami hantar pautan untuk set kata laluan baharu.</p>
          </>
        ) : (
          <TabMasuk mod={mod} tukar={tukarMod} />
        )}
        <div className="medan">
          <label htmlFor="emel">Emel</label>
          <input
            id="emel"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={emel}
            onChange={(e) => setEmel(e.target.value)}
            required
          />
        </div>
        {mod !== 'lupa' && (
          <MedanKataLaluan id="kata" label="Kata laluan" nilai={kata} tukar={setKata} baharu={false} />
        )}
        <PetakMesej mesej={mesej} />
        <button type="submit" className="butang butang-utama" disabled={sibuk}>
          {sibuk ? 'Sebentar…' : butang}
        </button>
        {mod === 'masuk' && (
          <button type="button" className="butang-teks tengah" onClick={() => tukarMod('lupa')}>
            Lupa kata laluan?
          </button>
        )}
        {mod === 'lupa' && (
          <button type="button" className="butang-teks tengah" onClick={() => tukarMod('masuk')}>
            Kembali ke log masuk
          </button>
        )}
      </form>
      <p className="nota tengah">Data anda peribadi: hanya anda boleh membacanya.</p>
    </Jenama>
  );
}

export function KataLaluanBaharu({ selesai }: { selesai: () => void }) {
  const [kata, setKata] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<Mesej>(null);

  const hantar = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    if (kata.length < PANJANG_MIN) {
      setMesej({ jenis: 'ralat', teks: `Kata laluan mesti sekurang-kurangnya ${PANJANG_MIN} aksara.` });
      return;
    }
    setSibuk(true);
    setMesej(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: kata });
      if (error) setMesej({ jenis: 'ralat', teks: terjemahRalat(error.message) });
      else selesai();
    } catch (ralat) {
      setMesej({ jenis: 'ralat', teks: terjemahRalat(String(ralat)) });
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Jenama>
      <form className="kad borang" onSubmit={hantar}>
        <h2>Tetapkan kata laluan</h2>
        <p>Pilih kata laluan untuk akaun anda. Anda akan guna kata laluan ini untuk log masuk.</p>
        <MedanKataLaluan id="kata-baharu" label="Kata laluan baharu" nilai={kata} tukar={setKata} baharu />
        <PetakMesej mesej={mesej} />
        <button type="submit" className="butang butang-utama" disabled={sibuk}>
          {sibuk ? 'Sebentar…' : 'Simpan kata laluan'}
        </button>
      </form>
    </Jenama>
  );
}

/** Pautan daripada emel jemputan atau set semula kata laluan: kod ditukar menjadi sesi hanya apabila butang ditekan. */
export function TerimaPautan({ pautan, berjaya, tutup }: { pautan: { tokenHash: string; jenis: 'invite' | 'recovery' | 'magiclink' }; berjaya: () => void; tutup: () => void }) {
  const [sibuk, setSibuk] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const jemputan = pautan.jenis === 'invite';
  const buka = pautan.jenis === 'magiclink';
  const teruskan = async () => {
    setSibuk(true);
    setRalat(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash: pautan.tokenHash, type: pautan.jenis });
      if (error) {
        setRalat(
          /fetch|network/i.test(error.message)
            ? terjemahRalat(error.message)
            : jemputan
              ? 'Pautan jemputan ini sudah luput atau sudah digunakan. Minta admin sekolah menghantar semula jemputan.'
              : buka
                ? 'Pautan ini sudah luput atau sudah digunakan. Log masuk seperti biasa dengan emel dan kata laluan anda.'
                : 'Pautan ini sudah luput atau sudah digunakan. Minta pautan baharu melalui "Lupa kata laluan".',
        );
        setSibuk(false);
        return;
      }
      buangPautanEmel();
      berjaya();
    } catch (e) {
      setRalat(terjemahRalat(e instanceof Error ? e.message : null));
      setSibuk(false);
    }
  };
  return (
    <Jenama>
      <div className="kad borang">
        <h2>{jemputan ? 'Jemputan Guru360' : buka ? 'Peringatan Guru360' : 'Set semula kata laluan'}</h2>
        <p>{jemputan ? 'Anda dijemput menyertai Guru360. Tekan butang di bawah, kemudian tetapkan kata laluan anda.' : buka ? 'Admin sekolah anda menghantar peringatan. Tekan butang di bawah untuk membuka Guru360.' : 'Tekan butang di bawah, kemudian tetapkan kata laluan baharu.'}</p>
        <div aria-live="polite">
          {ralat && (
            <p className="mesej mesej-ralat" role="alert">
              {ralat}
            </p>
          )}
        </div>
        <button type="button" className="butang butang-utama" disabled={sibuk} onClick={() => void teruskan()}>
          {sibuk ? 'Sebentar…' : jemputan ? 'Terima jemputan' : buka ? 'Buka Guru360' : 'Teruskan'}
        </button>
        {ralat && (
          <button
            type="button"
            className="butang butang-garis"
            onClick={() => {
              buangPautanEmel();
              tutup();
            }}
          >
            Ke log masuk
          </button>
        )}
      </div>
    </Jenama>
  );
}

export function Memuat() {
  return (
    <div className="masuk memuat" role="status">
      <img src="./icons/icon-192.png" alt="" width="64" height="64" />
      <span>Membuka Guru360…</span>
    </div>
  );
}
