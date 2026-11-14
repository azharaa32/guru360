-- Tugas 5: cuti sekolah guru sendiri. Kalendar KPM dan cuti umum disimpan dalam kod aplikasi (src/data/kalendar.ts).
-- jenis 'cuti'    : sekolah ditutup (cuti peristiwa, cuti khas sekolah)
-- jenis 'sekolah' : hari persekolahan ganti, walaupun hujung minggu atau cuti; ikut_hari = jadual hari yang dipakai

create table public.cuti_sendiri (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mula date not null,
  tamat date not null,
  nama text not null check (char_length(nama) between 1 and 120),
  jenis text not null default 'cuti' check (jenis in ('cuti', 'sekolah')),
  ikut_hari smallint check (ikut_hari is null or ikut_hari between 0 and 6),
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now(),
  check (tamat >= mula),
  check (tamat - mula <= 366)
);

comment on table public.cuti_sendiri is 'Cuti peristiwa dan hari persekolahan ganti yang ditetapkan oleh sekolah guru';

create index cuti_sendiri_guru_idx on public.cuti_sendiri (guru_id, mula);

alter table public.cuti_sendiri enable row level security;

revoke all on public.cuti_sendiri from anon;
revoke all on public.cuti_sendiri from authenticated;
grant select, insert, update, delete on public.cuti_sendiri to authenticated;

create policy "cuti_sendiri: baca sendiri" on public.cuti_sendiri
  for select to authenticated
  using ((select auth.uid()) = guru_id);

create policy "cuti_sendiri: cipta sendiri" on public.cuti_sendiri
  for insert to authenticated
  with check ((select auth.uid()) = guru_id);

create policy "cuti_sendiri: kemas kini sendiri" on public.cuti_sendiri
  for update to authenticated
  using ((select auth.uid()) = guru_id)
  with check ((select auth.uid()) = guru_id);

create policy "cuti_sendiri: padam sendiri" on public.cuti_sendiri
  for delete to authenticated
  using ((select auth.uid()) = guru_id);

create trigger cuti_sendiri_dikemas_kini
  before update on public.cuti_sendiri
  for each row execute function public.set_dikemas_kini_pada();
