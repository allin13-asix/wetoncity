import type { Hiasan, Jenis, Kategori } from './tipe.ts'

export const kategori: Record<Kategori, { nama: string; warna: string }> = {
  layanan: { nama: 'Layanan kota', warna: '#2d5bd0' },
  ekonomi: { nama: 'Ekonomi dan usaha', warna: '#e0a800' },
  pelabuhan: { nama: 'Pelabuhan dan pesisir', warna: '#1e94a8' },
  pendidikan: { nama: 'Pendidikan', warna: '#7a4fd0' },
  hunian: { nama: 'Hunian', warna: '#e7704f' },
  kesehatan: { nama: 'Kesehatan', warna: '#e0453a' },
  publik: { nama: 'Ruang publik', warna: '#2e8b6a' },
  industri: { nama: 'Industri', warna: '#7c8a93' },
}

export const katalog: Jenis[] = [
  // Pelabuhan dan pesisir
  {
    id: 'terminal-pelabuhan', nama: 'Terminal Pelabuhan Weton', kategori: 'pelabuhan', model: 'terminal',
    ukuran: [7.6, 4.6], utama: true, fase: 0,
    ringkas: 'Pintu kedatangan semua pendatang baru.',
    fungsi: [
      'Pemain baru tiba di sini dan disambut Mbak Laras, pemandu warga baru.',
      'Menerima uang saku Rp 1.000.000, lalu memilih tempat tinggal.',
      'Pangkalan ojek dan angkot untuk keliling kota.',
      'Nanti: perjalanan antar kota lewat kapal (Fase 3).',
    ],
  },
  {
    id: 'tpi', nama: 'Tempat Pelelangan Ikan (TPI)', kategori: 'pelabuhan', model: 'tpi',
    ukuran: [5.6, 4.2], utama: true, fase: 1,
    ringkas: 'Lelang ikan segar setiap pagi.',
    fungsi: [
      'Pekerjaan: buruh bongkar ikan (Tier 1).',
      'Warung dan restoran membeli ikan di sini.',
      'Usaha Perahu Nelayan menjual hasil tangkapan di sini (Fase 1).',
    ],
  },
  {
    id: 'gudang-pelabuhan', nama: 'Gudang Pelabuhan', kategori: 'pelabuhan', model: 'gudang',
    ukuran: [8, 5.2], fase: 0,
    ringkas: 'Gudang barang masuk dan keluar pelabuhan.',
    fungsi: ['Pekerjaan: kuli angkut (Tier 1), admin gudang (Tier 2), mandor pelabuhan (Tier 3).'],
  },
  {
    id: 'lapangan-kontainer', nama: 'Lapangan Peti Kemas', kategori: 'pelabuhan', model: 'kontainer',
    ukuran: [6, 4.6], fase: 2,
    ringkas: 'Tumpukan peti kemas dan derek pelabuhan.',
    fungsi: ['Nanti: operator derek dan pengiriman barang industri ke luar kota (Fase 2 sampai 3).'],
  },
  {
    id: 'dermaga', nama: 'Dermaga Weton', kategori: 'pelabuhan', model: 'dermaga',
    ukuran: [3.2, 9], diLaut: true, fase: 0,
    ringkas: 'Dermaga kayu tempat kapal penumpang bersandar.',
    fungsi: ['Pendatang baru turun dari kapal di sini (adegan pembuka).'],
  },
  {
    id: 'kapal-penumpang', nama: 'KM Segara Mulia', kategori: 'pelabuhan', model: 'kapal',
    ukuran: [3.6, 12], diLaut: true, fase: 0,
    ringkas: 'Kapal penumpang yang membawa pendatang baru.',
    fungsi: ['Adegan pembuka: kapal sandar, pemain turun, disambut pemandu.'],
  },
  {
    id: 'perahu-nelayan', nama: 'Perahu Nelayan', kategori: 'pelabuhan', model: 'perahu',
    ukuran: [1.4, 3.6], diLaut: true, fase: 0,
    ringkas: 'Perahu jukung bercadik milik nelayan Weton.',
    fungsi: ['Usaha Perahu Nelayan dibuka dari Beranda: modal Rp 3.000.000, hasil ikan setiap 4 jam, simpan paling banyak 6 siklus.'],
  },
  {
    id: 'mercusuar', nama: 'Mercusuar Weton', kategori: 'publik', model: 'mercusuar',
    ukuran: [2.4, 2.4], utama: true, fase: 0,
    ringkas: 'Penanda kota dari laut.',
    fungsi: ['Landmark dan latar foto KTP Kota.', 'Nanti: lokasi event tahunan (Fase 3).'],
  },

  // Layanan kota
  {
    id: 'balai-kota', nama: 'Balai Kota Weton', kategori: 'layanan', model: 'balai-kota',
    ukuran: [7.6, 5.4], utama: true, fase: 0,
    ringkas: 'Pusat pemerintahan kota.',
    fungsi: [
      'KTP Kota dan pendaftaran RT/RW.',
      'Papan proyek gotong royong dan Level Kota (Fase 2).',
      'Pekerjaan: staf honorer (SMA/SMK, Tier 3); PNS untuk sarjana (Tier 5).',
    ],
  },
  {
    id: 'bursa-kerja', nama: 'Bursa Kerja Weton', kategori: 'layanan', model: 'bursa',
    ukuran: [5, 3.6], utama: true, fase: 0,
    ringkas: 'Tempat mencari lowongan sesuai ijazah.',
    fungsi: ['Daftar lowongan sesuai ijazah dan Keahlian.', 'Misi pertama pemain baru: cari pekerjaan.'],
  },
  {
    id: 'blk', nama: 'Balai Latihan Kerja (BLK)', kategori: 'layanan', model: 'blk',
    ukuran: [5.6, 3.6], utama: true, fase: 0,
    ringkas: 'Kursus keterampilan untuk menaikkan Keahlian.',
    fungsi: ['Kursus Keahlian level 1 sampai 10.', 'Biaya kursus naik berlipat: Rp 100.000 x 1,7 pangkat (level - 1).'],
  },
  {
    id: 'koran-weton', nama: 'Kantor Koran Weton', kategori: 'layanan', model: 'koran',
    ukuran: [4, 3.6], utama: true, fase: 0,
    ringkas: 'Redaksi Koran Kota.',
    fungsi: [
      'Koran Kota: berita otomatis dari kejadian warga, ditambah berita dari tim.',
      'Pekerjaan: staf redaksi junior (SMA, Tier 3); wartawan (S1 Ilmu Komunikasi, Tier 5).',
    ],
  },

  {
    id: 'kantor-polisi', nama: 'Polsek Weton', kategori: 'layanan', model: 'kantor-polisi',
    ukuran: [6.4, 4.6], utama: true, fase: 0,
    ringkas: 'Kantor polisi sektor Kota Weton.',
    fungsi: [
      'Pekerjaan: bintara polisi (Tier 2), brigadir polisi (Tier 3).',
      'Patroli rutin ke Gang Kenari; sesekali razia ke Rumah Judi Mujur dan menyita taruhan.',
    ],
  },
  {
    id: 'markas-kodim', nama: 'Markas Kodim Weton', kategori: 'layanan', model: 'markas-kodim',
    ukuran: [11, 8], utama: true, fase: 0,
    ringkas: 'Komando distrik militer, berpagar tembok dan berlapangan apel.',
    fungsi: [
      'Pekerjaan: tamtama (Tier 1), bintara (Tier 2), sersan (Tier 3).',
      'Babinsa ikut kerja bakti warga dan proyek gotong royong (Fase 2).',
    ],
  },
  {
    id: 'damkar', nama: 'Pemadam Kebakaran Weton', kategori: 'layanan', model: 'damkar',
    ukuran: [7.2, 5.2], utama: true, fase: 0,
    ringkas: 'Pos pemadam kebakaran dengan tiga garasi dan menara selang.',
    fungsi: [
      'Pekerjaan: petugas damkar (Tier 1), komandan regu (Tier 3).',
      'Nanti: kejadian kebakaran di kota dan usaha warga (Fase 2).',
    ],
  },
  {
    id: 'dinas-masyarakat', nama: 'Dinas Masyarakat', kategori: 'layanan', model: 'dinas', varian: { warna: '#e8833a' },
    ukuran: [5.8, 4.4], fase: 0,
    ringkas: 'Kantor Dinas Masyarakat Kota Weton: kependudukan, sosial, dan pemberdayaan warga.',
    fungsi: [
      'Pekerjaan PNS berjenjang: Juru Muda (Tier 1), Pengatur Muda (Tier 2), Penata Muda (Tier 3) untuk lulusan SMA/SMK.',
      'Pembina Muda (Tier 4, D3) dan Pembina Utama (Tier 5, S1) terbuka setelah kuliah (Fase 2).',
    ],
  },
  {
    id: 'dinas-pendidikan', nama: 'Dinas Pendidikan', kategori: 'layanan', model: 'dinas', varian: { warna: '#3f78c9' },
    ukuran: [5.8, 4.4], fase: 0,
    ringkas: 'Kantor Dinas Pendidikan Kota Weton: sekolah negeri, beasiswa, dan pelatihan guru.',
    fungsi: [
      'Pekerjaan PNS berjenjang: Juru Muda (Tier 1), Pengatur Muda (Tier 2), Penata Muda (Tier 3) untuk lulusan SMA/SMK.',
      'Pembina Muda (Tier 4, D3) dan Pembina Utama (Tier 5, S1) terbuka setelah kuliah (Fase 2).',
    ],
  },
  {
    id: 'dinas-kepegawaian', nama: 'Dinas Kepegawaian', kategori: 'layanan', model: 'dinas', varian: { warna: '#4f9b62' },
    ukuran: [5.8, 4.4], fase: 0,
    ringkas: 'Kantor Dinas Kepegawaian Kota Weton: penerimaan dan kenaikan jabatan PNS kota.',
    fungsi: [
      'Pekerjaan PNS berjenjang: Juru Muda (Tier 1), Pengatur Muda (Tier 2), Penata Muda (Tier 3) untuk lulusan SMA/SMK.',
      'Pembina Muda (Tier 4, D3) dan Pembina Utama (Tier 5, S1) terbuka setelah kuliah (Fase 2).',
    ],
  },
  {
    id: 'dinas-ekonomi', nama: 'Dinas Ekonomi', kategori: 'layanan', model: 'dinas', varian: { warna: '#e6b83a' },
    ukuran: [5.8, 4.4], fase: 0,
    ringkas: 'Kantor Dinas Ekonomi Kota Weton: izin usaha, pasar, dan koperasi.',
    fungsi: [
      'Pekerjaan PNS berjenjang: Juru Muda (Tier 1), Pengatur Muda (Tier 2), Penata Muda (Tier 3) untuk lulusan SMA/SMK.',
      'Pembina Muda (Tier 4, D3) dan Pembina Utama (Tier 5, S1) terbuka setelah kuliah (Fase 2).',
    ],
  },

  {
    id: 'bandara', nama: 'Bandara Weton', kategori: 'layanan', model: 'bandara',
    ukuran: [38, 16], utama: true, fase: 0,
    ringkas: 'Bandara kota dengan landasan, menara kontrol, dan terminal penumpang.',
    fungsi: [
      'Terbang ke Jakarte (pelatihan, Keahlian +1), Culabaya (proyek borongan, upah besar), atau Soloe (dagang batik).',
      'Selama di luar kota pemain tidak bisa beraksi di Weton; hasil perjalanan diterima saat pulang.',
    ],
  },

  // Ekonomi dan usaha
  {
    id: 'bank-weton', nama: 'Bank Weton', kategori: 'ekonomi', model: 'bank',
    ukuran: [4.8, 3.6], utama: true, fase: 0,
    ringkas: 'Bank milik kota.',
    fungsi: [
      'Tabungan: setor dan tarik kapan saja, bunga 0,25% setiap siklus tagihan. Kasbon dilunasi di sini.',
      'Pekerjaan: satpam (Tier 2); teller (D3 Perbankan, Tier 4); staf kredit (S1 Akuntansi, Tier 5).',
    ],
  },
  {
    id: 'pasar-weton', nama: 'Pasar Weton', kategori: 'ekonomi', model: 'pasar',
    ukuran: [8.6, 4.6], utama: true, fase: 1,
    ringkas: 'Pasar tradisional tempat warga berdagang.',
    fungsi: [
      'Jual beli antarwarga dan dengan pedagang NPC.',
      'Harga bergerak di pita 70% sampai 130% dari harga dasar.',
      'Pekerjaan: buruh pasar (Tier 1).',
    ],
  },
  {
    id: 'minimarket', nama: 'Minimarket Sinar', kategori: 'ekonomi', model: 'minimarket',
    ukuran: [4.4, 3.6], fase: 0,
    ringkas: 'Minimarket dekat pusat kota.',
    fungsi: ['Pekerjaan: pramuniaga (Tier 1), kasir (Tier 2), supervisor (Tier 3).'],
  },
  {
    id: 'rm-padang', nama: 'Rumah Makan Padang Uda Fadli', kategori: 'ekonomi', model: 'rm-padang',
    ukuran: [5.4, 4.4], utama: true, fase: 0,
    ringkas: 'Nasi Padang beratap gonjong, rendangnya kebanggaan Uda Fadli.',
    fungsi: [
      'Makan nasi rendang: Rp 50.000 untuk 10 Tenaga, paling banyak dua kali sehari.',
      'Pekerjaan: pelayan (Tier 1), juru masak (Tier 2).',
    ],
  },
  {
    id: 'alpa-maret', nama: 'Alpa Maret', kategori: 'ekonomi', model: 'waralaba', varian: { merek: 'alpa' },
    ukuran: [4.4, 3.6], fase: 0,
    ringkas: 'Minimarket waralaba merah. Selalu bersebelahan dengan Indo April.',
    fungsi: ['Pekerjaan: kasir (Tier 1), kepala toko (Tier 3).'],
  },
  {
    id: 'indo-april', nama: 'Indo April', kategori: 'ekonomi', model: 'waralaba', varian: { merek: 'indo' },
    ukuran: [4.4, 3.6], fase: 0,
    ringkas: 'Minimarket waralaba biru. Selalu bersebelahan dengan Alpa Maret.',
    fungsi: ['Pekerjaan: pramuniaga (Tier 1), kepala toko (Tier 3).'],
  },
  {
    id: 'tempat-judi', nama: 'Rumah Judi Mujur', kategori: 'ekonomi', model: 'tempat-judi',
    ukuran: [4.6, 3.8], fase: 0,
    ringkas: 'Ruko berpintu setengah tertutup di Gang Kenari. Rumah selalu menang.',
    fungsi: [
      'Bertaruh uang game Rp 10.000 sampai Rp 1.000.000; menang dibayar dua kali lipat, peluang 45%.',
      'Setiap taruhan memakai 5 Tenaga. Tidak ada uang sungguhan.',
    ],
  },
  {
    id: 'kafe', nama: 'Kafe Dermaga', kategori: 'ekonomi', model: 'kafe',
    ukuran: [4, 3.4], fase: 0,
    ringkas: 'Kafe kecil tempat warga nongkrong.',
    fungsi: ['Pekerjaan: pelayan (Tier 1), barista (Tier 2).'],
  },
  {
    id: 'bengkel', nama: 'Bengkel Motor Mandowen', kategori: 'ekonomi', model: 'bengkel',
    ukuran: [4.6, 3.8], fase: 0,
    ringkas: 'Bengkel motor andalan warga.',
    fungsi: ['Pekerjaan: montir (Tier 2), kepala bengkel (Tier 3). Cocok untuk lulusan SMK otomotif.'],
  },
  {
    id: 'warung-pantai', nama: 'Warung Pantai', kategori: 'ekonomi', model: 'warung',
    ukuran: [3.2, 2.8], fase: 0,
    ringkas: 'Warung kelapa muda dan mi rebus di pasir.',
    fungsi: ['Pekerjaan: pelayan warung (Tier 1).', 'Usaha Warung Makan dibuka dari Beranda: modal Rp 4.000.000, hasil setiap 4 jam.'],
  },
  {
    id: 'resto-seafood', nama: 'Restoran Seafood Karang', kategori: 'ekonomi', model: 'resto',
    ukuran: [6, 4.2], fase: 0,
    ringkas: 'Restoran ikan bakar di tepi pantai.',
    fungsi: ['Pekerjaan: pelayan (Tier 2), koki (Tier 3).', 'Membeli ikan dari TPI.'],
  },
  {
    id: 'hotel-pantai', nama: 'Hotel Pantai Weton', kategori: 'ekonomi', model: 'hotel',
    ukuran: [7.6, 5], fase: 1,
    ringkas: 'Hotel wisata dengan kolam renang.',
    fungsi: ['Pekerjaan: resepsionis (Tier 2), kepala shift (Tier 3); manajer (D3 Perhotelan, Tier 4).'],
  },

  // Pendidikan
  {
    id: 'univ-rektorat', nama: 'Universitas Weton (Rektorat)', kategori: 'pendidikan', model: 'rektorat',
    ukuran: [8, 4.6], utama: true, fase: 0,
    ringkas: 'Gedung utama kompleks Universitas Weton.',
    fungsi: ['Daftar kuliah D3 atau S1 dan bayar UKT per semester dari Beranda.', 'Satu sesi kuliah per hari, 20 Tenaga; lima sesi menyelesaikan satu semester.', 'Lulus membuka pekerjaan Tier 4 (D3) atau Tier 5 (S1).'],
  },
  {
    id: 'univ-fakultas', nama: 'Gedung Fakultas', kategori: 'pendidikan', model: 'fakultas',
    ukuran: [6.2, 4.4], fase: 0,
    ringkas: 'Ruang kuliah di kompleks kampus.',
    fungsi: ['Kehadiran kuliah memakai Tenaga setiap hari kuliah.'],
  },
  {
    id: 'univ-perpustakaan', nama: 'Perpustakaan Universitas', kategori: 'pendidikan', model: 'perpustakaan',
    ukuran: [5.4, 4.2], fase: 0,
    ringkas: 'Perpustakaan pusat kampus.',
    fungsi: ['Tempat belajar mandiri; nanti memberi bonus nilai (Fase 3).'],
  },
  {
    id: 'sma-negeri', nama: 'SMA Negeri 1 Weton', kategori: 'pendidikan', model: 'sekolah',
    varian: { jenis: 'sma' }, ukuran: [7, 4.6], fase: 3,
    ringkas: 'Sekolah asal sebagian warga.',
    fungsi: ['Latar cerita dan tempat guru NPC. Pekerjaan guru butuh gelar sarjana pendidikan.'],
  },
  {
    id: 'smk-negeri', nama: 'SMK Negeri 1 Weton', kategori: 'pendidikan', model: 'sekolah',
    varian: { jenis: 'smk' }, ukuran: [6.4, 4.6], fase: 3,
    ringkas: 'Sekolah kejuruan: otomotif, perhotelan, pelayaran.',
    fungsi: ['Latar cerita dan tempat guru NPC.'],
  },

  // Kesehatan
  {
    id: 'rs-weton', nama: 'RSUD Weton', kategori: 'kesehatan', model: 'rs',
    ukuran: [9.4, 5], utama: true, fase: 0,
    ringkas: 'Rumah sakit umum kota.',
    fungsi: ['Berobat: Rp 150.000, Tenaga langsung penuh, sekali sehari.', 'Pekerjaan: perawat (D3 Keperawatan, Tier 4).'],
  },

  // Hunian
  {
    id: 'kost-melati', nama: 'Kost Melati (Level 1)', kategori: 'hunian', model: 'kost',
    varian: { level: 1 }, ukuran: [5, 4.2], utama: true, fase: 0,
    ringkas: 'Kost paling sederhana: kamar kecil, kamar mandi di luar.',
    fungsi: ['Sewa Rp 280.000 dan listrik Rp 35.000 per minggu.'],
  },
  {
    id: 'kost-mawar', nama: 'Kost Mawar (Level 2)', kategori: 'hunian', model: 'kost',
    varian: { level: 2 }, ukuran: [5, 4.4], utama: true, fase: 0,
    ringkas: 'Kamar mandi dalam, WiFi, dapur bersama.',
    fungsi: ['Sewa Rp 520.000 dan listrik Rp 50.000 per minggu.', 'Biaya makan hemat 20%, kursus diskon 10%.'],
  },
  {
    id: 'kost-anggrek', nama: 'Kost Anggrek (Level 3)', kategori: 'hunian', model: 'kost',
    varian: { level: 3 }, ukuran: [6, 4.6], utama: true, fase: 0,
    ringkas: 'Kost eksklusif: AC, laundry, parkir, keamanan 24 jam.',
    fungsi: ['Sewa Rp 980.000 dan listrik Rp 90.000 per minggu.', 'Tenaga maksimum +10, makan hemat 20%, kursus diskon 10%.'],
  },
  {
    id: 'rusun-weton', nama: 'Rusunawa Weton', kategori: 'hunian', model: 'rusun',
    ukuran: [8, 4.8], utama: true, fase: 0,
    ringkas: 'Rumah susun bersubsidi, satu kamar dibagi dua warga.',
    fungsi: ['Sewa Rp 120.000 dan listrik Rp 20.000 per minggu per orang.', 'Syarat: belum punya properti dan masih Tier 2 ke bawah.'],
  },
  {
    id: 'rumah-nelayan', nama: 'Rumah Nelayan', kategori: 'hunian', model: 'rumah-nelayan',
    ukuran: [3, 2.8], fase: 0,
    ringkas: 'Rumah panggung warga kampung nelayan.',
    fungsi: ['Tempat tinggal warga NPC. Tidak bisa disewa.'],
  },
  {
    id: 'rumah-menengah', nama: 'Rumah Warga', kategori: 'hunian', model: 'rumah',
    ukuran: [4.6, 4], fase: 2,
    ringkas: 'Rumah dua lantai di Perumahan Weton Indah.',
    fungsi: ['Rumah milik pemain (Fase 2).', 'Pemilik bisa membuka kamar untuk teman yang numpang.'],
  },
  {
    id: 'kavling', nama: 'Kavling Perumahan', kategori: 'hunian', model: 'kavling',
    ukuran: [4.2, 4], fase: 2,
    ringkas: 'Kavling contoh di perumahan.',
    fungsi: ['Lahan kosong berpatok di seluruh kota bisa dibeli dari Beranda, lalu dibangun rumah sendiri.'],
  },

  {
    id: 'lokalisasi', nama: 'Kompleks Gang Kenari (bekas lokalisasi)', kategori: 'hunian', model: 'gang-kenari',
    ukuran: [7.6, 4.4], fase: 0,
    ringkas: 'Deretan rumah petak di ujung Gang Kenari yang sedang ditertibkan Pemkot.',
    fungsi: [
      'Kawasan lama yang menjadi sasaran penertiban. Tidak ada aksi pemain di sini.',
      'Nanti: program alih usaha dan pelatihan dari Dinas Masyarakat (Fase 2).',
    ],
  },

  // Ruang publik
  {
    id: 'masjid-agung', nama: 'Masjid Agung Weton', kategori: 'publik', model: 'masjid',
    ukuran: [7, 6], utama: true, fase: 3,
    ringkas: 'Masjid besar di sisi alun-alun.',
    fungsi: ['Landmark kota.', 'Kegiatan warga: sedekah dan takjil Ramadan (Fase 3).'],
  },
  {
    id: 'alun-alun', nama: 'Alun-Alun Weton', kategori: 'publik', model: 'alun',
    ukuran: [8, 6], utama: true, fase: 3,
    ringkas: 'Lapangan terbuka di jantung kota.',
    fungsi: ['Pusat event kota: 17-an, pasar malam, malam takbiran (Fase 3).', 'Titik kumpul saat tur kota.'],
  },

  // Industri: semua pabrik di Jalan Pabrik
  {
    id: 'papan-proyek', nama: 'Lahan Kawasan Industri', kategori: 'industri', model: 'papan-proyek',
    ukuran: [4.6, 2], fase: 2,
    ringkas: 'Lahan kosong berpagar dengan papan proyek.',
    fungsi: ['Menandai lahan yang akan dibuka. Peresmian menjadi peristiwa besar kota.'],
  },
  {
    id: 'pabrik-otomotif', nama: 'Pabrik Otomotif Weton Motor', kategori: 'industri', model: 'pabrik-otomotif',
    ukuran: [13, 8.4], utama: true, fase: 0,
    ringkas: 'Perakitan mobil dan motor beratap gergaji.',
    fungsi: ['Pekerjaan: operator perakitan (Tier 1), teknisi mesin (Tier 2), supervisor produksi (Tier 3). Cocok untuk lulusan SMK otomotif.'],
  },
  {
    id: 'pabrik-garmen', nama: 'Pabrik Garmen Sekar Busana', kategori: 'industri', model: 'pabrik-garmen',
    ukuran: [12, 7.4], utama: true, fase: 0,
    ringkas: 'Konveksi tiga lantai, ratusan mesin jahit.',
    fungsi: ['Pekerjaan: penjahit (Tier 1), pemeriksa mutu (Tier 2), supervisor produksi (Tier 3).'],
  },
  {
    id: 'pabrik-makanan', nama: 'Pabrik Makanan dan Minuman Segara Rasa', kategori: 'industri', model: 'pabrik-makanan',
    ukuran: [11.4, 8.4], utama: true, fase: 0,
    ringkas: 'Silo, tangki, dan lini kemas makanan ringan serta minuman.',
    fungsi: ['Pekerjaan: operator pengemasan (Tier 1), analis mutu pangan (Tier 2), supervisor produksi (Tier 3).'],
  },
]

export const hiasan: Hiasan[] = [
  { id: 'pohon-kelapa', nama: 'Pohon Kelapa', model: 'kelapa', ukuran: [1.8, 1.8] },
  { id: 'pohon-rindang', nama: 'Pohon Trembesi', model: 'rindang', ukuran: [2.2, 2.2] },
  { id: 'semak', nama: 'Semak', model: 'semak', ukuran: [1, 1] },
  { id: 'lampu-jalan', nama: 'Lampu Jalan', model: 'lampu', ukuran: [0.8, 0.8] },
  { id: 'payung-pantai', nama: 'Payung Pantai', model: 'payung', ukuran: [1.6, 1.6] },
  { id: 'angkot', nama: 'Angkot', model: 'angkot', ukuran: [1.3, 2.8] },
  { id: 'mobil', nama: 'Mobil', model: 'mobil', ukuran: [1.1, 2.3] },
]

export const jenisById = new Map(katalog.map((j) => [j.id, j]))
