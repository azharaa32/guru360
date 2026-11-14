-- Tugas 8: takwim program sekolah yang dicatat oleh guru.

create table public.program (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nama text not null check (char_length(nama) between 1 and 160),
  tarikh date not null,
  tarikh_tamat date,
  masa_mula time,
  masa_tamat time,
  tempat text not null default '' check (char_length(tempat) <= 160),
  catatan text not null default '' check (char_length(catatan) <= 1000),
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now(),
  check (tarikh_tamat is null or (tarikh_tamat >= tarikh and tarikh_tamat - tarikh <= 60)),
  check (masa_tamat is null or masa_mula is null or tarikh_tamat is not null or masa_tamat > masa_mula)
);

comment on table public.program is 'Program dalam takwim guru; dokumen (kertas kerja, surat, minit, OPR) dipaut kepadanya';

create index program_guru_idx on public.program (guru_id, tarikh);

alter table public.program enable row level security;

revoke all on public.program from anon;
revoke all on public.program from authenticated;
grant select, insert, update, delete on public.program to authenticated;

create policy "program: baca sendiri" on public.program
  for select to authenticated
  using ((select auth.uid()) = guru_id);

create policy "program: cipta sendiri" on public.program
  for insert to authenticated
  with check ((select auth.uid()) = guru_id);

create policy "program: kemas kini sendiri" on public.program
  for update to authenticated
  using ((select auth.uid()) = guru_id)
  with check ((select auth.uid()) = guru_id);

create policy "program: padam sendiri" on public.program
  for delete to authenticated
  using ((select auth.uid()) = guru_id);

create trigger program_dikemas_kini
  before update on public.program
  for each row execute function public.set_dikemas_kini_pada();
