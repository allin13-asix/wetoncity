# Kota Weton: tata letak dan aset

Status: draf 2, 19 Oktober 2026 (tata letak dibangun ulang). Pelengkap [KONSEP.md](KONSEP.md). Semua yang dijelaskan di sini sudah berjalan di situs prototipe (`pnpm dev`, port 3600).

## 1. Gambaran

Weton City ditampilkan sebagai diorama 3D low-poly yang dilihat dari atas miring. Laut di sisi utara (bagian atas layar), kota di selatannya. Pemain tidak berjalan di peta: peta dipakai untuk membaca kota, memilih tempat, dan mengikuti tur. Ketuk bangunan untuk melihat fungsi, pekerjaan, warga, dan biayanya.

Halaman situs:

| Halaman | Isi |
|---|---|
| `/` | Peta kota: geser, zoom, putar 90 derajat, pilih waktu (pagi, siang, sore, malam), daftar tempat, dan tur pemain baru |
| `/galeri` | Galeri aset: lihat tiap model berputar, lembar semua model, unduh `.glb` |
| `/warga` | 100 NPC dengan pencarian dan filter "bisa diajak bicara" |
| `/panduan` | Alur pemain baru, tempat tinggal, pekerjaan, kuliah, dan fasilitas utama |

Peta menerima `?tur=1` (mulai tur) dan `?fokus=<id>` (terbang ke satu bangunan, misalnya `?fokus=balai-kota`).

## 2. Koordinat dan satuan

- Peta 168 x 124 petak (diperbesar 20 Oktober 2026). Satu petak kira-kira 3 meter.
- Sumbu x ke timur, sumbu z ke selatan, y ke atas. Utara (z kecil) adalah laut.
- Garis pantai berkelok: teluk pelabuhan di barat (z sekitar 10), lalu menipis ke tanjung di timur tempat mercusuar berdiri (z sekitar 4).
- Bangunan menghadap selatan (+z) pada rotasi 0, timur pada 90, utara pada 180, barat pada 270. Karena jalan melengkung, rotasi boleh sudut berapa pun.

## 3. Jalan, sungai, dan cara bangunan diletakkan

Jalan berupa garis lengkung (titik kendali dihaluskan), bukan kotak-kotak:

| Jalan | Bentuk | Lebar |
|---|---|---|
| Jalan Pantai | menyusuri pantai dari barat ke timur | 2,6 |
| Jalan Raya Weton | diagonal melengkung dari pelabuhan ke alun-alun, menyeberang Kali Sekar | 3,2 |
| Jalan Alun-Alun | persegi bersudut bulat mengelilingi alun-alun | 2,6 |
| Jalan Kampus | dari alun-alun ke timur laut | 3 |
| Jalan Sekar | dari alun-alun ke barat, menyeberang Kali Sekar | 2,4 |
| Jalan Nelayan | gang berkelok di kampung nelayan | 2 |
| Jalan Weton Indah dan Jalan Kenanga | masuk perumahan di selatan | 2,2 |
| Jalan Merdeka | dari Jalan Pantai lurus ke selatan sampai Jalan Raya, poros kantor layanan | 2,6 |
| Gang Kenari | gang sempit ke selatan dari Jalan Sekar | 1,8 |
| Jalan Industri | dari Jalan Kampus ke selatan sampai tepi peta | 2,6 |
| Jalan Lingkar Kampus | jalan kecil melingkar di dalam kompleks Universitas Weton | 1,8 |
| Jalan Pabrik | poros kawasan industri, semua pabrik di sini | 2,8 |
| Jalan Bandara | ke Bandara Weton di tenggara | 3 |
| Jalan Cempaka dan Jalan Flamboyan | jalan baru di selatan, penuh tanah kavling | 2,2 sampai 2,4 |

**Kali Sekar** mengalir dari tepi selatan ke laut dan membelah kota barat dan timur. Tiga jembatan berpagar dihitung otomatis di tempat jalan melintasinya.

**Bangunan tidak ditaruh tangan.** Di `src/data/tataletak.ts`, tiap deret menyebut jalan, sisi (kiri atau kanan searah titik jalan), titik mulai (`mulai` atau `dekat: [x, z]`), dan urutan isi. Mesin penempatan meletakkan isi satu per satu di tepi jalan dengan **muka menghadap jalan**, lalu bergeser bila menabrak persimpangan, sungai, laut, atau bangunan lain. Isi bisa berupa id bangunan, `lahan:L:D` untuk lahan kosong, atau `_:N` untuk jeda. Hanya benda di air (dermaga, kapal, perahu), alun-alun, dan mercusuar yang ditaruh tangan.

`pnpm cek` memastikan: tidak ada isi yang gagal mendapat tempat, tidak ada yang menabrak jalan, sungai, atau laut, jarak antarbangunan minimal 1,4 petak, dan muka setiap bangunan (kecuali alun-alun dan mercusuar) berada paling jauh 3,6 petak dari jalan terdekat dan menghadap ke jalan itu.

**Editor tata letak (Wali Kota).** Halaman `/editor` (tautan di Kantor Wali Kota, hanya di server pengembangan) menampilkan peta 2D. Bangunan dan lahan bisa diseret, diputar, dihadapkan dan ditempel ke jalan terdekat, ditambah, atau dihapus; titik kendali jalan bisa diseret, jalan baru dibuat dengan mengeklik titik. Benda yang menabrak jalan, sungai, laut, atau benda lain ditandai merah. Simpan menulis `src/data/tataletak-kustom.ts`, yang lalu menggantikan tata letak otomatis untuk semua pemain setelah di-commit; "Kembali ke otomatis" mengisinya null. Pohon, semak, dan lampu selalu disusun ulang dari jalan. Panel Bangunan berisi kartu tiap jenis bangunan yang bisa diseret ke peta. Panel Slot menyimpan sampai enam rancangan di `db/tataletak-slot.json` tanpa mengubah peta; "Terapkan ke peta" baru menulis tata letak aktif. "Mulai dari nol" mengosongkan editor (bisa diurungkan).

## 4. Distrik dan isinya

| Distrik | Letak | Isi |
|---|---|---|
| Pelabuhan Weton | teluk barat, utara Jalan Pantai | Terminal, TPI, dua gudang, dua dermaga, KM Segara Mulia, perahu nelayan; lapangan peti kemas di seberang muara Kali Sekar |
| Pantai Weton | pesisir timur sampai tanjung | Empat warung pantai, restoran seafood, Hotel Pantai, Mercusuar |
| Kampung Nelayan | barat, sepanjang Jalan Nelayan | Rumah panggung, SMA Negeri 1, SMK Negeri 1 |
| Koridor Jalan Raya | sepanjang Jalan Raya Weton dan Jalan Pantai | Bursa Kerja dan BLK dekat pelabuhan (tempat pertama yang dicari pendatang), kafe, bengkel, Rumah Makan Padang Uda Fadli |
| Kawasan Merdeka | Jalan Merdeka dan Jalan Pantai | Polsek Weton, Markas Kodim, Pemadam Kebakaran, Dinas Masyarakat, Dinas Pendidikan, Dinas Ekonomi |
| Pusat Kota | pedalaman, jauh dari pelabuhan | Alun-alun dengan sepasang beringin; Balai Kota di selatan menghadap utara, Masjid Agung di barat menghadap timur, Pasar Weton di utara, Bank dan Koran di timur, Dinas Kepegawaian di Jalan Weton Indah |
| Kawasan Kampus dan Kesehatan | Jalan Kampus | Rektorat, perpustakaan, dua gedung fakultas, RSUD Weton |
| Kampung Kost Sekar | Jalan Sekar dan Gang Kenari | Dua Kost Melati, dua Kost Mawar, Alpa Maret dan Indo April yang bersebelahan, Rumah Judi Mujur dan kompleks Gang Kenari (bekas lokalisasi) di gang |
| Perumahan Weton Indah | selatan alun-alun, Jalan Kenanga | Dua Rusunawa, Kost Anggrek, rumah warga, empat kavling, Minimarket Sinar |
| Kawasan Industri | tenggara, Jalan Industri, dan pesisir timur | Pabrik Otomotif Weton Motor, Pabrik Garmen Sekar Busana, Pabrik Makanan dan Minuman Segara Rasa (beroperasi), pabrik dan gudang industri cadangan (transparan karena terkunci), papan proyek |

Tata letak Pusat Kota mengikuti pola kota Jawa: alun-alun di tengah, pusat pemerintahan di selatan, masjid di barat, pasar di utara.

**Lahan kosong.** Empat petak berpatok tersisa setelah bangunan layanan dan pabrik ditambahkan, ditambah lahan hijau terbuka di tengah kota. Semula tiga belas petak di tepi jalan (tanah kering berpatok dan berpapan) sengaja dibiarkan kosong sebagai cadangan usaha dan rumah warga di fase berikutnya. Sebagian besar ada di sepanjang Jalan Pantai timur, koridor Jalan Raya, Jalan Sekar, perumahan, dan kawasan industri.

Jumlah: 52 jenis bangunan, 81 penempatan, 37 lahan kosong berpatok (bisa dibeli pemain), ditambah pohon, semak, lampu jalan, dan lima kendaraan (rute kota lewat Jalan Raya dan alun-alun, rute pantai pulang pergi).

## 5. Bangunan utama fasilitas kota

Tujuh belas bangunan bertanda "utama". Merekalah yang diberi label di peta saat dizoom dan yang dibahas dalam tur.

| Bangunan | Fungsi di game | Fase |
|---|---|---|
| Terminal Pelabuhan Weton | Pintu kedatangan, pemandu, uang saku, pangkalan ojek dan angkot | 0 |
| TPI | Lelang ikan, kerja buruh ikan, usaha Perahu Nelayan | 1 |
| Mercusuar Weton | Landmark, latar foto KTP Kota | 0 |
| Balai Kota Weton | KTP Kota, RT/RW, proyek gotong royong, Level Kota | 0 dan 2 |
| Bursa Kerja Weton | Lowongan sesuai ijazah, misi pertama | 0 |
| Balai Latihan Kerja (BLK) | Kursus Keahlian level 1 sampai 10 | 0 |
| Kantor Koran Weton | Koran Kota, kerja wartawan | 0 |
| Bank Weton | Tabungan, kasbon, pinjaman usaha | 1 |
| Pasar Weton | Jual beli antarwarga dan pedagang NPC | 1 |
| Universitas Weton (Rektorat) | Pendaftaran kuliah, UKT, wisuda | 2 |
| RSUD Weton | Pemulihan Tenaga cepat, kerja perawat | 2 |
| Kost Melati, Mawar, Anggrek | Tiga level kost | 0 |
| Rusunawa Weton | Hunian bersubsidi dibagi dua warga | 0 |
| Masjid Agung Weton | Landmark, kegiatan warga | 3 |
| Alun-Alun Weton | Event kota: 17-an, pasar malam, malam takbiran | 3 |

Daftar lengkap bersama fungsinya ada di `src/data/bangunan.ts` dan tampil di panel info peta.

## 6. Aset 3D

Semua model dirakit dari kode, tanpa Blender dan tanpa berkas gambar.

- `src/aset/rakit.ts` menyediakan perakit: kotak, silinder, kerucut, kubah, atap pelana dan perisai, haluan kapal, dan baris jendela. Semua bagian digabung menjadi **satu geometri berwarna per titik**, jadi satu bangunan sama dengan satu draw call.
- Model dikelompokkan di `model-pelabuhan.ts`, `model-kota.ts`, `model-hunian.ts`, `model-usaha.ts`, dan `model-hiasan.ts`. `palet.ts` memuat warna bersama supaya semuanya terasa satu keluarga.
- Ukuran model mengikuti ukuran di katalog (`ukuran` pada `src/data/bangunan.ts`). `pnpm aset` mengukur model sebenarnya dan gagal bila ada yang keluar dari petaknya lebih dari 0,8 petak.
- Galeri aset mengekspor tiap model ke `.glb` di browser, jadi aset bisa dipakai di Blender, Unity, atau tempat lain.

Anggaran beban (dari `pnpm aset`): seluruh kota sekitar 73.000 segitiga. Bangunan 24.400 segitiga dalam 65 mesh; pohon, semak, dan lampu memakai instancing. Masih ringan untuk ponsel kelas menengah. Pencahayaan memakai material Lambert tanpa bayangan nyata.

Model yang tersedia: 38 jenis bangunan (pelabuhan, layanan kota, ekonomi, pendidikan, kesehatan, hunian, ruang publik, industri) dan 7 hiasan (pohon kelapa, pohon trembesi, semak, lampu jalan, payung pantai, angkot, mobil).

## 7. Tampilan peta

- **Kamera:** ortografik miring (elevasi 32 derajat). Geser dengan satu jari atau tetikus, zoom dengan cubit atau roda. Kamera tidak keluar dari peta. Tombol putar memutar 90 derajat.
- **Waktu:** pagi, siang, sore, malam. Pembukaan pertama mengikuti jam WIB. Cahaya, warna langit, dan warna laut berpindah halus.
- **Laut:** blok air dengan riak yang bergeser pelan. Kapal dan perahu bergoyang. Pengguna dengan pengaturan "kurangi gerakan" melihat laut diam.
- **Label:** nama distrik (kuning) muncul saat peta dilihat utuh. Nama bangunan utama muncul saat dizoom. Bangunan terpilih selalu berlabel, ditandai bingkai kuning dan pin yang melayang.
- **Tur:** 13 langkah bersama Mbak Laras: sambutan, memilih tempat tinggal (kartu karcis dengan biaya mingguan), sepuluh fasilitas, lalu misi pertama mencari kerja. Detailnya di [WARGA.md](WARGA.md).
- **Ponsel:** panel info naik dari bawah, kamera menggeser bangunan terpilih ke bagian layar yang tidak tertutup panel. Pada layar sempit peta dibuka lebih dekat daripada tampilan utuh.

## 8. Menambah bangunan baru

1. Tambah entri di `katalog` pada `src/data/bangunan.ts`: id, nama, kategori, `model`, `ukuran`, fase, ringkasan, dan fungsi.
2. Tulis pembuat modelnya di salah satu berkas `src/aset/model-*.ts`. Pusat bangunan di (0, 0), dasar di y = 0, depan menghadap +z.
3. Taruh id jenis itu di salah satu `deret` pada `src/data/tataletak.ts` (atau buat deret baru di sisi jalan yang diinginkan). Letak dan arah muka dihitung otomatis.
4. Jalankan `pnpm periksa`. Lihat hasilnya di `/galeri` dan `/`.

## 9. Ide lanjutan

- **Hari pasaran:** weton Jawa sebagai mekanik (lihat [EKONOMI.md](EKONOMI.md)).
- **Jendela menyala** dan lampu jalan bercahaya saat malam.
- **Kawasan Industri** yang benar-benar dibangun lewat animasi peresmian saat Level Kota tercapai.
- **Karakter NPC** yang berjalan di jalan dan menjadi titik ketuk untuk percakapan.
- **Rumah ibadah lain** selain Masjid Agung, bila ingin mewakili warga yang beragam.

## 10. Belum diputuskan

1. Gaya ilustrasi akhir untuk kartu dan avatar NPC (sekarang inisial berwarna).
2. Apakah bayangan nyata dipakai di desktop.
3. Apakah peta perlu satu tampilan malam yang lebih dramatis (jendela menyala) sebelum Fase 1.
