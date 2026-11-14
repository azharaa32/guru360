// Jana ikon PWA daripada SVG. Jalankan sekali sahaja bila reka bentuk ikon berubah: node scripts/ikon.mjs
// Memerlukan pakej "sharp" (tidak dipasang oleh npm install biasa; hasilnya sudah disimpan dalam public/icons).
import sharp from 'sharp';

const svg = (jejari, skala) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${jejari}" fill="#0e5a4a"/>
<g transform="translate(256 256) scale(${skala}) translate(-256 -256)">
<path d="M256 96a160 160 0 1 1-138.6 80" fill="none" stroke="#e8a317" stroke-width="30" stroke-linecap="round"/>
<circle cx="176" cy="117" r="17" fill="#e8a317"/>
<path d="M312 208a74 74 0 1 0 18 48h-74" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
</g></svg>`;

const buat = (nama, saiz, jejari, skala) =>
  sharp(Buffer.from(svg(jejari, skala))).resize(saiz, saiz).png().toFile(`public/icons/${nama}`);

await buat('icon-192.png', 192, 112, 1);
await buat('icon-512.png', 512, 112, 1);
await buat('icon-maskable-512.png', 512, 0, 0.72);
await buat('apple-touch-icon.png', 180, 0, 0.86);
console.log('Ikon siap');
