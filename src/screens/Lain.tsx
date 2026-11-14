import { Kepala, Kosong } from '../components/Rangka';
import { APP_VERSION } from '../lib/config';
import { sudahDipasang, usePelayan, type StatusPelayan } from '../lib/hooks';

export function Takwim() {
  return (
    <>
      <Kepala tajuk="Takwim" sub="Program dan cuti sekolah" />
      <main className="isi">
        <Kosong ikon="takwim" tajuk="Belum ada program">
          Kalendar program, cuti dan penggal KPM akan dibuka di sini dalam kemas kini akan datang.
        </Kosong>
      </main>
    </>
  );
}

const teksPelayan: Record<StatusPelayan, string> = {
  menyemak: 'Menyemak…',
  ok: 'Bersambung',
  gagal: 'Tidak dapat dihubungi',
  'luar-talian': 'Tiada internet',
};

export function Profil({ dalamTalian }: { dalamTalian: boolean }) {
  const { status, semak } = usePelayan(dalamTalian);
  return (
    <>
      <Kepala tajuk="Profil" sub="Akaun dan tetapan" />
      <main className="isi">
        <Kosong ikon="profil" tajuk="Belum log masuk">
          Daftar dan log masuk dengan emel akan dibuka dalam kemas kini seterusnya.
        </Kosong>
        <section className="kad" aria-labelledby="tajuk-tentang">
          <h2 id="tajuk-tentang" className="kad-tajuk">
            Tentang aplikasi
          </h2>
          <dl className="senarai">
            <div>
              <dt>Versi</dt>
              <dd className="mono">{APP_VERSION}</dd>
            </div>
            <div>
              <dt>Cara dibuka</dt>
              <dd>{sudahDipasang() ? 'Aplikasi dipasang' : 'Pelayar web'}</dd>
            </div>
            <div>
              <dt>Pelayan data</dt>
              <dd>
                <span className={`lencana lencana-${status}`} role="status">
                  {teksPelayan[status]}
                </span>
              </dd>
            </div>
          </dl>
          {status === 'gagal' && (
            <button type="button" className="butang butang-garis" onClick={semak}>
              Cuba semula
            </button>
          )}
        </section>
      </main>
    </>
  );
}
