-- Pindah sekolah: status baca dan siap disimpan berasingan bagi setiap sekolah,
-- supaya guru yang berpindah boleh menanda semula makluman ibu pejabat di sekolah baharunya.
alter table public.makluman_status drop constraint makluman_status_pkey;
alter table public.makluman_status add primary key (makluman_id, guru_id, sekolah_id);
