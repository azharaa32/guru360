-- Keselamatan: borang Daftar sekolah yang terbuka hanya diterima bersama kod pendaftaran sekali guna daripada ibu pejabat.
-- Ibu pejabat menjana dan memadam kod; fungsi pelayan daftar-sekolah menanda kod sebagai digunakan.
create table public.kod_daftar (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique check (kod ~ '^[A-Z2-9]{8}$'),
  catatan text not null default '' check (char_length(catatan) <= 120),
  dicipta_oleh uuid default auth.uid() references auth.users (id) on delete set null,
  dicipta_pada timestamptz not null default now(),
  digunakan_pada timestamptz,
  sekolah_id uuid references public.sekolah (id) on delete set null
);
comment on table public.kod_daftar is 'Kod pendaftaran sekali guna yang dijana ibu pejabat; borang Daftar sekolah hanya diterima dengan kod yang belum digunakan';
create index kod_daftar_dicipta_oleh_idx on public.kod_daftar (dicipta_oleh);
create index kod_daftar_sekolah_idx on public.kod_daftar (sekolah_id);

alter table public.kod_daftar enable row level security;
revoke all on public.kod_daftar from anon, authenticated;
grant select, insert, delete on public.kod_daftar to authenticated;

create policy "kod_daftar: ibu pejabat baca" on public.kod_daftar for select to authenticated
  using ((select private.ialah_ibu_pejabat()));
create policy "kod_daftar: ibu pejabat jana" on public.kod_daftar for insert to authenticated
  with check ((select private.ialah_ibu_pejabat()) and digunakan_pada is null and sekolah_id is null);
create policy "kod_daftar: ibu pejabat padam yang belum digunakan" on public.kod_daftar for delete to authenticated
  using ((select private.ialah_ibu_pejabat()) and digunakan_pada is null);
