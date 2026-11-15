-- Guru boleh memadam akaun sendiri. Semua baris guru itu terpadam bersama kerana setiap jadual
-- merujuk auth.users dengan ON DELETE CASCADE. Fail dalam storan dipadam oleh aplikasi sebelum fungsi ini dipanggil.
create or replace function public.padam_akaun()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  saya uuid := (select auth.uid());
begin
  if saya is null then
    raise exception 'Tiada sesi log masuk';
  end if;
  delete from auth.users where id = saya;
end;
$$;

revoke all on function public.padam_akaun() from public, anon;
grant execute on function public.padam_akaun() to authenticated;
comment on function public.padam_akaun() is 'Padam akaun pemanggil sendiri (auth.uid()) dan semua datanya';
