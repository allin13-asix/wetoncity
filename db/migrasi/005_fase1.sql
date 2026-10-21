-- Fase 1 awal: Koran Kota yang ditulis Wali Kota dari dalam game, langganan web push, pasar (gudang barang dan lapak
-- antarwarga), dan numpang di rumah warga lain.

-- Edisi Koran yang ditulis dari /koran/tulis. Edisi bertanggal sama dengan src/data/koran.ts menggantikannya.
create table koran_edisi (
  tanggal text primary key check (tanggal ~ '^\d{4}-\d{2}-\d{2}$'),
  berita jsonb not null,
  besok text,
  ditulis_oleh uuid references warga(id) on delete set null,
  diubah_pada timestamptz not null default now()
);

-- Langganan web push per perangkat.
create table push_langganan (
  endpoint text primary key,
  warga_id uuid not null references warga(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  dibuat_pada timestamptz not null default now(),
  terakhir_kirim timestamptz
);
create index push_langganan_warga on push_langganan (warga_id);

-- Barang milik warga (kg).
create table gudang (
  warga_id uuid not null references warga(id) on delete cascade,
  barang text not null check (barang in ('ikan', 'beras')),
  jumlah int not null check (jumlah >= 0),
  primary key (warga_id, barang)
);

-- Lapak antarwarga. Barang dititipkan saat lapak dibuka. Uang pembeli ditahan di `uang_tertahan` dan baru masuk
-- ke kas penjual saat penjual membuka game, jadi transaksi pembeli tidak perlu mengunci baris penjual.
create table lapak (
  id uuid primary key default gen_random_uuid(),
  penjual_id uuid not null references warga(id) on delete cascade,
  barang text not null check (barang in ('ikan', 'beras')),
  sisa int not null check (sisa >= 0),
  harga int not null check (harga > 0),
  uang_tertahan bigint not null default 0 check (uang_tertahan >= 0),
  terjual int not null default 0,
  dibuat_pada timestamptz not null
);
create index lapak_barang on lapak (barang, harga) where sisa > 0;
create index lapak_penjual on lapak (penjual_id);

-- Numpang: pemilik rumah menerima penumpang dengan uang dapur mingguan. Uang dapur ditahan di baris ini lalu
-- dicairkan ke pemilik saat pemilik membuka game (alasan sama dengan lapak).
alter table warga
  add column numpang_terima boolean not null default false,
  add column uang_dapur int not null default 0 check (uang_dapur between 0 and 100000);

create table numpang (
  id uuid primary key default gen_random_uuid(),
  pemilik_id uuid not null references warga(id) on delete cascade,
  penumpang_id uuid not null references warga(id) on delete cascade,
  uang_dapur int not null check (uang_dapur between 0 and 100000),
  status text not null check (status in ('minta', 'aktif', 'selesai')),
  uang_tertahan bigint not null default 0 check (uang_tertahan >= 0),
  dibuat_pada timestamptz not null,
  berakhir_pada timestamptz,
  check (pemilik_id <> penumpang_id)
);
create unique index numpang_penumpang_berjalan on numpang (penumpang_id) where status in ('minta', 'aktif');
create index numpang_pemilik on numpang (pemilik_id) where status in ('minta', 'aktif');

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

create or replace view ledger_golongan as
select l.*,
  case
    when l.akun = 'kas' and l.jenis in ('uang_saku', 'upah', 'bonus_harian', 'judi_menang', 'hasil_perjalanan', 'hasil_usaha', 'jual_npc') then 'faucet'
    when l.akun = 'kas' and l.jenis in (
      'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon', 'judi_kalah', 'makan',
      'tiket_pesawat', 'ukt', 'berobat', 'modal_usaha', 'upgrade_usaha', 'bahan_usaha', 'beli_lahan', 'bangun_rumah',
      'beli_npc', 'biaya_lapak'
    ) then 'sink'
    else 'lain'
  end as golongan
from ledger l;
