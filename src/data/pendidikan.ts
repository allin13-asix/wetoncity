// Universitas Weton. Pemain baru lulusan SMA/SMK berumur 18 tahun.

/** Satu semester sama dengan satu siklus tagihan (7 hari). */
export const KULIAH = {
  hariPerSemester: 7,
  sesiPerSemester: 5,
  tenagaPerSesi: 20,
} as const
export const TENAGA_PER_SEMESTER = KULIAH.sesiPerSemester * KULIAH.tenagaPerSesi

export type Jurusan = {
  id: string
  nama: string
  jenjang: 'D3' | 'S1'
  semester: number
  /** biaya kuliah per semester (UKT) */
  ukt: number
  fakultas: string
  /** id pekerjaan yang terbuka setelah lulus */
  membuka: string[]
  ringkas: string
}

export const jurusan: Jurusan[] = [
  { id: 'd3-keperawatan', nama: 'D3 Keperawatan', jenjang: 'D3', semester: 6, ukt: 600_000, fakultas: 'Kesehatan', membuka: ['perawat', 'pns-masyarakat-4', 'pns-pendidikan-4'], ringkas: 'Praktik di RSUD Weton.' },
  { id: 'd3-perhotelan', nama: 'D3 Perhotelan dan Pariwisata', jenjang: 'D3', semester: 6, ukt: 600_000, fakultas: 'Pariwisata', membuka: ['manajer-hotel', 'pns-masyarakat-4', 'pns-pendidikan-4'], ringkas: 'Praktik di Hotel Pantai Weton.' },
  { id: 'd3-perbankan', nama: 'D3 Keuangan dan Perbankan', jenjang: 'D3', semester: 6, ukt: 600_000, fakultas: 'Ekonomi dan Bisnis', membuka: ['teller-bank', 'pns-pendidikan-4', 'pns-kepegawaian-4', 'pns-ekonomi-4'], ringkas: 'Magang di Bank Weton.' },
  { id: 's1-akuntansi', nama: 'S1 Akuntansi', jenjang: 'S1', semester: 8, ukt: 750_000, fakultas: 'Ekonomi dan Bisnis', membuka: ['staf-kredit', 'pns-balai-kota', 'pns-ekonomi-5'], ringkas: 'Laporan keuangan dan audit.' },
  { id: 's1-manajemen', nama: 'S1 Manajemen', jenjang: 'S1', semester: 8, ukt: 750_000, fakultas: 'Ekonomi dan Bisnis', membuka: ['pns-balai-kota', 'manajer-produksi', 'pns-kepegawaian-5', 'pns-ekonomi-5'], ringkas: 'Mengelola usaha dan organisasi.' },
  { id: 's1-pendidikan', nama: 'S1 Pendidikan', jenjang: 'S1', semester: 8, ukt: 750_000, fakultas: 'Keguruan', membuka: ['guru', 'pns-balai-kota', 'pns-pendidikan-5'], ringkas: 'Praktik mengajar di sekolah negeri.' },
  { id: 's1-komunikasi', nama: 'S1 Ilmu Komunikasi', jenjang: 'S1', semester: 8, ukt: 750_000, fakultas: 'Sosial dan Politik', membuka: ['wartawan', 'pns-balai-kota', 'pns-masyarakat-5'], ringkas: 'Jurnalistik dan humas.' },
  { id: 's1-perikanan', nama: 'S1 Perikanan dan Kelautan', jenjang: 'S1', semester: 8, ukt: 900_000, fakultas: 'Perikanan', membuka: ['penyuluh-perikanan', 'pns-balai-kota', 'pns-masyarakat-5'], ringkas: 'Budidaya dan tata kelola pesisir.' },
  { id: 's1-teknik-sipil', nama: 'S1 Teknik Sipil', jenjang: 'S1', semester: 8, ukt: 1_000_000, fakultas: 'Teknik', membuka: ['insinyur-sipil', 'pns-balai-kota'], ringkas: 'Jalan, jembatan, dan bangunan kota.' },
  { id: 's1-teknik-industri', nama: 'S1 Teknik Industri', jenjang: 'S1', semester: 8, ukt: 1_000_000, fakultas: 'Teknik', membuka: ['insinyur-industri', 'manajer-produksi'], ringkas: 'Produksi dan logistik di pabrik-pabrik Jalan Pabrik.' },
  { id: 's1-informatika', nama: 'S1 Informatika', jenjang: 'S1', semester: 8, ukt: 1_000_000, fakultas: 'Teknik', membuka: ['staf-it', 'pns-balai-kota', 'pns-kepegawaian-5'], ringkas: 'Perangkat lunak dan sistem kota.' },
]

export const totalUkt = (j: Jurusan) => j.ukt * j.semester

/** Latar sekolah pendatang baru, dipilih sekali saat tiba. Pekerjaan di tempat yang cocok: upah +15% dan syarat Keahlian 2 lebih rendah. */
export const SEKOLAH = {
  sma: {
    nama: 'SMA', ringkas: 'Umum. Cocok untuk kerja kantor dan kuliah: UKT diskon 25%.',
    tempat: ['balai-kota', 'dinas-ekonomi', 'dinas-kepegawaian', 'dinas-masyarakat', 'dinas-pendidikan', 'koran-weton', 'bank-weton'], diskonUkt: 0.25,
  },
  'smk-otomotif': { nama: 'SMK Otomotif', ringkas: 'Mesin dan kendaraan: bengkel, pabrik otomotif, sopir dan ojek terminal.', tempat: ['bengkel', 'pabrik-otomotif', 'terminal-pelabuhan'], diskonUkt: 0 },
  'smk-perhotelan': { nama: 'SMK Perhotelan', ringkas: 'Melayani tamu: hotel, restoran, kafe, dan warung makan.', tempat: ['hotel-pantai', 'resto-seafood', 'rm-padang', 'kafe', 'warung-pantai'], diskonUkt: 0 },
  'smk-pelayaran': { nama: 'SMK Pelayaran', ringkas: 'Laut dan pelabuhan: gudang, TPI, dermaga, dan kapal.', tempat: ['gudang-pelabuhan', 'tpi', 'dermaga', 'kapal-penumpang', 'lapangan-kontainer', 'mercusuar'], diskonUkt: 0 },
} as const
export type Sekolah = keyof typeof SEKOLAH
export const BONUS_SEKOLAH = { upah: 0.15, keahlian: 2 } as const
export const adalahSekolah = (x: unknown): x is Sekolah => typeof x === 'string' && Object.hasOwn(SEKOLAH, x)
