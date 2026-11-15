-- Jobskop guru disimpan sebagai satu dokumen jenis 'jobskop' (jawatan yang dipegang dan tugas yang telah diedit).
alter table public.dokumen drop constraint dokumen_jenis_check;
alter table public.dokumen add constraint dokumen_jenis_check check (jenis in ('kertas_kerja', 'memo', 'surat', 'minit', 'opr', 'jobskop'));
comment on table public.dokumen is 'Dokumen rasmi guru (kertas kerja, memo, surat, minit, OPR, jobskop); isi mengikut jenis, boleh dipaut kepada program';
