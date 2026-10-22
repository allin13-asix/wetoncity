-- Obrolan ruang (global kota dan per gedung hunian), batas hadiah barang harian, dan kepemilikan bangunan yang lebih luas:
-- nama buatan pemilik, harga beli, dan penghasilan pasif yang ditahan sampai pemilik beraksi (dicairkan malas, tanpa cron).
-- Nilai balancing ada di src/data/balans.ts; berkas ini hanya skema.

-- obrolan ruang: 'global' untuk semua warga, 'hunian:<id bangunan>' untuk penghuni satu gedung hunian
create table obrolan (
  id bigint generated always as identity primary key,
  ruang text not null check (ruang ~ '^(global|hunian:[a-z0-9-]{2,60})$'),
  warga_id uuid not null references warga(id) on delete cascade,
  isi text not null check (char_length(isi) between 1 and 300),
  dibuat_pada timestamptz not null
);
create index obrolan_ruang on obrolan (ruang, id desc);
create index obrolan_warga on obrolan (warga_id, dibuat_pada);

-- utas pesan pribadi antara dua warga
create index pesan_pasangan on pesan (least(dari_id, ke_id), greatest(dari_id, ke_id), id desc);

-- hadiah barang antarwarga: paling banyak beberapa kali per tanggal WIB
alter table warga
  add column hadiah_tanggal text,
  add column hadiah_kali int not null default 0;

-- bangunan milik pemain: nama buatan pemilik, harga beli (patokan hasil dasar), dan kapan hasil dasar terakhir dihitung
alter table lahan_milik
  add column nama_kustom text check (nama_kustom is null or char_length(nama_kustom) between 3 and 32),
  add column harga_beli bigint check (harga_beli is null or harga_beli > 0),
  add column hasil_pada timestamptz;

-- bagi hasil upah dan sewa untuk pemilik bangunan, ditulis oleh transaksi pekerja atau penghuni (hanya insert, tanpa
-- mengunci baris pemilik) dan dihapus sambil dicairkan saat pemilik beraksi
create table hasil_bangunan (
  id bigint generated always as identity primary key,
  lahan_id text not null references lahan_milik(lahan_id) on delete cascade,
  jumlah bigint not null check (jumlah > 0),
  sumber text not null check (sumber in ('upah', 'sewa')),
  dibuat_pada timestamptz not null
);
create index hasil_bangunan_lahan on hasil_bangunan (lahan_id);

alter table ledger drop constraint ledger_jenis_check;
alter table ledger add constraint ledger_jenis_check check (jenis in (
  'uang_saku', 'upah', 'bonus_harian',
  'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon',
  'kasbon_baru', 'bunga_kasbon',
  'dana_walikota',
  'judi_menang', 'judi_kalah', 'makan',
  'setor_tabungan', 'tarik_tabungan', 'bunga_tabungan',
  'tiket_pesawat', 'hasil_perjalanan', 'ukt', 'berobat',
  'modal_usaha', 'upgrade_usaha', 'hasil_usaha', 'bahan_usaha',
  'beli_lahan', 'bangun_rumah',
  'beli_npc', 'jual_npc', 'beli_lapak', 'jual_lapak', 'biaya_lapak',
  'uang_dapur',
  'rawat_inap', 'biaya_seleksi', 'beli_toko', 'beli_properti_npc', 'beli_properti', 'jual_properti',
  'hadiah_surat', 'hadiah_mingguan',
  'hasil_properti'
));

create or replace view ledger_golongan as
select l.*,
  case
    when l.akun = 'kas' and l.jenis in (
      'uang_saku', 'upah', 'bonus_harian', 'judi_menang', 'hasil_perjalanan', 'hasil_usaha', 'jual_npc', 'hadiah_surat', 'hadiah_mingguan',
      'hasil_properti'
    ) then 'faucet'
    when l.akun = 'kas' and l.jenis in (
      'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon', 'judi_kalah', 'makan',
      'tiket_pesawat', 'ukt', 'berobat', 'modal_usaha', 'upgrade_usaha', 'bahan_usaha', 'beli_lahan', 'bangun_rumah',
      'beli_npc', 'biaya_lapak', 'rawat_inap', 'biaya_seleksi', 'beli_toko', 'beli_properti_npc'
    ) then 'sink'
    else 'lain'
  end as golongan
from ledger l;
