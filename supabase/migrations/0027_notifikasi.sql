-- Notifikasi telefon (Web Push).
-- Kunci VAPID dan token cron disimpan dalam Supabase Vault (dimasukkan berasingan, tidak dalam repositori).

-- Langganan push bagi setiap peranti. Endpoint ialah alamat rahsia peranti itu di pelayan push pelayar.
create table public.push_langganan (
  id uuid primary key default gen_random_uuid(),
  pengguna_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  dicipta_pada timestamptz not null default now()
);
comment on table public.push_langganan is 'Peranti yang menerima notifikasi telefon bagi setiap pengguna';
create index push_langganan_pengguna_idx on public.push_langganan (pengguna_id);

alter table public.push_langganan enable row level security;
revoke all on public.push_langganan from anon, authenticated;
grant select, delete on public.push_langganan to authenticated;
create policy "push_langganan: baca sendiri" on public.push_langganan for select to authenticated using (pengguna_id = (select auth.uid()));
create policy "push_langganan: padam sendiri" on public.push_langganan for delete to authenticated using (pengguna_id = (select auth.uid()));

-- Daftar peranti ini untuk pengguna semasa. Jika peranti sama pernah didaftar oleh akaun lain (log masuk bertukar),
-- pemiliknya dipindahkan: hanya peranti yang memegang endpoint itu boleh menyerahkannya.
create function public.daftar_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Sila log masuk.' using errcode = '42501'; end if;
  insert into public.push_langganan (pengguna_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set pengguna_id = excluded.pengguna_id, p256dh = excluded.p256dh, auth = excluded.auth, dicipta_pada = now();
  -- Had peranti setiap pengguna: simpan 10 yang terbaharu.
  delete from public.push_langganan where id in (
    select id from public.push_langganan where pengguna_id = (select auth.uid()) order by dicipta_pada desc offset 10
  );
end $$;
revoke all on function public.daftar_push(text, text, text) from public, anon;
grant execute on function public.daftar_push(text, text, text) to authenticated;

-- Notifikasi yang sudah dihantar, supaya satu peristiwa tidak dihantar dua kali. Hanya fungsi pelayan memakainya.
create table public.notis_dihantar (
  kunci text primary key,
  dihantar_pada timestamptz not null default now()
);
comment on table public.notis_dihantar is 'Kunci peristiwa notifikasi yang sudah dihantar (elak pendua)';
alter table public.notis_dihantar enable row level security;
revoke all on public.notis_dihantar from anon, authenticated;

-- Rahsia notifikasi untuk fungsi pelayan sahaja.
create function public.rahsia_notifikasi() returns table (vapid_awam text, vapid_privat text, cron_kunci text)
language sql security definer set search_path = '' as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_awam'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_privat'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'cron_kunci');
$$;
revoke all on function public.rahsia_notifikasi() from public, anon, authenticated;
grant execute on function public.rahsia_notifikasi() to service_role;

-- Peringatan harian (program dan cuti esok) jam 8 malam waktu Malaysia (12:00 UTC).
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule(
  'guru360-notifikasi-harian',
  '0 12 * * *',
  $cron$
  select net.http_post(
    url := 'https://kcstwehrdphrtxqovqyx.supabase.co/functions/v1/notifikasi',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-kunci-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_kunci')),
    body := '{"aksi":"harian"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
