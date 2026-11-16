# Guru360

Aplikasi web boleh pasang (PWA) untuk guru menyiapkan kerja harian sekolah: RPH, takwim, kertas kerja, memo, surat, minit, OPR dan jobskop.

Sejak versi 2, Guru360 diurus mengikut sekolah, dengan tiga peranan:

- **Guru** menyertai sekolah melalui emel jemputan dan membuat kerja hariannya.
- **Admin sekolah** (seorang bagi setiap sekolah) menjemput guru, menetapkan kepala surat dan cuti, menghantar makluman dan tindakan, menyemak RPH, membaca dokumen guru dan menetapkan jawatan. Akaun ini tidak mengajar.
- **Ibu pejabat** meluluskan atau mencipta sekolah, menghantar makluman dan cuti kepada semua sekolah, dan melihat status ringkas setiap sekolah.

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
| `supabase/functions/` | Fungsi pelayan: `daftar-sekolah`, `urus-sekolah`, `urus-ahli` |

## Keselamatan

Repositori ini awam. Hanya kunci **awam** Supabase berada dalam kod. Jangan masukkan kunci rahsia, data guru atau dokumen peribadi ke dalam repositori.

- Setiap jadual dilindungi Row Level Security mengikut sekolah dan peranan.
- Kunci perkhidmatan hanya digunakan di dalam fungsi pelayan, selepas pemanggil disemak.
- Kunci SMTP hanya disimpan di papan pemuka Supabase.
- Pendaftaran akaun terbuka dimatikan; akaun dicipta melalui pendaftaran sekolah atau jemputan sahaja.

## Tetapan Supabase yang tidak berada dalam repositori

- Authentication → SMTP Settings: penghantar emel sendiri.
- Authentication → Sign In / Providers: "Allow new users to sign up" dimatikan.
- Authentication → Emails → Templates: templat *Invite user* dan *Reset password* memakai pautan `?token_hash={{ .TokenHash }}&type=invite` (atau `recovery`) ke alamat aplikasi.
