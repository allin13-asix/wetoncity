-- Sistem kehidupan kota: lapar, statistik, level dan reputasi, inventori dan mailbox, pertemanan dan teman sekamar,
-- pesan, properti (lahan kota, NPC, antarpemain, konstruksi), roulette, memancing, minimarket, seleksi, dan latihan.
-- Nilai balancing ada di src/data/balans.ts; berkas ini hanya skema.

alter table warga
  -- 1. lapar. Nilai pada saat lapar_pada; lapar_hukum_pada = batas waktu pengurangan Kesehatan yang sudah dihitung.
  add column lapar int not null default 100 check (lapar between 0 and 100),
  add column lapar_pada timestamptz not null default now(),
  add column lapar_hukum_pada timestamptz,
  add column rawat_sampai timestamptz,
  -- 12. atribut
  add column kekuatan int not null default 5 check (kekuatan between 0 and 100),
  add column kecerdasan int not null default 5 check (kecerdasan between 0 and 100),
  add column karisma int not null default 5 check (karisma between 0 and 100),
  add column disiplin int not null default 5 check (disiplin between 0 and 100),
  -- 14 dan 4. level, EXP (sisa menuju level berikut), reputasi total dan mingguan, catatan batas harian
  add column level int not null default 1 check (level >= 1),
  add column exp bigint not null default 0 check (exp >= 0),
  add column reputasi bigint not null default 0 check (reputasi >= 0),
  add column reputasi_minggu int not null default 0 check (reputasi_minggu >= 0),
  add column harian jsonb not null default '{}'::jsonb,
  -- 3. kamar di dalam bangunan hunian, dan kewajiban pindah bagi pihak yang menolak atau memutus pertemanan sekamar
  add column hunian_kamar int,
  add column hunian_kamar_berikut int,
  add column wajib_pindah_tenggat timestamptz,
  add column wajib_pindah_dari text,
  -- 5 dan 13. riwayat ganti pekerjaan (stempel waktu ISO) dan bangunan tempat bekerja
  add column ganti_kerja jsonb not null default '[]'::jsonb,
  add column tempat_kerja text,
  -- 11. hasil seleksi pekerjaan khusus: { lulus: [id], gagal: { id: ISO sampai kapan } }
  add column seleksi jsonb not null default '{}'::jsonb,
  -- 17. latihan (kursus keahlian atau atribut) yang sedang berjalan dan jeda sesudahnya
  add column latihan_id text,
  add column latihan_target int,
  add column latihan_selesai timestamptz,
  add column latihan_jeda timestamptz,
  -- 16. profil publik
  add column profil_properti boolean not null default false,
  -- 9. sesi memancing yang sedang berjalan
  add column pancing jsonb;

create index warga_reputasi on warga (reputasi desc) where peran <> 'walikota';
create index warga_reputasi_minggu on warga (reputasi_minggu desc) where peran <> 'walikota' and reputasi_minggu > 0;
create index warga_tempat_kerja on warga (tempat_kerja, pekerjaan_id);
create index warga_kamar on warga (hunian_tempat, hunian_kamar);

-- Kota: minggu peringkat yang sedang berjalan (awal pekan WIB, YYYY-MM-DD)
alter table kota add column minggu_peringkat text;

-- 4. snapshot top-N tiap minggu
create table peringkat_mingguan (
  minggu text not null,
  peringkat int not null,
  warga_id uuid references warga(id) on delete set null,
  nama text not null,
  poin int not null,
  hadiah bigint not null default 0,
  dibuat_pada timestamptz not null,
  primary key (minggu, peringkat)
);

-- 2. mailbox: barang yang tidak muat di inventori, hadiah, dan kiriman. Inventori memakai tabel gudang yang sudah ada.
create table surat (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references warga(id) on delete cascade,
  pengirim text not null,
  judul text not null,
  item text check (item is null or item ~ '^[a-z0-9-]{2,40}$'),
  jumlah int not null default 0 check (jumlah >= 0),
  uang bigint not null default 0 check (uang >= 0),
  sumber text not null,
  dibuat_pada timestamptz not null,
  check ((item is not null and jumlah > 0) or uang > 0)
);
create index surat_warga on surat (warga_id, dibuat_pada);

-- 3 dan 16. pertemanan. Pasangan disimpan dengan a < b. `sekamar` terisi bila permintaan dibuat otomatis karena sekamar.
create table pertemanan (
  a uuid not null references warga(id) on delete cascade,
  b uuid not null references warga(id) on delete cascade,
  status text not null check (status in ('minta', 'teman')),
  peminta uuid not null references warga(id) on delete cascade,
  sekamar text,
  dibuat_pada timestamptz not null,
  primary key (a, b),
  check (a < b)
);
create index pertemanan_b on pertemanan (b);

-- 16. pesan antarpemain
create table pesan (
  id bigint generated always as identity primary key,
  dari_id uuid not null references warga(id) on delete cascade,
  ke_id uuid not null references warga(id) on delete cascade,
  isi text not null check (char_length(isi) between 1 and 300),
  dibaca boolean not null default false,
  dibuat_pada timestamptz not null,
  check (dari_id <> ke_id)
);
create index pesan_ke on pesan (ke_id, id desc);
create index pesan_dari on pesan (dari_id, dibuat_pada);

-- 6 dan 7. properti pemain: jenis objek (lahan kosong atau bangunan NPC yang dibeli), konstruksi, dan penjualan antarpemain.
-- Lahan dan bangunan tanpa baris di sini milik kota (lahan) atau NPC (bangunan).
alter table lahan_milik
  add column jenis_objek text not null default 'lahan' check (jenis_objek in ('lahan', 'bangunan')),
  add column bangun_jenis text,
  add column bangun_mulai timestamptz,
  add column bangun_selesai timestamptz,
  add column jual_mode text not null default 'tidak' check (jual_mode in ('tidak', 'tetap', 'negosiasi')),
  add column jual_harga bigint check (jual_harga is null or jual_harga > 0);
update lahan_milik set bangun_jenis = 'rumah' where rumah;

create table penawaran_properti (
  id uuid primary key default gen_random_uuid(),
  lahan_id text not null references lahan_milik(lahan_id) on delete cascade,
  penjual_id uuid not null references warga(id) on delete cascade,
  pembeli_id uuid not null references warga(id) on delete cascade,
  harga bigint not null check (harga > 0),
  -- siapa yang harus menjawab sekarang
  giliran text not null check (giliran in ('penjual', 'pembeli')),
  status text not null check (status in ('terbuka', 'diterima', 'ditolak', 'kedaluwarsa', 'dibatalkan', 'ditawar_balik')),
  babak int not null default 1,
  induk uuid references penawaran_properti(id) on delete set null,
  dibuat_pada timestamptz not null,
  kedaluwarsa_pada timestamptz not null,
  selesai_pada timestamptz,
  check (penjual_id <> pembeli_id)
);
create unique index penawaran_terbuka on penawaran_properti (lahan_id, pembeli_id) where status = 'terbuka';
create index penawaran_penjual on penawaran_properti (penjual_id) where status = 'terbuka';
create index penawaran_pembeli on penawaran_properti (pembeli_id) where status = 'terbuka';

-- 8. audit tiap putaran roulette
create table judi_putaran (
  id bigint generated always as identity primary key,
  warga_id uuid not null references warga(id) on delete cascade,
  kunci text,
  nomor int not null check (nomor between 0 and 36),
  warna text not null check (warna in ('merah', 'hitam', 'hijau')),
  taruhan jsonb not null,
  total_taruhan bigint not null check (total_taruhan > 0),
  total_kembali bigint not null check (total_kembali >= 0),
  dibuat_pada timestamptz not null
);
create index judi_putaran_warga on judi_putaran (warga_id, id desc);

-- 10. stok tiap minimarket; baris dibuat saat pertama dipakai (nilai awal dari src/data/balans.ts)
create table toko_stok (
  toko text not null,
  produk text not null check (produk ~ '^[a-z0-9-]{2,40}$'),
  stok int not null check (stok >= 0),
  diperbarui_pada timestamptz not null,
  primary key (toko, produk)
);

-- jenis ledger baru
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
  'hadiah_surat', 'hadiah_mingguan'
));

create or replace view ledger_golongan as
select l.*,
  case
    when l.akun = 'kas' and l.jenis in (
      'uang_saku', 'upah', 'bonus_harian', 'judi_menang', 'hasil_perjalanan', 'hasil_usaha', 'jual_npc', 'hadiah_surat', 'hadiah_mingguan'
    ) then 'faucet'
    when l.akun = 'kas' and l.jenis in (
      'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon', 'judi_kalah', 'makan',
      'tiket_pesawat', 'ukt', 'berobat', 'modal_usaha', 'upgrade_usaha', 'bahan_usaha', 'beli_lahan', 'bangun_rumah',
      'beli_npc', 'biaya_lapak', 'rawat_inap', 'biaya_seleksi', 'beli_toko', 'beli_properti_npc'
    ) then 'sink'
    else 'lain'
  end as golongan
from ledger l;
