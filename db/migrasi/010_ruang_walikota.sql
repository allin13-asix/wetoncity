-- Ruang obrolan berwujud (alun-alun dan taman dengan beberapa ruang paralel, serta ruang dalam gedung hunian) dengan
-- kehadiran pemain dan posisinya, barang buatan Wali Kota, dan catatan bansos. Nilai balancing di src/data/balans.ts.

-- kehadiran di ruang berwujud: satu baris per warga (satu ruang sekaligus); dianggap pergi bila detaknya basi
create table ruang_hadir (
  warga_id uuid primary key references warga(id) on delete cascade,
  ruang text not null check (ruang ~ '^((alun|taman):[0-9]{1,3}|hunian:[a-z0-9-]{2,60})$'),
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  terakhir timestamptz not null
);
create index ruang_hadir_ruang on ruang_hadir (ruang, terakhir);

alter table obrolan drop constraint obrolan_ruang_check;
alter table obrolan add constraint obrolan_ruang_check check (ruang ~ '^(global|(alun|taman):[0-9]{1,3}|hunian:[a-z0-9-]{2,60})$');

-- barang buatan Wali Kota: id berawalan "k-"; ikon dari bentuk 2D bawaan dengan warna pilihan
create table barang_kustom (
  id text primary key check (id ~ '^k-[a-z0-9-]{2,37}$'),
  nama text not null check (char_length(nama) between 3 and 40),
  jenis text not null check (jenis in ('konsumsi', 'koleksi', 'bahan')),
  dasar bigint not null check (dasar between 100 and 100000000),
  satuan text not null check (char_length(satuan) between 2 and 12),
  ringkas text not null default '' check (char_length(ringkas) <= 120),
  tenaga int not null default 0 check (tenaga between 0 and 50),
  kesehatan int not null default 0 check (kesehatan between 0 and 50),
  lapar int not null default 0 check (lapar between 0 and 60),
  bentuk text not null,
  warna text not null check (warna ~ '^#[0-9a-f]{6}$'),
  dibuat_oleh uuid references warga(id) on delete set null,
  dibuat_pada timestamptz not null
);

-- bansos dari Wali Kota: dikirim lewat mailbox; baris ini catatan audit
create table bansos (
  id bigint generated always as identity primary key,
  walikota_id uuid references warga(id) on delete set null,
  sasaran text not null,
  item text,
  jumlah int not null default 0,
  uang bigint not null default 0,
  penerima int not null,
  pesan text,
  dibuat_pada timestamptz not null
);
