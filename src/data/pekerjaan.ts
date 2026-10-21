import type { Fase } from './tipe.ts'
import type { Tier } from './ekonomi.ts'

export type Pendidikan = 'SMA/SMK' | 'D3' | 'S1'

export type Pekerjaan = {
  id: string
  nama: string
  tier: Tier
  minKeahlian: number
  /** Ijazah minimum. SMA/SMK berarti terbuka untuk semua pemain baru. */
  pendidikan: Pendidikan
  /** id jurusan yang diterima; kosong berarti semua jurusan pada jenjang itu */
  jurusan?: string[]
  /** jenis bangunan tempat kerja */
  tempat: string
  ringkas: string
  fase: Fase
  /** baru tersedia setelah Kawasan Industri dibuka */
  terkunci?: boolean
}

// Semua pemain baru lulusan SMA/SMK. Daftar ini adalah satu-satunya yang terbuka sebelum kuliah.
export const pekerjaanSmaSmk: Pekerjaan[] = [
  // Tier 1: tanpa Keahlian
  { id: 'kuli-angkut', nama: 'Kuli angkut pelabuhan', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'gudang-pelabuhan', ringkas: 'Memanggul barang dari kapal ke gudang.', fase: 0 },
  { id: 'ojek-pangkalan', nama: 'Tukang ojek pangkalan', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'terminal-pelabuhan', ringkas: 'Mengantar penumpang kapal ke tujuan di dalam kota.', fase: 0 },
  { id: 'pelayan-warung', nama: 'Pelayan warung pantai', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'warung-pantai', ringkas: 'Melayani pembeli kelapa muda dan mi rebus.', fase: 0 },
  { id: 'pramuniaga', nama: 'Pramuniaga minimarket', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'minimarket', ringkas: 'Menata rak dan melayani pembeli.', fase: 0 },
  { id: 'pelayan-kafe', nama: 'Pelayan kafe', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'kafe', ringkas: 'Mengantar pesanan dan membersihkan meja.', fase: 0 },
  { id: 'petugas-kebersihan', nama: 'Petugas kebersihan kota', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'balai-kota', ringkas: 'Menyapu jalan dan mengangkut sampah, tenaga honorer.', fase: 0 },
  { id: 'buruh-ikan', nama: 'Buruh bongkar ikan', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'tpi', ringkas: 'Membongkar tangkapan dan menata peti ikan.', fase: 1 },
  { id: 'buruh-pasar', nama: 'Buruh panggul pasar', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'pasar-weton', ringkas: 'Memanggul belanjaan pedagang dan pembeli.', fase: 1 },
  { id: 'juru-parkir', nama: 'Juru parkir', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'pasar-weton', ringkas: 'Mengatur parkir motor di depan pasar.', fase: 1 },

  // Tier 2: Keahlian 3
  { id: 'admin-gudang', nama: 'Admin gudang', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'gudang-pelabuhan', ringkas: 'Mencatat barang masuk dan keluar.', fase: 0 },
  { id: 'kasir-minimarket', nama: 'Kasir minimarket', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'minimarket', ringkas: 'Memegang kasir dan menghitung setoran.', fase: 0 },
  { id: 'barista', nama: 'Barista', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'kafe', ringkas: 'Meracik kopi dan minuman.', fase: 0 },
  { id: 'pelayan-resto', nama: 'Pelayan restoran seafood', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'resto-seafood', ringkas: 'Melayani tamu di tepi pantai.', fase: 0 },
  { id: 'montir', nama: 'Montir motor', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'bengkel', ringkas: 'Servis motor warga. Cocok untuk lulusan SMK otomotif.', fase: 0 },
  { id: 'sopir-angkot', nama: 'Sopir angkot', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'terminal-pelabuhan', ringkas: 'Membawa penumpang berkeliling rute kota.', fase: 0 },
  { id: 'satpam-bank', nama: 'Satpam bank', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'bank-weton', ringkas: 'Menjaga pintu dan mengatur antrean.', fase: 1 },
  { id: 'resepsionis-hotel', nama: 'Resepsionis hotel', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'hotel-pantai', ringkas: 'Menyambut tamu dan mengurus kamar. Cocok untuk lulusan SMK perhotelan.', fase: 1 },

  // Tier 3: Keahlian 6. Batas tertinggi untuk lulusan SMA/SMK tanpa gelar.
  { id: 'mandor-pelabuhan', nama: 'Mandor pelabuhan', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'gudang-pelabuhan', ringkas: 'Memimpin regu kuli dan mengatur jadwal bongkar muat.', fase: 0 },
  { id: 'supervisor-minimarket', nama: 'Supervisor minimarket', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'minimarket', ringkas: 'Mengatur shift dan stok toko.', fase: 0 },
  { id: 'koki-resto', nama: 'Koki restoran seafood', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'resto-seafood', ringkas: 'Memimpin dapur ikan bakar.', fase: 0 },
  { id: 'kepala-bengkel', nama: 'Kepala bengkel', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'bengkel', ringkas: 'Memegang pekerjaan servis berat dan melatih montir baru.', fase: 0 },
  { id: 'staf-honorer', nama: 'Staf honorer balai kota', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'balai-kota', ringkas: 'Mengurus berkas layanan warga.', fase: 0 },
  { id: 'staf-redaksi', nama: 'Staf redaksi junior', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'koran-weton', ringkas: 'Menyunting naskah dan memeriksa fakta untuk Koran Kota.', fase: 0 },
  { id: 'kepala-shift-hotel', nama: 'Kepala shift hotel', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'hotel-pantai', ringkas: 'Memimpin petugas hotel dalam satu shift.', fase: 1 },
  { id: 'juru-mudi', nama: 'Juru mudi kapal kecil', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'dermaga', ringkas: 'Mengemudikan kapal angkut dalam teluk. Cocok untuk lulusan SMK pelayaran.', fase: 1 },
  // Layanan keamanan dan darurat
  { id: 'tamtama-tni', nama: 'Tamtama TNI', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'markas-kodim', ringkas: 'Prajurit jaga dan apel pagi di Markas Kodim.', fase: 0 },
  { id: 'petugas-damkar', nama: 'Petugas pemadam kebakaran', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'damkar', ringkas: 'Merawat selang dan ikut regu saat sirene berbunyi.', fase: 0 },
  { id: 'bintara-polisi', nama: 'Bintara polisi', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'kantor-polisi', ringkas: 'Berjaga di Polsek dan patroli keliling kota.', fase: 0 },
  { id: 'bintara-tni', nama: 'Bintara TNI', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'markas-kodim', ringkas: 'Babinsa yang membina kampung dan kerja bakti.', fase: 0 },
  { id: 'brigadir-polisi', nama: 'Brigadir polisi', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'kantor-polisi', ringkas: 'Memimpin regu patroli dan razia.', fase: 0 },
  { id: 'sersan-tni', nama: 'Sersan TNI', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'markas-kodim', ringkas: 'Memimpin regu dan latihan prajurit.', fase: 0 },
  { id: 'danru-damkar', nama: 'Komandan regu pemadam', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'damkar', ringkas: 'Memimpin regu pemadam di lapangan.', fase: 0 },

  // Usaha
  { id: 'pelayan-padang', nama: 'Pelayan rumah makan Padang', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'rm-padang', ringkas: 'Menghidang piring lauk bertumpuk ke meja tamu.', fase: 0 },
  { id: 'juru-masak-padang', nama: 'Juru masak Padang', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'rm-padang', ringkas: 'Mengaduk rendang berjam-jam di dapur Uda Fadli.', fase: 0 },
  { id: 'kasir-alpa', nama: 'Kasir Alpa Maret', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'alpa-maret', ringkas: 'Menyapa pembeli dan menawarkan pulsa.', fase: 0 },
  { id: 'pramuniaga-indo', nama: 'Pramuniaga Indo April', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'indo-april', ringkas: 'Menata rak dan menawarkan promo minggu ini.', fase: 0 },
  { id: 'kepala-toko-alpa', nama: 'Kepala toko Alpa Maret', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'alpa-maret', ringkas: 'Mengatur stok dan shift toko.', fase: 0 },
  { id: 'kepala-toko-indo', nama: 'Kepala toko Indo April', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'indo-april', ringkas: 'Mengatur stok dan shift toko.', fase: 0 },

  // Pabrik besar
  { id: 'operator-otomotif', nama: 'Operator perakitan mobil', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'pabrik-otomotif', ringkas: 'Memasang komponen di lini perakitan.', fase: 0 },
  { id: 'penjahit-garmen', nama: 'Penjahit garmen', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'pabrik-garmen', ringkas: 'Menjahit pakaian sesuai pola di lini produksi.', fase: 0 },
  { id: 'operator-makanan', nama: 'Operator pengemasan', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'pabrik-makanan', ringkas: 'Mengawasi mesin kemas makanan ringan dan minuman.', fase: 0 },
  { id: 'teknisi-otomotif', nama: 'Teknisi mesin otomotif', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'pabrik-otomotif', ringkas: 'Menyetel mesin dan robot las. Cocok untuk lulusan SMK otomotif.', fase: 0 },
  { id: 'qc-garmen', nama: 'Pemeriksa mutu garmen', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'pabrik-garmen', ringkas: 'Memeriksa jahitan dan ukuran sebelum dikemas.', fase: 0 },
  { id: 'qc-makanan', nama: 'Analis mutu pangan', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'pabrik-makanan', ringkas: 'Menguji contoh produk di laboratorium pabrik.', fase: 0 },
  { id: 'supervisor-otomotif', nama: 'Supervisor produksi otomotif', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'pabrik-otomotif', ringkas: 'Memimpin satu lini perakitan.', fase: 0 },
  { id: 'supervisor-garmen', nama: 'Supervisor produksi garmen', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'pabrik-garmen', ringkas: 'Memimpin puluhan penjahit dalam satu shift.', fase: 0 },
  { id: 'supervisor-makanan', nama: 'Supervisor produksi pangan', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'pabrik-makanan', ringkas: 'Memimpin lini kemas dan menjaga target harian.', fase: 0 },

  // PNS Dinas Kota, jenjang 1 sampai 3 untuk lulusan SMA/SMK
  { id: 'pns-masyarakat-1', nama: 'Juru Muda Dinas Masyarakat', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'dinas-masyarakat', ringkas: 'Melayani KTP dan surat warga di loket.', fase: 0 },
  { id: 'pns-pendidikan-1', nama: 'Juru Muda Dinas Pendidikan', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'dinas-pendidikan', ringkas: 'Mengurus arsip sekolah negeri.', fase: 0 },
  { id: 'pns-kepegawaian-1', nama: 'Juru Muda Dinas Kepegawaian', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'dinas-kepegawaian', ringkas: 'Mengurus berkas absensi pegawai.', fase: 0 },
  { id: 'pns-ekonomi-1', nama: 'Juru Muda Dinas Ekonomi', tier: 1, minKeahlian: 1, pendidikan: 'SMA/SMK', tempat: 'dinas-ekonomi', ringkas: 'Melayani loket izin usaha kecil.', fase: 0 },
  { id: 'pns-masyarakat-2', nama: 'Pengatur Muda Dinas Masyarakat', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'dinas-masyarakat', ringkas: 'Mendata warga penerima bantuan.', fase: 0 },
  { id: 'pns-pendidikan-2', nama: 'Pengatur Muda Dinas Pendidikan', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'dinas-pendidikan', ringkas: 'Mengelola data siswa dan beasiswa.', fase: 0 },
  { id: 'pns-kepegawaian-2', nama: 'Pengatur Muda Dinas Kepegawaian', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'dinas-kepegawaian', ringkas: 'Menyiapkan seleksi pegawai baru.', fase: 0 },
  { id: 'pns-ekonomi-2', nama: 'Pengatur Muda Dinas Ekonomi', tier: 2, minKeahlian: 3, pendidikan: 'SMA/SMK', tempat: 'dinas-ekonomi', ringkas: 'Memantau harga di Pasar Weton.', fase: 0 },
  { id: 'pns-masyarakat-3', nama: 'Penata Muda Dinas Masyarakat', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'dinas-masyarakat', ringkas: 'Memimpin program pemberdayaan kampung.', fase: 0 },
  { id: 'pns-pendidikan-3', nama: 'Penata Muda Dinas Pendidikan', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'dinas-pendidikan', ringkas: 'Mengawasi sekolah dan pelatihan guru.', fase: 0 },
  { id: 'pns-kepegawaian-3', nama: 'Penata Muda Dinas Kepegawaian', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'dinas-kepegawaian', ringkas: 'Mengatur mutasi dan kenaikan jabatan.', fase: 0 },
  { id: 'pns-ekonomi-3', nama: 'Penata Muda Dinas Ekonomi', tier: 3, minKeahlian: 6, pendidikan: 'SMA/SMK', tempat: 'dinas-ekonomi', ringkas: 'Membina koperasi dan usaha warga.', fase: 0 },
]

// Pekerjaan profesional: terkunci sampai pemain lulus dari Universitas Weton. D3 membuka Tier 4, S1 membuka Tier 5.
export const pekerjaanProfesional: Pekerjaan[] = [
  { id: 'perawat', nama: 'Perawat', tier: 4, minKeahlian: 3, pendidikan: 'D3', jurusan: ['d3-keperawatan'], tempat: 'rs-weton', ringkas: 'Merawat pasien di RSUD Weton.', fase: 2 },
  { id: 'manajer-hotel', nama: 'Manajer hotel', tier: 4, minKeahlian: 3, pendidikan: 'D3', jurusan: ['d3-perhotelan'], tempat: 'hotel-pantai', ringkas: 'Mengelola operasional Hotel Pantai Weton.', fase: 2 },
  { id: 'teller-bank', nama: 'Teller dan staf layanan bank', tier: 4, minKeahlian: 3, pendidikan: 'D3', jurusan: ['d3-perbankan'], tempat: 'bank-weton', ringkas: 'Melayani transaksi tabungan dan kasbon warga.', fase: 2 },
  { id: 'staf-kredit', nama: 'Staf kredit bank', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-akuntansi'], tempat: 'bank-weton', ringkas: 'Menilai permohonan kasbon dan pinjaman usaha.', fase: 2 },
  { id: 'guru', nama: 'Guru', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-pendidikan'], tempat: 'sma-negeri', ringkas: 'Mengajar di SMA atau SMK Negeri.', fase: 3 },
  { id: 'wartawan', nama: 'Wartawan', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-komunikasi'], tempat: 'koran-weton', ringkas: 'Meliput kejadian kota untuk Koran Kota.', fase: 2 },
  { id: 'insinyur-sipil', nama: 'Insinyur sipil', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-teknik-sipil'], tempat: 'balai-kota', ringkas: 'Merancang dan mengawasi proyek gotong royong kota.', fase: 2 },
  { id: 'staf-it', nama: 'Staf teknologi informasi', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-informatika'], tempat: 'balai-kota', ringkas: 'Menjaga sistem layanan kota dan situs Balai Kota.', fase: 2 },
  { id: 'penyuluh-perikanan', nama: 'Penyuluh perikanan', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-perikanan'], tempat: 'tpi', ringkas: 'Membina nelayan dan menjaga mutu ikan.', fase: 2 },
  { id: 'pns-balai-kota', nama: 'Pegawai negeri Balai Kota', tier: 5, minKeahlian: 3, pendidikan: 'S1', tempat: 'balai-kota', ringkas: 'Terbuka untuk lulusan S1 jurusan apa pun.', fase: 2 },
  { id: 'insinyur-industri', nama: 'Insinyur industri', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-teknik-industri'], tempat: 'pabrik-otomotif', ringkas: 'Mengatur alur produksi pabrik otomotif.', fase: 2 },
  { id: 'manajer-produksi', nama: 'Manajer produksi', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-teknik-industri', 's1-manajemen'], tempat: 'pabrik-makanan', ringkas: 'Memimpin seluruh lini produksi pabrik makanan.', fase: 2 },

  // PNS Dinas Kota, jenjang 4 (D3) dan 5 (S1)
  { id: 'pns-masyarakat-4', nama: 'Pembina Muda Dinas Masyarakat', tier: 4, minKeahlian: 3, pendidikan: 'D3', jurusan: ['d3-keperawatan', 'd3-perhotelan'], tempat: 'dinas-masyarakat', ringkas: 'Menyusun kebijakan sosial kota.', fase: 2 },
  { id: 'pns-pendidikan-4', nama: 'Pembina Muda Dinas Pendidikan', tier: 4, minKeahlian: 3, pendidikan: 'D3', tempat: 'dinas-pendidikan', ringkas: 'Menyusun program pendidikan kota.', fase: 2 },
  { id: 'pns-kepegawaian-4', nama: 'Pembina Muda Dinas Kepegawaian', tier: 4, minKeahlian: 3, pendidikan: 'D3', jurusan: ['d3-perbankan'], tempat: 'dinas-kepegawaian', ringkas: 'Menyusun formasi pegawai kota.', fase: 2 },
  { id: 'pns-ekonomi-4', nama: 'Pembina Muda Dinas Ekonomi', tier: 4, minKeahlian: 3, pendidikan: 'D3', jurusan: ['d3-perbankan'], tempat: 'dinas-ekonomi', ringkas: 'Menyusun rencana ekonomi kota.', fase: 2 },
  { id: 'pns-masyarakat-5', nama: 'Pembina Utama Dinas Masyarakat', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-komunikasi', 's1-perikanan'], tempat: 'dinas-masyarakat', ringkas: 'Memimpin Dinas Masyarakat.', fase: 2 },
  { id: 'pns-pendidikan-5', nama: 'Pembina Utama Dinas Pendidikan', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-pendidikan'], tempat: 'dinas-pendidikan', ringkas: 'Memimpin Dinas Pendidikan.', fase: 2 },
  { id: 'pns-kepegawaian-5', nama: 'Pembina Utama Dinas Kepegawaian', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-manajemen', 's1-informatika'], tempat: 'dinas-kepegawaian', ringkas: 'Memimpin Dinas Kepegawaian.', fase: 2 },
  { id: 'pns-ekonomi-5', nama: 'Pembina Utama Dinas Ekonomi', tier: 5, minKeahlian: 3, pendidikan: 'S1', jurusan: ['s1-akuntansi', 's1-manajemen'], tempat: 'dinas-ekonomi', ringkas: 'Memimpin Dinas Ekonomi.', fase: 2 },
]

export const semuaPekerjaan = [...pekerjaanSmaSmk, ...pekerjaanProfesional]
export const pekerjaanDi = (jenisBangunan: string) => semuaPekerjaan.filter((p) => p.tempat === jenisBangunan)
