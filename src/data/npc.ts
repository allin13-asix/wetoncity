import type { Fase } from './tipe.ts'

export type Npc = {
  id: string
  nama: string
  umur: number
  jk: 'L' | 'P'
  peran: string
  /** jenis bangunan tempat bekerja, atau null */
  tempatKerja: string | null
  /** jenis bangunan atau id distrik */
  tempatTinggal: string
  watak: string
  interaktif?: { fungsi: string; tawaran: string; sapaan: string; fase: Fase }
}

// 21 NPC yang bisa diajak bicara. Fungsi menunjuk fitur game yang dibuka lewat percakapan.
const interaktif: Npc[] = [
  {
    id: 'npc-001', nama: 'Mbak Laras Setyowati', umur: 27, jk: 'P', peran: 'Pemandu warga baru', tempatKerja: 'terminal-pelabuhan', tempatTinggal: 'kost-mawar', watak: 'ramah dan sabar',
    interaktif: { fungsi: 'pemandu', fase: 0, tawaran: 'Memberi uang saku, membantu memilih tempat tinggal, mengantar tur kota, dan memberi misi pertama.', sapaan: 'Selamat datang di Weton City! Capek ya di kapal? Sini, saya antar keliling dulu.' },
  },
  {
    id: 'npc-002', nama: 'Pak Darmo Susilo', umur: 52, jk: 'L', peran: 'Kepala Pelabuhan', tempatKerja: 'terminal-pelabuhan', tempatTinggal: 'kampung-nelayan', watak: 'tegas tapi adil',
    interaktif: { fungsi: 'info-kapal', fase: 3, tawaran: 'Jadwal kapal dan perjalanan antar kota.', sapaan: 'Kapal masuk tepat waktu di sini. Kalau telat, biasanya karena ombak, bukan karena saya.' },
  },
  {
    id: 'npc-003', nama: 'Bu Marni', umur: 58, jk: 'P', peran: 'Ibu Kost Melati', tempatKerja: 'kost-melati', tempatTinggal: 'kost-melati', watak: 'cerewet tapi perhatian',
    interaktif: { fungsi: 'sewa-kost', fase: 0, tawaran: 'Sewa, pindah, dan tagihan Kost Melati.', sapaan: 'Jemuran ditaruh di belakang ya, Nak. Listrik jangan lupa dimatikan.' },
  },
  {
    id: 'npc-004', nama: 'Mbak Dinda Prameswari', umur: 31, jk: 'P', peran: 'Pengelola Kost Mawar', tempatKerja: 'kost-mawar', tempatTinggal: 'kost-mawar', watak: 'rapi dan modern',
    interaktif: { fungsi: 'sewa-kost', fase: 0, tawaran: 'Sewa, pindah, dan tagihan Kost Mawar.', sapaan: 'WiFi-nya kencang, dapur bersama bersih. Asal piring dicuci, kita akur.' },
  },
  {
    id: 'npc-005', nama: 'Pak Hendra Gunawan', umur: 45, jk: 'L', peran: 'Pengelola Kost Anggrek', tempatKerja: 'kost-anggrek', tempatTinggal: 'perumahan', watak: 'profesional dan sedikit perhitungan',
    interaktif: { fungsi: 'sewa-kost', fase: 0, tawaran: 'Sewa, pindah, dan tagihan Kost Anggrek.', sapaan: 'Fasilitas terbaik di Weton. Tapi harganya juga, jadi pastikan gajimu cukup.' },
  },
  {
    id: 'npc-006', nama: 'Pak Suwandi', umur: 49, jk: 'L', peran: 'Petugas Rusunawa', tempatKerja: 'rusun-weton', tempatTinggal: 'rusun-weton', watak: 'sabar, hafal semua penghuni',
    interaktif: { fungsi: 'rusun', fase: 0, tawaran: 'Pendaftaran, antrean, dan aturan Rusunawa Weton.', sapaan: 'Rusun ini untuk warga yang baru mulai. Kalau sudah mapan, mohon beri tempat untuk yang lain.' },
  },
  {
    id: 'npc-007', nama: 'Pak Karyo Wibowo', umur: 61, jk: 'L', peran: 'Ketua RT 03 Kampung Nelayan', tempatKerja: null, tempatTinggal: 'kampung-nelayan', watak: 'sepuh, suka bercerita',
    interaktif: { fungsi: 'rt-rw', fase: 2, tawaran: 'Mendaftar ke RT dan RW, ikut kerja bakti dan peringkat antar RT.', sapaan: 'Warga baru? Lapor ke saya dulu, biar dikenal tetangga. Nanti saya kenalkan.' },
  },
  {
    id: 'npc-008', nama: 'Pak Khairul Wianto', umur: 55, jk: 'L', peran: 'Wali Kota Weton', tempatKerja: 'balai-kota', tempatTinggal: 'perumahan', watak: 'visioner dan hangat',
    interaktif: { fungsi: 'proyek-kota', fase: 2, tawaran: 'Papan proyek gotong royong dan Level Kota.', sapaan: 'Kota ini dibangun bersama. Sumbanganmu, sekecil apa pun, ikut menentukan arahnya.' },
  },
  {
    id: 'npc-009', nama: 'Pak Teguh Santoso', umur: 40, jk: 'L', peran: 'Petugas Bursa Kerja', tempatKerja: 'bursa-kerja', tempatTinggal: 'kost-mawar', watak: 'lugas, hafal semua lowongan',
    interaktif: { fungsi: 'bursa-kerja', fase: 0, tawaran: 'Daftar lowongan sesuai ijazah dan Keahlian.', sapaan: 'Lulusan SMA atau SMK? Ada banyak kerjaan. Mulai dari bawah, naik pelan-pelan.' },
  },
  {
    id: 'npc-010', nama: 'Bu Ratna Dewanti', umur: 46, jk: 'P', peran: 'Kepala BLK Weton', tempatKerja: 'blk', tempatTinggal: 'perumahan', watak: 'disiplin dan bangga pada murid',
    interaktif: { fungsi: 'kursus', fase: 0, tawaran: 'Kursus untuk menaikkan Keahlian.', sapaan: 'Keahlian itu modal. Makin tinggi, makin besar upah yang bisa kamu minta.' },
  },
  {
    id: 'npc-011', nama: 'Bu Dewi Anggraini', umur: 38, jk: 'P', peran: 'Staf Admisi Universitas Weton', tempatKerja: 'univ-rektorat', tempatTinggal: 'kost-mawar', watak: 'teliti',
    interaktif: { fungsi: 'admisi', fase: 2, tawaran: 'Pendaftaran kuliah, pembayaran UKT, dan wisuda.', sapaan: 'Mau ambil jurusan apa? Satu semester sama dengan satu minggu. Kuliah sambil kerja boleh.' },
  },
  {
    id: 'npc-012', nama: 'Pak Rahmat Hidayat', umur: 36, jk: 'L', peran: 'Customer Service Bank Weton', tempatKerja: 'bank-weton', tempatTinggal: 'kost-mawar', watak: 'sopan',
    interaktif: { fungsi: 'bank', fase: 1, tawaran: 'Tabungan, kasbon, dan pinjaman usaha.', sapaan: 'Kalau tagihan belum terbayar, jangan panik. Ada kasbon, tapi bunganya 10 persen seminggu.' },
  },
  {
    id: 'npc-013', nama: 'Mbok Yem', umur: 63, jk: 'P', peran: 'Pedagang sayur', tempatKerja: 'pasar-weton', tempatTinggal: 'kampung-nelayan', watak: 'galak ke penawar sadis, baik hati sebenarnya',
    interaktif: { fungsi: 'pasar', fase: 1, tawaran: 'Jual beli dengan pedagang NPC di pasar.', sapaan: 'Mau beli apa, Nak? Jangan nawar separuh harga, nanti saya marah.' },
  },
  {
    id: 'npc-014', nama: 'Pak Jalil Bahari', umur: 66, jk: 'L', peran: 'Juragan perahu senior', tempatKerja: 'tpi', tempatTinggal: 'kampung-nelayan', watak: 'bijak dan hafal laut',
    interaktif: { fungsi: 'usaha-perahu', fase: 1, tawaran: 'Membuka usaha Perahu Nelayan (modal Rp 3.000.000).', sapaan: 'Laut tidak pernah pelit pada yang sabar. Mau coba punya perahu sendiri?' },
  },
  {
    id: 'npc-015', nama: 'Mas Bayu Pratama', umur: 29, jk: 'L', peran: 'Wartawan Koran Weton', tempatKerja: 'koran-weton', tempatTinggal: 'kost-melati', watak: 'ingin tahu dan cepat bicara',
    interaktif: { fungsi: 'koran', fase: 0, tawaran: 'Koran Kota dan wawancara untuk berita.', sapaan: 'Ada kabar apa dari kapal tadi? Siapa tahu besok pagi masuk koran.' },
  },
  {
    id: 'npc-016', nama: 'dr. Sari Kartika', umur: 41, jk: 'P', peran: 'Dokter RSUD Weton', tempatKerja: 'rs-weton', tempatTinggal: 'perumahan', watak: 'tenang',
    interaktif: { fungsi: 'kesehatan', fase: 2, tawaran: 'Memulihkan Tenaga lebih cepat dengan biaya.', sapaan: 'Kerja boleh keras, tapi tidur tetap perlu. Tubuh bukan mesin.' },
  },
  {
    id: 'npc-017', nama: 'Pak Sugeng Raharjo', umur: 50, jk: 'L', peran: 'Mandor Pelabuhan', tempatKerja: 'gudang-pelabuhan', tempatTinggal: 'kampung-nelayan', watak: 'keras tapi adil',
    interaktif: { fungsi: 'mandor', fase: 0, tawaran: 'Pekerjaan pelabuhan dan jalur naik jadi mandor.', sapaan: 'Tenaga ada? Barang menunggu. Yang rajin saya ingat, yang malas saya juga ingat.' },
  },
  {
    id: 'npc-018', nama: 'Mas Bagas Aditya', umur: 20, jk: 'L', peran: 'Mahasiswa', tempatKerja: 'univ-fakultas', tempatTinggal: 'rusun-weton', watak: 'santai dan suka membantu',
    interaktif: { fungsi: 'teman-sekamar', fase: 0, tawaran: 'Teman sekamar NPC di Rusunawa selama belum ada pemain lain.', sapaan: 'Santai aja, kasurku yang atas. Kalau berisik, bilang ya.' },
  },
  {
    id: 'npc-019', nama: 'Kang Ujang Suryana', umur: 44, jk: 'L', peran: 'Sopir angkot', tempatKerja: 'terminal-pelabuhan', tempatTinggal: 'kost-melati', watak: 'riang dan suka bernyanyi',
    interaktif: { fungsi: 'transportasi', fase: 2, tawaran: 'Naik angkot ke tempat lain di kota.', sapaan: 'Naik, naik! Kiri, kiri! Ongkosnya murah, ceritanya gratis.' },
  },
  {
    id: 'npc-020', nama: 'Bu Hajjah Fatimah', umur: 59, jk: 'P', peran: 'Ketua PKK dan tokoh masyarakat', tempatKerja: 'masjid-agung', tempatTinggal: 'perumahan', watak: 'dermawan',
    interaktif: { fungsi: 'arisan', fase: 3, tawaran: 'Membentuk dan mengikuti arisan warga.', sapaan: 'Arisan ibu-ibu sudah penuh, tapi untukmu selalu ada kursi.' },
  },
  {
    id: 'npc-021', nama: 'Pak Lukas Mandowen', umur: 37, jk: 'L', peran: 'Pemilik Bengkel Motor', tempatKerja: 'bengkel', tempatTinggal: 'kampung-nelayan', watak: 'cekatan',
    interaktif: { fungsi: 'bengkel', fase: 0, tawaran: 'Pekerjaan montir dan kepala bengkel.', sapaan: 'Anak SMK otomotif? Bagus, tangan saya butuh bantuan.' },
  },
]

type Baris = readonly [nama: string, umur: number, jk: 'L' | 'P', peran: string, kerja: string | null, tinggal: string, watak: string]

// 79 NPC latar: mengisi kota, muncul di Koran Kota, dan menjadi teman bicara saat percakapan diperluas.
const latar: Baris[] = [
  // Pelabuhan
  ['Daeng Rahim', 47, 'L', 'Nelayan pemilik perahu', 'tpi', 'kampung-nelayan', 'pendiam dan tajam membaca cuaca'],
  ['Cak Bambang', 38, 'L', 'Buruh bongkar ikan', 'tpi', 'kampung-nelayan', 'ramah dan suka melucu'],
  ['Yuyun Sulastri', 44, 'P', 'Pedagang ikan lelang', 'tpi', 'kampung-nelayan', 'lantang dan cekatan menawar'],
  ['Hasan Basri', 41, 'L', 'Kuli angkut pelabuhan', 'gudang-pelabuhan', 'kampung-nelayan', 'kuat dan jarang bicara'],
  ['Marthen Rumbiak', 33, 'L', 'Kuli angkut pelabuhan', 'gudang-pelabuhan', 'kost-melati', 'rajin dan jago bernyanyi'],
  ['Bang Hotma Sitorus', 49, 'L', 'Operator derek', 'lapangan-kontainer', 'perumahan', 'suara besar, hati lembut'],
  ['Pak Dedi Sutisna', 36, 'L', 'Admin gudang', 'gudang-pelabuhan', 'kost-mawar', 'teliti soal angka'],
  ['Kang Asep Maulana', 29, 'L', 'Tukang ojek pangkalan', 'terminal-pelabuhan', 'kampung-nelayan', 'ramah pada pendatang'],
  ['Pak Johan Tanuwijaya', 56, 'L', 'Agen tiket kapal', 'terminal-pelabuhan', 'perumahan', 'perhitungan tapi jujur'],
  ['Bu Yohana Lenggu', 35, 'P', 'Petugas karcis', 'terminal-pelabuhan', 'kost-mawar', 'tertib dan murah senyum'],
  ['Pak Karto Wibisono', 68, 'L', 'Penjaga mercusuar', 'mercusuar', 'kampung-nelayan', 'penyendiri dan hafal bintang'],
  ['Nakhoda Burhan Lubis', 52, 'L', 'Nakhoda KM Segara Mulia', 'dermaga', 'perumahan', 'berwibawa dan gemar bercerita pelayaran'],
  // Pasar
  ['Mpok Nurhayati', 50, 'P', 'Pedagang ayam', 'pasar-weton', 'kampung-nelayan', 'blak-blakan'],
  ['Koh Budi Santoso', 54, 'L', 'Pedagang beras', 'pasar-weton', 'perumahan', 'teliti dan dermawan diam-diam'],
  ['Bu Wayan Sari', 42, 'P', 'Pedagang buah', 'pasar-weton', 'kost-mawar', 'ceria'],
  ['Mbok Painem', 61, 'P', 'Penjual jamu gendong', 'pasar-weton', 'kampung-nelayan', 'sabar dengan resep turun-temurun'],
  ['Mang Oding', 45, 'L', 'Juru parkir', 'pasar-weton', 'kampung-nelayan', 'hafal semua plat motor'],
  ['Uda Fadli', 39, 'L', 'Pemilik rumah makan Padang', 'rm-padang', 'perumahan', 'bangga pada rendangnya'],
  ['Ci Meiling Tan', 47, 'P', 'Pedagang kain', 'pasar-weton', 'perumahan', 'halus bicara dan bermata jeli'],
  ['Bang Juned', 34, 'L', 'Buruh panggul pasar', 'pasar-weton', 'kost-melati', 'humoris'],
  ['Pak Ridwan', 57, 'L', 'Kepala Pasar Weton', 'pasar-weton', 'perumahan', 'tegas soal kebersihan'],
  // Pusat kota
  ['Bu Titin Hartati', 45, 'P', 'Sekretaris Balai Kota', 'balai-kota', 'perumahan', 'rapi dan pantang terlambat'],
  ['Pak Anwar Siregar', 51, 'L', 'Kepala Dinas Masyarakat', 'dinas-masyarakat', 'perumahan', 'bersemangat soal kota bersih'],
  ['Mbak Citra', 26, 'P', 'Petugas layanan KTP Kota', 'balai-kota', 'kost-mawar', 'sabar menjelaskan'],
  ['Pak Bondan', 40, 'L', 'Komandan regu pemadam kebakaran', 'damkar', 'kampung-nelayan', 'bangun paling pagi, sigap saat sirene'],
  ['Pak Ir. Surya Pranoto', 48, 'L', 'Konsultan proyek kota', 'balai-kota', 'perumahan', 'cerewet soal kualitas'],
  ['Mbak Ayu Lestari', 27, 'P', 'Staf layanan Bank Weton', 'bank-weton', 'kost-mawar', 'ramah dan profesional'],
  ['Pak Agus', 35, 'L', 'Satpam bank', 'bank-weton', 'rusun-weton', 'waspada tapi suka menyapa'],
  ['Bu Maya Kusumawati', 43, 'P', 'Manajer Bank Weton', 'bank-weton', 'perumahan', 'dingin saat kerja, hangat di luar'],
  ['Mas Dimas', 28, 'L', 'Fotografer Koran Weton', 'koran-weton', 'kost-melati', 'suka mengejar momen'],
  ['Bu Endang Sulistyowati', 53, 'P', 'Pemimpin redaksi Koran Weton', 'koran-weton', 'perumahan', 'galak soal ejaan'],
  ['Mbak Nia', 25, 'P', 'Kasir minimarket', 'minimarket', 'kost-melati', 'cepat dan hafal pelanggan'],
  ['Mas Ferry', 31, 'L', 'Supervisor minimarket', 'minimarket', 'kost-mawar', 'suka membuat jadwal'],
  ['Kak Sinta', 23, 'P', 'Barista Kafe Dermaga', 'kafe', 'kost-mawar', 'hafal pesanan langganan'],
  ['Pak Kadir', 42, 'L', 'Montir bengkel', 'bengkel', 'kampung-nelayan', 'menebak kerusakan dari suara'],
  ['Pak Wahyu', 39, 'L', 'Instruktur BLK', 'blk', 'kost-mawar', 'sabar mengajar dari nol'],
  ['Mbak Ika', 30, 'P', 'Staf Bursa Kerja', 'bursa-kerja', 'kost-mawar', 'hafal syarat tiap lowongan'],
  ['Pak Rustam', 46, 'L', 'Pemilik warung pantai', 'warung-pantai', 'kampung-nelayan', 'dermawan dan suka mi rebus pedas'],
  // Pendidikan
  ['Prof. Dr. Harsono Atmaja', 62, 'L', 'Rektor Universitas Weton', 'univ-rektorat', 'perumahan', 'tenang dan visioner'],
  ['Dr. Siti Nurjanah', 45, 'P', 'Dosen Teknik Sipil', 'univ-fakultas', 'perumahan', 'kritis dan suka turun ke lapangan'],
  ['Dr. Kevin Hartanto', 38, 'L', 'Dosen Informatika', 'univ-fakultas', 'kost-anggrek', 'santai dan suka kopi'],
  ['Bu Marlina Sari', 41, 'P', 'Dosen Akuntansi', 'univ-fakultas', 'perumahan', 'teliti dan tegas'],
  ['Pak Gunawan', 50, 'L', 'Dosen Perikanan dan Kelautan', 'univ-fakultas', 'perumahan', 'cinta laut'],
  ['Bu Wulan', 37, 'P', 'Pustakawan', 'univ-perpustakaan', 'kost-mawar', 'pelan bicara, cepat menemukan buku'],
  ['Tiara', 20, 'P', 'Mahasiswa Keperawatan', 'univ-fakultas', 'rusun-weton', 'rajin dan selalu membawa buku'],
  ['Rafli', 19, 'L', 'Mahasiswa Teknik', 'univ-fakultas', 'rusun-weton', 'penasaran dan suka membongkar barang'],
  ['Putri Ayuningtyas', 21, 'P', 'Mahasiswa Komunikasi', 'univ-fakultas', 'kost-melati', 'suka merekam segalanya'],
  ['Pak Saiful', 54, 'L', 'Kepala SMA Negeri 1 Weton', 'sma-negeri', 'perumahan', 'bijak dan suka berpantun'],
  ['Bu Yeni', 40, 'P', 'Guru Matematika', 'sma-negeri', 'perumahan', 'sabar mengulang penjelasan'],
  ['Pak Dodi', 43, 'L', 'Guru Otomotif SMK', 'smk-negeri', 'kampung-nelayan', 'tangan kotor, hati bersih'],
  ['Bu Ani', 36, 'P', 'Guru Perhotelan SMK', 'smk-negeri', 'kost-mawar', 'rapi dan penuh senyum'],
  // Kesehatan
  ['Ratih', 29, 'P', 'Perawat', 'rs-weton', 'kost-mawar', 'tenang saat keadaan genting'],
  ['Joko', 33, 'L', 'Perawat', 'rs-weton', 'rusun-weton', 'humoris dan sering lembur'],
  ['Linda', 34, 'P', 'Apoteker', 'rs-weton', 'perumahan', 'teliti soal dosis'],
  ['Pak Parman', 50, 'L', 'Satpam RSUD', 'rs-weton', 'kampung-nelayan', 'hafal jam besuk'],
  ['dr. Gede Arya', 47, 'L', 'Dokter jaga', 'rs-weton', 'perumahan', 'tenang dan hangat'],
  // Pantai
  ['Kak Rina', 24, 'P', 'Resepsionis Hotel Pantai', 'hotel-pantai', 'kost-mawar', 'ramah dan fasih beberapa bahasa'],
  ['Pak Made Wirawan', 45, 'L', 'Manajer Hotel Pantai', 'hotel-pantai', 'perumahan', 'disiplin soal pelayanan'],
  ['Chef Aji', 38, 'L', 'Koki restoran seafood', 'resto-seafood', 'perumahan', 'perfeksionis soal bumbu'],
  ['Mbak Wati', 28, 'P', 'Pelayan restoran seafood', 'resto-seafood', 'kampung-nelayan', 'gesit dan hafal menu'],
  ['Mas Reno', 26, 'L', 'Penjaga pantai', 'warung-pantai', 'kost-melati', 'atletis dan waspada'],
  ['Mbak Santi', 32, 'P', 'Penjual kelapa muda', 'warung-pantai', 'kampung-nelayan', 'suka mengobrol'],
  ['Bang Ucok', 40, 'L', 'Pemandu wisata pantai', 'hotel-pantai', 'kost-melati', 'pandai bercerita'],
  ['Pak Ketut', 52, 'L', 'Penyewa payung dan alat pantai', 'warung-pantai', 'kampung-nelayan', 'santai dan suka bersiul'],
  // Kampung dan perumahan
  ['Bu Tuti', 48, 'P', 'Ibu rumah tangga', null, 'kampung-nelayan', 'tahu semua kabar kampung'],
  ['Pak Haji Sholeh', 66, 'L', 'Pensiunan guru', null, 'perumahan', 'suka menasihati'],
  ['Nenek Ramini', 74, 'P', 'Penjual kue tradisional', null, 'kampung-nelayan', 'pelupa tapi murah hati'],
  ['Mbak Lina', 31, 'P', 'Penjahit', null, 'kampung-nelayan', 'teliti dan cepat'],
  ['Serka Arman Hidayat', 37, 'L', 'Babinsa Kodim Weton', 'markas-kodim', 'kampung-nelayan', 'mudah tertawa, disegani anak muda'],
  ['Aipda Eko Prasetyo', 44, 'L', 'Polisi Polsek Weton', 'kantor-polisi', 'perumahan', 'hafal semua wajah warga'],
  ['Dimas', 12, 'L', 'Pelajar SD', null, 'kampung-nelayan', 'ingin menjadi nakhoda'],
  ['Salsa', 10, 'P', 'Pelajar SD', null, 'perumahan', 'banyak bertanya'],
  ['Rangga', 15, 'L', 'Pelajar SMP', null, 'kampung-nelayan', 'jago sepak bola'],
  ['Nadia', 17, 'P', 'Siswi kelas 12', 'sma-negeri', 'perumahan', 'ingin kuliah di Universitas Weton'],
  ['Pak Haji Anwar', 60, 'L', 'Pengusaha kapal kecil', null, 'perumahan', 'tegas dalam bisnis'],
  ['Bu Sumi', 52, 'P', 'Tukang pijat', null, 'kampung-nelayan', 'tangan hangat, lidah tajam'],
  // Proyek lahan industri
  ['Pak Darwis', 46, 'L', 'Mandor proyek lahan industri', 'papan-proyek', 'kost-melati', 'keras tapi peduli'],
  ['Tegar', 27, 'L', 'Surveyor', 'papan-proyek', 'rusun-weton', 'bersemangat dengan peta'],
  ['Pak Ngatimin', 50, 'L', 'Operator alat berat', 'papan-proyek', 'kampung-nelayan', 'tenang dan jarang bicara'],
]

const nomor = (n: number) => `npc-${String(n).padStart(3, '0')}`

export const npc: Npc[] = [
  ...interaktif,
  ...latar.map(([nama, umur, jk, peran, tempatKerja, tempatTinggal, watak], i): Npc => ({
    id: nomor(interaktif.length + i + 1), nama, umur, jk, peran, tempatKerja, tempatTinggal, watak,
  })),
]

export const npcInteraktif = npc.filter((n) => n.interaktif)
export const npcDi = (jenisBangunan: string) => npc.filter((n) => n.tempatKerja === jenisBangunan)
