-- Tugas 2: profil guru. Satu baris bagi setiap akaun; hanya pemilik boleh baca dan ubah.

create table public.profil (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null default '' check (char_length(nama) <= 120),
  sekolah text not null default '' check (char_length(sekolah) <= 160),
  negeri text check (
    negeri is null or negeri in (
      'JOHOR', 'KEDAH', 'KELANTAN', 'MELAKA', 'NEGERI SEMBILAN', 'PAHANG', 'PERAK', 'PERLIS',
      'PULAU PINANG', 'SABAH', 'SARAWAK', 'SELANGOR', 'TERENGGANU',
      'WP KUALA LUMPUR', 'WP LABUAN', 'WP PUTRAJAYA'
    )
  ),
  gred text not null default '' check (char_length(gred) <= 20),
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now()
);

comment on table public.profil is 'Profil guru; id sama dengan auth.users.id';

alter table public.profil enable row level security;

-- Akses: pengguna yang log masuk sahaja, dan hanya baris sendiri.
revoke all on public.profil from anon;
revoke all on public.profil from authenticated;
grant select, insert, update on public.profil to authenticated;

create policy "profil: baca sendiri" on public.profil
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profil: cipta sendiri" on public.profil
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profil: kemas kini sendiri" on public.profil
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Tiada polisi DELETE: profil hanya terpadam apabila akaun dipadam (on delete cascade).

create function public.set_dikemas_kini_pada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.dikemas_kini_pada = now();
  return new;
end;
$$;

revoke execute on function public.set_dikemas_kini_pada() from public, anon, authenticated;

create trigger profil_dikemas_kini
  before update on public.profil
  for each row execute function public.set_dikemas_kini_pada();
