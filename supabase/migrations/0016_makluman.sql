-- Fasa sekolah, tugas 5: makluman dan tindakan.
-- sekolah_id diisi  : dihantar admin sekolah kepada guru sekolahnya.
-- sekolah_id kosong : dihantar ibu pejabat kepada guru semua sekolah.
create table public.makluman (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid references public.sekolah (id) on delete cascade,
  jenis text not null default 'makluman' check (jenis in ('makluman', 'tindakan')),
  tajuk text not null check (char_length(tajuk) between 1 and 300),
  tarikh_akhir date,
  dicipta_oleh uuid default auth.uid() references auth.users (id) on delete set null,
  dicipta_pada timestamptz not null default now()
);
comment on table public.makluman is 'Makluman dan tindakan daripada admin sekolah (satu sekolah) atau ibu pejabat (semua sekolah)';
create index makluman_sekolah_idx on public.makluman (sekolah_id, dicipta_pada desc);
create index makluman_dicipta_oleh_idx on public.makluman (dicipta_oleh);

-- Satu baris bagi setiap guru yang sudah membaca; siap_pada diisi apabila guru menandakan tindakan siap.
create table public.makluman_status (
  makluman_id uuid not null references public.makluman (id) on delete cascade,
  guru_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sekolah_id uuid not null references public.sekolah (id) on delete cascade,
  dibaca_pada timestamptz not null default now(),
  siap_pada timestamptz,
  primary key (makluman_id, guru_id)
);
comment on table public.makluman_status is 'Status baca dan siap bagi setiap guru untuk satu makluman atau tindakan';
create index makluman_status_guru_idx on public.makluman_status (guru_id);
create index makluman_status_sekolah_idx on public.makluman_status (sekolah_id, makluman_id);

alter table public.makluman enable row level security;
alter table public.makluman_status enable row level security;
revoke all on public.makluman, public.makluman_status from anon, authenticated;
grant select, insert, delete on public.makluman to authenticated;
grant select, insert, update on public.makluman_status to authenticated;

create policy "makluman: baca milik sekolah sendiri dan ibu pejabat" on public.makluman for select to authenticated
  using (sekolah_id is null or sekolah_id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));
create policy "makluman: admin atau ibu pejabat cipta" on public.makluman for insert to authenticated
  with check (sekolah_id = (select private.sekolah_ditadbir()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
create policy "makluman: admin atau ibu pejabat padam" on public.makluman for delete to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));

create policy "makluman_status: guru baca sendiri, admin baca sekolahnya, ibu pejabat baca semua" on public.makluman_status for select to authenticated
  using (guru_id = (select auth.uid()) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "makluman_status: guru cipta sendiri" on public.makluman_status for insert to authenticated
  with check (
    guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_mengajar())
    and exists (select 1 from public.makluman m where m.id = makluman_id and (m.sekolah_id is null or m.sekolah_id = (select private.sekolah_mengajar())))
  );
create policy "makluman_status: guru kemas kini sendiri" on public.makluman_status for update to authenticated
  using (guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_mengajar()))
  with check (guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_mengajar()));
