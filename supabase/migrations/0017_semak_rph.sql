-- Fasa sekolah, tugas 6: admin sekolah membaca dan menyemak RPH guru sekolahnya. Ibu pejabat boleh membaca.
create policy "rph: admin baca sekolahnya, ibu pejabat baca semua" on public.rph for select to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));

-- Satu semakan bagi setiap RPH. guru_id dan sekolah_id disalin supaya peraturan akses ringkas dan pantas.
create table public.rph_semakan (
  rph_id uuid primary key references public.rph (id) on delete cascade,
  guru_id uuid not null references auth.users (id) on delete cascade,
  sekolah_id uuid not null references public.sekolah (id) on delete cascade,
  ulasan text not null default '' check (char_length(ulasan) <= 1000),
  disemak_oleh uuid default auth.uid() references auth.users (id) on delete set null,
  disemak_pada timestamptz not null default now()
);
comment on table public.rph_semakan is 'Tanda "Disemak" dan ulasan admin sekolah pada RPH guru';
create index rph_semakan_guru_idx on public.rph_semakan (guru_id);
create index rph_semakan_sekolah_idx on public.rph_semakan (sekolah_id);
create index rph_semakan_disemak_oleh_idx on public.rph_semakan (disemak_oleh);

alter table public.rph_semakan enable row level security;
revoke all on public.rph_semakan from anon, authenticated;
grant select, insert, update, delete on public.rph_semakan to authenticated;

create policy "rph_semakan: guru baca sendiri, admin baca sekolahnya, ibu pejabat baca semua" on public.rph_semakan for select to authenticated
  using (guru_id = (select auth.uid()) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "rph_semakan: admin cipta untuk RPH sekolahnya" on public.rph_semakan for insert to authenticated
  with check (
    sekolah_id = (select private.sekolah_ditadbir())
    and exists (select 1 from public.rph r where r.id = rph_id and r.guru_id = rph_semakan.guru_id and r.sekolah_id = rph_semakan.sekolah_id and r.status = 'siap')
  );
create policy "rph_semakan: admin kemas kini di sekolahnya" on public.rph_semakan for update to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()))
  with check (
    sekolah_id = (select private.sekolah_ditadbir())
    and exists (select 1 from public.rph r where r.id = rph_id and r.guru_id = rph_semakan.guru_id and r.sekolah_id = rph_semakan.sekolah_id)
  );
create policy "rph_semakan: admin padam di sekolahnya" on public.rph_semakan for delete to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()));

-- Apabila guru mengubah isi RPH yang sudah disemak, tanda semakan gugur.
create function public.gugur_semakan_rph() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.objektif, new.aktiviti, new.pentaksiran, new.refleksi, new.status, new.kelas, new.subjek)
     is distinct from (old.objektif, old.aktiviti, old.pentaksiran, old.refleksi, old.status, old.kelas, old.subjek) then
    delete from public.rph_semakan where rph_id = new.id;
  end if;
  return new;
end $$;
revoke all on function public.gugur_semakan_rph() from public, anon, authenticated;
create trigger rph_gugur_semakan after update on public.rph for each row execute function public.gugur_semakan_rph();
