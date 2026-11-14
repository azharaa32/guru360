-- Tugas 4: jadual waktu guru. Banyak baris bagi setiap guru; id dijana di telefon supaya boleh diisi tanpa internet.

create table public.jadual_waktu (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  hari smallint not null check (hari between 0 and 6), -- 0 = Ahad ... 6 = Sabtu
  mula time not null,
  tamat time not null,
  subjek text not null check (char_length(subjek) between 1 and 80),
  kelas text not null default '' check (char_length(kelas) <= 40),
  perlu_rph boolean not null default true,
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now(),
  check (tamat > mula)
);

comment on table public.jadual_waktu is 'Waktu dalam jadual mingguan guru';

create index jadual_waktu_guru_idx on public.jadual_waktu (guru_id, hari, mula);

alter table public.jadual_waktu enable row level security;

revoke all on public.jadual_waktu from anon;
revoke all on public.jadual_waktu from authenticated;
grant select, insert, update, delete on public.jadual_waktu to authenticated;

create policy "jadual_waktu: baca sendiri" on public.jadual_waktu
  for select to authenticated
  using ((select auth.uid()) = guru_id);

create policy "jadual_waktu: cipta sendiri" on public.jadual_waktu
  for insert to authenticated
  with check ((select auth.uid()) = guru_id);

create policy "jadual_waktu: kemas kini sendiri" on public.jadual_waktu
  for update to authenticated
  using ((select auth.uid()) = guru_id)
  with check ((select auth.uid()) = guru_id);

create policy "jadual_waktu: padam sendiri" on public.jadual_waktu
  for delete to authenticated
  using ((select auth.uid()) = guru_id);

create trigger jadual_waktu_dikemas_kini
  before update on public.jadual_waktu
  for each row execute function public.set_dikemas_kini_pada();
