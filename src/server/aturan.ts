// Aturan game yang murni: tanpa basis data dan tanpa jam global. Dipakai server, uji, dan klien
// (agar Tenaga bisa berjalan di layar). Angka dasar ada di src/data; berkas ini hanya merangkainya.
import { AKSI_SEBULAN, HARI_PER_SIKLUS, TENAGA, UMK_AWAL, USAHA, gajiTier, indeksHarga, kursusBiaya, pengaliUpah, upgradeBiaya } from '../data/ekonomi.ts'
import { hunian, rincianBulan, type Hunian } from '../data/hunian.ts'
import { pekerjaanProfesional, pekerjaanSmaSmk, semuaPekerjaan, type Pekerjaan } from '../data/pekerjaan.ts'
import { BONUS_SEKOLAH, KULIAH, SEKOLAH, adalahSekolah, jurusan, type Jurusan } from '../data/pendidikan.ts'
import { LAPAR } from '../data/balans.ts'

export const HARI_MS = 86_400_000
export const SIKLUS_MS = HARI_PER_SIKLUS * HARI_MS
/** Tenaga pulih 1 poin setiap selang ini (10 per jam). */
export const TENAGA_SELANG_MS = 3_600_000 / TENAGA.pulihPerJam
/** Kasbon di atas ambang ini (setara UMK awal), atau lebih tua dari satu siklus, memperlambat pemulihan Tenaga. Bukan plafon. */
export const KASBON_AMBANG = 2_500_000
export const KASBON_BUNGA = 0.1
/** Tradisi mudik: pemain yang lama pergi hanya ditagih sebanyak ini saat kembali. */
export const SIKLUS_DITAGIH_MAKS = 2
export const AKSI_MAKS = 10
export const RUSUN = { id: 'rusun-weton', batasKeahlian: 6, pindahHari: 28 } as const
export const HUNIAN_PINDAHAN = 'kost-melati'

export const hunianById = (id: string | null | undefined): Hunian | undefined => (id ? hunian.find((h) => h.id === id) : undefined)
export const bisaDipilih = (h: Hunian) => h.fase === 0 && h.jenis !== 'numpang'

/** Pekerjaan yang sudah dibuka di Fase 0: lulusan SMA/SMK, belum terkunci. */
export const lowongan: readonly Pekerjaan[] = pekerjaanSmaSmk.filter((p) => p.fase === 0 && !p.terkunci)
export const lowonganById = (id: string | null | undefined) => (id ? lowongan.find((p) => p.id === id) : undefined)
export const pekerjaanById = (id: string | null | undefined) => (id ? semuaPekerjaan.find((p) => p.id === id) : undefined)

/** Lowongan untuk satu warga: pekerjaan SMA/SMK, ditambah pekerjaan profesional yang cocok dengan ijazahnya. */
export function lowonganUntuk(ijazah: string | null): readonly Pekerjaan[] {
  const j = jurusanById(ijazah)
  if (!j) return lowongan
  return [...lowongan, ...pekerjaanProfesional.filter((p) => p.pendidikan === j.jenjang && (!p.jurusan || p.jurusan.includes(j.id)))]
}
/** Pekerjaan di tempat yang cocok dengan latar sekolah pemain. */
export const cocokSekolah = (p: Pekerjaan, sekolah: string | null | undefined) =>
  adalahSekolah(sekolah) && (SEKOLAH[sekolah].tempat as readonly string[]).includes(p.tempat)
export const minKeahlianUntuk = (p: Pekerjaan, sekolah?: string | null) => Math.max(1, p.minKeahlian - (cocokSekolah(p, sekolah) ? BONUS_SEKOLAH.keahlian : 0))
export const bolehAmbil = (p: Pekerjaan, keahlian: number, sekolah?: string | null) => keahlian >= minKeahlianUntuk(p, sekolah)
/** UKT per semester setelah diskon latar sekolah (SMA 25%). */
export const uktUntuk = (j: Jurusan, sekolah?: string | null) => Math.round((j.ukt * (1 - (adalahSekolah(sekolah) ? SEKOLAH[sekolah].diskonUkt : 0))) / 1000) * 1000

/** Rumah Makan Padang: bayar untuk Tenaga tambahan. Harga sengaja di atas nilai upah 10 Tenaga untuk lulusan SMA/SMK, jadi kemudahan, bukan jalan pintas. */
export const MAKAN = { harga: 50_000, tenaga: 10, kaliPerHari: 2 } as const

/** Rumah Judi Mujur: uang game saja. Menang dibayar dua kali lipat dengan peluang 45%, jadi rata-rata pemain rugi 10% per taruhan (penyedot uang). */
export const JUDI = { peluang: 0.45, razia: 0.1, tenaga: 5, taruhanMin: 10_000, taruhanMaks: 1_000_000 } as const

/** Penerbangan dari Bandara Weton. Selama pergi pemain tidak bisa beraksi; hasil diterima saat pulang. */
export const TUJUAN = {
  jakarte: { nama: 'Jakarte', tiket: 2_000_000, jam: 12, ringkas: 'Pelatihan di ibu kota untuk Keahlian di bawah 6. Pulang dengan Keahlian +1.' },
  culabaya: { nama: 'Culabaya', tiket: 400_000, jam: 24, ringkas: 'Proyek borongan di pelabuhan besar. Upah setara 24 aksi pekerjaanmu.' },
  soloe: { nama: 'Soloe', tiket: 450_000, jam: 8, ringkas: 'Kulakan batik lalu dijual ke tetangga saat pulang: Rp 530.000.' },
} as const
export type Tujuan = keyof typeof TUJUAN
/** Hasil Soloe dijaga kecil (untung Rp 80.000) karena tidak memakai Tenaga dan bisa dilakukan sambil tidur; lihat pnpm sim. */
export const HASIL_SOLOE = 530_000
/** Satu penerbangan per tanggal WIB, dan Jakarte hanya untuk Keahlian di bawah ini (di atasnya lebih murah dari kursus). */
export const TERBANG = { perHari: 1, jakarteMaksKeahlian: 6 } as const
/** Borongan Culabaya setara satu hari kerja aktif (24 aksi), jadi tidak pernah lebih untung daripada bekerja di kota setelah tiket. */
export const AKSI_CULABAYA = 24

/** Tabungan Bank Weton: bunga kecil setiap siklus tagihan. */
export const BANK = { bungaPerSiklus: 0.0025 } as const
/** RSUD Weton: Tenaga langsung penuh, sekali sehari. */
/** RSUD Weton: Tenaga dan Kesehatan langsung penuh, sekali sehari. */
export const RSUD = { harga: 350_000 } as const

/** Lahan kosong di peta: harga per petak persegi, batas kepemilikan, dan biaya membangun rumah. */
export const LAHAN = { hargaPerPetak: 120_000, maksMilik: 3, biayaRumah: 15_000_000 } as const
export const hargaLahan = (l: { w: number; d: number }) => Math.round((l.w * l.d * LAHAN.hargaPerPetak) / 100_000) * 100_000

/** Usaha pemain (docs/EKONOMI.md bagian 11): produksi tiap 4 jam, simpan paling banyak 6 siklus. */
export const USAHA_ATURAN = { siklusMs: 4 * 3_600_000, simpanMaks: 6, tenagaAmbil: 5, slot: 2, levelMaks: 5 } as const
export const JENIS_USAHA = {
  perahu: { nama: 'Perahu nelayan', ...USAHA['Perahu nelayan'] },
  warung: { nama: 'Warung makan', ...USAHA['Warung makan'] },
} as const
export type JenisUsaha = keyof typeof JENIS_USAHA
export const labaSiklus = (jenis: JenisUsaha, level: number) => Math.round(JENIS_USAHA[jenis].hasil * 1.25 ** (level - 1) - JENIS_USAHA[jenis].bahan)
export const biayaUpgradeUsaha = (jenis: JenisUsaha, level: number) => upgradeBiaya(JENIS_USAHA[jenis], level)

export const SESI_KULIAH = { tenaga: KULIAH.tenagaPerSesi, perSemester: KULIAH.sesiPerSemester } as const
export const jurusanById = (id: string | null | undefined) => (id ? jurusan.find((j) => j.id === id) : undefined)

export type Peran = 'warga' | 'walikota'

/** Aturan khusus Wali Kota (pemilik kota): rumah dinas tanpa tagihan, Tenaga besar yang pulih tiap menit, dana tak terbatas lewat Kantor Wali Kota. */
export const WALIKOTA = { tenagaMaks: 1000, selangMs: 60_000, danaAwal: 1_000_000_000, danaMaksPerAksi: 10_000_000_000 } as const

export const tenagaMaks = (hunianId: string | null, peran: Peran = 'warga') =>
  peran === 'walikota' ? WALIKOTA.tenagaMaks : TENAGA.maks + (hunianById(hunianId)?.tenagaMaks ?? 0)

export function kasbonMacet(kasbon: number, sejak: Date | null, now: Date): boolean {
  if (kasbon <= 0) return false
  if (kasbon > KASBON_AMBANG) return true
  return sejak !== null && now.getTime() - sejak.getTime() > SIKLUS_MS
}
/**
 * Kesehatan 0 sampai 100: turun 1 tiap aksi kerja, pulih 1 tiap 2 jam (12 sehari). Di bawah 30 pemain sakit dan
 * Tenaga pulih dua kali lebih lambat sampai sehat lagi atau berobat di RSUD.
 */
export const KESEHATAN = { maks: 100, pulihMs: 2 * 3_600_000, perAksi: 1, sakit: 30 } as const
export const sakit = (kesehatan: number) => kesehatan < KESEHATAN.sakit
export const selangTenaga = (macet: boolean, peran: Peran = 'warga', lemah = false, lapar = false) =>
  peran === 'walikota' ? WALIKOTA.selangMs : (macet || lemah ? TENAGA_SELANG_MS * 2 : TENAGA_SELANG_MS) / (lapar ? LAPAR.pengaliPulihTenaga : 1)
/** Kapasitas satu bangunan hunian (orang), atau null bila tanpa batas. */
export const kapasitasHunian = (h: Hunian) => (h.kamar ? h.kamar * h.penghuni : null)

/**
 * Pulihkan Tenaga sampai `now`. Waktu sisa yang belum genap satu poin tidak hilang:
 * `pada` maju sebesar poin yang diberikan, bukan ke `now`. Saat penuh, jam pulih mulai dari `now`.
 */
export function pulihkanTenaga(s: { tenaga: number; pada: Date }, maks: number, selangMs: number, now: Date): { tenaga: number; pada: Date } {
  if (s.tenaga >= maks) return { tenaga: maks, pada: now }
  const poin = Math.floor((now.getTime() - s.pada.getTime()) / selangMs)
  if (poin <= 0) return s
  if (s.tenaga + poin >= maks) return { tenaga: maks, pada: now }
  return { tenaga: s.tenaga + poin, pada: new Date(s.pada.getTime() + poin * selangMs) }
}

/** Tagihan satu siklus (satu bulan kota) pada UMK yang berlaku. */
export const rincianTagihan = (h: Hunian, umk = UMK_AWAL) => rincianBulan(h, umk)

/** Berapa siklus yang sudah jatuh tempo pada `now` (0 bila belum). */
export function jumlahSiklusJatuhTempo(tagihanBerikut: Date, now: Date): number {
  const selisih = now.getTime() - tagihanBerikut.getTime()
  return selisih < 0 ? 0 : Math.floor(selisih / SIKLUS_MS) + 1
}

/** Gaji pokok sebulan sebuah pekerjaan: UMK dikali koefisien tiernya. */
export const gajiPekerjaan = (p: Pekerjaan, umk = UMK_AWAL) => gajiTier(p.tier, umk)
/**
 * Upah untuk sejumlah aksi: gaji sebulan dibagi 70 aksi kerja penuh, dikali bonus Keahlian di atas level 6.
 * Upah satu aksi dibulatkan dulu, jadi kerja yang dipecah beberapa kali memberi jumlah yang sama.
 */
export const upahAksi = (p: Pekerjaan, keahlian: number, aksi: number, umk = UMK_AWAL, sekolah?: string | null) =>
  aksi * Math.round((gajiPekerjaan(p, umk) / AKSI_SEBULAN) * pengaliUpah(keahlian) * (cocokSekolah(p, sekolah) ? 1 + BONUS_SEKOLAH.upah : 1))

// ---- UMK dan kebijakan Wali Kota

/**
 * UMK berubah hanya lewat penetapan Wali Kota, paling sering sekali per 7 hari. Penetapan harus dalam 5% dari
 * rekomendasi tren: UMK x (1 + pertumbuhan total upah warga 7 hari terakhir dibanding 7 hari sebelumnya),
 * pertumbuhan dijepit -5% sampai +8%.
 */
export const KEBIJAKAN_UMK = { jedaMs: 7 * 86_400_000, rentang: 0.05, trenMin: -0.05, trenMaks: 0.08, umkMin: 1_000_000, umkMaks: 20_000_000 } as const
const bulatPuluhRibu = (n: number) => Math.round(n / 10_000) * 10_000
export function trenEkonomi(upah7: number, upahSebelum7: number): number {
  if (upahSebelum7 <= 0) return 0
  return Math.min(KEBIJAKAN_UMK.trenMaks, Math.max(KEBIJAKAN_UMK.trenMin, (upah7 - upahSebelum7) / upahSebelum7))
}
export function rentangUmk(umk: number, tren: number): { rekomendasi: number; min: number; maks: number } {
  const rekomendasi = bulatPuluhRibu(umk * (1 + tren))
  return {
    rekomendasi,
    min: Math.max(KEBIJAKAN_UMK.umkMin, bulatPuluhRibu(rekomendasi * (1 - KEBIJAKAN_UMK.rentang))),
    maks: Math.min(KEBIJAKAN_UMK.umkMaks, bulatPuluhRibu(rekomendasi * (1 + KEBIJAKAN_UMK.rentang))),
  }
}

export const biayaKursus = (keahlian: number, h: Hunian | undefined) =>
  Math.round((kursusBiaya(keahlian) * (1 - (h?.kursusDiskon ?? 0))) / 1000) * 1000

/** Tanggal di zona WIB (UTC+7) dalam bentuk YYYY-MM-DD. */
export const tanggalWIB = (now: Date) => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)

const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'] as const

/** Hari pasaran Jawa untuk tanggal YYYY-MM-DD. Siklusnya lima hari; 1 Januari 1970 jatuh pada Wage. */
export const pasaran = (tanggal: string) => PASARAN[(((Math.floor(Date.parse(`${tanggal}T00:00:00Z`) / HARI_MS) + 3) % 5) + 5) % 5]

/** "Minggu Pon, 18 Oktober 2026" untuk tanggal YYYY-MM-DD. */
export function tanggalPanjang(tanggal: string): string {
  const d = new Date(`${tanggal}T12:00:00Z`)
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('id-ID', { ...o, timeZone: 'UTC' })
  return `${f({ weekday: 'long' })} ${pasaran(tanggal)}, ${f({ day: 'numeric', month: 'long', year: 'numeric' })}`
}

// ---- validasi masukan pendaftaran

export const bersihkanEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '')

export function cekDaftar(i: { email: string; nama: string; sandi: string }): string | null {
  if (i.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) return 'Email tidak valid.'
  if (i.nama.length < 2 || i.nama.length > 30) return 'Nama panggilan 2 sampai 30 karakter.'
  if (/[\u0000-\u001f<>]/.test(i.nama)) return 'Nama panggilan memuat karakter yang tidak boleh.'
  if (i.sandi.length < 8) return 'Kata sandi minimal 8 karakter.'
  if (i.sandi.length > 200) return 'Kata sandi terlalu panjang.'
  return null
}

// ---- pasar dan barang (docs/EKONOMI.md bagian 12 dan 19)

export type JenisBarang = 'bahan' | 'konsumsi' | 'koleksi'
type DefBarang = { nama: string; jenis: JenisBarang; dasar: number; satuan: string; ringkas: string; tenaga?: number; kesehatan?: number; lapar?: number }

/**
 * Barang pasar dan harga dasarnya pada UMK awal. Bahan dipakai usaha, konsumsi menambah Tenaga (paling banyak
 * tiga kali sehari), koleksi tidak punya efek dan disimpan atau diperdagangkan.
 */
export const BARANG = {
  ikan: { nama: 'Ikan', jenis: 'bahan', dasar: 30_000, satuan: 'kg', ringkas: 'Hasil perahu nelayan. Bahan warung makan.' },
  beras: { nama: 'Beras', jenis: 'bahan', dasar: 15_000, satuan: 'kg', ringkas: 'Bahan warung makan.' },
  'es-teh': { nama: 'Es teh manis', jenis: 'konsumsi', dasar: 11_000, satuan: 'gelas', tenaga: 3, lapar: 2, ringkas: 'Segar di siang yang terik.' },
  'pisang-goreng': { nama: 'Pisang goreng', jenis: 'konsumsi', dasar: 14_000, satuan: 'porsi', tenaga: 4, lapar: 8, ringkas: 'Teman ngobrol di warung kopi.' },
  'kopi-tubruk': { nama: 'Kopi tubruk', jenis: 'konsumsi', dasar: 19_000, satuan: 'gelas', tenaga: 5, lapar: 3, ringkas: 'Kopi hitam kental ala pelabuhan.' },
  'jamu-kunyit': { nama: 'Jamu kunyit asam', jenis: 'konsumsi', dasar: 27_000, satuan: 'botol', tenaga: 8, kesehatan: 10, lapar: 5, ringkas: 'Racikan Mbok Jamu dari pasar. Kesehatan +10.' },
  'nasi-bungkus': { nama: 'Nasi bungkus', jenis: 'konsumsi', dasar: 35_000, satuan: 'bungkus', tenaga: 10, lapar: 35, ringkas: 'Nasi, sayur, dan ikan goreng dalam daun pisang.' },
  'roti-sobek': { nama: 'Roti sobek', jenis: 'konsumsi', dasar: 9_000, satuan: 'bungkus', tenaga: 2, lapar: 14, ringkas: 'Roti empuk isi cokelat, siap santap.' },
  'mi-instan': { nama: 'Mi instan', jenis: 'konsumsi', dasar: 6_000, satuan: 'bungkus', tenaga: 3, lapar: 20, ringkas: 'Mi kuah seduh, penyelamat akhir bulan.' },
  'air-mineral': { nama: 'Air mineral', jenis: 'konsumsi', dasar: 4_000, satuan: 'botol', tenaga: 1, lapar: 0, ringkas: 'Air putih dingin.' },
  'susu-uht': { nama: 'Susu UHT', jenis: 'konsumsi', dasar: 10_000, satuan: 'kotak', tenaga: 3, kesehatan: 3, lapar: 8, ringkas: 'Susu cokelat kemasan kotak.' },
  biskuit: { nama: 'Biskuit', jenis: 'konsumsi', dasar: 8_000, satuan: 'bungkus', tenaga: 2, lapar: 12, ringkas: 'Biskuit gandum untuk ganjal perut.' },
  'minuman-energi': { nama: 'Minuman energi', jenis: 'konsumsi', dasar: 16_000, satuan: 'botol', tenaga: 10, lapar: 0, ringkas: 'Segar dan bertenaga, tapi tidak mengenyangkan.' },
  'ikan-kembung': { nama: 'Ikan kembung', jenis: 'bahan', dasar: 14_000, satuan: 'ekor', ringkas: 'Tangkapan umum dari pantai.' },
  'ikan-tongkol': { nama: 'Ikan tongkol', jenis: 'bahan', dasar: 18_000, satuan: 'ekor', ringkas: 'Tangkapan umum, berdaging padat.' },
  'ikan-kakap': { nama: 'Ikan kakap', jenis: 'bahan', dasar: 45_000, satuan: 'ekor', ringkas: 'Tangkapan jarang, bahan favorit restoran.' },
  'cumi-cumi': { nama: 'Cumi-cumi', jenis: 'bahan', dasar: 55_000, satuan: 'ekor', ringkas: 'Tangkapan jarang yang naik saat malam.' },
  'ikan-tuna': { nama: 'Ikan tuna', jenis: 'bahan', dasar: 160_000, satuan: 'ekor', ringkas: 'Tangkapan langka, besar dan berharga.' },
  lobster: { nama: 'Lobster', jenis: 'bahan', dasar: 320_000, satuan: 'ekor', ringkas: 'Tangkapan langka dari karang dalam.' },
  'perangko-lawas': { nama: 'Perangko lawas', jenis: 'koleksi', dasar: 80_000, satuan: 'lembar', ringkas: 'Perangko kantor pos Weton tempo dulu.' },
  'miniatur-monaz': { nama: 'Miniatur Monaz', jenis: 'koleksi', dasar: 150_000, satuan: 'buah', ringkas: 'Oleh-oleh khas Jakarte.' },
  'batik-tulis': { nama: 'Batik tulis Soloe', jenis: 'koleksi', dasar: 250_000, satuan: 'lembar', ringkas: 'Kadang dibawa pulang dari Soloe.' },
  'kerang-mutiara': { nama: 'Kerang mutiara', jenis: 'koleksi', dasar: 400_000, satuan: 'buah', ringkas: 'Sesekali terjaring perahu nelayan.' },
  'wayang-kulit': { nama: 'Wayang kulit', jenis: 'koleksi', dasar: 450_000, satuan: 'buah', ringkas: 'Tokoh Semar, tatahan halus.' },
  'keris-mini': { nama: 'Keris miniatur', jenis: 'koleksi', dasar: 600_000, satuan: 'buah', ringkas: 'Pajangan meja dengan warangka kayu.' },
  'akik-bacan': { nama: 'Batu akik bacan', jenis: 'koleksi', dasar: 900_000, satuan: 'butir', ringkas: 'Hijau berkilau, kebanggaan kolektor.' },
  'lukisan-pelabuhan': { nama: 'Lukisan Pelabuhan Weton', jenis: 'koleksi', dasar: 1_200_000, satuan: 'buah', ringkas: 'Cat minyak, senja di dermaga lama.' },
} as const satisfies Record<string, DefBarang>
export type Barang = keyof typeof BARANG
export const adalahBarang = (x: unknown): x is Barang => typeof x === 'string' && Object.hasOwn(BARANG, x)
export const defBarang = (b: Barang): DefBarang => BARANG[b]

/** Pedagang NPC menjual di 130% dan membeli di 70% harga dasar; lapak warga harus di dalam pita itu; biaya lapak 5% dari penjualan. */
export const PASAR = { npcJual: 1.3, npcBeli: 0.7, biayaLapak: 0.05, diskonPasaran: 0.15, maksPerAksi: 500, gudangMaks: 2000, lapakMaks: 5 } as const
/** Barang konsumsi paling banyak dipakai tiga kali per tanggal WIB. */
export const KONSUMSI = { kaliPerHari: 3 } as const
/** Peluang barang koleksi didapat: per siklus perahu, per perjalanan Soloe, per perjalanan Jakarte. */
export const TEMUAN = { mutiaraPerSiklus: 0.03, batikSoloe: 0.25, monazJakarte: 0.3 } as const

/** Hari pasaran: barang yang dijual NPC lebih murah pada hari itu. */
export const BARANG_PASARAN: Record<string, Barang | null> = { Legi: 'ikan', Pahing: 'beras', Pon: 'jamu-kunyit', Wage: 'nasi-bungkus', Kliwon: 'batik-tulis' }

const dasarKini = (b: Barang, umk: number) => BARANG[b].dasar * indeksHarga(umk)
/** Harga NPC hari ini: `jual` = warga membeli dari NPC, `beli` = NPC membeli dari warga. */
export function hargaNpc(b: Barang, tanggal: string, umk = UMK_AWAL): { jual: number; beli: number; diskon: boolean } {
  const diskon = BARANG_PASARAN[pasaran(tanggal)] === b
  const d = dasarKini(b, umk)
  return { jual: Math.round((d * PASAR.npcJual * (diskon ? 1 - PASAR.diskonPasaran : 1)) / 100) * 100, beli: Math.round((d * PASAR.npcBeli) / 100) * 100, diskon }
}
export const pitaLapak = (b: Barang, umk = UMK_AWAL): [number, number] => [Math.ceil(dasarKini(b, umk) * PASAR.npcBeli), Math.floor(dasarKini(b, umk) * PASAR.npcJual)]
export const biayaLapak = (bruto: number) => Math.round(bruto * PASAR.biayaLapak)

/** Ikan per siklus perahu (kg): 2 kg dasar, naik 25% per level. */
export const ikanPerSiklus = (level: number) => Math.round(2 * 1.25 ** (level - 1))

// ---- numpang (docs/EKONOMI.md bagian 5)

/** Uang dapur paling banyak per bulan kota; satu rumah satu kamar tamu; pemberitahuan berhenti 1 hari. */
export const NUMPANG = { id: 'numpang', dapurMaks: 300_000, kamarPerRumah: 1, pemberitahuanMs: 86_400_000 } as const
