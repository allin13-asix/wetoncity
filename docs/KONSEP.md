# Konsep Pokok: Weton City

Status: draf 2, 18 Oktober 2026. Dokumen ini memuat konsep. Dokumen pendamping: [KOTA.md](KOTA.md) (tata letak dan aset), [WARGA.md](WARGA.md) (alur pemain, hunian, pekerjaan, kuliah, NPC), dan [EKONOMI.md](EKONOMI.md) (angka dan simulasi). Skema data dan tampilan mobile penuh belum ditulis.

Prototipe yang sudah berjalan: peta kota 3D, galeri aset, data kota, tur pemain baru, daftar 100 NPC, dan panduan. Server Fase 0 juga sudah berjalan dan teruji: akun, Postgres, ledger uang, Tenaga, kerja, kursus, bonus harian, tagihan, dan kasbon (lihat [SERVER.md](SERVER.md)).

## 1. Ringkasan

Weton City adalah game kota virtual berbasis web untuk pengguna ponsel. Pemain datang sebagai pendatang baru di sebuah kota pelabuhan fiktif ala Indonesia, lalu pelan-pelan menjadi warga, juragan, dan tokoh kota. Tidak ada PvP. Seru-nya datang dari membangun penghidupan, berdagang antarwarga, dan bergotong royong membesarkan kota. Referensi sistem: Torn City (bar yang pulih seiring waktu, ekonomi buatan pemain). Referensi rasa: kehidupan sehari-hari Indonesia. Pintu masuk lewat akun Instagram kota.

## 2. Prinsip desain

1. **Ponsel dulu.** Satu sesi cukup 2 sampai 5 menit. Layar dirancang untuk satu tangan.
2. **Tanpa PvP.** Tidak ada penyerangan atau pencurian antarpemain. Persaingan hanya lewat papan peringkat dan pasar.
3. **Hangat dan lucu.** Nada slice-of-life, bukan kriminal. Bahasa sehari-hari, humor lokal.
4. **Kota terasa hidup, bahkan saat sepi.** Karakter NPC dan Koran Kota mengisi kekosongan di awal.
5. **Bisa dibangun sendirian.** Setiap fitur harus lolos pertanyaan: apakah game tetap menyenangkan tanpanya? Kalau ya, ditunda.

## 3. Kota

**Nama.** Weton City. "Weton" adalah hitungan hari kelahiran dalam tradisi Jawa. Nama ini membuka ide lanjutan: Pasar Weton mengikuti hari pasaran lima harian (Legi, Pahing, Pon, Wage, Kliwon), dan setiap warga punya weton dari tanggal bergabungnya.

**Letak.** Kota pelabuhan dengan laut di sisi utara dan tidak ada pegunungan. Peta berukuran 120 x 92 petak dengan jalan melengkung, Kali Sekar yang membelah kota, dan lahan kosong untuk pertumbuhan (lihat [KOTA.md](KOTA.md)):

- **Pelabuhan Weton:** pintu masuk kota. Terminal, TPI, gudang, lapangan peti kemas, dua dermaga, dan kapal penumpang.
- **Pantai Weton:** warung, restoran seafood, hotel, dan mercusuar.
- **Kampung Nelayan:** rumah panggung warga pesisir, SMA dan SMK.
- **Koridor Jalan Raya:** bursa kerja, BLK, kafe, bengkel, dan minimarket di jalan dari pelabuhan ke pusat kota.
- **Pusat Kota:** di pedalaman, jauh dari pelabuhan. Alun-alun dikelilingi balai kota (selatan), masjid agung (barat), pasar (utara), bank, dan koran.
- **Kawasan Kampus dan Kesehatan:** Universitas Weton dan RSUD Weton.
- **Kampung Kost Sekar:** Kost Level 1 dan 2.
- **Perumahan Weton Indah:** Rusunawa, Kost Level 3, dan kavling rumah untuk Fase 2.
- **Kawasan Industri:** tidak ada di awal. Lahan kosong berpagar. Pabrik pertama terbuka ketika Level Kota mencapai ambang tertentu; pembukaannya menjadi peristiwa besar kota ("Pabrik pertama diresmikan"). Efeknya membuka pekerjaan dan barang produksi baru, tetapi biaya hidup kota ikut naik. Ini sumber ketegangan tanpa PvP.

## 4. Perjalanan pemain

Semua pemain mulai di usia 18 tahun sebagai lulusan SMA atau SMK. Detail di [WARGA.md](WARGA.md).

1. Pemain mengikuti akun Instagram kota dan masuk (lihat bagian 8).
2. Tiba di Pelabuhan Weton sebagai **Pendatang**, disambut Mbak Laras (pemandu), dan menerima uang saku Rp 1.000.000.
3. Memilih tempat tinggal: Rusunawa bersubsidi (dibagi dua warga), tiga level kost, atau numpang di rumah teman (Fase 2, butuh pertemanan dan izin pemilik).
4. Berkeliling kota bersama pemandu, lalu menjalani misi pertama: mencari pekerjaan di Bursa Kerja.
5. Bekerja, menaikkan Keahlian di BLK, atau kuliah di Universitas Weton, lalu naik menjadi **Warga**.
6. Membuka usaha sendiri dan menjadi **Juragan**.
7. Berkontribusi besar untuk kota dan menjadi **Tokoh Kota**.

Setiap tingkat membuka aksi, usaha, atau fitur baru. Syarat dan angka ada di [EKONOMI.md](EKONOMI.md).

## 5. Loop inti

**Aksi (pakai Tenaga) → hasil (Rupiah, Reputasi, keahlian) → pengeluaran (kos, makan, tagihan) → peluang baru.**

Sumber daya awal:

- **Rupiah:** mata uang utama.
- **Tenaga:** bar yang pulih seiring waktu. Dihitung dari waktu terakhir diperbarui, tanpa cron.
- **Reputasi:** menentukan rank dan akses.
- **Keahlian:** naik karena dilatih atau dipakai. Membuka pekerjaan yang lebih baik.

Bar kedua (Semangat) baru dipertimbangkan setelah loop dasar terbukti seru.

Pemain yang kembali harus selalu punya alasan: bar penuh, usaha selesai berproduksi, tagihan jatuh tempo, atau berita baru di koran.

## 6. Sistem dan fase

| Sistem | Isi singkat | Fase |
|---|---|---|
| Peta kota 3D | Diorama low-poly sebagai tampilan utama: ketuk bangunan untuk info, tur bersama pemandu | 0 |
| Kerja | 61 pekerjaan untuk lulusan SMA/SMK (Tier 1 sampai 3), termasuk PNS Dinas Kota, polisi, TNI, damkar, dan tiga pabrik besar. Menghabiskan Tenaga | 0 |
| Hunian dan tagihan | Rusunawa, tiga level kost, biaya hidup berkala, penyedot uang utama | 0 |
| BLK | Kursus Keahlian level 1 sampai 10 | 0 |
| Koran Kota | Berita otomatis dari kejadian warga, ditambah berita dari tim | 0 |
| Kuliah | Universitas Weton: tiga jurusan D3 dan delapan jurusan S1, membuka Tier 4 dan 5 | 2 |
| Usaha | Warung, kos-kosan, konter, bengkel. Berproduksi sendiri dan bisa di-upgrade | 1 |
| Pasar | Jual-beli antarwarga, ditambah pedagang NPC agar tidak sepi | 1 |
| Bank | Tabungan sederhana | 1 |
| RT/RW | Kelompok warga, menggantikan geng. Bersaing sehat di peringkat | 2 |
| Gotong royong | Semua warga menyumbang proyek kota (pos ronda, jembatan, pasar baru) | 2 |
| Level Kota dan Industri | Perkembangan kota membuka zona dan fitur | 2 |
| Arisan | Iuran kelompok kecil dengan giliran penerima | 3 |
| Event kalender | 17-an, Ramadan, mudik, Lebaran | 3 |
| Semangat (bar kedua) | Menambah kedalaman bila diperlukan | 3 |

## 7. Perkembangan kota

Kota memiliki **Level Kota**, naik lewat proyek gotong royong dan total aktivitas warga. Level membuka bangunan, pekerjaan, zona, dan event. Angka ambang menyusul di dokumen ekonomi.

Dengan begitu pemain punya tujuan bersama, dan tim pengembang punya cara rilis konten yang terasa seperti kota yang tumbuh.

## 8. Pintu masuk Instagram

Alur yang diusulkan: pemain mengirim DM berisi kode ke akun kota, sistem menerima lewat webhook, mengecek status mengikuti, lalu membuat akun.

Catatan penting, perlu diverifikasi di dokumentasi Meta terbaru sebelum dibangun:

- Perlu akun Business atau Creator dan persetujuan app review Meta.
- Daftar pengikut tidak bisa ditarik lewat API resmi. Pengecekan hanya mungkin untuk orang yang mengirim DM.
- Kebijakan Meta bisa berubah. **Instagram tidak boleh menjadi satu-satunya jalan masuk.** Sediakan login cadangan (email atau Google).
- Aturan satu akun Instagram untuk satu warga membantu mencegah multi-akun.

Selama fase 0 dan 1, login sederhana cukup. Integrasi Instagram dikerjakan setelah loop inti terbukti seru.

## 9. Garis besar ekonomi

- **Sumber uang:** kerja, usaha, event, penjualan di pasar.
- **Penyedot uang:** kos, makan, tagihan listrik, cicilan, pajak, upgrade, sumbangan proyek.
- Tidak ada uang nyata yang bisa ditarik. Tidak ada unsur judi.
- Setiap perubahan saldo dicatat di tabel ledger (tidak hanya mengubah angka saldo), agar bug duplikasi uang bisa dilacak dan dibatalkan.
- Harga pasar bergerak oleh pasokan dan permintaan, dengan job terjadwal sederhana.

Angka rinci ditulis di dokumen ekonomi.

## 10. Yang sengaja tidak dibuat

- PvP dan segala bentuk penyerangan atau pencurian antarpemain.
- Uang nyata yang bisa ditarik.
- Karakter pemain yang berjalan di peta. Peta 3D dipakai untuk membaca kota dan memilih tempat, bukan untuk bergerak.
- Chat realtime di dalam game. Komunitas dulu lewat Instagram atau WhatsApp.
- Aplikasi native. Cukup PWA yang bisa dipasang.
- Monetisasi. Dipikirkan setelah ada pemain dan tanda pertumbuhan.

## 11. Garis besar teknis

- PWA mobile-first. Navigasi bawah dengan 4 sampai 5 tab (Beranda, Aksi, Usaha, Pasar, Kota).
- Peta kota adalah adegan 3D low-poly (three.js lewat react-three-fiber) dengan kamera ortografik miring. Semua model dirakit dari kode dan digabung per bangunan; seluruh kota sekitar 34.000 segitiga, ringan untuk ponsel.
- Tata letak, pekerjaan, hunian, jurusan, dan NPC disimpan sebagai data di `src/data` dan diperiksa oleh `pnpm periksa`.
- Web push untuk notifikasi bar penuh dan tagihan.
- Semua pembaruan bersifat asinkron: nilai dan waktu pembaruan disimpan, lalu dihitung saat dibaca.
- Satu basis data relasional, transaksi dan row lock untuk setiap perubahan uang.
- Stack: Next.js 16 (App Router), React 19, TypeScript, pnpm, three.js dengan react-three-fiber. Basis data Postgres lewat postgres.js dengan SQL mentah, tanpa ORM.

## 12. Peta jalan

**Fase 0, prototipe (bisa sendiri, beberapa minggu).** Sudah ada: peta kota 3D, 38 jenis bangunan, tur pemain baru, galeri aset, daftar 100 NPC, panduan, simulasi ekonomi, dan server: login sederhana, kartu warga, bar Tenaga, kerja, kursus, bonus harian, hunian dan tagihan mingguan, kasbon, serta ledger uang. Berikutnya: Koran Kota manual, navigasi bawah untuk ponsel, web push. Selesai bila: satu orang betul-betul ingin membukanya lagi keesokan harinya.

**Fase 1, warga undangan.** Usaha, pasar dengan NPC, bank, kode undangan. Selesai bila: 20 sampai 50 teman atau kenalan memainkannya beberapa hari berturut-turut.

**Fase 2, kota tumbuh.** RT/RW, gotong royong, Level Kota, Kawasan Industri, onboarding Instagram. Selesai bila: akun Instagram kota bisa mendatangkan warga baru tanpa Anda mengajak satu per satu.

**Fase 3, kedalaman.** Arisan, event kalender, Semangat, pertimbangan monetisasi.

## 13. Risiko

- **Kota sepi di awal.** Ekonomi pasar dan RT harus berjalan dengan NPC sampai pemain cukup.
- **Inflasi.** Penyedot uang harus sebanding dengan sumber uang.
- **Ketergantungan pada Meta.** Selalu sediakan jalan masuk cadangan.
- **Kelelahan sendirian.** Pegang pertanyaan prinsip nomor 5 dan jaga cakupan fase kecil.

## 14. Pertanyaan terbuka

Sudah diputuskan: nama kota (Weton City), identitas visual (diorama 3D low-poly dengan papan petunjuk pelabuhan sebagai gaya antarmuka), mata uang Rupiah, dan tanpa PvP.

1. Bahasa: Indonesia saja?
2. Siapa yang menulis berita dan konten bila sudah banyak pemain? Hanya Anda?
3. Batas jumlah warga awal (undangan terbatas atau terbuka)?
4. Apakah hari pasaran Jawa dijadikan mekanik?
5. Apakah perlu rumah ibadah selain Masjid Agung agar kota mewakili warga yang beragam?
6. Bagaimana sink kekayaan jangka panjang dibuat cukup besar (lihat [EKONOMI.md](EKONOMI.md) bagian 14)?
