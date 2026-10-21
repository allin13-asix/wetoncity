-- Latar sekolah pemain, kamar di bangunan hunian tertentu, dan Kesehatan.
alter table warga
  add column sekolah text check (sekolah in ('sma', 'smk-otomotif', 'smk-perhotelan', 'smk-pelayaran')),
  add column hunian_tempat text,
  add column hunian_tempat_berikut text,
  add column kesehatan int not null default 100 check (kesehatan between 0 and 100),
  add column kesehatan_pada timestamptz not null default now();
create index warga_hunian_tempat on warga (hunian_tempat);
create index warga_hunian_tempat_berikut on warga (hunian_tempat_berikut);
