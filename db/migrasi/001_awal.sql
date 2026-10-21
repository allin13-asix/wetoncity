-- Weton City, skema Fase 0. Uang hanya bergerak lewat ledger; warga.kas dan warga.kasbon adalah saldo turunan
-- yang selalu sama dengan jumlah baris ledger akun masing-masing (diperiksa oleh uji server).

create table warga (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nama text not null,
  sandi_hash text not null,
  dibuat_pada timestamptz not null,
  terakhir_aktif timestamptz not null,
  kas bigint not null default 0 check (kas >= 0),
  kasbon bigint not null default 0 check (kasbon >= 0),
  kasbon_sejak timestamptz,
  -- Tenaga: nilai pada saat tenaga_pada; nilai sekarang dihitung saat dibaca (tanpa cron)
  tenaga int not null check (tenaga >= 0),
  tenaga_pada timestamptz not null,
  keahlian int not null default 1 check (keahlian between 1 and 10),
  keahlian6_sejak timestamptz,
  pekerjaan_id text,
  hunian_id text,
  hunian_berikut text,
  -- tagihan: siklus 7 hari sejak bergabung; upah_siklus adalah dasar pajak penghasilan
  tagihan_berikut timestamptz not null,
  upah_siklus bigint not null default 0 check (upah_siklus >= 0),
  -- tanggal WIB terakhir klaim bonus harian, bentuk YYYY-MM-DD
  bonus_tanggal text check (bonus_tanggal ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);
create unique index warga_email_unik on warga (lower(email));
create index warga_hunian on warga (hunian_id);

create table sesi (
  token_hash text primary key,
  warga_id uuid not null references warga(id) on delete cascade,
  dibuat_pada timestamptz not null,
  kedaluwarsa timestamptz not null
);
create index sesi_warga on sesi (warga_id);

create table ledger (
  id bigint generated always as identity primary key,
  warga_id uuid not null references warga(id) on delete cascade,
  akun text not null check (akun in ('kas', 'kasbon')),
  jenis text not null check (jenis in (
    'uang_saku', 'upah', 'bonus_harian',                      -- faucet (kas bertambah)
    'tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon',       -- sink (kas berkurang)
    'kasbon_baru', 'bunga_kasbon'                             -- kasbon bertambah, tanpa gerak kas
  )),
  jumlah bigint not null check (jumlah <> 0),                 -- bertanda: tambah positif, kurang negatif
  saldo_setelah bigint not null check (saldo_setelah >= 0),
  kunci text,
  rincian jsonb not null default '{}'::jsonb,
  dibuat_pada timestamptz not null
);
create index ledger_warga on ledger (warga_id, id desc);
create index ledger_jenis on ledger (jenis);

-- Ledger hanya boleh ditambah. Hapus berantai dari warga (kedalaman pemicu lebih dari 1) diizinkan agar akun uji dan akun yang dihapus bisa dibersihkan.
create function ledger_tak_boleh_ubah() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'ledger tidak boleh diubah atau dihapus langsung';
end $$;
create trigger ledger_kunci before update or delete on ledger for each row execute function ledger_tak_boleh_ubah();

-- Faucet dan sink untuk pemantauan rasio (docs/EKONOMI.md bagian 16)
create view ledger_golongan as
select l.*,
  case
    when l.akun = 'kas' and l.jenis in ('uang_saku', 'upah', 'bonus_harian') then 'faucet'
    when l.akun = 'kas' and l.jenis in ('tagihan_hidup', 'pajak', 'kursus', 'bayar_kasbon') then 'sink'
    else 'lain'
  end as golongan
from ledger l;

-- Idempotensi: tombol terketuk dua kali atau permintaan diulang menghasilkan satu efek dan jawaban yang sama
create table aksi_log (
  warga_id uuid not null references warga(id) on delete cascade,
  kunci text not null,
  aksi text not null,
  hasil jsonb not null,
  dibuat_pada timestamptz not null,
  primary key (warga_id, kunci)
);

-- Pembatas percobaan masuk yang gagal (per email), tanpa dependensi tambahan
create table percobaan_masuk (
  kunci text primary key,
  gagal int not null,
  sejak timestamptz not null
);
