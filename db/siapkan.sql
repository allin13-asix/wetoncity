-- Dijalankan sekali oleh superuser Postgres, dari folder proyek:
--   psql -U postgres -h 127.0.0.1 -v sandi=KATA_SANDI_BARU -f db/siapkan.sql
-- Membuat role weton_city (bukan superuser) dan dua database: weton_city dan weton_city_test.
-- Aman dijalankan ulang: role yang sudah ada hanya diganti kata sandinya.
select format('create role weton_city login password %L', :'sandi') where not exists (select from pg_roles where rolname = 'weton_city') \gexec
select format('alter role weton_city login password %L', :'sandi') where exists (select from pg_roles where rolname = 'weton_city') \gexec
select 'create database weton_city owner weton_city' where not exists (select from pg_database where datname = 'weton_city') \gexec
select 'create database weton_city_test owner weton_city' where not exists (select from pg_database where datname = 'weton_city_test') \gexec
