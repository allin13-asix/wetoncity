// Alur pemain baru: tiba di pelabuhan, menyebut latar sekolah, memilih tempat tinggal, berkeliling kota, lalu mencari kerja.
// Untuk pemain yang sudah masuk, pilihan sekolah, tempat tinggal, dan pekerjaan langsung disimpan.
// Pemandu: Mbak Laras (npc-001).

export type LangkahTur = {
  jenis: 'sapa' | 'sekolah' | 'hunian' | 'fasilitas' | 'misi'
  /** id penempatan di peta tempat kamera berhenti */
  bangunan: string
  judul: string
  teks: string
}

export const tur: LangkahTur[] = [
  {
    jenis: 'sapa', bangunan: 'terminal-pelabuhan', judul: 'Selamat datang di Weton City',
    teks: 'Baru turun dari KM Segara Mulia? Perjalanan jauh ya. Saya Laras, petugas pelabuhan. Ini bekal Rp 1.000.000 dari kampung halamanmu. Pakai dengan hati-hati, tujuh hari lagi sudah ada tagihan bulanan.',
  },
  {
    jenis: 'sekolah', bangunan: 'terminal-pelabuhan', judul: 'Dulu sekolah di mana?',
    teks: 'Biar saya bisa menunjukkan pekerjaan yang pas, ceritakan dulu sekolahmu di kampung. Lulusan SMK langsung cocok di bidangnya; lulusan SMA lebih mudah kerja kantor dan kuliah.',
  },
  {
    jenis: 'hunian', bangunan: 'kost-melati-1', judul: 'Pilih tempat tinggal',
    teks: 'Cari tempat tinggal dulu. Murah belum tentu buruk, mahal belum tentu cocok. Kamarnya terbatas: Kost Melati 4 kamar, Mawar 6, Anggrek 8, Rusunawa 30 kamar berdua, Hotel 20 kamar berdua. Nanti kamu juga bisa pindah dengan mengetuk gedungnya di peta.',
  },
  {
    jenis: 'fasilitas', bangunan: 'bursa-kerja', judul: 'Bursa Kerja',
    teks: 'Di sini kamu mencari pekerjaan. Semua pendatang lulusan SMA atau SMK, jadi yang terbuka adalah pekerjaan yang cukup dengan ijazah itu.',
  },
  {
    jenis: 'fasilitas', bangunan: 'blk', judul: 'Balai Latihan Kerja',
    teks: 'Kursus di sini menaikkan Keahlian. Keahlian 3 membuka pekerjaan Tier 2, dan Keahlian 6 membuka Tier 3. Ketuk gedungnya di peta untuk ikut kursus.',
  },
  {
    jenis: 'fasilitas', bangunan: 'pasar-weton', judul: 'Pasar Weton',
    teks: 'Tempat warga jual beli. Harga naik turun mengikuti pasokan, jadi perhatikan kapan menjual.',
  },
  {
    jenis: 'fasilitas', bangunan: 'bank-weton', judul: 'Bank Weton',
    teks: 'Menabung dan melunasi kasbon. Kalau tagihan belum terbayar, selisihnya menjadi kasbon dengan bunga 10 persen sebulan.',
  },
  {
    jenis: 'fasilitas', bangunan: 'univ-rektorat', judul: 'Universitas Weton',
    teks: 'Mau jadi perawat, guru, atau insinyur? Itu butuh gelar. Satu semester kira-kira satu minggu, dan kuliah sambil kerja boleh.',
  },
  {
    jenis: 'fasilitas', bangunan: 'balai-kota', judul: 'Balai Kota',
    teks: 'KTP Kota-mu ada di Beranda: ketuk kartu status di pojok kiri atas. Datang ke sini tiap hari untuk bonus harian, dan untuk membeli lahan.',
  },
  {
    jenis: 'fasilitas', bangunan: 'koran-weton', judul: 'Koran Weton',
    teks: 'Kalau kegiatanmu menarik, besok pagi bisa masuk koran.',
  },
  {
    jenis: 'fasilitas', bangunan: 'alun-alun', judul: 'Alun-Alun',
    teks: 'Tempat warga berkumpul saat 17-an, pasar malam, dan acara kota lainnya.',
  },
  {
    jenis: 'fasilitas', bangunan: 'rs-weton', judul: 'RSUD Weton',
    teks: 'Kerja terus-menerus menguras Kesehatan. Kalau sakit, Tenaga pulih lebih lambat. Berobat di sini memulihkan Tenaga dan Kesehatan.',
  },
  {
    jenis: 'misi', bangunan: 'bursa-kerja', judul: 'Misi pertama: cari pekerjaan',
    teks: 'Waktunya bekerja. Pilih satu pekerjaan di bawah. Setelah itu datangi tempat kerjanya di peta dan ketuk Kerja. Setiap aksi kerja memakai 10 Tenaga.',
  },
]
