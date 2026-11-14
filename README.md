# Guru360

Aplikasi web boleh pasang (PWA) untuk guru menyiapkan kerja harian sekolah: RPH, takwim, kertas kerja, memo, surat, minit, OPR dan jobskop.

- Antara muka: React + TypeScript, dibina dengan esbuild
- Pelayan: Supabase (pangkalan data, log masuk, simpanan fail)
- Hos: GitHub Pages, dideploy automatik oleh GitHub Actions setiap kali `main` berubah

## Jalankan

```
npm install
npm run build   # hasil dalam dist/
npm run serve   # http://localhost:4173/guru360/
```

## Susunan

| Laluan | Isi |
| --- | --- |
| `src/` | Kod aplikasi (skrin, komponen, tema, service worker) |
| `public/` | Manifest dan ikon |
| `build.mjs` | Skrip bina |
| `supabase/migrations/` | Perubahan pangkalan data, mengikut turutan |

## Keselamatan

Repositori ini awam. Hanya kunci **awam** Supabase berada dalam kod. Jangan masukkan kunci rahsia, data guru atau dokumen peribadi ke dalam repositori.
