-- Fasa sekolah, tugas 2: rekod siapa dan bila sekolah diluluskan atau ditolak.
-- Penulisan status dibuat oleh fungsi pelayan (daftar-sekolah, urus-sekolah) dengan kunci perkhidmatan; aplikasi hanya membaca.
alter table public.sekolah
  add column diputuskan_pada timestamptz,
  add column diputuskan_oleh uuid references auth.users (id) on delete set null;
create index sekolah_diputuskan_oleh_idx on public.sekolah (diputuskan_oleh);
