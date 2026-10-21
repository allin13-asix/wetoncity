# Warga Weton: pemain baru, tempat tinggal, pekerjaan, kuliah, NPC

Status: draf 1, 18 Oktober 2026. Pelengkap [KONSEP.md](KONSEP.md), [EKONOMI.md](EKONOMI.md), dan [KOTA.md](KOTA.md). Data lengkapnya ada di `src/data` dan tampil di situs (`/panduan`, `/warga`).

## 1. Siapa pemainnya

Semua pemain baru **berumur 18 tahun dan lulusan SMA atau SMK**. Mereka pendatang yang tiba dengan kapal, membawa uang saku Rp 1.000.000 dari kampung halaman. Tidak ada pilihan jurusan SMA atau SMK saat membuat karakter; semuanya sama. Yang membedakan pemain adalah pilihan setelahnya: tempat tinggal, pekerjaan, dan apakah berkuliah.

## 2. Alur pemain baru

Alur ini sudah bisa dicoba sebagai tur di peta (tombol "Tur kota" atau `/?tur=1`). Pemandunya Mbak Laras, petugas pelabuhan.

| Langkah | Tempat | Isi |
|---|---|---|
| 1. Sambutan | Terminal Pelabuhan | Kapal sandar, pemain disambut dan menerima uang saku Rp 1.000.000 |
| 2. Tempat tinggal | Kost Melati | Memilih Rusunawa, Kost Melati, Mawar, atau Anggrek. Numpang tampil terkunci. Setiap kartu menunjukkan biaya mingguan dan fasilitas, dan pemain bisa "Lihat di peta" sebelum memilih |
| 3. Bursa Kerja | Bursa Kerja | Tempat mencari lowongan sesuai ijazah |
| 4. BLK | Balai Latihan Kerja | Kursus menaikkan Keahlian; Keahlian 3 membuka Tier 2, Keahlian 6 membuka Tier 3 |
| 5. Pasar | Pasar Weton | Jual beli antarwarga, harga naik turun |
| 6. Bank | Bank Weton | Tabungan dan kasbon (bunga 10% per minggu) |
| 7. Universitas | Rektorat | Gelar membuka pekerjaan profesional; satu semester satu minggu |
| 8. Balai Kota | Balai Kota | KTP Kota dan proyek gotong royong |
| 9. Koran | Koran Weton | Kegiatan menarik bisa masuk koran |
| 10. Alun-Alun | Alun-Alun | Tempat acara kota |
| 11. Rumah sakit | RSUD Weton | Pemulihan Tenaga |
| 12. Lahan industri | Papan proyek | Lahan kosong, terbuka saat kota cukup besar |
| 13. Misi pertama | Bursa Kerja | Memilih satu pekerjaan Tier 1. Satu aksi memakai 10 Tenaga |

Pada langkah 2, setelah memilih, pemain melihat ringkasan: tagihan pertama, jatuh tempo 7 hari lagi, dibandingkan dengan perkiraan penghasilan minggu pertama sekitar Rp 980.000. Pilihan yang tagihannya lebih besar dari penghasilan (Kost Anggrek) diberi catatan bahwa uang saku akan menutup selisihnya.

## 3. Tempat tinggal

Lima pilihan. Angka lengkap dan hasil simulasinya ada di [EKONOMI.md](EKONOMI.md) bagian 8.

| Pilihan | Per minggu | Fasilitas inti | Syarat |
|---|---|---|---|
| **Rusunawa Weton** | Rp 315.000 | Satu kamar dibagi dua warga, dapur dan kamar mandi bersama | Belum punya properti, masih Tier 2 ke bawah, kuota 80 warga |
| **Kost Melati** (Level 1) | Rp 490.000 | Kamar 3 x 3 meter, kasur, lemari, kipas, kamar mandi di luar | Tanpa syarat |
| **Kost Mawar** (Level 2) | Rp 710.000 | Kamar mandi dalam, meja belajar, WiFi, dapur bersama, parkir motor. Makan hemat 20%, kursus diskon 10% | Tanpa syarat |
| **Kost Anggrek** (Level 3) | Rp 1.210.000 | Kamar ber-AC, air hangat, WiFi cepat, laundry, parkir mobil, keamanan 24 jam. Tenaga maksimum +10, makan hemat 20%, kursus diskon 10% | Tanpa syarat |
| **Numpang di rumah teman** | Rp 175.000 + uang dapur | Kamar tamu di rumah pemain lain | Berteman, dan pemilik memberi izin dan punya kamar kosong |

**Rusunawa dibagi dua.** Pemain berbagi kamar dengan satu pemain lain, atau dengan Mas Bagas (NPC mahasiswa) selama belum ada pemain lain. Rusunawa adalah kebijakan sosial kota: murah, tetapi ada kuota dan syarat, dan pemain yang sudah mapan diminta pindah paling lambat 4 minggu setelah mencapai Tier 3.

**Numpang.** Belum tersedia di awal karena belum ada pemain yang punya rumah. Setelah ada: pemilik rumah menentukan uang dapur 0 sampai Rp 100.000 per minggu, yang berpindah ke pemilik. Keduanya harus berteman. Salah satu boleh mengakhiri dengan pemberitahuan 1 hari. Ini mendorong pertemanan dan memberi alasan memiliki rumah.

## 4. Pekerjaan lulusan SMA dan SMK

Dua puluh tujuh pekerjaan, dibatasi sampai Tier 3. Tanpa gelar, itulah batasnya. Upah per aksi: Tier 1 Rp 12.000, Tier 2 Rp 20.000, Tier 3 Rp 32.000. Syarat Keahlian: 1, 3, dan 6.

**Tier 1 (tanpa Keahlian)**

| Pekerjaan | Tempat | Fase |
|---|---|---|
| Kuli angkut pelabuhan | Gudang Pelabuhan | 0 |
| Tukang ojek pangkalan | Terminal Pelabuhan | 0 |
| Pelayan warung pantai | Warung Pantai | 0 |
| Pramuniaga minimarket | Minimarket | 0 |
| Pelayan kafe | Kafe Dermaga | 0 |
| Petugas kebersihan kota | Balai Kota | 0 |
| Buruh bongkar ikan | TPI | 1 |
| Buruh panggul pasar | Pasar Weton | 1 |
| Juru parkir | Pasar Weton | 1 |

**Tier 2 (Keahlian 3)**

| Pekerjaan | Tempat | Fase |
|---|---|---|
| Admin gudang | Gudang Pelabuhan | 0 |
| Kasir minimarket | Minimarket | 0 |
| Barista | Kafe Dermaga | 0 |
| Pelayan restoran seafood | Restoran Seafood | 0 |
| Montir motor (cocok untuk SMK otomotif) | Bengkel | 0 |
| Sopir angkot | Terminal Pelabuhan | 0 |
| Satpam bank | Bank Weton | 1 |
| Resepsionis hotel (cocok untuk SMK perhotelan) | Hotel Pantai | 1 |
| Operator mesin pabrik (cocok untuk SMK mesin) | Pabrik | terkunci |

**Tier 3 (Keahlian 6)**

| Pekerjaan | Tempat | Fase |
|---|---|---|
| Mandor pelabuhan | Gudang Pelabuhan | 0 |
| Supervisor minimarket | Minimarket | 0 |
| Koki restoran seafood | Restoran Seafood | 0 |
| Kepala bengkel | Bengkel | 0 |
| Staf honorer balai kota | Balai Kota | 0 |
| Staf redaksi junior | Koran Weton | 0 |
| Kepala shift hotel | Hotel Pantai | 1 |
| Juru mudi kapal kecil (cocok untuk SMK pelayaran) | Dermaga | 1 |
| Teknisi pabrik | Pabrik | terkunci |

"Terkunci" berarti terbuka setelah Kawasan Industri dibuka oleh Level Kota.

## 5. Kuliah di Universitas Weton

Kampus berada di Kawasan Kampus dan Kesehatan (rektorat, perpustakaan, dua gedung fakultas). Satu semester sama dengan 7 hari; kehadiran memakai 5 sesi kuliah dengan 20 Tenaga per sesi. UKT dibayar di awal semester. Pemain tetap bisa bekerja dengan sisa Tenaga.

| Jurusan | Jenjang | Semester | UKT per semester | Membuka |
|---|---|---|---|---|
| Keperawatan | D3 | 6 | 600.000 | Perawat |
| Perhotelan dan Pariwisata | D3 | 6 | 600.000 | Manajer hotel |
| Keuangan dan Perbankan | D3 | 6 | 600.000 | Teller dan staf layanan bank |
| Akuntansi | S1 | 8 | 750.000 | Staf kredit bank, pegawai negeri |
| Manajemen | S1 | 8 | 750.000 | Pegawai negeri, manajer produksi |
| Pendidikan | S1 | 8 | 750.000 | Guru, pegawai negeri |
| Ilmu Komunikasi | S1 | 8 | 750.000 | Wartawan, pegawai negeri |
| Perikanan dan Kelautan | S1 | 8 | 900.000 | Penyuluh perikanan, pegawai negeri |
| Teknik Sipil | S1 | 8 | 1.000.000 | Insinyur sipil, pegawai negeri |
| Teknik Industri | S1 | 8 | 1.000.000 | Insinyur industri, manajer produksi |
| Informatika | S1 | 8 | 1.000.000 | Staf teknologi informasi, pegawai negeri |

Gelar D3 membuka **Tier 4** (Rp 42.000 per aksi), gelar S1 membuka **Tier 5** (Rp 54.000 per aksi), keduanya dengan Keahlian 3. "Pegawai negeri Balai Kota" terbuka untuk lulusan S1 jurusan apa pun. Lowongan Teknik Industri baru terbuka setelah Kawasan Industri dibuka. Kedokteran dan jenjang S2 sengaja belum ada.

Pilihan penting bagi pemain: D3 lebih cepat dan murah, S1 lebih lama tetapi akhirnya jauh lebih kaya (hasil simulasi di [EKONOMI.md](EKONOMI.md) bagian 10). Jalur lain tanpa gelar adalah membuka usaha sendiri (Fase 1).

## 6. NPC

Seratus warga NPC mengisi kota. Daftar lengkapnya (nama, umur, peran, tempat kerja dan tinggal, watak) ada di `/warga`.

- **21 NPC interaktif.** Bisa diajak bicara dan membuka fitur game. Masing-masing punya sapaan dan tawaran.
- **79 NPC latar.** Mengisi kota, menjadi bahan Koran Kota, dan nanti menjadi teman bicara saat percakapan diperluas. Sebarannya: pelabuhan 12, pasar 9, pusat kota 17, sekolah dan kampus 13, rumah sakit 5, pantai dan wisata 8, kampung dan perumahan 12, proyek lahan industri 3.
- Nama dan latar mencerminkan kota pelabuhan yang beragam: Jawa, Sunda, Betawi, Madura, Minang, Batak, Bugis, Bali, NTT, Papua, dan Tionghoa-Indonesia.

**NPC interaktif**

| NPC | Peran | Tempat | Fungsi | Fase |
|---|---|---|---|---|
| Mbak Laras Setyowati | Pemandu warga baru | Terminal Pelabuhan | Uang saku, memilih tempat tinggal, tur, misi pertama | 0 |
| Pak Darmo Susilo | Kepala Pelabuhan | Terminal Pelabuhan | Jadwal kapal dan perjalanan antar kota | 3 |
| Bu Marni | Ibu Kost Melati | Kost Melati | Sewa, pindah, tagihan | 0 |
| Mbak Dinda Prameswari | Pengelola Kost Mawar | Kost Mawar | Sewa, pindah, tagihan | 0 |
| Pak Hendra Gunawan | Pengelola Kost Anggrek | Kost Anggrek | Sewa, pindah, tagihan | 0 |
| Pak Suwandi | Petugas Rusunawa | Rusunawa Weton | Pendaftaran, antrean, aturan rusun | 0 |
| Pak Karyo Wibowo | Ketua RT 03 | Kampung Nelayan | Mendaftar ke RT/RW, kerja bakti | 2 |
| Pak Khairul Wianto | Wali Kota Weton | Balai Kota | Proyek gotong royong, Level Kota | 2 |
| Pak Teguh Santoso | Petugas Bursa Kerja | Bursa Kerja | Daftar lowongan | 0 |
| Bu Ratna Dewanti | Kepala BLK | BLK | Kursus Keahlian | 0 |
| Bu Dewi Anggraini | Staf Admisi | Rektorat | Pendaftaran kuliah, UKT, wisuda | 2 |
| Pak Rahmat Hidayat | Customer service bank | Bank Weton | Tabungan, kasbon, pinjaman usaha | 1 |
| Mbok Yem | Pedagang sayur | Pasar Weton | Jual beli dengan pedagang NPC | 1 |
| Pak Jalil Bahari | Juragan perahu senior | TPI | Membuka usaha Perahu Nelayan | 1 |
| Mas Bayu Pratama | Wartawan | Koran Weton | Koran Kota dan wawancara | 0 |
| dr. Sari Kartika | Dokter | RSUD Weton | Memulihkan Tenaga lebih cepat | 2 |
| Pak Sugeng Raharjo | Mandor pelabuhan | Gudang Pelabuhan | Pekerjaan pelabuhan, jalur jadi mandor | 0 |
| Mas Bagas Aditya | Mahasiswa | Rusunawa | Teman sekamar NPC | 0 |
| Kang Ujang Suryana | Sopir angkot | Terminal Pelabuhan | Naik angkot ke tempat lain | 2 |
| Bu Hajjah Fatimah | Ketua PKK | Masjid Agung | Membentuk dan mengikuti arisan | 3 |
| Pak Lukas Mandowen | Pemilik bengkel | Bengkel Motor | Pekerjaan montir dan kepala bengkel | 0 |

## 7. Belum diputuskan

1. Cara percakapan NPC bekerja (pilihan jawaban tetap, atau teks bebas) dan seberapa dalam pada Fase 0.
2. Apakah NPC latar diberi satu kalimat sapaan masing-masing.
3. Apakah Rusunawa menerima pasangan teman yang mendaftar bersama.
4. Bagaimana pemain yang sudah lulus S1 dan memiliki usaha dihitung untuk syarat pindah dari Rusunawa.

## Alur bermain di peta (20 Oktober 2026)

Semua aksi dilakukan dengan mengetuk bangunan di peta; Beranda hanya berisi KTP Kota, info karakter, dan menu yang tidak ada di peta.

- **Pendatang baru.** Setelah mendaftar, pemain langsung masuk tur dari Terminal Pelabuhan bersama Mbak Laras: memilih latar sekolah, memilih tempat tinggal (kamar di gedung pertama yang masih kosong), berkeliling fasilitas, lalu mengambil pekerjaan pertama. Tur berakhir di tempat kerja dengan tombol Kerja.
- **Latar sekolah** (dipilih sekali): SMA (kerja kantor, UKT diskon 25%), SMK Otomotif (bengkel, pabrik otomotif, terminal), SMK Perhotelan (hotel, restoran, kafe, warung), SMK Pelayaran (gudang pelabuhan, TPI, dermaga, kapal). Pekerjaan di tempat yang cocok: upah +15% dan syarat Keahlian 2 lebih rendah.
- **Kamar terbatas per gedung:** Kost Melati 4 kamar, Kost Mawar 6, Kost Anggrek 8, Rusunawa 30 kamar untuk 60 orang, Hotel Pantai 20 kamar untuk 40 orang. Pindah dengan mengetuk gedungnya; berlaku siklus tagihan berikutnya. Wali Kota tidak memakai kamar.
- **Status di peta:** kartu di kiri atas menampilkan nama, uang, Tenaga, Kesehatan, Keahlian, kasbon, dan sisa waktu tagihan; ketuk untuk membuka KTP.
- **Kesehatan** 0 sampai 100: turun 1 tiap aksi kerja, pulih 1 tiap 2 jam. Di bawah 30 pemain sakit dan Tenaga pulih dua kali lebih lambat. RSUD (Rp 350.000) memulihkan Tenaga dan Kesehatan; jamu kunyit asam menambah Kesehatan 10.
- **Aksi per bangunan:** tempat kerja (Kerja), Bursa Kerja (semua lowongan), tiap bangunan (lowongan di sana), BLK (kursus), Balai Kota (bonus harian, beli lahan), RM Padang, Rumah Judi, Bandara, Universitas, Bank (tabungan, kasbon), RSUD, Pasar, Dinas Ekonomi dan TPI (usaha), kost/rusun/hotel (kamar), rumah warga (numpang), Kantor Koran.
