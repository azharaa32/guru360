-- Fasa sekolah, tugas 8: jawatan guru ditetapkan oleh admin sekolah.
-- Guru melihat jawatan yang ditetapkan dan memasukkannya ke dalam jobskop sendiri.
create table public.jawatan_guru (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid not null references public.sekolah (id) on delete cascade,
  guru_id uuid not null references auth.users (id) on delete cascade,
  tahun smallint not null check (tahun between 2024 and 2100),
  kod text not null default '' check (char_length(kod) <= 20),
  nama text not null check (char_length(nama) between 1 and 160),
  butiran text not null default '' check (char_length(butiran) <= 120),
  dicipta_oleh uuid default auth.uid() references auth.users (id) on delete set null,
  dicipta_pada timestamptz not null default now(),
  unique (sekolah_id, guru_id, tahun, kod, butiran)
);
comment on table public.jawatan_guru is 'Jawatan (portfolio MySG) yang ditetapkan admin sekolah kepada guru bagi satu tahun';
create index jawatan_guru_guru_idx on public.jawatan_guru (guru_id, tahun);
create index jawatan_guru_dicipta_oleh_idx on public.jawatan_guru (dicipta_oleh);

alter table public.jawatan_guru enable row level security;
revoke all on public.jawatan_guru from anon, authenticated;
grant select, insert, delete on public.jawatan_guru to authenticated;

create policy "jawatan_guru: guru baca sendiri, admin baca sekolahnya, ibu pejabat baca semua" on public.jawatan_guru for select to authenticated
  using (guru_id = (select auth.uid()) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "jawatan_guru: admin tetapkan untuk guru aktif sekolahnya" on public.jawatan_guru for insert to authenticated
  with check (
    sekolah_id = (select private.sekolah_ditadbir())
    and exists (select 1 from public.ahli a where a.pengguna_id = jawatan_guru.guru_id and a.sekolah_id = jawatan_guru.sekolah_id and a.peranan = 'guru' and a.status = 'aktif')
  );
create policy "jawatan_guru: admin padam di sekolahnya" on public.jawatan_guru for delete to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()));
