-- Peran akun. Hanya 'walikota' yang boleh memakai Kantor Wali Kota. Peran tidak bisa diubah lewat API;
-- hanya lewat skrip scripts/buat-walikota.ts atau langsung di basis data.
alter table warga add column peran text not null default 'warga' check (peran in ('warga', 'walikota'));

-- Dana dari Kantor Wali Kota masuk lewat ledger seperti uang lain. Dihitung 'lain' di ledger_golongan
-- supaya rasio faucet dan sink pemain biasa tidak tercemar.
alter table ledger drop constraint ledger_jenis_check;
alter table ledger add constraint ledger_jenis_check check (jenis in (
  'uang_saku', 'upah', 'bonus_harian',
  'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon',
  'kasbon_baru', 'bunga_kasbon',
  'dana_walikota'
));
