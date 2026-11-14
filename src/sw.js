// Service worker Guru360. VERSION dan PRECACHE diisi oleh build.mjs.
const VERSION = '%VERSION%';
const PRECACHE = '%PRECACHE%';
const SHELL = `guru360-shell-${VERSION}`;
const FONTS = 'guru360-fonts-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('guru360-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fon Google: guna salinan tersimpan dahulu, simpan bila berjaya dimuat turun.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pelayan lain (contohnya Supabase) tidak disentuh: data sentiasa terus dari rangkaian.
  if (url.origin !== self.location.origin) return;

  // Buka halaman: cuba rangkaian dahulu supaya kemas kini sampai, jatuh ke cache bila tiada talian.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((cache) => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html', { cacheName: SHELL })),
    );
    return;
  }

  // Fail aplikasi (nama berhash): cache dahulu.
  event.respondWith(caches.match(req, { cacheName: SHELL }).then((hit) => hit || fetch(req)));
});
