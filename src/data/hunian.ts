import type { Fase } from './tipe.ts'
import { HARI_KOTA_PER_SIKLUS, MAKAN_HARIAN, UMK_AWAL, indeksHarga } from './ekonomi.ts'

export type Hunian = {
  id: string
  nama: string
  jenis: 'rusun' | 'kost' | 'hotel' | 'numpang' | 'rumah'
  level: number
  /** per bulan kota (satu siklus tagihan), per orang, pada UMK awal */
  sewaBulan: number
  listrikBulan: number
  penghuni: number
  /** jumlah kamar di satu bangunan hunian ini; tanpa nilai berarti tanpa batas (rumah sendiri, numpang) */
  kamar?: number
  /** jenis bangunan di peta */
  bangunan: string[]
  fasilitas: string[]
  makanDiskon: number
  kursusDiskon: number
  tenagaMaks: number
  syarat: string[]
  fase: Fase
  catatan?: string
}

export const hunian: Hunian[] = [
  {
    id: 'rusun-weton', nama: 'Rusunawa Weton', jenis: 'rusun', level: 0,
    sewaBulan: 150_000, listrikBulan: 40_000, penghuni: 2, kamar: 30,
    bangunan: ['rusun-weton'],
    fasilitas: ['Satu kamar dibagi dua warga', 'Dapur dan kamar mandi bersama', 'Ruang jemur di atap'],
    makanDiskon: 0, kursusDiskon: 0, tenagaMaks: 0,
    syarat: ['Belum punya properti sendiri', 'Masih Tier 2 ke bawah (Keahlian di bawah 6)', '30 kamar per gedung, satu kamar dua warga'],
    fase: 0,
    catatan: 'Teman sekamar adalah pemain lain. Selama belum ada, ditemani Mas Bagas (NPC). Wajib pindah paling lambat 4 minggu setelah mencapai Tier 3.',
  },
  {
    id: 'kost-melati', nama: 'Kost Melati', jenis: 'kost', level: 1,
    sewaBulan: 450_000, listrikBulan: 60_000, penghuni: 1, kamar: 4,
    bangunan: ['kost-melati'],
    fasilitas: ['Kamar sendiri 3 x 3 meter', 'Kasur dan lemari', 'Kipas angin', 'Kamar mandi di luar, bergilir'],
    makanDiskon: 0, kursusDiskon: 0, tenagaMaks: 0,
    syarat: ['Tanpa syarat'],
    fase: 0,
  },
  {
    id: 'kost-mawar', nama: 'Kost Mawar', jenis: 'kost', level: 2,
    sewaBulan: 750_000, listrikBulan: 90_000, penghuni: 1, kamar: 6,
    bangunan: ['kost-mawar'],
    fasilitas: ['Kamar mandi dalam', 'Meja belajar dan WiFi', 'Dapur bersama', 'Parkir motor'],
    makanDiskon: 0.2, kursusDiskon: 0.1, tenagaMaks: 0,
    syarat: ['Tanpa syarat'],
    fase: 0,
    catatan: 'Dapur bersama menghemat biaya makan 20%. WiFi memberi diskon kursus 10%.',
  },
  {
    id: 'kost-anggrek', nama: 'Kost Anggrek', jenis: 'kost', level: 3,
    sewaBulan: 980_000, listrikBulan: 150_000, penghuni: 1, kamar: 8,
    bangunan: ['kost-anggrek'],
    fasilitas: ['Kamar luas ber-AC', 'Kamar mandi dalam dengan air hangat', 'WiFi cepat dan laundry', 'Parkir mobil dan keamanan 24 jam'],
    makanDiskon: 0.2, kursusDiskon: 0.1, tenagaMaks: 10,
    syarat: ['Tanpa syarat'],
    fase: 0,
    catatan: 'Tagihan besar memperlambat kemajuan di minggu-minggu awal: Tier 3 tercapai jauh lebih lambat daripada di kost lain. Lebih cocok setelah Tier 2.',
  },
  {
    id: 'hotel-pantai', nama: 'Hotel Pantai Weton', jenis: 'hotel', level: 4,
    sewaBulan: 1_500_000, listrikBulan: 0, penghuni: 2, kamar: 20,
    bangunan: ['hotel-pantai'],
    fasilitas: ['Kamar ber-AC menghadap laut, dibagi dua tamu', 'Sarapan setiap pagi', 'Listrik dan air sudah termasuk', 'Kolam renang dan layanan kamar'],
    makanDiskon: 0.3, kursusDiskon: 0, tenagaMaks: 20,
    syarat: ['Tanpa syarat', '20 kamar, satu kamar dua tamu'],
    fase: 0,
    catatan: 'Tinggal di hotel: paling nyaman, paling mahal. Sarapan menghemat biaya makan 30%.',
  },
  {
    id: 'rumah-sendiri', nama: 'Rumah sendiri', jenis: 'rumah', level: 4,
    sewaBulan: 0, listrikBulan: 120_000, penghuni: 1,
    bangunan: ['rumah-menengah'],
    fasilitas: ['Tanpa sewa', 'Dibangun di lahan milikmu', 'Bebas menata sendiri'],
    makanDiskon: 0.2, kursusDiskon: 0, tenagaMaks: 10,
    syarat: ['Punya lahan dengan rumah yang sudah dibangun (beli lahan dan bangun rumah dari Beranda)'],
    fase: 0,
    catatan: 'Hanya bisa dipilih setelah membangun rumah di lahan milikmu.',
  },
  {
    id: 'numpang', nama: 'Numpang di rumah teman', jenis: 'numpang', level: 0,
    sewaBulan: 0, listrikBulan: 0, penghuni: 1,
    bangunan: ['rumah-menengah'],
    fasilitas: ['Kamar tamu di rumah pemain lain', 'Pemilik menentukan uang dapur 0 sampai Rp 300.000 per bulan'],
    makanDiskon: 0, kursusDiskon: 0, tenagaMaks: 0,
    syarat: ['Berteman dengan pemilik rumah', 'Pemilik memberi izin dan punya kamar kosong', 'Keduanya boleh mengakhiri dengan pemberitahuan 1 hari'],
    fase: 2,
    catatan: 'Belum bisa dipilih sampai ada pemain yang punya rumah. Uang dapur berpindah ke pemilik, jadi tidak menambah uang beredar.',
  },
]

/** Rincian tagihan satu bulan kota: sewa, listrik, dan makan (setelah diskon), disesuaikan dengan indeks harga UMK, dibulatkan ke ribuan. */
export function rincianBulan(h: Hunian, umk = UMK_AWAL) {
  const i = indeksHarga(umk)
  const ribu = (n: number) => Math.round((n * i) / 1000) * 1000
  const sewa = ribu(h.sewaBulan)
  const listrik = ribu(h.listrikBulan)
  const makan = ribu(MAKAN_HARIAN * HARI_KOTA_PER_SIKLUS * (1 - h.makanDiskon))
  return { sewa, listrik, makan, total: sewa + listrik + makan }
}

export const biayaBulan = (h: Hunian, umk = UMK_AWAL) => rincianBulan(h, umk).total
