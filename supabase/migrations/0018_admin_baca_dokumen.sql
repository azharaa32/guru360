-- Fasa sekolah, tugas 7: admin sekolah membaca dokumen dan program guru sekolahnya (baca sahaja). Ibu pejabat boleh membaca.
-- Polisi tulis tidak berubah: hanya guru pemilik boleh mencipta, mengubah atau memadam.
create policy "dokumen: admin baca sekolahnya, ibu pejabat baca semua" on public.dokumen for select to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
create policy "program: admin baca sekolahnya, ibu pejabat baca semua" on public.program for select to authenticated
  using (sekolah_id = (select private.sekolah_ditadbir()) or (select private.ialah_ibu_pejabat()));
