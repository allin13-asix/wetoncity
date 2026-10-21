-- Rumah Makan Padang: berapa kali warga makan pada tanggal WIB terakhir.
alter table warga add column makan_tanggal text check (makan_tanggal ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
alter table warga add column makan_kali int not null default 0 check (makan_kali >= 0);

-- Taruhan judi dan makan masuk ledger seperti uang lain.
alter table ledger drop constraint ledger_jenis_check;
alter table ledger add constraint ledger_jenis_check check (jenis in (
  'uang_saku', 'upah', 'bonus_harian',
  'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon',
  'kasbon_baru', 'bunga_kasbon',
  'dana_walikota',
  'judi_menang', 'judi_kalah', 'makan'
));

create or replace view ledger_golongan as
select l.*,
  case
    when l.akun = 'kas' and l.jenis in ('uang_saku', 'upah', 'bonus_harian', 'judi_menang') then 'faucet'
    when l.akun = 'kas' and l.jenis in ('tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon', 'judi_kalah', 'makan') then 'sink'
    else 'lain'
  end as golongan
from ledger l;
