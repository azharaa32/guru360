import { useCallback, useEffect, useState } from 'react';

interface Hasil {
  url: string;
  fail: File;
  tajuk: string;
}

/** Jana PDF dalam telefon, kemudian tawarkan Buka dan Kongsi. */
export function usePdf() {
  const [pdf, setPdf] = useState<Hasil | null>(null);
  const [menjana, setMenjana] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);

  useEffect(() => () => void (pdf && URL.revokeObjectURL(pdf.url)), [pdf]);

  const jana = useCallback(async (bina: () => Promise<Uint8Array>, namaFail: string, tajuk: string) => {
    setMenjana(true);
    setRalat(null);
    try {
      const bait = await bina();
      const fail = new File([bait as BlobPart], namaFail, { type: 'application/pdf' });
      setPdf({ url: URL.createObjectURL(fail), fail, tajuk });
    } catch (e) {
      console.error(e);
      setPdf(null);
      setRalat(
        navigator.onLine
          ? 'PDF tidak dapat dijana. Cuba lagi.'
          : 'Enjin PDF belum dimuat turun ke telefon ini. Sambung internet sekali, kemudian cuba lagi.',
      );
    } finally {
      setMenjana(false);
    }
  }, []);

  const buang = useCallback(() => setPdf(null), []);
  return { pdf, menjana, ralat, jana, buang };
}

export function HasilPdf({ pdf, ralat }: { pdf: Hasil | null; ralat: string | null }) {
  const bolehKongsi = pdf !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdf.fail] });
  const kongsi = async () => {
    if (!pdf) return;
    try {
      await navigator.share({ files: [pdf.fail], title: pdf.tajuk });
    } catch {
      /* guru membatalkan perkongsian */
    }
  };
  return (
    <>
      <div aria-live="polite">
        {ralat && (
          <p className="mesej mesej-ralat" role="alert">
            {ralat}
          </p>
        )}
        {pdf && <p className="mesej mesej-ok">PDF siap: {pdf.tajuk}.</p>}
      </div>
      {pdf && (
        <div className="dua-butang">
          <a className="butang butang-garis" href={pdf.url} download={pdf.fail.name} target="_blank" rel="noopener">
            Buka PDF
          </a>
          {bolehKongsi ? (
            <button type="button" className="butang butang-garis" onClick={kongsi}>
              Kongsi
            </button>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
