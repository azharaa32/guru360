import { useState } from 'react';
import { bacaStoran, tulisStoran } from '../lib/simpanan';
import type { StatusNotis } from '../lib/notifikasi';

interface Props {
  status: StatusNotis;
  ralat: string | null;
  sibuk: boolean;
  dalamTalian: boolean;
  hidupkan: () => void;
  matikan: () => void;
}

const PENERANGAN = 'Makluman baharu, peringatan RPH, ulasan semakan, perubahan jawatan, dan program atau cuti esok.';

function Nota({ status }: { status: StatusNotis }) {
  if (status === 'perlu-pasang')
    return <p className="nota">Pada iPhone, pasang Guru360 ke skrin utama dahulu (Kongsi, kemudian "Tambah ke Skrin Utama"), kemudian buka dari ikon itu.</p>;
  if (status === 'disekat') return <p className="nota">Notifikasi disekat untuk laman ini. Benarkan notifikasi dalam tetapan pelayar atau telefon, kemudian buka semula Guru360.</p>;
  if (status === 'tidak-disokong') return <p className="nota">Pelayar ini tidak menyokong notifikasi. Guna Chrome pada Android, atau Safari pada iPhone selepas memasang Guru360.</p>;
  return null;
}

/** Tetapan di skrin Profil. */
export function TetapanNotis({ status, ralat, sibuk, dalamTalian, hidupkan, matikan }: Props) {
  if (status === 'memuat') return null;
  return (
    <section className="kad" aria-labelledby="tajuk-notis">
      <h2 id="tajuk-notis">Notifikasi telefon</h2>
      <p className="nota">{PENERANGAN}</p>
      <Nota status={status} />
      {status === 'hidup' && <p className="mesej mesej-ok">Notifikasi hidup pada telefon ini.</p>}
      {ralat && (
        <p className="mesej mesej-ralat" role="alert">
          {ralat}
        </p>
      )}
      {status === 'mati' && (
        <button type="button" className="butang butang-utama" disabled={sibuk || !dalamTalian} onClick={hidupkan}>
          {sibuk ? 'Sebentar…' : 'Hidupkan notifikasi'}
        </button>
      )}
      {status === 'hidup' && (
        <button type="button" className="butang butang-garis" disabled={sibuk} onClick={matikan}>
          {sibuk ? 'Sebentar…' : 'Matikan notifikasi'}
        </button>
      )}
    </section>
  );
}

const KUNCI_TOLAK = 'guru360.notis.tolak';

/** Ajakan di skrin Utama, sekali sahaja sehingga guru menolaknya. */
export function KadNotis({ status, ralat, sibuk, dalamTalian, hidupkan }: Props) {
  const [ditolak, setDitolak] = useState(() => bacaStoran<boolean>(KUNCI_TOLAK) === true);
  if (ditolak || (status !== 'mati' && status !== 'perlu-pasang')) return null;
  const tolak = () => {
    tulisStoran(KUNCI_TOLAK, true);
    setDitolak(true);
  };
  return (
    <section className="kad kad-makluman" aria-labelledby="tajuk-ajak-notis">
      <strong id="tajuk-ajak-notis">Terima notifikasi di telefon?</strong>
      <p className="nota">{PENERANGAN}</p>
      <Nota status={status} />
      {ralat && (
        <p className="mesej mesej-ralat" role="alert">
          {ralat}
        </p>
      )}
      <div className="dua-butang">
        <button type="button" className="butang butang-garis butang-kecil" onClick={tolak}>
          Nanti
        </button>
        {status === 'mati' && (
          <button type="button" className="butang butang-utama butang-kecil" disabled={sibuk || !dalamTalian} onClick={hidupkan}>
            Hidupkan
          </button>
        )}
      </div>
    </section>
  );
}
