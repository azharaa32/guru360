-- Fasa sekolah, tugas 4 (bahagian 1): kepala surat dan logo dikongsi satu sekolah.
-- Admin sekolah menetapkan; semua guru sekolah itu membaca dan memakainya dalam dokumen.
create table public.templat_sekolah (
  id uuid primary key references public.sekolah (id) on delete cascade,
  nama_sekolah text not null default '' check (char_length(nama_sekolah) <= 160),
  alamat text not null default '' check (char_length(alamat) <= 400),
  telefon text not null default '' check (char_length(telefon) <= 60),
  emel text not null default '' check (char_length(emel) <= 120),
  kod_sekolah text not null default '' check (char_length(kod_sekolah) <= 20),
  logo_kiri text check (logo_kiri is null or char_length(logo_kiri) <= 200),
  logo_kanan text check (logo_kanan is null or char_length(logo_kanan) <= 200),
  dikemas_kini_pada timestamptz not null default now()
);
comment on table public.templat_sekolah is 'Kepala surat dan logo sekolah; id sama dengan sekolah.id';

create trigger templat_sekolah_dikemas_kini before update on public.templat_sekolah
  for each row execute function public.set_dikemas_kini_pada();

alter table public.templat_sekolah enable row level security;
revoke all on public.templat_sekolah from anon, authenticated;
grant select, insert, update on public.templat_sekolah to authenticated;

create policy "templat_sekolah: ahli sekolah dan ibu pejabat baca" on public.templat_sekolah for select to authenticated
  using (id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));
create policy "templat_sekolah: admin cipta" on public.templat_sekolah for insert to authenticated
  with check (id = (select private.sekolah_ditadbir()));
create policy "templat_sekolah: admin kemas kini" on public.templat_sekolah for update to authenticated
  using (id = (select private.sekolah_ditadbir())) with check (id = (select private.sekolah_ditadbir()));

-- Logo sekolah disimpan dalam folder bernama id sekolah.
create policy "fail: ahli baca folder sekolah" on storage.objects for select to authenticated
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_saya())::text);
create policy "fail: admin muat naik ke folder sekolah" on storage.objects for insert to authenticated
  with check (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir())::text);
create policy "fail: admin ganti dalam folder sekolah" on storage.objects for update to authenticated
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir())::text)
  with check (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir())::text);
create policy "fail: admin padam dalam folder sekolah" on storage.objects for delete to authenticated
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir())::text);
