-- Fasa sekolah, tugas 9: ibu pejabat membaca senarai ahli (nama dan emel) mana-mana sekolah untuk papan ringkasan.
-- Fungsi menyemak sendiri bahawa pemanggil ialah ibu pejabat.
create function public.butiran_sekolah_hq(p_sekolah uuid)
returns table (id uuid, pengguna_id uuid, peranan text, status text, masuk_pada timestamptz, keluar_pada timestamptz,
               minta_keluar_pada timestamptz, nama text, emel text, diterima boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.ialah_ibu_pejabat()) then
    raise exception 'Hanya ibu pejabat boleh melakukan ini.' using errcode = '42501';
  end if;
  return query select * from public.ahli_sekolah_butiran(p_sekolah);
end $$;
revoke all on function public.butiran_sekolah_hq(uuid) from public, anon;
grant execute on function public.butiran_sekolah_hq(uuid) to authenticated;
