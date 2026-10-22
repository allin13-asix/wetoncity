# Weton City

Kota pelabuhan virtual ala Indonesia untuk ponsel. Pemain datang sebagai pendatang berumur 18 tahun lulusan SMA atau SMK, memilih tempat tinggal, mencari kerja atau kuliah, lalu membesarkan kota bersama warga lain. Tanpa PvP.

Yang sudah ada di repo ini: peta kota 3D, galeri aset, data kota, tur pemain baru, 100 NPC, panduan, simulasi ekonomi, dan server Fase 0. Server Fase 0 mencakup akun dengan email dan kata sandi, Postgres, ledger uang, Tenaga, kerja, kursus, bonus harian, tagihan mingguan, dan kasbon. Rancangannya ada di [docs/SERVER.md](docs/SERVER.md).

## Menjalankan

```bash
pnpm install
cp .env.example .env.local   # isi DATABASE_URL dan DATABASE_URL_UJI (lihat "Basis data")
pnpm db:migrasi
pnpm dev
```

Buka <http://localhost:3600>. Port 3000 sengaja dihindari.

Peta, galeri, daftar warga, dan panduan tetap jalan tanpa basis data. Halaman akun (`/masuk`, `/mulai`, `/beranda`) dan semua `/api` butuh Postgres.

Sebelum commit, jalankan semua pemeriksaan (tanpa basis data):

```bash
pnpm periksa
```

Uji yang memakai basis data dijalankan terpisah:

```bash
pnpm uji:server   # uji domain di skema sementara pada DATABASE_URL_UJI
pnpm dev          # di terminal lain
pnpm smoke        # alur HTTP penuh ke server dev, membersihkan akun ujinya sendiri
```

## Basis data

Butuh Postgres 15 atau lebih baru. Role `weton_city` dan dua database (`weton_city`, `weton_city_test`) dibuat sekali oleh `db/siapkan.sql`. Skripnya aman dijalankan ulang.

**Pilihan A, Postgres sistem.** Superuser menjalankan:

```bash
psql -U postgres -h 127.0.0.1 -v sandi=KATA_SANDI_BARU -f db/siapkan.sql
```

**Pilihan B, klaster pribadi di folder proyek**, tanpa kata sandi superuser. `initdb`, `pg_ctl`, dan `psql` ada di folder `bin` instalasi Postgres. Port 5544 dipilih agar tidak bentrok dengan Postgres sistem.

```bash
initdb -D .pgdata -U postgres -A trust -E UTF8 --locale=C
pg_ctl -D .pgdata -o "-p 5544" -l .pgdata/server.log -w start
psql -h 127.0.0.1 -p 5544 -U postgres -d postgres -v sandi=KATA_SANDI_BARU -f db/siapkan.sql
pg_ctl -D .pgdata stop   # untuk mematikan
```

Mode `trust` membiarkan proses lokal mana pun masuk sebagai superuser. Pakai hanya di mesin pengembangan. Setelah komputer dihidupkan ulang, jalankan `pnpm db:hidup` (menghidupkan klaster di latar belakang bila belum jalan).

Isi `.env.local` dengan kata sandi yang sama (port 5432 untuk pilihan A, 5544 untuk pilihan B):

```
DATABASE_URL=postgres://weton_city:KATA_SANDI_BARU@127.0.0.1:5544/weton_city
DATABASE_URL_UJI=postgres://weton_city:KATA_SANDI_BARU@127.0.0.1:5544/weton_city_test
```

## Halaman

| Alamat | Isi |
|---|---|
| `/` | Peta kota 3D. `?tur=1` memulai tur, `?fokus=balai-kota` terbang ke satu bangunan |
| `/galeri` | Galeri aset: putar tiap model, lembar semua model, unduh `.glb` |
| `/warga` | 100 NPC dengan pencarian |
| `/panduan` | Alur pemain baru, hunian, pekerjaan, kuliah, fasilitas utama |
| `/masuk` | Masuk atau daftar sebagai warga baru |
| `/mulai` | Memilih tempat tinggal. `?pindah=1` untuk pindah (berlaku siklus tagihan berikutnya) |
| `/beranda` | Uang, Tenaga, kerja, Bursa Kerja, kursus, bonus harian, tagihan, kasbon, riwayat |

## Aplikasi terpasang (PWA)

Weton City bisa dipasang ke layar utama ponsel dan dibuka layar penuh seperti aplikasi.

- `src/app/manifest.ts`: nama, warna, ikon, dan pintasan (Peta, Beranda, Pasar, Pesan).
- Ikon: `src/app/icon.svg` (sudut membulat) dan `public/ikon-penuh.svg` (penuh-bidang) menjadi `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, dan `src/app/apple-icon.png`. Bila logo berubah, render ulang PNG-nya dari kedua SVG itu.
- `public/sw.js`: pengingat web push dan halaman `public/offline.html` saat dibuka tanpa internet. Hanya halaman offline yang di-cache; halaman, API, dan aset lain selalu dari jaringan. Header `no-cache` untuk `sw.js` ada di `next.config.ts`.
- Tombol "Pasang di layar utama" (`src/ui/Pwa.tsx`) ada di Beranda dan menu peta: Android dan Chrome memakai dialog pasang bawaan, iPhone mendapat petunjuk Bagikan lalu Tambah ke Layar Utama. Tidak tampil bila sudah dibuka dari layar utama.

## Struktur

```
docs/            Rancangan: KONSEP, KOTA, WARGA, EKONOMI, SERVER
db/              siapkan.sql (role dan database) dan migrasi/ (skema, dijalankan berurutan)
scripts/         Pemeriksa: cek-data, sim-ekonomi, cek-aset. Server: db, uji-server, ukur-kueri, smoke-server
src/data/        Semua isi game sebagai data: katalog bangunan, tata letak, hunian,
                 pekerjaan, jurusan, NPC, tur, angka ekonomi
src/server/      Aturan murni (Tenaga, tagihan, upah) dan operasi basis data (akun, game, kueri)
src/aset/        Perakit model 3D dan semua model bangunan (tanpa berkas gambar)
src/kota/        Adegan react-three-fiber: tanah dan laut, bangunan, hiasan, kamera
src/ui/          Antarmuka: peta, panel info, tur, galeri, daftar warga, masuk, beranda
src/app/         Halaman Next.js; src/app/api berisi route handler
```

## Skrip

| Perintah | Fungsi |
|---|---|
| `pnpm tipe` | Pemeriksaan tipe TypeScript |
| `pnpm cek` | Tata letak tidak tumpang tindih, rujukan NPC, pekerjaan, jurusan, hunian, dan tur benar |
| `pnpm sim` | Simulasi ekonomi dari angka di `src/data`; gagal bila melanggar maksud desain |
| `pnpm aset` | Segitiga dan ukuran tiap model dibanding petaknya, beban seluruh kota |
| `pnpm periksa` | Keempatnya berurutan, tanpa basis data |
| `pnpm db:migrasi` | Menjalankan migrasi di `db/migrasi` pada `DATABASE_URL` |
| `pnpm uji:server` | 26 uji domain: ledger, Tenaga, kuota Rusunawa, idempotensi, serentak, tagihan, kasbon, dan kesetaraan kas harian dengan `pnpm sim` |
| `pnpm ukur` | Round-trip basis data per fitur lewat proksi yang menunda RTT (`-- --rtt=60 --keluar=ukur.json --banding=awal.json`) |
| `pnpm smoke` | Alur HTTP penuh ke server dev (`BASE_URL` bila bukan localhost:3600) |
| `pnpm walikota` | Membuat akun Wali Kota untuk pengembang (hanya DB lokal; lihat docs/SERVER.md) |
| `pnpm build` | Build produksi |

Skrip `cek`, `sim`, `aset`, `db`, `uji-server`, dan `smoke` dijalankan langsung oleh Node (tanpa kompilasi), jadi berkas data dan server memakai impor berekstensi `.ts` dan hanya sintaks yang bisa dihapus-tipenya.

## Menambah bangunan

Lihat [docs/KOTA.md](docs/KOTA.md) bagian 8.
