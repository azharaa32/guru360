import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { NEGERI } from '../lib/akaun';
import { type DataSekolahBaru, type Hasil } from '../lib/sekolah';

const KOSONG: DataSekolahBaru = { nama: '', kod: '', negeri: '', admin_nama: '', emel: '' };

/**
 * Borang sekolah dan admin. Dipakai untuk pendaftaran sendiri (orang awam) dan cipta sekolah (ibu pejabat).
 * Kata laluan tidak ditaip di sini: admin menetapkannya sendiri melalui pautan dalam emel jemputan.
 */
export function BorangSekolah({
  awalan,
  butang,
  hantar,
  selesai,
  catatan,
  perluKod = false,
}: {
  /** Pendaftaran sendiri memerlukan kod pendaftaran daripada ibu pejabat. */
  perluKod?: boolean;
  awalan: string;
  butang: string;
  hantar: (d: DataSekolahBaru) => Promise<Hasil>;
  selesai: (d: DataSekolahBaru) => void;
  catatan?: ReactNode;
}) {
  const [d, setD] = useState<DataSekolahBaru>(KOSONG);
  const [sibuk, setSibuk] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const ubah = (k: keyof DataSekolahBaru) => (v: string) => setD((x) => ({ ...x, [k]: v }));

  const hantarBorang = async (e: FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    setSibuk(true);
    setRalat(null);
    const h = await hantar(d);
    setSibuk(false);
    if (h.ok) selesai(d);
    else setRalat(h.ralat);
  };

  const medan = (k: keyof DataSekolahBaru, label: string, atribut: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="medan">
      <label htmlFor={`${awalan}-${k}`}>{label}</label>
      <input id={`${awalan}-${k}`} value={d[k]} onChange={(e) => ubah(k)(e.target.value)} required maxLength={k === 'nama' ? 200 : k === 'emel' ? 254 : 120} {...atribut} />
    </div>
  );

  return (
    <form className="borang borang-sekolah" onSubmit={hantarBorang}>
      {perluKod && (
        <div className="medan">
          <label htmlFor={`${awalan}-kod-daftar`}>Kod pendaftaran</label>
          <input
            id={`${awalan}-kod-daftar`}
            className="mono"
            value={d.kod_daftar ?? ''}
            onChange={(e) => setD((x) => ({ ...x, kod_daftar: e.target.value.toUpperCase() }))}
            required
            minLength={8}
            maxLength={12}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${awalan}-kod-daftar-bantuan`}
          />
          <p className="bantuan" id={`${awalan}-kod-daftar-bantuan`}>
            Lapan aksara, diberi oleh ibu pejabat. Setiap kod hanya boleh digunakan sekali.
          </p>
        </div>
      )}
      {medan('nama', 'Nama sekolah', { autoComplete: 'organization', autoCapitalize: 'characters' })}
      {medan('kod', 'Kod sekolah', { autoCapitalize: 'characters', spellCheck: false, maxLength: 20, minLength: 3 })}
      <div className="medan">
        <label htmlFor={`${awalan}-negeri`}>Negeri</label>
        <select id={`${awalan}-negeri`} value={d.negeri} onChange={(e) => ubah('negeri')(e.target.value)} required>
          <option value="">Pilih negeri</option>
          {NEGERI.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {medan('admin_nama', 'Nama admin sekolah', { autoComplete: 'name', autoCapitalize: 'characters' })}
      {medan('emel', 'Emel admin', { type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none', spellCheck: false })}
      {catatan}
      <div aria-live="polite">
        {ralat && (
          <p className="mesej mesej-ralat" role="alert">
            {ralat}
          </p>
        )}
      </div>
      <button type="submit" className="butang butang-utama" disabled={sibuk}>
        {sibuk ? 'Sebentar…' : butang}
      </button>
    </form>
  );
}

/** Pendaftaran sekolah oleh orang awam (pengurusan sekolah). Guru biasa menyertai melalui jemputan. */
export function DaftarSekolah({ kepala, daftar, kembali }: { kepala: ReactNode; daftar: (d: DataSekolahBaru) => Promise<Hasil>; kembali: () => void }) {
  const [hantar, setHantar] = useState<DataSekolahBaru | null>(null);
  if (hantar)
    return (
      <div className="kad borang" role="status">
        <h2>Permohonan dihantar</h2>
        <p>
          Kami hantar emel ke <strong className="mono">{hantar.emel}</strong>. Tekan pautan di dalamnya untuk menetapkan kata laluan, kemudian log masuk.
        </p>
        <p className="nota">Sekolah anda menunggu kelulusan ibu pejabat. Anda boleh menjemput guru sebaik sahaja diluluskan. Semak juga folder spam.</p>
        <button type="button" className="butang butang-garis" onClick={kembali}>
          Kembali ke log masuk
        </button>
      </div>
    );
  return (
    <div className="kad borang">
      {kepala}
      <p className="nota">Untuk pengurusan sekolah sahaja, dengan kod pendaftaran daripada ibu pejabat. Guru biasa tidak mendaftar di sini; guru menyertai melalui emel jemputan daripada admin sekolah.</p>
      <BorangSekolah
        awalan="daftar"
        perluKod
        butang="Daftar sekolah"
        hantar={daftar}
        selesai={setHantar}
        catatan={
          <p className="mesej mesej-tunggu">
            <strong>Perlu kelulusan ibu pejabat.</strong> Selepas mendaftar, sekolah anda menunggu kelulusan. Kata laluan ditetapkan melalui pautan dalam emel.
          </p>
        }
      />
    </div>
  );
}
