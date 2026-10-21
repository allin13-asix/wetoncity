// Nilai balancing sistem kehidupan kota (lapar, inventori, sekamar, level, reputasi, properti, konstruksi, roulette,
// memancing, minimarket, seleksi, kuota, kursus). Sumber tunggal: server, klien, dan uji membaca angka dari sini.
// Semua logika dihitung di server; berkas ini hanya angka dan daftar. Tanpa impor dari src/server.

const MENIT = 60_000
const JAM = 3_600_000
const HARI = 86_400_000

// ---------------------------------------------------------------- 1. lapar

/**
 * Lapar 0 sampai 100 turun satu poin tiap `turunSelangMs`. Di bawah `ambang` pemain berstatus LAPAR:
 * pemulihan Tenaga dikali `pengaliPulihTenaga`, dan Kesehatan berkurang `kesehatanKurang` tiap `kesehatanJedaMs`
 * sampai terkunci di `kesehatanMin`. Bila Kesehatan sudah di batas itu dan masih lapar, pemain dirawat otomatis.
 */
export const LAPAR = {
  maks: 100,
  awal: 100,
  turunSelangMs: 15 * MENIT,
  ambang: 30,
  pengaliPulihTenaga: 0.5,
  kesehatanKurang: 5,
  kesehatanJedaMs: JAM,
  kesehatanMin: 20,
  rawat: { biaya: 150_000, durasiMs: JAM, laparPulih: 60, kesehatanPulih: 50 },
  /** Pulih lapar dari makan di Rumah Makan Padang. */
  makanPadang: 40,
} as const

// ---------------------------------------------------------------- 12. statistik

export const ATRIBUT = ['kekuatan', 'kecerdasan', 'karisma', 'disiplin'] as const
export type Atribut = (typeof ATRIBUT)[number]
export const NAMA_ATRIBUT: Record<Atribut, string> = { kekuatan: 'Kekuatan', kecerdasan: 'Kecerdasan', karisma: 'Karisma', disiplin: 'Disiplin' }
export const STATISTIK = { awal: 5, maks: 100 } as const

// ---------------------------------------------------------------- 2. inventori

export const INVENTORI = {
  /** jumlah satuan barang yang muat sekaligus (semua jenis dijumlah) */
  kapasitas: 200,
  /** surat di mailbox paling banyak; surat baru ditolak diam-diam bila penuh */
  suratMaks: 100,
  transferMaks: 100,
} as const

// ---------------------------------------------------------------- 3. teman sekamar

export const SEKAMAR = {
  /** masa tenggang bagi pihak yang menolak atau memutus pertemanan sebelum wajib pindah */
  tenggangMs: 24 * JAM,
} as const

// ---------------------------------------------------------------- 4 dan 14. aktivitas, EXP, reputasi, level

export const SUMBER = ['kerja', 'transaksi', 'minigame', 'interaksi', 'belajar'] as const
export type Sumber = (typeof SUMBER)[number]

/**
 * Per sumber aktivitas: EXP dan poin reputasi per satuan aksi, batas harian per sumber (anti-farming), dan bonus EXP
 * untuk aksi pertama sumber itu pada hari tersebut. Reputasi hanya dari kerja, transaksi, minigame, dan interaksi.
 */
export const AKTIVITAS: Record<Sumber, { exp: number; rep: number; batasExp: number; batasRep: number; bonusPertama: number }> = {
  kerja: { exp: 8, rep: 1, batasExp: 400, batasRep: 20, bonusPertama: 40 },
  transaksi: { exp: 5, rep: 1, batasExp: 100, batasRep: 10, bonusPertama: 20 },
  minigame: { exp: 6, rep: 1, batasExp: 150, batasRep: 10, bonusPertama: 25 },
  interaksi: { exp: 3, rep: 2, batasExp: 60, batasRep: 12, bonusPertama: 15 },
  belajar: { exp: 25, rep: 0, batasExp: 150, batasRep: 0, bonusPertama: 30 },
}

/** EXP untuk naik dari level L ke L + 1 = baseExp x L^pangkat. */
export const LEVEL = {
  baseExp: 100,
  pangkat: 1.5,
  maks: 100,
  /** hadiah Wali Kota tiap naik level: uang = level x uangPerLevel x pengali kelipatan; barang pada kelipatan tertentu */
  hadiah: {
    uangPerLevel: 25_000,
    kelipatan5: { pengali: 4, barang: { 'jamu-kunyit': 3 } as Record<string, number> },
    kelipatan10: { pengali: 10, barang: { 'jamu-kunyit': 5, 'nasi-bungkus': 5 } as Record<string, number> },
  },
} as const

export const PERINGKAT = {
  /** jumlah teratas yang disimpan dan diberi hadiah tiap minggu */
  topN: 10,
  /** jumlah baris yang ditampilkan di balai kota dan alun-alun */
  tampil: 20,
  /** tabel hadiah mingguan yang diumumkan; peringkat di luar tabel tidak mendapat hadiah */
  hadiah: [
    { dari: 1, sampai: 1, uang: 5_000_000 },
    { dari: 2, sampai: 2, uang: 3_000_000 },
    { dari: 3, sampai: 3, uang: 2_000_000 },
    { dari: 4, sampai: 10, uang: 500_000 },
  ],
  /** syarat poin mingguan minimum agar masuk snapshot */
  poinMin: 1,
} as const

// ---------------------------------------------------------------- 5. ganti pekerjaan

export const GANTI_KERJA = {
  cooldownMs: 12 * JAM,
  /** paling banyak berapa kali ganti dalam satu periode bergulir */
  maksPerPeriode: 3,
  periodeMs: 7 * HARI,
} as const

// ---------------------------------------------------------------- 6. properti

export const PROPERTI = {
  /** penawaran yang tidak dijawab dalam waktu ini kedaluwarsa */
  tawarKedaluwarsaMs: 48 * JAM,
  /** batas babak tawar-menawar bolak-balik dalam satu rangkaian */
  babakMaks: 6,
  /** penawaran paling rendah dan paling tinggi sebagai pecahan harga patokan penjual (atau harga lahan kota) */
  tawarMinRasio: 0.5,
  tawarMaksRasio: 2,
  /** properti milik pemain yang boleh dipasang jual sekaligus */
  jualMaks: 3,
  /** tawaran terbuka yang boleh dikirim satu pemain sekaligus */
  tawarTerbukaMaks: 5,
  /** harga tetap rumah yang dimiliki NPC, per jenis bangunan di peta */
  hargaNpc: { 'rumah-nelayan': 28_000_000, 'rumah-menengah': 65_000_000 } as Record<string, number>,
  /** kalimat NPC pemilik saat pemain membuka dialog jual beli */
  dialogNpc: {
    sapa: 'Rumah ini sudah lama saya tempati. Kalau cocok, saya lepas dengan harga pas.',
    tawar: 'Harga sudah saya hitung dari biaya bangun dan lokasi. Tidak bisa ditawar, tapi suratnya lengkap.',
    setuju: 'Baik, kuncinya sekarang milikmu. Rawat baik-baik, ya.',
  },
} as const

// ---------------------------------------------------------------- 7. konstruksi

/** Bangunan yang bisa didirikan pemain di lahannya. `jenis` menunjuk jenis bangunan di peta (lowongan mengikuti jenis ini). */
export const BANGUN: Record<string, { nama: string; biaya: number; durasiMs: number; hunian: boolean }> = {
  rumah: { nama: 'Rumah', biaya: 15_000_000, durasiMs: 6 * JAM, hunian: true },
  kafe: { nama: 'Kafe', biaya: 35_000_000, durasiMs: 12 * JAM, hunian: false },
  'warung-pantai': { nama: 'Warung Pantai', biaya: 25_000_000, durasiMs: 10 * JAM, hunian: false },
  bengkel: { nama: 'Bengkel Motor', biaya: 45_000_000, durasiMs: 16 * JAM, hunian: false },
}

/**
 * Empat tahap visual. `dari` = progres (0 sampai 1) saat tahap mulai; `tampil` = bagian model bangunan yang terlihat
 * (diinterpolasi di dalam tahap). Tahap terakhir adalah bangunan selesai.
 */
export const TAHAP_BANGUN: ReadonlyArray<{ nama: string; dari: number; tampil: readonly [number, number] }> = [
  { nama: 'Pondasi', dari: 0, tampil: [0, 0.1] },
  { nama: 'Rangka dan dinding', dari: 0.25, tampil: [0.25, 0.5] },
  { nama: 'Atap dan finishing', dari: 0.65, tampil: [0.8, 0.9] },
  { nama: 'Selesai', dari: 1, tampil: [1, 1] },
]

// ---------------------------------------------------------------- 8. roulette

export const ROULETTE = {
  kantong: 37,
  merah: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
  taruhanMin: 5_000,
  taruhanMaks: 500_000,
  /** jumlah semua taruhan dalam satu putaran */
  totalMaks: 2_000_000,
  taruhanPerPutaran: 10,
  tenaga: 5,
  /** pembayaran selain pengembalian taruhan: 35:1, 1:1, 2:1 */
  bayar: { lurus: 35, merah: 1, hitam: 1, ganjil: 1, genap: 1, rendah: 1, tinggi: 1, lusin: 2, kolom: 2 },
} as const

// ---------------------------------------------------------------- 9. memancing

export type Kelangkaan = 'umum' | 'jarang' | 'langka'

export const MEMANCING = {
  tenaga: 8,
  tungguMs: [4_000, 15_000] as readonly [number, number],
  /** waktu setelah ikan menggigit untuk menarik kail */
  jendelaMs: 4_000,
  /** mini game timing: penanda berayun bolak-balik; lebar zona sasaran (0 sampai 1) per kelangkaan */
  periodeMs: 1_600,
  zona: { umum: 0.32, jarang: 0.24, langka: 0.16 } as Record<Kelangkaan, number>,
  /** tepat di tengah zona (selisih kurang dari bagian ini dari setengah lebar) dihitung sempurna dan dapat bonus */
  sempurna: 0.35,
  /** peluang tambahan satu ikan lagi saat sempurna */
  bonusSempurna: 0.25,
  /** sesi yang tidak ditarik sampai batas ini dianggap hangus */
  hangusMs: 60_000,
  /** bobot loot table berbobot per ikan; id barang ada di BARANG (src/server/aturan.ts) */
  loot: [
    { barang: 'ikan-kembung', kelangkaan: 'umum', bobot: 40 },
    { barang: 'ikan-tongkol', kelangkaan: 'umum', bobot: 30 },
    { barang: 'ikan-kakap', kelangkaan: 'jarang', bobot: 12 },
    { barang: 'cumi-cumi', kelangkaan: 'jarang', bobot: 10 },
    { barang: 'ikan-tuna', kelangkaan: 'langka', bobot: 5 },
    { barang: 'lobster', kelangkaan: 'langka', bobot: 3 },
  ] as ReadonlyArray<{ barang: string; kelangkaan: Kelangkaan; bobot: number }>,
} as const

// ---------------------------------------------------------------- 10. minimarket

export type JenisPromo = 'persen' | 'nominal' | 'beli_gratis'
export type Promo = {
  id: string
  toko: string
  /** id barang, atau '*' untuk semua produk toko */
  produk: string
  jenis: JenisPromo
  /** persen: 1 sampai 100; nominal: potongan rupiah per satuan */
  nilai?: number
  /** beli_gratis: beli `beli` gratis `gratis` */
  beli?: number
  gratis?: number
  /** periode aktif, tanggal WIB YYYY-MM-DD (kedua ujung termasuk) */
  dari: string
  sampai: string
  /** hari dalam pekan (0 Minggu sampai 6 Sabtu, WIB); kosong berarti setiap hari */
  hari?: number[]
  label: string
}

/** Tiga minimarket menjual produk yang sama dengan stok dan harga sendiri. `harga` pada UMK awal; tiap toko berbeda. */
export const TOKO = {
  toko: {
    minimarket: {
      nama: 'Minimarket Sinar',
      harga: { 'es-teh': 12_000, 'pisang-goreng': 14_000, 'kopi-tubruk': 19_000, 'nasi-bungkus': 37_000, 'roti-sobek': 10_000, 'mi-instan': 7_000, 'air-mineral': 4_500, 'susu-uht': 11_000, biskuit: 8_500, 'minuman-energi': 17_000 },
      stokAwal: 40, stokMaks: 60, restokJumlah: 6, restokMs: JAM,
    },
    'alpa-maret': {
      nama: 'Alpa Maret',
      harga: { 'es-teh': 11_000, 'pisang-goreng': 15_000, 'kopi-tubruk': 20_000, 'nasi-bungkus': 35_000, 'roti-sobek': 9_500, 'mi-instan': 7_500, 'air-mineral': 4_000, 'susu-uht': 12_000, biskuit: 8_000, 'minuman-energi': 16_000 },
      stokAwal: 50, stokMaks: 80, restokJumlah: 8, restokMs: JAM,
    },
    'indo-april': {
      nama: 'Indo April',
      harga: { 'es-teh': 12_500, 'pisang-goreng': 13_500, 'kopi-tubruk': 18_000, 'nasi-bungkus': 36_000, 'roti-sobek': 10_500, 'mi-instan': 6_500, 'air-mineral': 4_500, 'susu-uht': 10_500, biskuit: 9_000, 'minuman-energi': 18_000 },
      stokAwal: 30, stokMaks: 50, restokJumlah: 5, restokMs: JAM,
    },
  } as Record<string, { nama: string; harga: Record<string, number>; stokAwal: number; stokMaks: number; restokJumlah: number; restokMs: number }>,
  /** paling banyak satuan per pembelian */
  beliMaks: 20,
  promo: [
    { id: 'sinar-mi', toko: 'minimarket', produk: 'mi-instan', jenis: 'persen', nilai: 20, dari: '2026-10-01', sampai: '2026-12-31', label: 'Mi instan diskon 20%' },
    { id: 'sinar-akhir-pekan', toko: 'minimarket', produk: '*', jenis: 'persen', nilai: 5, dari: '2026-10-01', sampai: '2026-12-31', hari: [0, 6], label: 'Akhir pekan semua produk diskon 5%' },
    { id: 'alpa-roti', toko: 'alpa-maret', produk: 'roti-sobek', jenis: 'nominal', nilai: 2_000, dari: '2026-10-01', sampai: '2026-12-31', label: 'Roti sobek potongan Rp 2.000' },
    { id: 'alpa-susu', toko: 'alpa-maret', produk: 'susu-uht', jenis: 'beli_gratis', beli: 2, gratis: 1, dari: '2026-10-01', sampai: '2026-12-31', label: 'Beli 2 gratis 1 susu UHT' },
    { id: 'indo-biskuit', toko: 'indo-april', produk: 'biskuit', jenis: 'beli_gratis', beli: 3, gratis: 1, dari: '2026-10-01', sampai: '2026-12-31', label: 'Beli 3 gratis 1 biskuit' },
    { id: 'indo-kopi', toko: 'indo-april', produk: 'kopi-tubruk', jenis: 'persen', nilai: 15, dari: '2026-10-01', sampai: '2026-12-31', hari: [1, 2, 3], label: 'Senin sampai Rabu kopi diskon 15%' },
  ] as ReadonlyArray<Promo>,
} as const

// ---------------------------------------------------------------- 11. pekerjaan khusus

export type Golongan = 'pns' | 'polisi' | 'tentara'

/**
 * Pekerjaan khusus: syarat minimum stats, lalu tes. Syarat tiap atribut = `dasar` + `perTier` x (tier - 1).
 * Skor tes = rata-rata berbobot atribut + acak -variasi sampai +variasi; lulus bila skor >= nilaiLulus + (tier - 1) x tambahanPerTier.
 */
export const SELEKSI: Record<Golongan, {
  nama: string
  /** jenis bangunan tempat kerjanya */
  tempat: string[]
  /** awalan id pekerjaan yang ikut golongan ini */
  awalan?: string
  dasar: Partial<Record<Atribut, number>>
  perTier: number
  bobot: Record<Atribut, number>
  nilaiLulus: number
  tambahanPerTier: number
  variasi: number
  biaya: number
  tenaga: number
  cooldownMs: number
}> = {
  pns: {
    nama: 'Seleksi CPNS', tempat: ['dinas-masyarakat', 'dinas-pendidikan', 'dinas-kepegawaian', 'dinas-ekonomi'], awalan: 'pns-',
    dasar: { kecerdasan: 8, disiplin: 8 }, perTier: 2, bobot: { kekuatan: 0, kecerdasan: 0.5, karisma: 0.15, disiplin: 0.35 },
    nilaiLulus: 6, tambahanPerTier: 2, variasi: 5, biaya: 75_000, tenaga: 20, cooldownMs: 24 * JAM,
  },
  polisi: {
    nama: 'Seleksi Polri', tempat: ['kantor-polisi'],
    dasar: { kekuatan: 10, disiplin: 10, kecerdasan: 6 }, perTier: 3, bobot: { kekuatan: 0.35, kecerdasan: 0.2, karisma: 0.1, disiplin: 0.35 },
    nilaiLulus: 8, tambahanPerTier: 2, variasi: 5, biaya: 100_000, tenaga: 25, cooldownMs: 36 * JAM,
  },
  tentara: {
    nama: 'Seleksi TNI', tempat: ['markas-kodim'],
    dasar: { kekuatan: 12, disiplin: 12 }, perTier: 3, bobot: { kekuatan: 0.45, kecerdasan: 0.1, karisma: 0.05, disiplin: 0.4 },
    nilaiLulus: 8, tambahanPerTier: 2, variasi: 5, biaya: 100_000, tenaga: 30, cooldownMs: 36 * JAM,
  },
}

// ---------------------------------------------------------------- 13. kuota lowongan

/**
 * Kuota pekerja pemain per pekerjaan per bangunan = round(perTier[tier] x pengaliJenis[jenis ?? 1]), paling sedikit 1.
 * `perPekerjaan` menimpa hitungan itu untuk pekerjaan tertentu.
 */
export const KUOTA = {
  perTier: { 1: 4, 2: 3, 3: 2, 4: 2, 5: 1 } as Record<number, number>,
  pengaliJenis: {
    'terminal-pelabuhan': 2, 'gudang-pelabuhan': 2, tpi: 2, 'pabrik-otomotif': 3, 'pabrik-garmen': 3, 'pabrik-makanan': 3,
    'balai-kota': 2, minimarket: 1, 'alpa-maret': 1.5, 'indo-april': 1.5, 'rm-padang': 1.5, 'rs-weton': 2, 'hotel-pantai': 1.5,
  } as Record<string, number>,
  perPekerjaan: {} as Record<string, number>,
} as const

// ---------------------------------------------------------------- 17. kursus keahlian dan atribut

export const LATIHAN = {
  /** kursus keahlian: durasi = dasar + perLevel x (level tujuan - 1) */
  keahlian: { durasiDasarMs: 45 * MENIT, durasiPerLevelMs: 15 * MENIT, tenaga: 10 },
  /** syarat minimum Kecerdasan dan Disiplin untuk naik ke level tujuan: max(0, kali x level - kurang) */
  syaratStat: { kali: 2, kurang: 2, atribut: ['kecerdasan', 'disiplin'] as readonly Atribut[] },
  /** jeda setelah satu kursus selesai sebelum boleh ikut kursus lain */
  cooldownMs: 3 * JAM,
  /** kursus peningkatan atribut di BLK */
  atribut: {
    'latihan-fisik': { nama: 'Latihan fisik di sasana', atribut: 'kekuatan', naik: 2, biaya: 150_000, tenaga: 15, durasiMs: 90 * MENIT },
    'kursus-logika': { nama: 'Kursus logika dan analitik', atribut: 'kecerdasan', naik: 2, biaya: 200_000, tenaga: 10, durasiMs: 90 * MENIT },
    'public-speaking': { nama: 'Kelas public speaking', atribut: 'karisma', naik: 2, biaya: 175_000, tenaga: 10, durasiMs: 75 * MENIT },
    'pelatihan-disiplin': { nama: 'Pelatihan baris-berbaris dan etos kerja', atribut: 'disiplin', naik: 2, biaya: 150_000, tenaga: 15, durasiMs: 90 * MENIT },
  } as Record<string, { nama: string; atribut: Atribut; naik: number; biaya: number; tenaga: number; durasiMs: number }>,
} as const

// ---------------------------------------------------------------- pesan antarpemain

export const PESAN = { panjangMaks: 300, perJamMaks: 20, inboxTampil: 50 } as const
