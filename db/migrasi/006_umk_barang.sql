-- UMK kota dan kebijakan Wali Kota, barang konsumsi dan koleksi, uang dapur bulanan.

-- Satu baris: UMK yang berlaku.
create table kota (
  id int primary key check (id = 1),
  umk bigint not null check (umk > 0),
  umk_sejak timestamptz not null
);
insert into kota (id, umk, umk_sejak) values (1, 2500000, now());

-- Riwayat penetapan UMK.
create table kebijakan_umk (
  id bigserial primary key,
  umk_lama bigint not null,
  umk_baru bigint not null,
  tren numeric not null,
  rekomendasi bigint not null,
  alasan text,
  ditetapkan_oleh uuid references warga(id) on delete set null,
  ditetapkan_pada timestamptz not null
);

-- Barang kini banyak macamnya; daftar sahnya dijaga kode (src/server/aturan.ts).
alter table gudang drop constraint gudang_barang_check;
alter table gudang add constraint gudang_barang_check check (barang ~ '^[a-z0-9-]{2,40}$');
alter table lapak drop constraint lapak_barang_check;
alter table lapak add constraint lapak_barang_check check (barang ~ '^[a-z0-9-]{2,40}$');

-- Jatah barang konsumsi per tanggal WIB.
alter table warga
  add column konsumsi_tanggal text,
  add column konsumsi_kali int not null default 0;

-- Uang dapur kini per bulan kota (satu siklus), paling banyak Rp 300.000.
alter table warga drop constraint warga_uang_dapur_check;
alter table warga add constraint warga_uang_dapur_check check (uang_dapur between 0 and 300000);
alter table numpang drop constraint numpang_uang_dapur_check;
alter table numpang add constraint numpang_uang_dapur_check check (uang_dapur between 0 and 300000);

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
  'uang_dapur'
));
