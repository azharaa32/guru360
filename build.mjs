// Bina Guru360 ke folder dist/ untuk GitHub Pages.
// Semua laluan relatif (./) supaya aplikasi berjalan di bawah /guru360/ atau mana-mana laluan lain.
import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const out = 'dist';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const result = await build({
  entryPoints: { app: 'src/main.tsx' },
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  format: 'esm',
  splitting: true,
  chunkNames: 'bahagian-[hash]',
  jsx: 'automatic',
  outdir: path.join(out, 'assets'),
  entryNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  // Untuk ujian tempatan sahaja: GURU360_SUPABASE_STUB menggantikan pustaka Supabase dengan fail tiruan.
  alias: process.env.GURU360_SUPABASE_STUB ? { '@supabase/supabase-js': process.env.GURU360_SUPABASE_STUB } : {},
  logLevel: 'info',
});

const built = Object.keys(result.metafile.outputs).map((f) => path.relative(out, f).split(path.sep).join('/'));
const js = built.find((f) => /assets\/app-[^/]+\.js$/.test(f));
const css = built.find((f) => f.endsWith('.css'));
const lain = built.filter((f) => f !== js && f !== css);
if (!js || !css) throw new Error('Fail app.js atau app.css tidak terhasil');

await cp('public', out, { recursive: true });

const html = (await readFile('index.html', 'utf8')).replace('%APP_CSS%', `./${css}`).replace('%APP_JS%', `./${js}`);
await writeFile(path.join(out, 'index.html'), html);

// Senarai fail untuk disimpan oleh service worker supaya aplikasi dibuka tanpa internet.
const icons = (await readdir(path.join(out, 'icons'))).map((f) => `./icons/${f}`);
const precache = ['./', './index.html', './manifest.webmanifest', `./${js}`, `./${css}`, ...lain.map((f) => `./${f}`), ...icons];
const version = [js, css, ...lain].map((f) => path.basename(f).replace(/\.\w+$/, '').split('-').pop()).join('');
const sw = (await readFile('src/sw.js', 'utf8'))
  .replace("'%VERSION%'", JSON.stringify(version))
  .replace("'%PRECACHE%'", JSON.stringify(precache));
await writeFile(path.join(out, 'sw.js'), sw);

// GitHub Pages: jangan proses dengan Jekyll.
await writeFile(path.join(out, '.nojekyll'), '');
console.log(`Siap: ${precache.length} fail dalam cache, versi ${version}`);
