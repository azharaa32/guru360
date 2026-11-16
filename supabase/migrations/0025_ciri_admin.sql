-- Ciri admin: peratus RPH ikut jadual, peringatan, gambar OPR di skrin admin, tolak jawatan.

-- 1. Admin sekolah membaca jadual waktu guru sekolahnya (untuk mengira RPH yang sepatutnya ada). Ibu pejabat boleh membaca.
create index if not exists jadual_waktu_sekolah_idx on public.jadual_waktu (sekolah_id);
create policy "jadual_waktu: admin baca sekolahnya, ibu pejabat baca semua" on public.jadual_waktu for select to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));

-- 2. Jawatan yang ditambah guru boleh ditolak oleh admin. Baris 'ditolak' hanya dicipta dan dipadam oleh admin (polisi sedia ada).
alter table public.jawatan_guru add column status text not null default 'sah' check (status in ('sah', 'ditolak'));

-- 3. Admin sekolah melihat gambar OPR bagi dokumen yang dimiliki sekolahnya. Laluan: <id guru>/opr/<id dokumen>/<fail>.
create policy "fail: admin baca gambar dokumen sekolahnya" on storage.objects for select to authenticated
  using (
    bucket_id = 'fail'
    and (storage.foldername(name))[2] = 'opr'
    and exists (
      select 1 from public.dokumen d
      where d.id::text = (storage.foldername(name))[3]
        and d.guru_id::text = (storage.foldername(name))[1]
        and d.sekolah_id = (select private.sekolah_ditadbir())
    )
  );

-- 4. Peringatan RPH daripada admin sekolah kepada seorang guru. Dicipta oleh fungsi pelayan sahaja (urus-ahli: ingatkan).
create table public.peringatan (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid not null references public.sekolah (id) on delete cascade,
  guru_id uuid not null references auth.users (id) on delete cascade,
  minggu date not null,
  dihantar_oleh uuid references auth.users (id) on delete set null,
  dihantar_pada timestamptz not null default now(),
  dibaca_pada timestamptz
);
comment on table public.peringatan is 'Peringatan RPH daripada admin sekolah kepada guru bagi satu minggu';
create index peringatan_guru_idx on public.peringatan (guru_id, dihantar_pada desc);
create index peringatan_sekolah_idx on public.peringatan (sekolah_id, dihantar_pada desc);
create index peringatan_dihantar_oleh_idx on public.peringatan (dihantar_oleh);

alter table public.peringatan enable row level security;
revoke all on public.peringatan from anon, authenticated;
grant select on public.peringatan to authenticated;
grant update (dibaca_pada) on public.peringatan to authenticated;

create policy "peringatan: guru baca sendiri di sekolahnya, admin baca sekolahnya" on public.peringatan for select to authenticated
  using ((guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_saya())) or sekolah_id = (select private.sekolah_ditadbir()));
create policy "peringatan: guru tanda baca sendiri" on public.peringatan for update to authenticated
  using (guru_id = (select auth.uid())) with check (guru_id = (select auth.uid()));
