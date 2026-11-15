-- Fasa sekolah, tugas 3: jemput guru, keluarkan guru dan "Minta dikeluarkan".
-- Penulisan dibuat oleh fungsi pelayan urus-ahli dengan kunci perkhidmatan; aplikasi hanya membaca.
alter table public.ahli add column minta_keluar_pada timestamptz;

-- Cari akaun mengikut emel. Untuk fungsi pelayan sahaja.
create function public.cari_pengguna_emel(p_emel text)
returns table (id uuid, disahkan boolean)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email_confirmed_at is not null from auth.users u where lower(u.email) = lower(p_emel) limit 1;
$$;

-- Ahli sebuah sekolah bersama nama dan emel. Untuk fungsi pelayan sahaja.
create function public.ahli_sekolah_butiran(p_sekolah uuid)
returns table (id uuid, pengguna_id uuid, peranan text, status text, masuk_pada timestamptz, keluar_pada timestamptz,
               minta_keluar_pada timestamptz, nama text, emel text, diterima boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.pengguna_id, a.peranan, a.status, a.masuk_pada, a.keluar_pada, a.minta_keluar_pada,
         coalesce(p.nama, ''), u.email::text, u.email_confirmed_at is not null
  from public.ahli a
  join auth.users u on u.id = a.pengguna_id
  left join public.profil p on p.id = a.pengguna_id
  where a.sekolah_id = p_sekolah
  order by a.status, a.peranan, coalesce(nullif(p.nama, ''), u.email::text);
$$;

revoke all on function public.cari_pengguna_emel(text), public.ahli_sekolah_butiran(uuid) from public, anon, authenticated;
grant execute on function public.cari_pengguna_emel(text), public.ahli_sekolah_butiran(uuid) to service_role;
