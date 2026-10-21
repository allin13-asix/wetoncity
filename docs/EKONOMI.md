# Loop Ekonomi: Weton City

Status: draf 2, 18 Oktober 2026. Pelengkap [KONSEP.md](KONSEP.md) dan [WARGA.md](WARGA.md).

Semua angka hidup di `src/data/ekonomi.ts`, `hunian.ts`, dan `pendidikan.ts`. Skrip [scripts/sim-ekonomi.ts](../scripts/sim-ekonomi.ts) membaca angka yang sama dan gagal bila maksud desain di dokumen ini terlanggar. Jalankan dengan `pnpm sim`. Tabel hasil di bawah disalin dari keluaran skrip itu.

Cakupan simulasi: kerja, kursus, kuliah, tagihan, pajak, dan bonus harian. Usaha dan pasar (Fase 1) baru berupa rumus dan belum disimulasikan dengan perilaku pemain.

## 1. Tujuan

1. Pemain baru merasakan kemajuan dalam hari pertama.
2. Kemajuan awal cepat, lalu melambat. Tujuan jangka panjang datang dari gelar, usaha, rumah, dan proyek kota.
3. Tidak ada pemain yang jatuh ke lingkaran utang tanpa jalan keluar.
4. Uang yang beredar tidak menggelembung. Setiap uang yang dicetak harus punya jalan keluar.
5. Cukup sederhana untuk dibangun sendirian.

## 2. Satuan dan waktu

- Mata uang: Rupiah (Rp), bilangan bulat.
- Siklus tagihan: 7 hari sejak pemain bergabung, bukan serentak se-kota.
- Waktu nyata. Satu hari game sama dengan satu hari di dunia nyata.
- Dua tipe pemain acuan:
  - **Santai:** satu sesi sehari, memakai 100 Tenaga.
  - **Aktif:** dua sesi sehari, memakai sekitar 200 Tenaga.
- Uang saku awal: **Rp 1.000.000** (bekal dari kampung halaman). Cukup untuk memilih tempat tinggal mana pun tanpa langsung berutang.

## 3. Tenaga

| Parameter | Nilai |
|---|---|
| Batas maksimum | 100 (Kost Anggrek +10) |
| Pemulihan | 10 per jam |
| Biaya satu aksi kerja | 10 |
| Biaya satu kursus | 10 |
| Biaya satu sesi kuliah | 20 |

Nilai disimpan sebagai `tenaga` dan `tenaga_diperbarui_pada`. Saat dibaca: `tenaga_sekarang = min(maksimum, tenaga + jam_berlalu x 10)`. Tidak memakai cron.

## 4. Sumber uang

| Sumber | Keterangan | Fase |
|---|---|---|
| Upah kerja | Utama. Dibayar kota, bukan pemain lain | 0 |
| Bonus harian | Rp 20.000, sekali klaim per hari | 0 |
| Penjualan usaha ke permintaan kota | Hasil usaha yang dibeli warga NPC | 1 |
| Hadiah event | Dibagikan tim pada event kalender | 3 |

Penjualan antarpemain di pasar dan uang dapur bagi yang menumpang hanya memindahkan uang. Keduanya bukan sumber uang.

## 5. Penyedot uang

| Penyedot | Keterangan | Fase |
|---|---|---|
| Biaya hidup mingguan | Sewa, listrik, makan | 0 |
| Pajak penghasilan | Atas upah kerja mingguan | 0 |
| Kursus Keahlian | Biaya naik berlipat | 0 |
| UKT kuliah | Per semester | 2 |
| Modal dan upgrade usaha | Biaya naik berlipat, hasil naik lebih pelan | 1 |
| Biaya lapak pasar | 5% dari harga jual, dibayar penjual | 1 |
| Bahan operasional dari NPC | Misalnya solar perahu | 1 |
| Bunga kasbon | 10% per minggu | 0 |
| Makan di RM Padang | Rp 50.000 untuk 10 Tenaga, dua kali sehari; di atas nilai upah 10 Tenaga untuk SMA/SMK | 0 |
| Rumah Judi Mujur | Peluang menang 45%, menang dibayar dua kali: rata-rata rugi 10% per taruhan | 0 |
| Sumbangan proyek gotong royong | Sukarela, diganjar Reputasi | 2 |
| Kavling dan rumah | Pembelian besar, tujuan jangka panjang | 2 |

## 6. Kerja

Satu aksi kerja memakai 10 Tenaga dan menghasilkan `10 x tarif per Tenaga x pengali Keahlian`.

| Tier | Ijazah | Keahlian | Upah per Tenaga | Upah per aksi |
|---|---|---|---|---|
| 1 | SMA/SMK | 1 | 1.200 | 12.000 |
| 2 | SMA/SMK | 3 | 2.000 | 20.000 |
| 3 | SMA/SMK | 6 | 3.200 | 32.000 |
| 4 | D3 | 3 | 4.200 | 42.000 |
| 5 | S1 | 3 | 5.400 | 54.000 |

- Lulusan SMA/SMK tanpa gelar mentok di Tier 3. Daftar pekerjaannya (61, termasuk PNS Dinas Kota, polisi, TNI, damkar, dan tiga pabrik besar) ada di `src/data/pekerjaan.ts` dan halaman `/panduan`.
- Gelar menggantikan pengalaman: D3 dan S1 hanya butuh Keahlian 3.
- **Pengali Keahlian:** level di atas 6 menambah upah 4% per level (maksimum +16% di level 10). Ini alasan kursus level 7 sampai 10 tetap berguna dan sekaligus menyedot uang jangka panjang.
- Pekerjaan industri (operator mesin, teknisi, insinyur industri, manajer produksi) baru terbuka setelah Kawasan Industri dibuka oleh Level Kota.

Variasi acak ±10% pada upah per aksi boleh ditambahkan untuk rasa, selama rata-ratanya tetap. Belum dimasukkan.

## 7. Keahlian dan kursus

Satu nilai Keahlian umum (level 1 sampai 10). Kursus naik satu level, memakan 10 Tenaga dan biaya:

`biaya(n -> n+1) = bulatkan_ke_ribuan(100.000 x 1,7^(n-1))`

| Level | 1>2 | 2>3 | 3>4 | 4>5 | 5>6 | 6>7 | 7>8 | 8>9 | 9>10 |
|---|---|---|---|---|---|---|---|---|---|
| Rp | 100.000 | 170.000 | 289.000 | 491.000 | 835.000 | 1.420.000 | 2.414.000 | 4.103.000 | 6.976.000 |

Total sampai level 3: Rp 270.000. Sampai level 6: sekitar Rp 1,9 juta. Sampai level 10: sekitar Rp 16,8 juta. Hunian dengan WiFi (Kost Mawar dan Anggrek) memberi diskon kursus 10%.

## 8. Tempat tinggal

Pilihan, biaya mingguan (angka lama; lihat bagian 19 untuk angka bulanan yang berlaku), dan perilakunya. Detail alur ada di [WARGA.md](WARGA.md).

| Pilihan | Sewa | Listrik | Makan | Total per minggu | Efek |
|---|---|---|---|---|---|
| Rusunawa Weton (dibagi 2) | 120.000 | 20.000 | 175.000 | **315.000** | Bersubsidi, ada syarat dan kuota |
| Kost Melati (Level 1) | 280.000 | 35.000 | 175.000 | **490.000** | Tanpa efek |
| Kost Mawar (Level 2) | 520.000 | 50.000 | 140.000 | **710.000** | Makan hemat 20%, kursus diskon 10% |
| Kost Anggrek (Level 3) | 980.000 | 90.000 | 140.000 | **1.210.000** | Tenaga maks +10, makan hemat 20%, kursus diskon 10% |
| Numpang di rumah teman | 0 | 0 | 175.000 | **175.000 + uang dapur (0 sampai 100.000)** | Fase 2, butuh pemilik rumah |

Hasil simulasi, uang saku Rp 1.000.000, tanpa kasbon pada semua pilihan:

| Tempat tinggal | Santai: Tier 2 / Tier 3 | Aktif: Tier 2 / Tier 3 |
|---|---|---|
| Rusunawa | hari 1 / hari 7 | hari 1 / hari 4 |
| Kost Melati | hari 1 / hari 10 | hari 1 / hari 5 |
| Kost Mawar | hari 1 / hari 11 | hari 1 / hari 5 |
| Kost Anggrek | hari 4 / hari 21 | hari 3 / hari 7 |

Bacaannya: kost mahal tidak menjebak pemain, tetapi memperlambat kemajuan, karena uang yang dipakai kursus tersisa lebih sedikit. Itu pilihan gaya hidup yang sengaja diberi harga, bukan pilihan yang salah.

**Aturan Rusunawa.** Kuota 80 warga (40 kamar). Syarat: belum punya properti dan masih Tier 2 ke bawah. Wajib pindah paling lambat 4 minggu setelah mencapai Tier 3. Selama belum ada pemain lain, teman sekamar adalah Mas Bagas (NPC).

**Aturan numpang.** Pemilik rumah harus berteman dengan penumpang dan memberi izin, serta punya kamar kosong. Kamar bertambah seiring tingkat rumah. Uang dapur ditetapkan pemilik antara 0 dan Rp 100.000 per minggu dan berpindah ke pemilik. Salah satu pihak boleh mengakhiri dengan pemberitahuan 1 hari. Pilihan ini baru muncul setelah ada pemain yang memiliki rumah.

**Pindah.** Boleh pindah kapan saja; berlaku mulai siklus berikutnya. Tagihan siklus berjalan memakai tarif lama.

## 9. Biaya hidup, pajak, kasbon

- Tagihan mingguan = sewa + listrik + makan, ditambah pajak penghasilan.
- **Pajak penghasilan** bertingkat atas total upah kerja satu siklus: sampai Rp 1.000.000 nol persen, Rp 1.000.000 sampai Rp 3.000.000 lima persen, di atasnya sepuluh persen. Contoh: upah Rp 2.000.000 berarti pajak Rp 50.000.
- Kas tidak pernah negatif. Bila kas kurang, selisih menjadi **kasbon warung** dengan bunga 10% per minggu atas kasbon yang masih berjalan, dihitung tiap kali tagihan ditagih.
- **Kasbon macet:** kasbon di atas Rp 1.000.000 (ambang, bukan plafon) atau belum lunas lebih dari 7 hari. Selama macet, pemulihan Tenaga dua kali lebih lambat sampai lunas. Tidak ada game over.
- Kasbon dilunasi dengan tombol "Bayar kasbon" sebesar yang mampu; tidak ada pelunasan otomatis.
- Pembayaran tagihan mendahulukan sewa, listrik, dan makan, baru pajak.
- **Tradisi mudik:** bila pemain lama tidak masuk, hanya maksimal 2 siklus tagihan yang ditagih saat ia kembali. Sisanya dihapus.

## 10. Kuliah di Universitas Weton

Satu semester sama dengan satu siklus (7 hari). UKT dibayar di awal semester. Kehadiran memakai 5 sesi kuliah per semester, masing-masing 20 Tenaga (total 100 per semester), jadi pemain tetap bisa bekerja dengan sisa Tenaga. Gelar membuka Tier 4 (D3) atau Tier 5 (S1).

| Jenjang | Semester | UKT per semester | Total UKT | Jurusan |
|---|---|---|---|---|
| D3 | 6 | 600.000 | 3.600.000 | Keperawatan, Perhotelan dan Pariwisata, Keuangan dan Perbankan |
| S1 | 8 | 750.000 | 6.000.000 | Akuntansi, Manajemen, Pendidikan, Ilmu Komunikasi |
| S1 | 8 | 900.000 | 7.200.000 | Perikanan dan Kelautan |
| S1 | 8 | 1.000.000 | 8.000.000 | Teknik Sipil, Teknik Industri, Informatika |

Hasil simulasi (Kost Melati, mulai kuliah di hari ke-8, kas dalam juta rupiah):

| Pemain | Lulus (hari) | Kas hari 90 | Kas hari 180 | Kas hari 360 |
|---|---|---|---|---|
| Santai, kerja saja | - | 9,5 | 37,3 | 92,9 |
| Santai, D3 Keperawatan | 51 | 7,1 | 44,5 | 119,4 |
| Santai, S1 Akuntansi | 66 | 5,2 | 53,9 | 151,3 |
| Santai, S1 Teknik Sipil | 68 | 2,8 | 51,5 | 148,9 |
| Aktif, kerja saja | - | 40,4 | 98,5 | 214,6 |
| Aktif, D3 Keperawatan | 49 | 43,4 | 120,3 | 274,0 |
| Aktif, S1 Akuntansi | 63 | 44,5 | 143,9 | 342,7 |
| Aktif, S1 Teknik Sipil | 63 | 42,4 | 141,8 | 340,6 |

- Kuliah menekan kas sementara (kas hari 90 lebih rendah), lalu menyusul kerja saja pada hari 72 sampai 86.
- D3 lebih cepat dan murah. S1 lebih lambat tetapi menyusul D3 pada hari 79 (santai) sampai 86 (aktif) dan unggul jauh setelahnya. Setelah setahun, S1 sekitar 60% lebih kaya daripada kerja saja, D3 sekitar 28%.
- Tidak ada pemain yang berutang karena kuliah.

## 11. Usaha (Fase 1, titik awal)

Setiap usaha berproduksi sendiri per siklus 4 jam, menyimpan maksimal 6 siklus (24 jam), dan harus "diambil" oleh pemain (aksi kecil, sekitar 5 Tenaga). Ini alasan pemain kembali sekali sehari.

| Usaha | Modal | Hasil per siklus | Bahan per siklus | Laba per hari | Balik modal |
|---|---|---|---|---|---|
| Perahu nelayan | 3.000.000 | 2 kg ikan (60.000) | solar 20.000 | 240.000 | 12,5 hari |
| Warung makan | 4.000.000 | 20 porsi (80.000) | 1 kg ikan + 1 kg beras (45.000) | 210.000 | 19 hari |

Pada harga ekstrem pasar, balik modal bisa 23 sampai 31 hari. Rantai pasokan: perahu menghasilkan ikan yang dibeli warung.

**Upgrade (level n ke n+1):** biaya `0,6 x modal x 1,8^(n-1)`, hasil bruto `hasil dasar x 1,25^(n-1)`.

| Perubahan | Perahu: biaya (balik modal) | Warung: biaya (balik modal) |
|---|---|---|
| 1 ke 2 | 1.800.000 (20 hari) | 2.400.000 (20 hari) |
| 2 ke 3 | 3.240.000 (29 hari) | 4.320.000 (29 hari) |
| 3 ke 4 | 5.832.000 (41 hari) | 7.776.000 (41 hari) |
| 4 ke 5 | 10.498.000 (60 hari) | 13.997.000 (60 hari) |

**Batas dan permintaan:** slot usaha 1 (Warga), 2 (Juragan), 3 (Tokoh Kota). Penjualan ke kota per siklus per usaha: `min(hasil, permintaan_kota / jumlah_usaha_sejenis)`, dengan `permintaan_kota = basis x (1 + 0,25 x (LevelKota - 1))`.

## 12. Pasar (Fase 1, titik awal)

Barang awal dan harga dasar per kg: ikan 30.000, beras 15.000.

- Pedagang NPC selalu **membeli di 70%** dan **menjual di 130%** harga dasar. Harga pasar pemain bergerak di dalam pita itu.
- Harga diperbarui tiap jam: `harga' = harga x (1 + 0,10 x (D - S) / (D + S + 1)) + 0,05 x (dasar - harga)`, dijepit ke 70% sampai 130% dari harga dasar.
- Biaya lapak 5% dari penjualan, dibayar penjual.
- Ide lanjutan: **hari pasaran.** Pasar Weton mengikuti siklus lima harian Jawa (Legi, Pahing, Pon, Wage, Kliwon) dengan komoditas yang berganti diskon, dan weton setiap warga ditentukan dari tanggal bergabungnya.

## 13. Perkembangan kota dan sink kekayaan

- **Proyek gotong royong** adalah penyedot kekayaan utama. Biaya proyek mengikuti uang yang beredar: `biaya_proyek ~ 4% x total kas warga yang aktif dalam 14 hari terakhir`, dihitung saat proyek dimulai.
- Level Kota membuka bangunan, zona, event, dan menaikkan permintaan kota.
- Level Kota tertentu membuka **Kawasan Industri** dan pekerjaan industri. Biaya hidup kota ikut naik.

## 14. Temuan yang harus diselesaikan sebelum Fase 2

Pemain aktif yang hanya bekerja dan membayar biaya hidup menumpuk uang dengan sangat cepat:

| | Kas hari 90 | Kas hari 180 | Kas hari 360 | Sink per faucet (360 hari) |
|---|---|---|---|---|
| Aktif, kerja saja | 40,4 jt | 98,5 jt | 214,6 jt | 0,21 |
| Santai, kerja saja | 9,5 jt | 37,3 jt | 92,9 jt | 0,33 |

Untuk menahan rasio di sekitar 0,85, pemain aktif harus menyerap sekitar **Rp 173 juta per tahun** lewat sink kekayaan. Karena usaha juga menambah faucet, kebutuhan sebenarnya lebih besar. Sink kekayaan yang diusulkan, semuanya belum disimulasikan:

| Sink | Perkiraan | Catatan |
|---|---|---|
| Kavling dan rumah sendiri | Rp 60 juta + Rp 150 juta | Tujuan jangka panjang; membuka numpang dan kamar tamu |
| Upgrade usaha sampai level 5 | Rp 21 juta (perahu) dan Rp 28 juta (warung) | Sudah ada rumusnya |
| Kursus level 7 sampai 10 | Rp 14,9 juta | Sudah ada, diberi hadiah +4% upah per level |
| Proyek gotong royong | 4% kas warga aktif per proyek | Menyesuaikan diri dengan uang beredar |
| Kendaraan dan barang status | Rp 15 juta sampai Rp 120 juta | Fase 3, kosmetik |
| Pajak bumi dan bangunan | Persentase nilai rumah per tahun | Menyedot tanpa menghukum yang aktif |

Aturan kerja: sebelum Fase 2 dibuka, simulasi harus diperluas agar rasio sink per faucet untuk pemain aktif berada di 0,75 sampai 0,95 pada hari ke-360, dengan usaha dan rumah ikut dihitung.

## 15. Pencatatan (ledger)

Setiap perubahan saldo adalah satu baris ledger dengan `jenis`, bukan sekadar mengubah angka kas.

- **Faucet:** `upah`, `bonus_harian`, `usaha_penjualan`, `hadiah_event`
- **Sink:** `tagihan_hidup`, `pajak`, `kursus`, `ukt`, `modal_usaha`, `upgrade_usaha`, `biaya_pasar`, `bahan_npc`, `bunga_kasbon`, `sumbangan_proyek`, `rumah`
- **Transfer:** `jual_beli_pasar`, `uang_dapur`

Aturan teknis:

- Semua perubahan lewat satu fungsi, dalam satu transaksi, dengan row lock pada baris pemain.
- Kolom kas punya `CHECK (kas >= 0)`.
- Setiap aksi membawa `idempotency_key`. Di ponsel, tombol sering terketuk dua kali.
- Rasio sink per faucet dihitung langsung dari kolom `jenis`.

## 16. Tuas penyetel dan pemantauan

Pantau mingguan, dari ledger:

| Metrik | Target | Bila di luar target |
|---|---|---|
| Rasio sink per faucet (semua pemain aktif) | 0,80 sampai 0,95 | di bawah 0,75: naikkan biaya hidup, pajak, atau biaya proyek. Di atas 1,0: turunkan |
| Persentase pemain berkasbon | di bawah 5% | naikkan upah Tier 1 atau turunkan biaya hidup |
| Waktu ke Tier 3 (santai) | 7 sampai 14 hari | sesuaikan faktor kursus |
| Median kas pemain aktif | naik pelan, tidak melonjak | periksa faucet baru |
| Persentase pemain berkuliah yang lulus | di atas 60% | turunkan UKT atau sesi kuliah |

Tuas yang boleh diubah tanpa mengubah kode: tarif upah per Tenaga, biaya hidup, faktor kursus, tarif pajak, UKT, biaya lapak, persentase biaya proyek, faktor upgrade, basis permintaan kota. Simpan di satu tabel konfigurasi, bukan di kode.

## 17. Belum diputuskan

1. Apakah upah kerja punya variasi acak, dan seberapa besar.
2. Apakah Keahlian dibuat per bidang (pelabuhan, dagang, kantor), atau tetap satu nilai.
3. Daftar barang pasar lengkap dan harga dasarnya.
4. Bonus untuk pemain yang kembali setelah mudik.
5. Ambang Level Kota untuk membuka Kawasan Industri.
6. Harga kavling dan rumah, dan apakah ada KPR.

## 18. Putaran simulasi fitur kota (20 Oktober 2026)

`pnpm sim` kini ikut menghitung perjalanan, usaha, rumah sendiri, dan tabungan untuk pemain aktif. Pasar antarwarga dan numpang hanya memindahkan uang antarwarga, jadi tidak dihitung sebagai faucet.

- **Soloe** semula untung Rp 300.000 per 8 jam tanpa Tenaga dan bisa diulang tiga kali sehari. Hasil diturunkan ke Rp 530.000 (untung Rp 80.000) dan penerbangan dibatasi sekali per tanggal WIB.
- **Jakarte** (Rp 2.000.000, Keahlian +1) lebih murah daripada kursus mulai Keahlian 8. Kini hanya untuk Keahlian di bawah 6.
- **Culabaya** tidak pernah lebih untung daripada kerja aktif sehari di tier mana pun.
- **Usaha masih terlalu kuat.** Pemain aktif yang membuka perahu dan warung lalu menaikkannya ke level 5 punya sekitar Rp 680 juta setelah setahun, dibanding Rp 215 juta bila hanya bekerja. Laba level 5 per hari: perahu sekitar Rp 759.000, warung sekitar Rp 902.000. Rasio sink per faucet turun ke 0,15. Sebelum usaha dibuka luas perlu salah satu: batas permintaan kota (bagian 11), biaya perawatan mingguan per level, atau kenaikan biaya upgrade yang lebih curam. Simulasi mencetak peringatan ini sampai diperbaiki.

## 19. UMK, gaji bulanan, dan barang (20 Oktober 2026)

Bagian ini menggantikan angka mingguan di bagian 3 sampai 5. Angka di kode adalah sumber kebenaran (`src/data/ekonomi.ts`, `src/data/hunian.ts`, `src/server/aturan.ts`).

**Waktu kota.** Satu siklus tagihan (7 hari nyata) dihitung sebagai satu bulan kota. Gaji, sewa, listrik, makan, pajak, dan uang dapur semuanya per bulan kota.

**UMK.** Upah minimum kota awal Rp 2.500.000 per bulan, disimpan di tabel `kota`. Gaji sebulan sebuah pekerjaan = UMK x koefisien tiernya: Tier 1 x1 (tepat UMK), Tier 2 x1,4, Tier 3 x2, Tier 4 x3, Tier 5 x4. Kerja penuh sebulan adalah 70 aksi (satu sesi sehari, 10 aksi, selama 7 hari), jadi upah satu aksi = gaji sebulan / 70, dikali bonus Keahlian di atas level 6. Pemain aktif yang bekerja dua sesi sehari mendapat sekitar dua kali gaji.

**Kebijakan Wali Kota.** UMK hanya berubah lewat penetapan Wali Kota di Kantor Wali Kota, paling sering sekali per 7 hari. Rekomendasi = UMK x (1 + tren), dengan tren = pertumbuhan total upah warga 7 hari terakhir dibanding 7 hari sebelumnya, dijepit -5% sampai +8%. Penetapan harus dalam 5% dari rekomendasi, kelipatan Rp 10.000, dan dicatat di `kebijakan_umk` beserta alasannya.

**Biaya hidup bulanan** (pada UMK awal). Harga hidup ikut UMK sebagian: indeks harga = 0,6 + 0,4 x UMK / UMK awal, berlaku untuk sewa, listrik, makan, dan harga pasar.

| Hunian | Sewa | Listrik | Makan (30 hari) | Total | Terhadap UMK |
|---|---|---|---|---|---|
| Rusunawa (dibagi 2) | 150.000 | 40.000 | 750.000 | 940.000 | 38% |
| Kost Melati | 450.000 | 60.000 | 750.000 | 1.260.000 | 50% |
| Kost Mawar | 750.000 | 90.000 | 600.000 | 1.440.000 | 58% |
| Kost Anggrek | 980.000 | 150.000 | 600.000 | 1.730.000 | 69% |
| Rumah sendiri | 0 | 120.000 | 600.000 | 720.000 | 29% |

**Pajak penghasilan bulanan:** 0% sampai Rp 4,5 juta, 5% sampai Rp 10 juta, 15% di atasnya. **Kasbon macet** bila di atas Rp 2,5 juta atau lebih tua dari satu siklus. **Uang dapur** numpang paling banyak Rp 300.000 per bulan. **Culabaya** kini setara 24 aksi (satu hari kerja aktif).

**Barang.** Lima belas barang di Pasar Weton, semuanya bisa dibeli dari dan dijual ke pedagang NPC (130% dan 70% harga dasar) serta diperdagangkan di lapak warga:

- Bahan: ikan, beras (dipakai usaha).
- Konsumsi, menambah Tenaga, paling banyak tiga kali per tanggal WIB: es teh (+3), pisang goreng (+4), kopi tubruk (+5), jamu kunyit asam (+8), nasi bungkus (+10). Harga per poin Tenaga sekitar Rp 4.500 sampai Rp 5.000 di NPC, di atas nilai Tenaga untuk Tier 1 dan 2, jadi baru menguntungkan bagi pekerja Tier 3 ke atas.
- Koleksi, tanpa efek: perangko lawas, miniatur Monaz, batik tulis Soloe, kerang mutiara, wayang kulit, keris miniatur, akik bacan, lukisan Pelabuhan Weton. Batik kadang dibawa pulang dari Soloe (25%), Monaz dari Jakarte (30%), kerang mutiara terjaring perahu (3% per siklus).

**Hasil simulasi.** Biaya hidup kini masuk akal terhadap UMK (Tier 1 santai menghabiskan sekitar separuh gaji untuk kost dan makan). Karena satu bulan kota hanya 7 hari nyata, pemain yang naik tier menabung sangat cepat: pemain aktif kerja saja punya sekitar Rp 490 juta setelah setahun nyata, dan rasio sink per faucet sekitar 0,18. Usaha tetap melipatgandakan kekayaan (bagian 18). Sink kekayaan Fase 2 makin dibutuhkan.
