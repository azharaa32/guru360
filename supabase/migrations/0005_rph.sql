-- Tugas 6: Rancangan Pengajaran Harian. Satu baris bagi setiap waktu mengajar pada satu tarikh.
-- Hari, masa, kelas dan subjek disalin daripada jadual waktu semasa RPH dicipta, supaya RPH lama
-- tidak berubah apabila jadual diubah. id dijana di telefon daripada (guru, tarikh, masa mula),
-- jadi RPH yang sama dicipta di dua peranti tidak berganda.

create table public.rph (
  id uuid primary key,
  guru_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tarikh date not null,
  mula time not null,
  tamat time not null,
  kelas text not null default '' check (char_length(kelas) <= 40),
  subjek text not null check (char_length(subjek) between 1 and 80),
  objektif text not null default '' check (char_length(objektif) <= 4000),
  aktiviti text not null default '' check (char_length(aktiviti) <= 6000),
  pentaksiran text not null default '' check (char_length(pentaksiran) <= 4000),
  refleksi text not null default '' check (char_length(refleksi) <= 4000),
  status text not null default 'draf' check (status in ('draf', 'siap')),
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now(),
  check (tamat > mula),
  unique (guru_id, tarikh, mula)
);

comment on table public.rph is 'Rancangan Pengajaran Harian guru';

alter table public.rph enable row level security;

revoke all on public.rph from anon;
revoke all on public.rph from authenticated;
grant select, insert, update, delete on public.rph to authenticated;

create policy "rph: baca sendiri" on public.rph
  for select to authenticated
  using ((select auth.uid()) = guru_id);

create policy "rph: cipta sendiri" on public.rph
  for insert to authenticated
  with check ((select auth.uid()) = guru_id);

create policy "rph: kemas kini sendiri" on public.rph
  for update to authenticated
  using ((select auth.uid()) = guru_id)
  with check ((select auth.uid()) = guru_id);

create policy "rph: padam sendiri" on public.rph
  for delete to authenticated
  using ((select auth.uid()) = guru_id);

create trigger rph_dikemas_kini
  before update on public.rph
  for each row execute function public.set_dikemas_kini_pada();
