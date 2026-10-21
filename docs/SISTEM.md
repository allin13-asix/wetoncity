# Sistem kehidupan kota (17 aturan)

Prinsip: semua logika dihitung di server (server-authoritative); angka balancing ada di `src/data/balans.ts`; proses berdurasi memakai
stempel waktu dan dihitung malas (tanpa cron, tetap berjalan saat pemain offline); uang dan barang bergerak dalam satu transaksi
(`dalamTransaksi` di `src/server/game.ts`). Skema: `db/migrasi/008_sistem_kehidupan.sql`. Aturan murni: `src/server/sistem-aturan.ts`.

| # | Fitur | Konfigurasi | Kode | API / UI |
|---|-------|-------------|------|----------|
| 1 | Lapar | `LAPAR` | `hitungLapar`, `rawatInap`, `selesaikan` | `Keadaan.lapar`, `Keadaan.dirawat`; panel Kondisi di Beranda |
| 2 | Inventori + mailbox | `INVENTORI` | `inventori.ts` (add/remove), `sistem.ts` (use/transfer/klaim) | `/api/inventori`, `/inventori` |
| 3 | Teman sekamar | `SEKAMAR` | `sosial.ts` (`masukKamar`), `sistem.ts` (`teman`), `selesaikan` (pindah paksa) | `/api/teman`, `/api/hunian` (`kamar`) |
| 4 | Reputasi + leaderboard | `AKTIVITAS`, `PERINGKAT` | `kemajuan.ts` (`catatAktivitas`, `pastikanPekan`, `papanPeringkat`) | `/api/peringkat`, `/peringkat`, Balai Kota, Alun-Alun |
| 5 | Batas ganti pekerjaan | `GANTI_KERJA` | `cekGantiKerja`, `pasangKerja` | `/api/pekerjaan` |
| 6 | Pembelian properti | `PROPERTI` | `game.ts` (`lahan` beli kota), `properti.ts` (NPC, harga tetap, negosiasi) | `/api/lahan`, `/api/properti`, panel lahan di peta |
| 7 | Animasi pembangunan | `BANGUN`, `TAHAP_BANGUN` | `progresBangun`, `tahapBangun`, `rumahDiPeta` | `/api/peta/rumah`, `src/kota/Isi.tsx` |
| 8 | Roulette Eropa | `ROULETTE` | `hiburan.ts` (`putarRoulette`), tabel `judi_putaran` | `/api/judi` |
| 9 | Memancing | `MEMANCING` | `hiburan.ts` (`pancing`) | `/api/pancing`, Warung Pantai |
| 10 | Tiga minimarket | `TOKO` | `hiburan.ts` (`beliToko`, `daftarToko`) | `/api/toko`, Minimarket Sinar, Alpa Maret, Indo April |
| 11 | Seleksi PNS/polisi/tentara | `SELEKSI` | `sistem.ts` (`ikutSeleksi`) | `/api/seleksi` |
| 12 | Stats | `ATRIBUT`, `STATISTIK` | kolom `kekuatan`, `kecerdasan`, `karisma`, `disiplin` | `Keadaan.atribut` |
| 13 | Kuota lowongan | `KUOTA` | `kuotaLowongan`, `pasangKerja` | `/api/pekerja` |
| 14 | Leveling | `LEVEL`, `AKTIVITAS` | `expUntukLevel` (`BASE_EXP x level^1,5`), `terapkanAktivitas`, `hadiahLevel` | `Keadaan.level`, hadiah lewat mailbox |
| 15 | Transparansi pekerja | `KUOTA` | `sistem.ts` (`pekerjaBangunan`) | `/api/pekerja`, panel bangunan |
| 16 | Profil publik | `PESAN` | `sistem.ts` (`profilPublik`, `kirimPesan`, `aturProfil`) | `/api/profil`, `/api/pesan`, `/profil/[id]`, `/pesan` |
| 17 | Keahlian + kursus | `LATIHAN` | `game.ts` (`kursus`, `selesaikanLatihan`) | `/api/kursus`, BLK |

## Catatan rancangan

- **Lapar**: turun 1 poin tiap 15 menit. Di bawah ambang 30 (LAPAR): pemulihan Tenaga setengah laju (dipisah tepat di saat mulai lapar, jadi
  waktu offline sebelum lapar tidak dihukum), Kesehatan -5 per jam sampai terkunci di 20, lalu rawat inap otomatis (biaya jadi kasbon bila kas kurang,
  semua aksi diblokir selama perawatan). Pemulihan: Rumah Makan Padang dan barang konsumsi dari inventori (`lapar` di `BARANG`).
- **Inventori** memakai tabel `gudang` (kapasitas total `INVENTORI.kapasitas`); `tambahItem` mengirim kelebihan ke mailbox (`surat`).
  Pembelian di Pasar (NPC dan lapak) tetap ditolak bila penuh, sedangkan minimarket, hadiah, oleh-oleh, hasil usaha, dan memancing memakai mailbox.
- **Sekamar**: nomor kamar disimpan (`hunian_kamar`). Masuk ke kamar berpenghuni membuat permintaan `pertemanan` ke semua penghuni lama. Yang menolak
  atau memutus pertemanan (selagi masih sekamar) mendapat `wajib_pindah_tenggat`; sesudahnya `selesaikan` memindahkannya ke Kost Melati.
- **Peringkat mingguan**: `pastikanPekan` berjalan sebelum aksi pemain pertama di tiap pekan WIB (kunci baris `kota`, satu penutup), menyimpan top-N di
  `peringkat_mingguan`, membayar hadiah lewat ledger (`hadiah_mingguan`), lalu mereset `reputasi_minggu`.
- **Properti**: lahan tanpa baris `lahan_milik` milik kota (dibeli di Balai Kota); rumah NPC (`PROPERTI.hargaNpc`) dibeli lewat dialog; properti pemain
  dijual `tetap` atau `negosiasi` (penawaran, tawar-balik sampai `babakMaks`, terima/tolak/kedaluwarsa). `pindahMilik` memindahkan kepemilikan dan uang
  dalam satu transaksi dan membatalkan tawaran lain. Server tidak mengenal posisi pemain, jadi "hanya di Balai Kota" ditegakkan oleh antarmuka (panel
  lahan mengarahkan ke Balai Kota); `/api/lahan` aksi `beli` adalah satu-satunya jalan membeli lahan kota.
- **Konstruksi**: `bangun_mulai`/`bangun_selesai` pada `lahan_milik`; progres `(now - mulai) / (selesai - mulai)`; empat tahap (0-10%, 25-50%, 80-90%, selesai).
  Rumah ditandai jadi saat pemiliknya memuat keadaan; bangunan kerja (kafe, warung, bengkel) membuka lowongan begitu `bangun_selesai` lewat.
- **Kuota**: hanya pekerja pemain yang dihitung; `warga.tempat_kerja` menunjuk bangunan (id penempatan atau lahan). Pekerja lama tanpa tempat otomatis
  ditempatkan di bangunan pertama jenisnya.
- **Kursus**: `latihan_id`/`latihan_selesai` diterapkan malas oleh `selesaikanLatihan`; jeda `LATIHAN.cooldownMs` sesudahnya. Ini mengganti kursus
  keahlian instan yang lama, jadi `scripts/uji-server.ts` dan `scripts/sim-ekonomi.ts` yang mengandalkan kursus instan perlu disesuaikan.
- **Judi lama**: `berjudi` (peluang 45%) masih ada di `game.ts` hanya untuk uji lama; rute `/api/judi` kini roulette.
