-- Fitur kota: tabungan bank, kuliah, penerbangan, berobat, usaha, dan lahan milik pemain.
alter table warga
  add column tabungan bigint not null default 0 check (tabungan >= 0),
  add column ijazah text,
  add column kuliah_jurusan text,
  add column kuliah_semester int not null default 0,
  add column kuliah_sesi int not null default 0,
  add column kuliah_ukt_lunas boolean not null default false,
  add column kuliah_sesi_tanggal text,
  add column perjalanan_tujuan text,
  add column perjalanan_pulang timestamptz,
  add column berobat_tanggal text;

alter table ledger drop constraint ledger_akun_check;
alter table ledger add constraint ledger_akun_check check (akun in ('kas', 'kasbon', 'tabungan'));

alter table ledger drop constraint ledger_jenis_check;
alter table ledger add constraint ledger_jenis_check check (jenis in (
  'uang_saku', 'upah', 'bonus_harian',
  'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon',
  'kasbon_baru', 'bunga_kasbon',
  'dana_walikota',
  'judi_menang', 'judi_kalah', 'makan',
  'setor_tabungan', 'tarik_tabungan', 'bunga_tabungan',
  'tiket_pesawat', 'hasil_perjalanan', 'ukt', 'berobat',
  'modal_usaha', 'upgrade_usaha', 'hasil_usaha',
  'beli_lahan', 'bangun_rumah'
));

create or replace view ledger_golongan as
select l.*,
  case
    when l.akun = 'kas' and l.jenis in ('uang_saku', 'upah', 'bonus_harian', 'judi_menang', 'hasil_perjalanan', 'hasil_usaha') then 'faucet'
    when l.akun = 'kas' and l.jenis in (
      'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon', 'judi_kalah', 'makan',
      'tiket_pesawat', 'ukt', 'berobat', 'modal_usaha', 'upgrade_usaha', 'beli_lahan', 'bangun_rumah'
    ) then 'sink'
    else 'lain'
  end as golongan
from ledger l;

-- Usaha milik pemain: berproduksi sendiri tiap 4 jam, hasil diambil pemain.
create table usaha (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references warga(id) on delete cascade,
  jenis text not null check (jenis in ('perahu', 'warung')),
  level int not null default 1 check (level between 1 and 5),
  produksi_pada timestamptz not null,
  dibuat_pada timestamptz not null
);
create index usaha_warga on usaha (warga_id);

-- Lahan kosong di peta yang sudah dibeli. lahan_id mengikuti id di src/data/tataletak.ts (lahan-N).
create table lahan_milik (
  lahan_id text primary key,
  warga_id uuid not null references warga(id) on delete cascade,
  dibeli_pada timestamptz not null,
  rumah boolean not null default false
);
create index lahan_milik_warga on lahan_milik (warga_id);
