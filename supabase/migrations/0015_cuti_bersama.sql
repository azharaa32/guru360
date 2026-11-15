-- Fasa sekolah, tugas 4 (bahagian 2): cuti dan hari ganti yang dikongsi.
-- sekolah_id diisi  : ditetapkan admin sekolah, untuk semua guru sekolah itu.
-- sekolah_id kosong : ditetapkan ibu pejabat, untuk semua sekolah.
create table public.cuti_bersama (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid references public.sekolah (id) on delete cascade,
  mula date not null,
  tamat date not null,
  nama text not null check (char_length(nama) between 1 and 120),
  jenis text not null default 'cuti' check (jenis in ('cuti', 'sekolah')),
  ikut_hari smallint check (ikut_hari is null or ikut_hari between 0 and 6),
  dicipta_oleh uuid default auth.uid() references auth.users (id) on delete set null,
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now(),
  check (tamat >= mula),
  check (tamat - mula <= 366)
);
comment on table public.cuti_bersama is 'Cuti dan hari persekolahan ganti yang ditetapkan admin sekolah (satu sekolah) atau ibu pejabat (semua sekolah)';
create index cuti_bersama_sekolah_idx on public.cuti_bersama (sekolah_id, mula);
create index cuti_bersama_dicipta_oleh_idx on public.cuti_bersama (dicipta_oleh);
create trigger cuti_bersama_dikemas_kini before update on public.cuti_bersama
  for each row execute function public.set_dikemas_kini_pada();

alter table public.cuti_bersama enable row level security;
revoke all on public.cuti_bersama from anon, authenticated;
grant select, insert, update, delete on public.cuti_bersama to authenticated;

create policy "cuti_bersama: baca cuti sekolah sendiri dan cuti semua sekolah" on public.cuti_bersama for select to authenticated
  using (sekolah_id is null or sekolah_id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));
create policy "cuti_bersama: admin atau ibu pejabat cipta" on public.cuti_bersama for insert to authenticated
  with check (sekolah_id = (select private.sekolah_ditadbir()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
create policy "cuti_bersama: admin atau ibu pejabat kemas kini" on public.cuti_bersama for update to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())))
  with check (sekolah_id = (select private.sekolah_ditadbir()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
create policy "cuti_bersama: admin atau ibu pejabat padam" on public.cuti_bersama for delete to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (sekolah_id is null and (select private.ialah_ibu_pejabat())));
