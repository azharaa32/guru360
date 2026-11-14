-- Tugas 3: templat sekolah (kepala surat) dan simpanan fail peribadi.

create table public.templat (
  id uuid primary key references auth.users (id) on delete cascade,
  nama_sekolah text not null default '' check (char_length(nama_sekolah) <= 160),
  alamat text not null default '' check (char_length(alamat) <= 400),
  telefon text not null default '' check (char_length(telefon) <= 60),
  emel text not null default '' check (char_length(emel) <= 120),
  kod_sekolah text not null default '' check (char_length(kod_sekolah) <= 20),
  logo_kiri text check (logo_kiri is null or char_length(logo_kiri) <= 200),
  logo_kanan text check (logo_kanan is null or char_length(logo_kanan) <= 200),
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now()
);

comment on table public.templat is 'Kepala surat dan logo sekolah bagi setiap guru; id sama dengan auth.users.id';

alter table public.templat enable row level security;

revoke all on public.templat from anon;
revoke all on public.templat from authenticated;
grant select, insert, update on public.templat to authenticated;

create policy "templat: baca sendiri" on public.templat
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "templat: cipta sendiri" on public.templat
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "templat: kemas kini sendiri" on public.templat
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger templat_dikemas_kini
  before update on public.templat
  for each row execute function public.set_dikemas_kini_pada();

-- Simpanan fail: satu baldi peribadi. Setiap guru hanya boleh sentuh folder bernama id sendiri.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fail', 'fail', false, 5242880, array['image/png', 'image/jpeg', 'application/pdf']);

create policy "fail: baca folder sendiri" on storage.objects
  for select to authenticated
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fail: muat naik ke folder sendiri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fail' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fail: ganti dalam folder sendiri" on storage.objects
  for update to authenticated
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fail' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fail: padam dalam folder sendiri" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select auth.uid())::text);
