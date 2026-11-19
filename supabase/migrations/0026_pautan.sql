-- Pautan pantas: admin sekolah meletak pautan untuk guru sekolahnya; ibu pejabat untuk semua sekolah (sekolah_id kosong).
create table public.pautan (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid references public.sekolah (id) on delete cascade,
  kategori text not null check (kategori in ('utama', 'kurikulum', 'kokurikulum', 'hem')),
  tajuk text not null check (char_length(btrim(tajuk)) between 1 and 80),
  -- Hanya https; menghalang javascript:, data: dan seumpamanya.
  url text not null check (url ~ '^https://[^\s/?#]+\.[^\s]+$' and char_length(url) <= 500),
  susunan integer not null default 0,
  dicipta_oleh uuid default auth.uid() references auth.users (id) on delete set null,
  dicipta_pada timestamptz not null default now()
);
comment on table public.pautan is 'Pautan ke laman luar daripada admin sekolah (satu sekolah) atau ibu pejabat (semua sekolah)';
create index pautan_sekolah_idx on public.pautan (sekolah_id, kategori, susunan);
create index pautan_dicipta_oleh_idx on public.pautan (dicipta_oleh);

alter table public.pautan enable row level security;
revoke all on public.pautan from anon, authenticated;
grant select, insert, delete on public.pautan to authenticated;
grant update (kategori, tajuk, url, susunan) on public.pautan to authenticated;

create policy "pautan: baca milik sekolah sendiri dan ibu pejabat" on public.pautan for select to authenticated
  using ((sekolah_id is null and (select private.sekolah_saya()) is not null) or sekolah_id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));
create policy "pautan: admin atau ibu pejabat cipta" on public.pautan for insert to authenticated
  with check (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
create policy "pautan: admin atau ibu pejabat ubah" on public.pautan for update to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())))
  with check (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
create policy "pautan: admin atau ibu pejabat padam" on public.pautan for delete to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
