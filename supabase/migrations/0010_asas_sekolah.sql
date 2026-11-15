-- Fasa sekolah, tugas 1: sekolah, keahlian, ibu pejabat; data guru kini terikat kepada sekolah.
-- Langkah data sekali sahaja (salinan keselamatan, pemadaman data Fasa 1 yang diminta pemilik, sekolah pertama)
-- dijalankan terus pada pangkalan data dan sengaja tidak disimpan di sini.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.sekolah (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) between 3 and 200),
  kod text not null check (char_length(kod) between 3 and 20),
  negeri text,
  status text not null default 'menunggu' check (status in ('menunggu', 'aktif', 'ditolak')),
  cara text not null default 'sendiri' check (cara in ('sendiri', 'ibu_pejabat')),
  dicipta_oleh uuid references auth.users (id) on delete set null,
  dicipta_pada timestamptz not null default now(),
  dikemas_kini_pada timestamptz not null default now()
);
comment on table public.sekolah is 'Sekolah yang menggunakan Guru360; menunggu kelulusan ibu pejabat jika didaftar sendiri';
create unique index sekolah_kod_idx on public.sekolah (upper(kod));
create index sekolah_dicipta_oleh_idx on public.sekolah (dicipta_oleh);
create trigger sekolah_dikemas_kini before update on public.sekolah for each row execute function public.set_dikemas_kini_pada();

create table public.ahli (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid not null references public.sekolah (id) on delete cascade,
  pengguna_id uuid not null references auth.users (id) on delete cascade,
  peranan text not null check (peranan in ('admin', 'guru')),
  status text not null default 'aktif' check (status in ('aktif', 'keluar')),
  masuk_pada timestamptz not null default now(),
  keluar_pada timestamptz
);
comment on table public.ahli is 'Keahlian pengguna dalam sekolah: seorang admin dan ramai guru; rekod kekal selepas guru keluar';
create unique index ahli_satu_aktif_idx on public.ahli (pengguna_id) where status = 'aktif';
create unique index ahli_satu_admin_idx on public.ahli (sekolah_id) where status = 'aktif' and peranan = 'admin';
create index ahli_sekolah_idx on public.ahli (sekolah_id, status);
create index ahli_pengguna_idx on public.ahli (pengguna_id);

create table public.ibu_pejabat (
  pengguna_id uuid primary key references auth.users (id) on delete cascade,
  ditambah_pada timestamptz not null default now()
);
comment on table public.ibu_pejabat is 'Akaun yang memegang kuasa ibu pejabat';

-- Fungsi bantu: dijalankan dengan hak pemilik supaya peraturan akses tidak bergelung.
create function private.ialah_ibu_pejabat() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ibu_pejabat where pengguna_id = (select auth.uid()));
$$;

create function private.sekolah_saya() returns uuid
language sql stable security definer set search_path = '' as $$
  select sekolah_id from public.ahli where pengguna_id = (select auth.uid()) and status = 'aktif';
$$;

create function private.sekolah_ditadbir() returns uuid
language sql stable security definer set search_path = '' as $$
  select sekolah_id from public.ahli where pengguna_id = (select auth.uid()) and status = 'aktif' and peranan = 'admin';
$$;

-- Sekolah tempat pemanggil mengajar: ahli aktif berperanan guru, dan sekolah itu sudah diluluskan.
create function private.sekolah_mengajar() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.sekolah_id from public.ahli a join public.sekolah s on s.id = a.sekolah_id
  where a.pengguna_id = (select auth.uid()) and a.status = 'aktif' and a.peranan = 'guru' and s.status = 'aktif';
$$;

revoke all on function private.ialah_ibu_pejabat(), private.sekolah_saya(), private.sekolah_ditadbir(), private.sekolah_mengajar() from public, anon;
grant execute on function private.ialah_ibu_pejabat(), private.sekolah_saya(), private.sekolah_ditadbir(), private.sekolah_mengajar() to authenticated;

-- Jadual baharu: baca sahaja buat masa ini; penulisan melalui fungsi pelayan dalam tugas seterusnya.
alter table public.sekolah enable row level security;
alter table public.ahli enable row level security;
alter table public.ibu_pejabat enable row level security;
revoke all on public.sekolah, public.ahli, public.ibu_pejabat from anon, authenticated;
grant select on public.sekolah, public.ahli, public.ibu_pejabat to authenticated;

create policy "sekolah: baca sekolah sendiri atau ibu pejabat" on public.sekolah for select to authenticated
  using (id = (select private.sekolah_saya()) or (select private.ialah_ibu_pejabat()));
create policy "ahli: baca keahlian sendiri, sekolah ditadbir, atau ibu pejabat" on public.ahli for select to authenticated
  using (pengguna_id = (select auth.uid()) or sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "ibu_pejabat: baca baris sendiri" on public.ibu_pejabat for select to authenticated
  using (pengguna_id = (select auth.uid()));

-- Data guru terikat kepada sekolah (jadual kosong semasa migrasi ini dijalankan).
do $$
declare t text;
begin
  foreach t in array array['jadual_waktu', 'cuti_sendiri', 'rph', 'program', 'dokumen'] loop
    execute format('alter table public.%I add column sekolah_id uuid not null references public.sekolah (id) on delete cascade', t);
    execute format('create index %I on public.%I (sekolah_id, guru_id)', t || '_sekolah_idx', t);
    execute format('drop policy %I on public.%I', t || ': baca sendiri', t);
    execute format('drop policy %I on public.%I', t || ': cipta sendiri', t);
    execute format('drop policy %I on public.%I', t || ': kemas kini sendiri', t);
    execute format('drop policy %I on public.%I', t || ': padam sendiri', t);
    execute format($p$create policy %I on public.%I for select to authenticated using ((select auth.uid()) = guru_id and sekolah_id = (select private.sekolah_mengajar()))$p$, t || ': guru baca sendiri di sekolahnya', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = guru_id and sekolah_id = (select private.sekolah_mengajar()))$p$, t || ': guru cipta sendiri di sekolahnya', t);
    execute format($p$create policy %I on public.%I for update to authenticated using ((select auth.uid()) = guru_id and sekolah_id = (select private.sekolah_mengajar())) with check ((select auth.uid()) = guru_id and sekolah_id = (select private.sekolah_mengajar()))$p$, t || ': guru kemas kini sendiri di sekolahnya', t);
    execute format($p$create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = guru_id and sekolah_id = (select private.sekolah_mengajar()))$p$, t || ': guru padam sendiri di sekolahnya', t);
  end loop;
end $$;

-- Sekolah diisi oleh pelayan, bukan oleh aplikasi: baris baharu sentiasa masuk ke sekolah tempat guru mengajar,
-- dan pemilik serta sekolah sesuatu baris tidak boleh ditukar selepas itu.
create function public.tetap_sekolah() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      new.sekolah_id := private.sekolah_mengajar();
      if new.sekolah_id is null then
        raise exception 'Akaun ini bukan guru aktif di mana-mana sekolah' using errcode = '42501';
      end if;
    end if;
  else
    new.sekolah_id := old.sekolah_id;
    new.guru_id := old.guru_id;
  end if;
  return new;
end $$;
revoke all on function public.tetap_sekolah() from public, anon, authenticated;

create trigger jadual_waktu_sekolah before insert or update on public.jadual_waktu for each row execute function public.tetap_sekolah();
create trigger cuti_sendiri_sekolah before insert or update on public.cuti_sendiri for each row execute function public.tetap_sekolah();
create trigger rph_sekolah before insert or update on public.rph for each row execute function public.tetap_sekolah();
create trigger program_sekolah before insert or update on public.program for each row execute function public.tetap_sekolah();
create trigger dokumen_sekolah before insert or update on public.dokumen for each row execute function public.tetap_sekolah();
