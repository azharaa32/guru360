// Salin data cuti (src/data/kalendar.ts) ke fungsi pelayan notifikasi, untuk peringatan cuti esok.
// Jalankan semula setiap kali kalendar dikemas kini: node scripts/cuti-fungsi.mjs
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

const hasil = await build({ entryPoints: ['src/data/kalendar.ts'], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const url = 'data:text/javascript;base64,' + Buffer.from(hasil.outputFiles[0].text).toString('base64');
const { KALENDAR, KUMPULAN_A } = await import(url);
const entri = KALENDAR.map(({ mula, tamat, nama, jenis, untuk, kecuali }) => ({ mula, tamat: tamat ?? mula, nama, jenis, untuk, kecuali: kecuali ?? [] }));
await writeFile('supabase/functions/notifikasi/cuti.json', JSON.stringify({ kumpulanA: KUMPULAN_A, entri }) + '\n');
console.log(`${entri.length} entri cuti ditulis.`);
