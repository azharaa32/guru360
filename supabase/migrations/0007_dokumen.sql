-- Tugas 9: dokumen rasmi guru. Satu jadual untuk kertas kerja, memo, surat, minit dan OPR;
-- isi setiap jenis disimpan sebagai JSON kerana susunannya berbeza mengikut jenis.

create table public.dokumen (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  jenis text not null check (jenis in ('kertas_kerja', 'memo', 'surat', 'minit', 'opr')),
  program_id uuid,
  tajuk text not null default '' check (char_length(tajuk) <= 200),
  isi jsonb not null default '{}'::jsonb check (jsonb_typeof(isi) = 'object' and pg_column_size(isi) <= 262144),
  status text not null default 'draf' check (status in ('draf', 'siap')),
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now()
);

comment on table public.dokumen is 'Dokumen rasmi guru (kertas kerja, memo, surat, minit, OPR); isi mengikut jenis, boleh dipaut kepada program';
comment on column public.dokumen.program_id is 'id program berkaitan; tiada kunci asing supaya dokumen boleh disimpan luar talian sebelum program sampai ke pelayan';

create index dokumen_guru_idx on public.dokumen (guru_id, jenis, dikemas_kini_pada desc);

alter table public.dokumen enable row level security;

revoke all on public.dokumen from anon;
revoke all on public.dokumen from authenticated;
grant select, insert, update, delete on public.dokumen to authenticated;

create policy "dokumen: baca sendiri" on public.dokumen
  for select to authenticated
  using ((select auth.uid()) = guru_id);

create policy "dokumen: cipta sendiri" on public.dokumen
  for insert to authenticated
  with check ((select auth.uid()) = guru_id);

create policy "dokumen: kemas kini sendiri" on public.dokumen
  for update to authenticated
  using ((select auth.uid()) = guru_id)
  with check ((select auth.uid()) = guru_id);

create policy "dokumen: padam sendiri" on public.dokumen
  for delete to authenticated
  using ((select auth.uid()) = guru_id);

create trigger dokumen_dikemas_kini
  before update on public.dokumen
  for each row execute function public.set_dikemas_kini_pada();
