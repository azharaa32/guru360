-- Semakan keselamatan fasa sekolah: pengukuhan peraturan akses.

-- (5) Menulis bagi pihak sekolah hanya dibenarkan apabila sekolah itu sudah diluluskan (aktif).
create function private.sekolah_ditadbir_aktif() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.sekolah_id from public.ahli a join public.sekolah s on s.id = a.sekolah_id
  where a.pengguna_id = (select auth.uid()) and a.status = 'aktif' and a.peranan = 'admin' and s.status = 'aktif';
$$;
revoke all on function private.sekolah_ditadbir_aktif() from public, anon;
grant execute on function private.sekolah_ditadbir_aktif() to authenticated;

alter policy "templat_sekolah: admin cipta" on public.templat_sekolah with check (id = (select private.sekolah_ditadbir_aktif()));
alter policy "templat_sekolah: admin kemas kini" on public.templat_sekolah
  using (id = (select private.sekolah_ditadbir_aktif())) with check (id = (select private.sekolah_ditadbir_aktif()));

alter policy "cuti_bersama: admin atau ibu pejabat cipta" on public.cuti_bersama
  with check (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
alter policy "cuti_bersama: admin atau ibu pejabat kemas kini" on public.cuti_bersama
  using (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())))
  with check (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
alter policy "cuti_bersama: admin atau ibu pejabat padam" on public.cuti_bersama
  using (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));

alter policy "makluman: admin atau ibu pejabat cipta" on public.makluman
  with check (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
alter policy "makluman: admin atau ibu pejabat padam" on public.makluman
  using (sekolah_id = (select private.sekolah_ditadbir_aktif()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));

alter policy "jawatan_guru: admin tetapkan untuk guru aktif sekolahnya" on public.jawatan_guru
  with check (
    sekolah_id = (select private.sekolah_ditadbir_aktif())
    and exists (select 1 from public.ahli a where a.pengguna_id = jawatan_guru.guru_id and a.sekolah_id = jawatan_guru.sekolah_id and a.peranan = 'guru' and a.status = 'aktif')
  );
alter policy "jawatan_guru: admin padam di sekolahnya" on public.jawatan_guru using (sekolah_id = (select private.sekolah_ditadbir_aktif()));

alter policy "rph_semakan: admin cipta untuk RPH sekolahnya" on public.rph_semakan
  with check (
    sekolah_id = (select private.sekolah_ditadbir_aktif())
    and exists (select 1 from public.rph r where r.id = rph_id and r.guru_id = rph_semakan.guru_id and r.sekolah_id = rph_semakan.sekolah_id and r.status = 'siap')
  );
-- (3) Kemas kini semakan juga hanya untuk RPH yang berstatus siap.
alter policy "rph_semakan: admin kemas kini di sekolahnya" on public.rph_semakan
  using (sekolah_id = (select private.sekolah_ditadbir_aktif()))
  with check (
    sekolah_id = (select private.sekolah_ditadbir_aktif())
    and exists (select 1 from public.rph r where r.id = rph_id and r.guru_id = rph_semakan.guru_id and r.sekolah_id = rph_semakan.sekolah_id and r.status = 'siap')
  );
alter policy "rph_semakan: admin padam di sekolahnya" on public.rph_semakan using (sekolah_id = (select private.sekolah_ditadbir_aktif()));

alter policy "fail: admin muat naik ke folder sekolah" on storage.objects
  with check (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir_aktif())::text);
alter policy "fail: admin ganti dalam folder sekolah" on storage.objects
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir_aktif())::text)
  with check (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir_aktif())::text);
alter policy "fail: admin padam dalam folder sekolah" on storage.objects
  using (bucket_id = 'fail' and (storage.foldername(name))[1] = (select private.sekolah_ditadbir_aktif())::text);

-- (1) Bekas ahli dan akaun tanpa sekolah tidak lagi membaca makluman dan cuti ibu pejabat,
--     dan guru hanya membaca semakan, jawatan dan status miliknya selagi masih ahli aktif sekolah itu.
alter policy "makluman: baca milik sekolah sendiri dan ibu pejabat" on public.makluman
  using ((sekolah_id is null and (select private.sekolah_saya()) is not null) or sekolah_id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));
alter policy "cuti_bersama: baca cuti sekolah sendiri dan cuti semua sekolah" on public.cuti_bersama
  using ((sekolah_id is null and (select private.sekolah_saya()) is not null) or sekolah_id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));

do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
           where schemaname = 'public' and cmd = 'SELECT' and tablename in ('rph_semakan', 'jawatan_guru', 'makluman_status') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
create policy "rph_semakan: baca" on public.rph_semakan for select to authenticated
  using ((guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_saya())) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "jawatan_guru: baca" on public.jawatan_guru for select to authenticated
  using ((guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_saya())) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "makluman_status: baca" on public.makluman_status for select to authenticated
  using ((guru_id = (select auth.uid()) and sekolah_id = (select private.sekolah_saya())) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));

-- (4) Baris status makluman tidak boleh dialihkan kepada makluman, guru atau sekolah lain.
create function public.kunci_status_makluman() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.makluman_id is distinct from old.makluman_id or new.guru_id is distinct from old.guru_id or new.sekolah_id is distinct from old.sekolah_id then
    raise exception 'Baris status makluman tidak boleh dialihkan.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.kunci_status_makluman() from public, anon, authenticated;
create trigger makluman_status_kunci before update on public.makluman_status for each row execute function public.kunci_status_makluman();
