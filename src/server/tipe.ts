// Tipe baris basis data dan keadaan yang dikirim ke klien. Hanya tipe.

export type Warga = {
  id: string
  email: string
  nama: string
  sandi_hash: string
  dibuat_pada: Date
  terakhir_aktif: Date
  kas: number
  kasbon: number
  kasbon_sejak: Date | null
  tenaga: number
  tenaga_pada: Date
  keahlian: number
  keahlian6_sejak: Date | null
  pekerjaan_id: string | null
  hunian_id: string | null
  hunian_berikut: string | null
  tagihan_berikut: Date
  upah_siklus: number
  bonus_tanggal: string | null
  peran: 'warga' | 'walikota'
  makan_tanggal: string | null
  makan_kali: number
  tabungan: number
  ijazah: string | null
  kuliah_jurusan: string | null
  kuliah_semester: number
  kuliah_sesi: number
  kuliah_ukt_lunas: boolean
  kuliah_sesi_tanggal: string | null
  perjalanan_tujuan: string | null
  perjalanan_pulang: Date | null
  berobat_tanggal: string | null
  numpang_terima: boolean
  uang_dapur: number
  konsumsi_tanggal: string | null
  sekolah: string | null
  hunian_tempat: string | null
  hunian_tempat_berikut: string | null
  kesehatan: number
  kesehatan_pada: Date
  konsumsi_kali: number
  lapar: number
  lapar_pada: Date
  lapar_hukum_pada: Date | null
  rawat_sampai: Date | null
  kekuatan: number
  kecerdasan: number
  karisma: number
  disiplin: number
  level: number
  /** EXP menuju level berikutnya */
  exp: number
  reputasi: number
  reputasi_minggu: number
  harian: Harian
  hunian_kamar: number | null
  hunian_kamar_berikut: number | null
  wajib_pindah_tenggat: Date | null
  wajib_pindah_dari: string | null
  /** stempel waktu ISO tiap ganti pekerjaan dalam periode bergulir */
  ganti_kerja: string[]
  /** id penempatan (atau lahan) bangunan tempat bekerja */
  tempat_kerja: string | null
  seleksi: { lulus?: string[]; gagal?: Record<string, string> }
  latihan_id: string | null
  latihan_target: number | null
  latihan_selesai: Date | null
  latihan_jeda: Date | null
  profil_properti: boolean
  hadiah_tanggal: string | null
  hadiah_kali: number
  pancing: SesiPancing | null
  /** bukan kolom warga: UMK yang berlaku, diisi saat transaksi dimulai */
  umk: number
}

/** Catatan batas harian per sumber aktivitas; direset saat tanggal WIB berganti. */
export type Harian = { tgl?: string; exp?: Record<string, number>; rep?: Record<string, number>; pertama?: string[] }

/** Sesi memancing. Ikan dan zona sasaran ditentukan server saat kail dilempar. Waktu dalam ms sejak epoch. */
export type SesiPancing = {
  lempar: number
  gigit: number
  hangus: number
  barang: string
  kelangkaan: 'umum' | 'jarang' | 'langka'
  /** pusat dan lebar zona sasaran penanda (0 sampai 1) */
  tengah: number
  lebar: number
}

export type BarisUsaha = { id: string; warga_id: string; jenis: 'perahu' | 'warung'; level: number; produksi_pada: Date; dibuat_pada: Date }
export type BarisLahan = {
  lahan_id: string; warga_id: string; dibeli_pada: Date; rumah: boolean
  jenis_objek: 'lahan' | 'bangunan'
  bangun_jenis: string | null; bangun_mulai: Date | null; bangun_selesai: Date | null
  jual_mode: 'tidak' | 'tetap' | 'negosiasi'; jual_harga: number | null
  nama_kustom: string | null; harga_beli: number | null; hasil_pada: Date | null
}
export type BarisNumpang = {
  id: string; pemilik_id: string; penumpang_id: string; uang_dapur: number; status: 'minta' | 'aktif' | 'selesai'
  uang_tertahan: number; dibuat_pada: Date; berakhir_pada: Date | null
}

export type Keadaan = {
  /** waktu server saat keadaan dibuat, untuk menyelaraskan jam klien */
  sekarang: string
  warga: { id: string; nama: string; email: string; bergabung: string }
  peran: 'warga' | 'walikota'
  kas: number
  kasbon: number
  kasbonMacet: boolean
  /** nilai pada saat `pada`; nilai sekarang dihitung klien dengan tenagaKini */
  tenaga: { nilai: number; pada: string; maks: number; selangMs: number }
  keahlian: number
  /** tempat = id penempatan bangunan (kamar) di peta, null bila tanpa batas kamar */
  hunian: { id: string; nama: string; tempat: string | null; kamar: number | null } | null
  hunianBerikut: { id: string; nama: string; tempat: string | null; kamar: number | null } | null
  sekolah: { id: string; nama: string } | null
  /** nilai pada saat `pada`; pulih 1 poin tiap selangMs; sakit bila di bawah 30 */
  kesehatan: { nilai: number; pada: string; maks: number; selangMs: number; sakit: boolean }
  pekerjaan: { id: string; nama: string; tier: number; upahPerAksi: number; gajiBulan: number; tempat: string } | null
  tagihan: { jatuhTempo: string; sewa: number; listrik: number; makan: number; pajak: number; dapur: number; total: number } | null
  upahSiklus: number
  bonus: { siap: boolean; jumlah: number }
  tabungan: number
  ijazah: { id: string; nama: string; jenjang: 'D3' | 'S1' } | null
  kuliah: {
    jurusan: { id: string; nama: string; jenjang: 'D3' | 'S1' }
    semester: number
    totalSemester: number
    sesi: number
    sesiPerSemester: number
    uktLunas: boolean
    ukt: number
    bisaHariIni: boolean
  } | null
  /** sedang di luar kota; pulang pada waktu ini */
  perjalanan: { tujuan: string; nama: string; pulang: string } | null
  berobatSiap: boolean
  usaha: Array<{ id: string; jenis: 'perahu' | 'warung'; nama: string; level: number; siklusSiap: number; hasilSiap: number; upgradeBiaya: number | null }>
  lahan: Array<{
    id: string; distrik: string; luas: number; rumah: boolean; objek: 'lahan' | 'bangunan'
    /** konstruksi: progres 0 sampai 1, tahap 1 sampai 4 (4 = selesai), tampil = bagian model yang terlihat */
    bangun: { jenis: string; nama: string; mulai: string; selesai: string; progres: number; tahap: number; tahapNama: string; tampil: number } | null
    jual: { mode: 'tetap' | 'negosiasi'; harga: number } | null
  }>
  punyaRumah: boolean
  /** barang di gudang per id barang (hanya yang ada) */
  gudang: Record<string, number>
  /** sisa jatah barang konsumsi hari ini */
  konsumsiSisa: number
  /** UMK yang berlaku per bulan kota */
  umk: number
  /** lapak milik sendiri; menunggu = uang pembeli yang dicairkan saat game dibuka berikutnya */
  lapak: Array<{ id: string; barang: string; sisa: number; harga: number; terjual: number; menunggu: number }>
  /** sedang numpang atau menunggu izin pemilik rumah */
  numpang: { pemilik: string; status: 'minta' | 'aktif'; uangDapur: number; berakhir: string | null } | null
  /** kamar tamu di rumah sendiri */
  kamarTamu: {
    terima: boolean
    uangDapur: number
    kamar: number
    penumpang: Array<{ id: string; nama: string; status: 'minta' | 'aktif'; uangDapur: number; berakhir: string | null }>
  }
  /** sisa jatah makan di Rumah Makan Padang hari ini */
  makanSisa: number
  /** hasil taruhan terakhir dalam jawaban ini, bila aksinya berjudi */
  judi?: { menang: boolean; razia: boolean; taruhan: number }
  /** edisi Koran Weton terbaru yang sudah terbit, atau null bila belum ada */
  koran: { tanggal: string; judul: string } | null
  /** kursus berikutnya, atau null bila Keahlian sudah maksimum */
  kursus: { dari: number; ke: number; biaya: number; tenaga: number; durasiMs: number; syarat: Array<{ atribut: string; perlu: number; punya: number }> } | null
  lowongan: Array<{
    id: string; nama: string; tier: number; tempat: string; tempatNama: string; upahPerAksi: number; gajiBulan: number; minKeahlian: number; boleh: boolean; cocok: boolean
    /** golongan seleksi (pns, polisi, tentara) bila pekerjaan ini butuh tes, selain itu null */
    seleksi: string | null
  }>
  /** nilai pada saat `pada`; turun 1 poin tiap selangMs; di bawah ambang pemain LAPAR */
  lapar: { nilai: number; pada: string; maks: number; selangMs: number; ambang: number }
  /** sedang dirawat di rumah sakit sampai waktu ini, atau null */
  dirawat: { sampai: string } | null
  atribut: { kekuatan: number; kecerdasan: number; karisma: number; disiplin: number }
  level: { nilai: number; exp: number; perlu: number; maks: number }
  reputasi: { total: number; minggu: number }
  /** isi dan kapasitas inventori, surat di mailbox, dan permintaan pertemanan yang menunggu jawabanmu */
  inventori: { dipakai: number; kapasitas: number }
  suratBaru: number
  permintaanTeman: number
  /** pesan pribadi yang belum dibaca */
  pesanBaru: number
  /** sisa kirim hadiah barang ke warga lain hari ini */
  hadiahSisa: number
  wajibPindah: { tenggat: string; dari: string } | null
  gantiKerja: { sisa: number; maks: number; jedaSampai: string | null }
  seleksi: { lulus: string[]; gagal: Record<string, string> }
  latihan: { id: string; nama: string; target: number | null; selesai: string } | null
  latihanJeda: string | null
  /** sesi memancing aktif (tanpa nama ikan): kapan menggigit, batas tarik, dan zona sasaran */
  pancing: { lempar: string; gigit: string; hangus: string; tengah: number; lebar: number; periodeMs: number } | null
  /** hasil memancing terakhir dalam jawaban ini */
  tangkapan?: { berhasil: boolean; barang?: string; jumlah?: number; kelangkaan?: string; nilai?: 'sempurna' | 'bagus' | 'meleset' | 'terlambat' }
  /** hasil putaran roulette terakhir dalam jawaban ini */
  /** hasil alat super Wali Kota: jumlah penerima bansos */
  walikota?: { penerima?: number }
  roulette?: { nomor: number; warna: string; taruhan: number; kembali: number; rincian: Array<{ jenis: string; nilai?: number; jumlah: number; menang: boolean; kembali: number }> }
  /** hasil tes seleksi terakhir dalam jawaban ini */
  tes?: { lulus: boolean; skor: number; nilaiLulus: number }
}

export type BarisLedger = {
  id: number
  akun: 'kas' | 'kasbon' | 'tabungan'
  jenis: string
  jumlah: number
  saldoSetelah: number
  rincian: Record<string, unknown>
  waktu: string
}
