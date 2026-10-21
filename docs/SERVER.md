# Server Fase 0: rancangan dan status

Status (18 Oktober 2026): selesai dan teruji.

- `pnpm uji:server`: 32 uji lolos (19 Oktober 2026), termasuk kas harian yang sama persis dengan `pnpm sim` selama 60 hari untuk Kost Melati, Mawar, dan Anggrek.
- `pnpm smoke`: 12 pemeriksaan HTTP lolos.
- Peramban (Chrome tanpa kepala lewat puppeteer, di desktop terang dan ponsel gelap): daftar, pilih tempat tinggal, ambil kerja, kerja, bonus, kursus, pindah tempat tinggal, keluar, masuk dengan sandi salah lalu benar, pengalihan saat belum masuk, dan `/mulai` bagi yang sudah punya tempat tinggal. Skrip peramban belum disimpan di repo.
- Uji tidak kosong: bonus harian sengaja dibuat lebih satu rupiah di server, dan empat uji langsung gagal (bonus dan tiga kesetaraan). Kode dipulihkan setelahnya.
- `pnpm periksa` dan `pnpm build` lolos.

## Sudah ada

- `db/siapkan.sql`: membuat role `weton_city` dan database `weton_city` dan `weton_city_test`. Dijalankan sekali oleh superuser, atau lewat klaster pribadi di `.pgdata` (README, bagian Basis data). Kata sandi dikirim sebagai variabel psql `sandi`, tidak ditulis di berkas.
- `.env.local` (tidak di-commit) berisi `DATABASE_URL` dan `DATABASE_URL_UJI`; `.env.example` sebagai contoh.
- `db/migrasi/001_awal.sql`: skema (warga, sesi, ledger, aksi_log, percobaan_masuk, view ledger_golongan).
- `src/server`: `aturan.ts` (aturan murni), `db.ts` dan `sql.ts` (klien postgres.js), `sandi.ts` (scrypt dan token), `akun.ts` (daftar, masuk, sesi), `game.ts` (muat, pilihHunian, ambilPekerjaan, kerja, kursus, klaimBonus, bayarKasbon, riwayat), `migrasi.ts`, `http.ts` (kuki, JSON, Origin, galat), `galat.ts`, `tipe.ts`.
- `src/app/api`: `daftar`, `masuk`, `keluar`, `sesi`, `saya`, `riwayat`, `hunian`, `pekerjaan`, `kerja`, `kursus`, `bonus`, `kasbon`.
- Halaman: `/masuk`, `/mulai` (juga `?pindah=1`), `/beranda`. Kartu pilihan tempat tinggal dipakai bersama tur peta (`src/ui/KartuHunian.tsx`). Papan navigasi menampilkan Masuk atau Beranda.
- Skrip: `pnpm db:migrasi`, `pnpm uji:server` (26 uji, termasuk kesetaraan kas harian dengan `pnpm sim` selama 60 hari untuk tiga hunian), `pnpm smoke` (alur HTTP penuh, membersihkan akun uji sendiri).

## Cara menjalankan pertama kali

1. Buat role dan database dengan `db/siapkan.sql` (README, bagian Basis data), lalu isi `.env.local`.
2. `pnpm db:migrasi`
3. `pnpm uji:server`
4. `pnpm dev`, lalu di terminal lain `pnpm smoke`.

## Keputusan

- **Tanpa ORM.** `postgres` (postgres.js), SQL mentah, `prepare: false` dan koneksi tunggal global seperti di CEVE-IN. Bigint dibaca sebagai Number (aman untuk Rupiah).
- **Round-trip adalah biaya utama.** Di produksi tiap round-trip ke basis data (pooler transaksi Supabase) memakan ratusan milidetik, jadi kode dirancang menghemat round-trip, bukan CPU. Dengan `prepare: false`, postgres.js menjalankan tiap query berparameter sebagai "describe dulu": dua round-trip dan pipeline berhenti. Karena itu `src/server/kueri.ts` menyisipkan nilai sebagai literal ter-escape (`literal()`, satu-satunya tempat nilai menjadi teks SQL) dan mengirim lewat protokol simple: satu round-trip per query, dan query yang di-await bersamaan (`Promise.all`) dikirim berurutan dalam satu penerbangan, dijalankan server sesuai urutan kirim. `tx.tulis` menunda pernyataan yang hasilnya tidak dibaca sampai penerbangan berikutnya. Satu aksi (`dalamTransaksi`) memakai koneksi yang dipesan (`sql.reserve`) dan tiga penerbangan paling banyak: awal (begin, kunci baris warga, lalu UMK, jawaban kunci idempotensi, numpang, uang tertahan, milik warga, koran bila basi), baca ulang milik hanya bila aksi menulis tabel milik, dan akhir (tulisan tertunda, `aksi_log`, commit). Jangan meng-await kolam `sql` selagi koneksi dipegang (kolam Vercel max 1). Ukur dengan `pnpm ukur`.
- **Login sederhana.** Email dan kata sandi (scrypt, format `s1$salt$kunci` seperti CEVE-IN). Sesi: token acak 32 byte, tabel `sesi` menyimpan hash sha256, cookie `weton_sid` httpOnly, SameSite Lax, Secure di produksi, 30 hari. Pembatas percobaan gagal per email (5 kali per 15 menit). Opsional `KODE_UNDANGAN`. Permintaan POST diperiksa Origin-nya.
- **Domain murni dan DB dipisah.** `src/server/aturan.ts` berisi fungsi murni (Tenaga, tagihan, tier, upah) tanpa dependensi server, bisa dipakai klien. `src/server/game.ts` berisi operasi DB. Semua menerima `sekarang: Date` agar waktu bisa dipalsukan di uji.
- **Ledger.** Setiap perubahan saldo lewat satu fungsi `catat`: mengubah `warga.kas` atau `warga.kasbon`, menambah baris ledger dengan `saldo_setelah`. CHECK `kas >= 0` sebagai jaring pengaman. Ledger tidak bisa diubah atau dihapus langsung (pemicu); hapus berantai dari `warga` boleh.
- **Konkurensi.** Setiap operasi dalam transaksi dengan `select ... for update` pada baris warga. Kuota Rusunawa memakai `pg_advisory_xact_lock`.
- **Idempotensi.** Klien mengirim `kunci` (UUID) per aksi. Tabel `aksi_log (warga_id, kunci)` menyimpan hasil; permintaan ulang mengembalikan hasil yang sama tanpa efek ganda.
- **Penagihan malas.** Setiap operasi dan setiap pemuatan keadaan dimulai dengan `selesaikan`: memulihkan Tenaga lalu menagih siklus yang jatuh tempo. Tidak ada cron.

## Aturan

**Tenaga.** Maksimum 100 ditambah bonus hunian (Kost Anggrek +10). Pulih 1 per 6 menit. Disimpan `tenaga` dan `tenaga_pada`. Saat dibaca: `ticks = floor((sekarang - tenaga_pada) / interval)`; bila `tenaga + ticks >= maks` maka penuh dan `tenaga_pada = sekarang`, selain itu `tenaga += ticks` dan `tenaga_pada += ticks * interval` (sisa waktu tidak hilang). Bila kasbon macet, interval dua kali lipat.

**Kasbon macet.** Kasbon di atas Rp 1.000.000 atau lebih dari 7 hari sejak `kasbon_sejak`. Penjelasan: Rp 1.000.000 adalah ambang penalti, bukan plafon (EKONOMI.md bagian 9 menyebut "maksimal"; samakan).

**Penagihan.** Siklus 7 hari sejak bergabung (`tagihan_berikut`). Saat jatuh tempo: n siklus terlewat, ditagih paling banyak 2 (tradisi mudik), sisanya dihapus tanpa bunga, `tagihan_berikut += n x 7 hari`. Tiap siklus yang ditagih: bunga kasbon 10% dari kasbon berjalan (baris `bunga_kasbon`), lalu `tagihan_hidup` (sewa + listrik + makan setelah diskon), lalu `pajak` (siklus pertama saja, dari `upah_siklus`, lalu `upah_siklus = 0`). Bila kas kurang: bayar sebanyak kas, selisih menjadi `kasbon_baru`. Setelah tiap siklus, `hunian_berikut` berlaku. Penghuni Rusunawa yang Keahliannya sudah 6 lebih dari 28 hari dipindah ke Kost Melati.

**Operasi** (semua butuh `kunci`, kecuali yang dicatat): `daftar` (kas 0 lalu `uang_saku` Rp 1.000.000, Tenaga 100, `tagihan_berikut` = +7 hari), `masuk`, `pilihHunian` (pertama kali langsung berlaku; selanjutnya menjadi `hunian_berikut`; Rusunawa: Keahlian di bawah 6, kuota 80), `ambilPekerjaan` (pekerjaan fase 0 SMA/SMK, Keahlian cukup), `kerja` (1 sampai 10 aksi, 10 Tenaga per aksi, upah `aksi x 10 x tarif tier pekerjaan x pengali Keahlian`, menambah `upah_siklus`), `kursus` (10 Tenaga dan biaya setelah diskon, Keahlian +1, mencatat `keahlian6_sejak`), `klaimBonus` (Rp 20.000 per tanggal WIB), `bayarKasbon`, `muat` (keadaan), `riwayat`. Belum boleh bekerja sebelum memilih hunian.

## API

`POST /api/daftar`, `/api/masuk`, `/api/keluar`; `GET /api/saya` (keadaan beserta lowongan); `POST /api/hunian`, `/api/pekerjaan`, `/api/kerja`, `/api/kursus`, `/api/bonus`, `/api/kasbon`; `GET /api/riwayat`. Galat berbentuk `{ galat: { kode, pesan } }` dengan pesan Indonesia polos.

## Halaman

`/masuk` (masuk dan daftar), `/mulai` (memilih hunian, memakai kartu karcis yang sama dengan tur, dari `src/ui/KartuHunian.tsx`), `/beranda` (kas, Tenaga, kerja, kursus, bonus, tagihan, kasbon, riwayat). Papan navigasi menampilkan Masuk atau Beranda lewat `/api/saya`. Gaya mengikuti papan petunjuk pelabuhan yang sudah ada.

## Uji

1. **Uji domain** (`pnpm uji:server`): memakai `DATABASE_URL_UJI`, satu skema sementara per jalan, waktu palsu. Cakup: daftar dan ledger awal, masuk dan pembatas, hunian dan kuota (termasuk dua permintaan serentak untuk slot terakhir), kerja dan Tenaga (sisa waktu pulih terjaga), idempotensi (permintaan serentak dengan kunci sama), 20 kerja serentak dengan kunci berbeda (tepat 10 berhasil), kursus, bonus lintas tengah malam WIB, penagihan, kasbon, bunga, kasbon macet, tradisi mudik (2 siklus), pindah hunian, pindah paksa Rusunawa, saldo sama dengan jumlah ledger, ledger tak bisa diubah langsung, hapus berantai boleh.
2. **Kesetaraan dengan simulasi:** pemain santai yang bertindak sekali sehari pada `t0 + d x 24 jam - 1 menit` dengan kebijakan yang sama seperti `scripts/sim-ekonomi.ts` harus menghasilkan kas yang sama dengan `simulasi()` pada setiap hari selama 60 hari (setelah memuat keadaan 30 menit sesudah hari itu agar tagihan jatuh tempo ikut selesai). Berlaku untuk Kost Melati, Kost Mawar, dan Kost Anggrek.
3. **Smoke HTTP** (`pnpm smoke`): ke server dev, membuat akun uji lewat API, melewati alur daftar sampai kerja dan tagihan, memeriksa cookie (HttpOnly, SameSite), Origin salah ditolak, lalu menghapus akun uji lewat DB.
4. Uji peramban (puppeteer) untuk `/masuk`, `/mulai`, `/beranda` di desktop dan ponsel. Dijalankan dengan skrip sementara; belum menjadi bagian repo.

## Temuan saat menjalankan uji

- `assert.deepEqual` membandingkan prototipe. Hasil query postgres.js adalah subkelas Array, jadi harus disebar (`[...hasil]`) sebelum dibandingkan dengan array biasa.
- Aturan global `.halaman section { margin-top: 48px }` melebarkan jarak antar panel Beranda. Diatasi dengan selektor `.halaman .panel` dan `.halaman .kk` di `akun.css`.
- Di uji peramban, mengisi ulang kolom yang sudah berisi harus mengosongkan nilainya dulu. Klik tiga kali tidak memilih seluruh isi kolom pada emulasi ponsel, sehingga email tergandakan dan peramban menolak formulir. Ini masalah alat uji, bukan aplikasi.

## Fitur kota (migrasi 004, 20 Oktober 2026)

Semua lewat `POST` dengan `kunci`, dan diblokir selama pemain di luar kota.

- **Bandara** (`/api/terbang`, `tujuan`): Jakarte (Rp 2.000.000, 12 jam, Keahlian +1), Culabaya (Rp 400.000, 24 jam, upah 30 aksi pekerjaanmu), Soloe (Rp 450.000, 8 jam, Rp 750.000). Hasil diterima saat pulang, dihitung saat dibaca.
- **Kuliah** (`/api/kuliah`, `aksi` daftar/ukt/sesi/berhenti): UKT per semester, satu sesi per tanggal WIB (20 Tenaga), lima sesi per semester. Lulus menyimpan `ijazah` dan menambah pekerjaan Tier 4 (D3) atau Tier 5 (S1) yang cocok ke lowongan.
- **Tabungan** (`/api/tabungan`, setor/tarik): akun ledger `tabungan`, bunga 0,25% setiap siklus tagihan.
- **RSUD** (`/api/berobat`): Rp 150.000, Tenaga penuh, sekali sehari.
- **Usaha** (`/api/usaha`, buka/ambil/upgrade; tabel `usaha`): perahu nelayan dan warung makan, produksi tiap 4 jam, simpan 6 siklus, ambil 5 Tenaga, paling banyak 2 usaha, level sampai 5.
- **Lahan** (`GET /api/lahan` daftar, `POST` beli/rumah; tabel `lahan_milik`): 37 lahan berpatok di peta, harga Rp 120.000 per petak persegi, paling banyak 3. Bangun rumah Rp 15.000.000 membuka hunian "Rumah sendiri" (tanpa sewa). Catatan: id lahan mengikuti urutan deret di `tataletak.ts`, jadi mengubah tata letak bisa menggeser id.
- Belum ada: pasar antarwarga, RT/RW, gotong royong, arisan, rumah pemain yang tampil di peta.

## Rumah Makan Padang dan Rumah Judi Mujur

Dua aksi berbayar yang menjadi penyedot uang (migrasi 003, jenis ledger `makan`, `judi_menang`, `judi_kalah`).

- **Makan** (`POST /api/makan`): Rp 50.000 untuk 10 Tenaga, paling banyak dua kali per tanggal WIB, ditolak bila Tenaga penuh. Harga sengaja di atas nilai upah 10 Tenaga untuk lulusan SMA/SMK, jadi kemudahan, bukan jalan pintas.
- **Judi** (`POST /api/judi`, `taruhan` Rp 10.000 sampai Rp 1.000.000): memakai 5 Tenaga. Peluang menang 45% dan menang dibayar dua kali lipat, jadi rata-rata pemain rugi 10% per taruhan. Sebagian kekalahan berupa razia polisi (taruhan disita). Angka acak dari `crypto.randomInt`; hasil tersimpan bersama kunci idempotensi, jadi permintaan ulang tidak mengocok ulang. Uang game saja.
- Pekerjaan baru di Polsek, Kodim, Damkar, empat Dinas Kota (PNS lima jenjang: Juru Muda, Pengatur Muda, Penata Muda untuk SMA/SMK; Pembina Muda untuk D3; Pembina Utama untuk S1), RM Padang, Alpa Maret, Indo April, dan tiga pabrik besar. Semua memakai tarif tier yang sama, jadi ekonomi dan uji kesetaraan tidak berubah.
- Kompleks Gang Kenari (bekas lokalisasi) hanya lokasi di peta tanpa aksi pemain.

## Wali Kota (akun pengembang)

Peran `walikota` (kolom `warga.peran`, migrasi 002) untuk pemilik kota yang ingin mencoba game. Peran tidak bisa diberikan lewat API; hanya lewat `pnpm walikota` (skrip menolak basis data selain localhost) atau langsung di basis data.

- **Aturan khusus:** rumah dinas tanpa tagihan sewa, listrik, makan, dan pajak. Tenaga maksimum 1.000 yang pulih 1 poin per menit. Keahlian awal 10. Dana awal Rp 1.000.000.000.
- **Kantor Wali Kota** (panel di Beranda, `POST /api/walikota`): tambah dana (sampai Rp 10 miliar per aksi, masuk ledger sebagai `dana_walikota`), isi Tenaga penuh, atur Keahlian 1 sampai 10. Pemain biasa mendapat 403 `bukan_walikota`.
- **Pratinjau Koran:** Wali Kota yang sedang masuk melihat semua edisi, termasuk yang belum terbit. Edisi yang dibuka dalam mode ini tidak ditandai sudah dibaca.
- **Akun bawaan:** `pnpm walikota` membuat "Khairul Wianto" dengan email `walikota@weton.test` dan kata sandi `walikota123`; ubah dengan `--nama`, `--email`, `--sandi`. Jalankan ulang untuk memulihkan akun atau mengatur ulang kata sandi.
- Dana Wali Kota dihitung `lain` di `ledger_golongan`, jadi rasio faucet dan sink pemain biasa tidak tercemar. Saldo tetap sama dengan jumlah ledger (diperiksa uji invarian).

## Celah yang diketahui

- Pembatas percobaan hanya per email. Belum ada batas per alamat IP, dan pendaftaran belum dibatasi laju. Cukup untuk pengembangan dan warga undangan (`KODE_UNDANGAN`); tambahkan di tepi (proksi atau middleware) sebelum dibuka untuk umum.
- Baris `percobaan_masuk` untuk email yang tidak pernah berhasil masuk tidak dibersihkan. Sesi kedaluwarsa dibersihkan setiap ada sesi baru.
- Tidak ada pekerjaan terjadwal. Tagihan dan Tenaga dihitung saat pemain membuka game, jadi pemain yang tidak datang tidak membebani server.

## Berikutnya

1. Simpan uji peramban sebagai skrip di repo bila alur akun sering berubah.
2. Koran Kota manual, navigasi bawah untuk ponsel, web push (lihat KONSEP bagian 11 dan 12).
3. Fase 1: usaha, pasar dengan NPC, bank, dan numpang ke rumah warga (kini terkunci karena belum ada pemain yang punya rumah).
