import type { Penempatan } from './tipe.ts'
import { jenisById } from './bangunan.ts'
import { kustom } from './tataletak-kustom.ts'

/**
 * Peta 168 x 124 petak. Utara (z kecil) adalah laut. 1 petak kira-kira 3 meter.
 * Jalan berupa garis lengkung. Bangunan tidak ditaruh tangan: tiap deret menyebut jalan, sisi, dan urutan isinya,
 * lalu mesin di bawah meletakkannya sepanjang jalan dengan muka menghadap jalan, melompati persimpangan,
 * sungai, dan bangunan lain. `pnpm cek` memeriksa hasilnya.
 */
export const PETA = { lebar: 168, dalam: 124 } as const

export type Titik = readonly [number, number]

/** Garis pantai: pasangan [x, z]. Laut ada di utara garis ini. Teluk pelabuhan di barat, tanjung mercusuar di timur. */
export const garisPantai: Titik[] = [
  [0, 13], [8, 13.6], [14, 12.6], [20, 10.8], [28, 10], [36, 10.2], [42, 11.2], [47, 12.4], [54, 12.8],
  [62, 11.8], [72, 10.2], [82, 8.8], [92, 7.6], [100, 6.4], [106, 4.6], [111, 4.2], [116, 5], [120, 6], [126, 6.8], [134, 7.8], [144, 8.6], [154, 9.2], [168, 9.6],
]

export function zPantai(x: number): number {
  const g = garisPantai
  if (x <= g[0][0]) return g[0][1]
  for (let i = 1; i < g.length; i++) {
    if (x <= g[i][0]) {
      const t = (x - g[i - 1][0]) / (g[i][0] - g[i - 1][0])
      return g[i - 1][1] + t * (g[i][1] - g[i - 1][1])
    }
  }
  return g[g.length - 1][1]
}

/** Kade beton pelabuhan: rentang x sepanjang pantai. */
export const KADE = { dari: 14, ke: 47 } as const

// ---------------------------------------------------------------- garis lengkung

export type Garis = { x: number[]; z: number[]; s: number[]; panjang: number; tutup: boolean; kotak: { x0: number; x1: number; z0: number; z1: number } }

/** Penghalusan Chaikin: sudut dipotong berulang sampai lengkung. Ujung garis terbuka tetap di tempat. */
function chaikin(p: Titik[], tutup: boolean, ulang = 4): Titik[] {
  let q = p.slice()
  for (let n = 0; n < ulang; n++) {
    const r: Titik[] = tutup ? [] : [q[0]]
    const m = tutup ? q.length : q.length - 1
    for (let i = 0; i < m; i++) {
      const a = q[i]
      const b = q[(i + 1) % q.length]
      r.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]])
    }
    if (!tutup) r.push(q[q.length - 1])
    q = r
  }
  return q
}

export function buatGaris(titik: Titik[], tutup = false): Garis {
  const q = chaikin(titik, tutup)
  if (tutup) q.push(q[0])
  const x = q.map((t) => t[0])
  const z = q.map((t) => t[1])
  const s = [0]
  for (let i = 1; i < q.length; i++) s.push(s[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]))
  return {
    x, z, s, panjang: s[s.length - 1], tutup,
    kotak: { x0: Math.min(...x), x1: Math.max(...x), z0: Math.min(...z), z1: Math.max(...z) },
  }
}

/** Titik dan arah (satuan) pada jarak `s` sepanjang garis. Garis tertutup berputar. */
export function titikPada(g: Garis, s: number): { x: number; z: number; tx: number; tz: number } {
  const n = g.s.length
  s = g.tutup ? ((s % g.panjang) + g.panjang) % g.panjang : Math.min(Math.max(s, 0), g.panjang)
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (g.s[m] <= s) lo = m
    else hi = m
  }
  const p = g.s[hi] - g.s[lo] || 1
  const t = (s - g.s[lo]) / p
  const dx = g.x[hi] - g.x[lo]
  const dz = g.z[hi] - g.z[lo]
  const l = Math.hypot(dx, dz) || 1
  return { x: g.x[lo] + dx * t, z: g.z[lo] + dz * t, tx: dx / l, tz: dz / l }
}

/** Jarak titik ke garis. `batas` mempercepat: garis yang kotaknya lebih jauh dari batas dilewati. */
export function jarakKeGaris(g: Garis, x: number, z: number, batas = Infinity): number {
  const k = g.kotak
  if (x < k.x0 - batas || x > k.x1 + batas || z < k.z0 - batas || z > k.z1 + batas) return Infinity
  let m = Infinity
  for (let i = 1; i < g.x.length; i++) {
    const ax = g.x[i - 1]
    const az = g.z[i - 1]
    const dx = g.x[i] - ax
    const dz = g.z[i] - az
    const l2 = dx * dx + dz * dz || 1
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2))
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z)
    if (d < m) m = d
  }
  return m
}

// ---------------------------------------------------------------- jalan dan sungai

export type Jalan = { id: string; nama: string; lebar: number; garis: Garis }

const jalanOtomatis: Array<{ id: string; nama: string; lebar: number; titik: Titik[]; tutup?: boolean }> = [
  {
    id: 'pantai', nama: 'Jalan Pantai', lebar: 2.6,
    titik: [[0, 24], [12, 24.6], [24, 25.4], [34, 25.6], [44, 25], [52, 23.6], [62, 22.4], [72, 21], [82, 19.4], [92, 18], [102, 17.4], [118, 17.6], [132, 18.6], [146, 19.6], [168, 20]],
  },
  {
    id: 'raya', nama: 'Jalan Raya Weton', lebar: 3.2,
    titik: [[28, 25.4], [30, 31], [34, 36.5], [40, 40.5], [47, 43], [55, 44.6], [62, 45.4], [68, 46]],
  },
  {
    // titik tambahan dekat sudut menjaga sisi tetap lurus: alun-alun persegi dengan sudut membulat
    id: 'alun', nama: 'Jalan Alun-Alun', lebar: 2.6, tutup: true,
    titik: [[58, 46], [61, 46], [75, 46], [78, 46], [78, 49], [78, 61], [78, 64], [75, 64], [61, 64], [58, 64], [58, 61], [58, 49]],
  },
  { id: 'kampus', nama: 'Jalan Kampus', lebar: 3, titik: [[78, 55], [86, 54], [94, 50.5], [104, 46], [116, 45.5], [127, 48]] },
  {
    // jalan kecil di dalam kompleks Universitas Weton: satu lingkaran, tidak ada jalan raya yang memisahkan gedung
    id: 'lingkar-kampus', nama: 'Jalan Lingkar Kampus', lebar: 1.8, tutup: true,
    titik: [[128, 33], [131, 31], [155, 31], [158, 33], [160, 43], [158, 53], [155, 55], [131, 55], [128, 53], [126, 43]],
  },
  {
    id: 'sekar', nama: 'Jalan Sekar', lebar: 2.4,
    titik: [[58, 61], [50, 61.6], [42, 62.2], [32, 63], [22, 64.6], [12, 67], [0, 70]],
  },
  { id: 'nelayan', nama: 'Jalan Nelayan', lebar: 2, titik: [[9, 24.4], [8, 33], [10, 42], [14, 51], [18, 58], [21, 64.8]] },
  { id: 'weton-indah', nama: 'Jalan Weton Indah', lebar: 2.2, titik: [[62, 64], [62.3, 81]] },
  {
    id: 'kenanga', nama: 'Jalan Kenanga', lebar: 2.2,
    titik: [[44, 85], [54, 82], [62, 81], [72, 80.6], [82, 81.5], [92, 84], [99, 87.5]],
  },
  { id: 'merdeka', nama: 'Jalan Merdeka', lebar: 2.6, titik: [[66.5, 21.8], [67, 30], [66.6, 38], [66, 45.8]] },
  { id: 'kenari', nama: 'Gang Kenari', lebar: 1.8, titik: [[26, 64], [25.5, 72], [23, 80], [20, 88], [18.5, 101.2]] },
  { id: 'industri', nama: 'Jalan Industri', lebar: 2.6, titik: [[104, 46.3], [103, 58], [105, 72], [108, 86], [110, 100], [112, 124]] },
  { id: 'pabrik', nama: 'Jalan Pabrik', lebar: 2.8, titik: [[105.4, 74], [118, 76], [132, 77], [148, 76], [168, 74.5]] },
  {
    // jalan baru di selatan: tanah kavling yang bisa dibeli pemain atau dibangun aset kota
    id: 'cempaka', nama: 'Jalan Cempaka', lebar: 2.4,
    titik: [[0, 102], [20, 101], [38, 103], [56, 106], [76, 105], [96, 103], [110, 100]],
  },
  { id: 'flamboyan', nama: 'Jalan Flamboyan', lebar: 2.2, titik: [[76, 105], [78, 114], [80, 124]] },
  { id: 'bandara', nama: 'Jalan Bandara', lebar: 3, titik: [[110, 100], [124, 101.4], [140, 102], [154, 101.6], [166, 100.6]] },
]

/** Titik kendali jalan (sebelum dihaluskan): dari editor Wali Kota bila ada, selain itu tata letak otomatis. */
export const jalanMentah: ReadonlyArray<{ id: string; nama: string; lebar: number; titik: Titik[]; tutup?: boolean }> = kustom?.jalan ?? jalanOtomatis

export const jalan: Jalan[] = jalanMentah.map((j) => ({ id: j.id, nama: j.nama, lebar: j.lebar, garis: buatGaris(j.titik, j.tutup) }))
export const jalanById = new Map(jalan.map((j) => [j.id, j]))

/** Kali Sekar mengalir dari selatan ke laut, membelah kota barat dan timur. */
export const sungai = {
  nama: 'Kali Sekar',
  lebar: 3,
  garis: buatGaris([[41, 124], [43, 114], [40, 104], [42, 92], [39, 83], [42, 74], [38.5, 62], [41.5, 52], [41, 44], [44, 36], [47, 28], [50, 20], [51.5, 14], [52, 8]]),
}

// ---------------------------------------------------------------- grid medan

/**
 * Jarak bersih ke tepi aspal dan tepi sungai, dihitung sekali di grid 0,5 petak.
 * Mempercepat penempatan dan hiasan (ribuan pemeriksaan) tanpa memeriksa setiap ruas garis.
 */
const SEL = 0.5
const GW = Math.ceil(PETA.lebar / SEL) + 1
const GH = Math.ceil(PETA.dalam / SEL) + 1

function rasterBersih(daftar: Array<{ garis: Garis; lebar: number }>, jangkau: number): Float32Array {
  const g = new Float32Array(GW * GH).fill(99)
  for (const { garis, lebar } of daftar) {
    const r = lebar / 2 + jangkau
    for (let s = 0; s <= garis.panjang + 0.5; s += 0.5) {
      const t = titikPada(garis, s)
      const i0 = Math.max(0, Math.floor((t.x - r) / SEL))
      const i1 = Math.min(GW - 1, Math.ceil((t.x + r) / SEL))
      const j0 = Math.max(0, Math.floor((t.z - r) / SEL))
      const j1 = Math.min(GH - 1, Math.ceil((t.z + r) / SEL))
      const r2 = r * r
      for (let j = j0; j <= j1; j++) {
        const dz = j * SEL - t.z
        for (let i = i0; i <= i1; i++) {
          const dx = i * SEL - t.x
          const e = dx * dx + dz * dz
          if (e > r2) continue
          const d = Math.sqrt(e) - lebar / 2
          const k = j * GW + i
          if (d < g[k]) g[k] = d
        }
      }
    }
  }
  return g
}

const bersihJalan = rasterBersih(jalan, 2.6)
const bersihSungai = rasterBersih([sungai], 2.6)
const baca = (g: Float32Array, x: number, z: number) => {
  const i = Math.round(x / SEL)
  const j = Math.round(z / SEL)
  return i < 0 || j < 0 || i >= GW || j >= GH ? 99 : g[j * GW + i]
}

/** Perkiraan jarak bersih ke aspal terdekat (galat sampai 0,4 petak; 99 bila jauh). */
export const jarakKeJalan = (x: number, z: number) => baca(bersihJalan, x, z)
/** Perkiraan jarak bersih ke tepi air Kali Sekar. */
export const jarakKeSungai = (x: number, z: number) => baca(bersihSungai, x, z)

/** Titik terdekat pada garis dan jaraknya (tepat). */
export function titikTerdekat(g: Garis, x: number, z: number): { x: number; z: number; d: number } {
  let m = { x: g.x[0], z: g.z[0], d: Infinity }
  for (let i = 1; i < g.x.length; i++) {
    const ax = g.x[i - 1]
    const az = g.z[i - 1]
    const dx = g.x[i] - ax
    const dz = g.z[i] - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
    const px = ax + dx * t
    const pz = az + dz * t
    const d = Math.hypot(px - x, pz - z)
    if (d < m.d) m = { x: px, z: pz, d }
  }
  return m
}

/** Jarak bersih tepat ke aspal jalan lain selain `kecuali`. */
export function jarakKeJalanLain(x: number, z: number, kecuali: string): number {
  let m = Infinity
  for (const j of jalan) if (j.id !== kecuali) m = Math.min(m, jarakKeGaris(j.garis, x, z, 4) - j.lebar / 2)
  return m
}

/** Jarak (sepanjang garis) titik garis yang paling dekat ke (x, z). */
function sDekat(g: Garis, x: number, z: number): number {
  let best = 0
  let d = Infinity
  for (let i = 0; i < g.x.length; i++) {
    const e = (g.x[i] - x) ** 2 + (g.z[i] - z) ** 2
    if (e < d) {
      d = e
      best = g.s[i]
    }
  }
  return best
}

/** Bagian jalan yang melintasi sungai: [dari, ke] dalam jarak sepanjang jalan. */
export const jembatan: Array<{ jalan: string; dari: number; ke: number }> = jalan.flatMap((j) => {
  const hasil: Array<{ jalan: string; dari: number; ke: number }> = []
  let mulai: number | null = null
  for (let s = 0; s <= j.garis.panjang; s += 0.25) {
    const t = titikPada(j.garis, s)
    const atas = jarakKeSungai(t.x, t.z) < 0.9
    if (atas && mulai === null) mulai = s
    if (!atas && mulai !== null) {
      hasil.push({ jalan: j.id, dari: mulai, ke: s })
      mulai = null
    }
  }
  if (mulai !== null) hasil.push({ jalan: j.id, dari: mulai, ke: j.garis.panjang })
  return hasil
})

// ---------------------------------------------------------------- distrik

export type Distrik = { id: string; nama: string; singkat: string; ringkas: string }

export const distrik: Distrik[] = [
  { id: 'pelabuhan', nama: 'Pelabuhan Weton', singkat: 'Pelabuhan', ringkas: 'Pintu masuk kota: terminal, TPI, gudang, dan dermaga di teluk barat.' },
  { id: 'pantai', nama: 'Pantai Weton', singkat: 'Pantai', ringkas: 'Warung, restoran, hotel, dan mercusuar di tanjung timur.' },
  { id: 'kampung-nelayan', nama: 'Kampung Nelayan', singkat: 'Kampung Nelayan', ringkas: 'Rumah panggung di sepanjang Jalan Nelayan, SMA dan SMK.' },
  { id: 'niaga', nama: 'Koridor Jalan Raya', singkat: 'Jalan Raya', ringkas: 'Bursa Kerja, BLK, toko, kafe, dan bengkel di sepanjang Jalan Raya Weton.' },
  { id: 'pusat-kota', nama: 'Pusat Kota', singkat: 'Pusat Kota', ringkas: 'Alun-alun dikelilingi Balai Kota, Masjid Agung, Pasar Weton, Bank, dan Koran.' },
  { id: 'bandara', nama: 'Bandara Weton', singkat: 'Bandara', ringkas: 'Bandara kota dengan penerbangan ke Jakarte, Culabaya, dan Soloe.' },
  { id: 'merdeka', nama: 'Kawasan Merdeka', singkat: 'Merdeka', ringkas: 'Polsek, Kodim, Pemadam Kebakaran, dan kantor dinas di sekitar Jalan Merdeka.' },
  { id: 'kampus', nama: 'Kawasan Kampus dan Kesehatan', singkat: 'Kampus', ringkas: 'Kompleks Universitas Weton di Jalan Lingkar Kampus, dan RSUD Weton di Jalan Kampus.' },
  { id: 'kost', nama: 'Kampung Kost Sekar', singkat: 'Kampung Kost', ringkas: 'Kost Level 1 dan Level 2 di Jalan Sekar.' },
  { id: 'perumahan', nama: 'Perumahan Weton Indah', singkat: 'Perumahan', ringkas: 'Rusunawa, Kost Level 3, rumah warga, dan kavling di Jalan Kenanga.' },
  { id: 'industri', nama: 'Kawasan Industri', singkat: 'Industri', ringkas: 'Tiga pabrik besar di Jalan Pabrik, dengan lahan industri cadangan.' },
]

// ---------------------------------------------------------------- kotak berputar

/** Kotak di tanah. `rot` derajat (0 menghadap selatan, 90 timur); `w` searah sumbu x model, `d` searah sumbu z model. */
export type Kotak = { x: number; z: number; rot: number; w: number; d: number }

const rad = (deg: number) => (deg * Math.PI) / 180

/** Sumbu x dan z lokal di peta, mengikuti rotation-y three.js. */
function sumbu(k: Kotak) {
  const a = rad(k.rot)
  return { ux: [Math.cos(a), -Math.sin(a)] as const, uz: [Math.sin(a), Math.cos(a)] as const }
}

export function sudutKotak(k: Kotak): Titik[] {
  const { ux, uz } = sumbu(k)
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [
    k.x + ux[0] * (a * k.w) / 2 + uz[0] * (b * k.d) / 2,
    k.z + ux[1] * (a * k.w) / 2 + uz[1] * (b * k.d) / 2,
  ] as const)
}

/** Titik contoh di dalam kotak (rapat sekitar 1 petak), untuk memeriksa jalan dan laut. */
export function contohKotak(k: Kotak, langkah = 1): Titik[] {
  const { ux, uz } = sumbu(k)
  const nx = Math.max(1, Math.ceil(k.w / langkah))
  const nz = Math.max(1, Math.ceil(k.d / langkah))
  const hasil: Titik[] = []
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const a = (i / nx - 0.5) * k.w
      const b = (j / nz - 0.5) * k.d
      hasil.push([k.x + ux[0] * a + uz[0] * b, k.z + ux[1] * a + uz[1] * b])
    }
  }
  return hasil
}

/** Apakah dua kotak bertumpuk bila masing-masing dilebarkan `jarak / 2` (uji sumbu pemisah). */
export function tumpang(a: Kotak, b: Kotak, jarak = 0): boolean {
  const jari = (Math.hypot(a.w, a.d) + Math.hypot(b.w, b.d)) / 2 + jarak
  if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 > jari * jari) return false
  const A = { ...a, w: a.w + jarak, d: a.d + jarak }
  const B = { ...b, w: b.w + jarak, d: b.d + jarak }
  const ca = sudutKotak(A)
  const cb = sudutKotak(B)
  for (const k of [A, B]) {
    const { ux, uz } = sumbu(k)
    for (const ax of [ux, uz]) {
      const pa = ca.map(([x, z]) => x * ax[0] + z * ax[1])
      const pb = cb.map(([x, z]) => x * ax[0] + z * ax[1])
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false
    }
  }
  return true
}

export const dalamKotak = (k: Kotak, x: number, z: number, tepi = 0) => {
  const { ux, uz } = sumbu(k)
  const dx = x - k.x
  const dz = z - k.z
  return Math.abs(dx * ux[0] + dz * ux[1]) <= k.w / 2 + tepi && Math.abs(dx * uz[0] + dz * uz[1]) <= k.d / 2 + tepi
}

// Grid berpresisi 0,5 petak, jadi tepi diberi cadangan; `pnpm cek` memeriksa ulang dengan jarak tepat.
const TEPI_JALAN = 0.6
const TEPI_SUNGAI = 1

/** Kotak di darat, di dalam peta, tidak menyentuh jalan, sungai, atau laut. */
export function kotakBebasMedan(k: Kotak): boolean {
  for (const [x, z] of contohKotak(k)) {
    if (x < 0.6 || x > PETA.lebar - 0.6 || z > PETA.dalam - 0.6) return false
    if (z < zPantai(x) + 0.8) return false
    if (jarakKeJalan(x, z) < TEPI_JALAN) return false
    if (jarakKeSungai(x, z) < TEPI_SUNGAI) return false
  }
  return true
}

// ---------------------------------------------------------------- deret sepanjang jalan

/** Jarak minimal antarbangunan (petak), supaya kota tidak terasa sesak. */
export const JARAK_BANGUNAN = 1.4
const TROTOAR = 0.6

/**
 * Satu deret bangunan di satu sisi jalan. `kiri` dan `kanan` dilihat searah urutan titik jalan.
 * Isi: id jenis bangunan, `lahan:L:D` untuk lahan kosong selebar L dan sedalam D, atau `_:N` untuk jeda N petak.
 */
type Deret = {
  jalan: string
  sisi: 'kiri' | 'kanan'
  distrik: string
  isi: string[]
  /** jarak sepanjang jalan tempat deret mulai, atau `dekat`: titik [x, z] yang dituju pusat isi pertama */
  mulai?: number
  dekat?: Titik
  mundur?: number
  jarak?: number
}

const deret: Deret[] = [
  // Bandara di tenggara (Jalan Bandara mengarah ke timur, kanan = selatan)
  { jalan: 'bandara', sisi: 'kanan', dekat: [141, 112], distrik: 'bandara', isi: ['bandara'] },
  // Pelabuhan di antara Jalan Pantai dan teluk; lapangan peti kemas di seberang muara
  { jalan: 'pantai', sisi: 'kiri', mulai: 4, distrik: 'pelabuhan', mundur: 2.4, isi: ['tpi', '_:2', 'terminal-pelabuhan', '_:1', 'gudang-pelabuhan', 'gudang-pelabuhan'] },
  { jalan: 'pantai', sisi: 'kiri', dekat: [58, 18], distrik: 'pelabuhan', mundur: 2, isi: ['lapangan-kontainer'] },
  // Pantai timur
  {
    jalan: 'pantai', sisi: 'kiri', dekat: [68, 17], distrik: 'pantai', mundur: 1.2,
    isi: ['warung-pantai', 'warung-pantai', '_:2', 'resto-seafood', '_:4', 'hotel-pantai', '_:3', 'warung-pantai', '_:6', 'warung-pantai'],
  },
  { jalan: 'pantai', sisi: 'kanan', dekat: [54.5, 28], distrik: 'niaga', isi: ['rm-padang'] },
  { jalan: 'pantai', sisi: 'kanan', dekat: [79, 25.5], distrik: 'merdeka', isi: ['damkar', '_:3', 'markas-kodim'] },
  // pesisir timur: kavling di tepi pantai dan di seberangnya
  { jalan: 'pantai', sisi: 'kiri', dekat: [126, 13], distrik: 'pantai', mundur: 1.2, isi: ['lahan:8:5', '_:4', 'lahan:8:5', '_:4', 'lahan:8:5'] },
  { jalan: 'pantai', sisi: 'kanan', dekat: [106, 24], distrik: 'pantai', isi: ['lahan:8:5', '_:3', 'lahan:8:5', '_:3', 'lahan:8:5', '_:3', 'lahan:8:5', '_:3', 'lahan:8:5'] },
  // Kawasan Merdeka: Jalan Merdeka mengarah ke selatan, jadi kiri = timur
  { jalan: 'merdeka', sisi: 'kanan', mulai: 2, distrik: 'merdeka', isi: ['kantor-polisi', 'dinas-masyarakat'] },
  { jalan: 'merdeka', sisi: 'kiri', mulai: 2, distrik: 'merdeka', isi: ['dinas-pendidikan', 'dinas-ekonomi'] },
  // Kampung nelayan
  { jalan: 'pantai', sisi: 'kanan', mulai: 12, distrik: 'kampung-nelayan', isi: ['rumah-nelayan', 'rumah-nelayan', 'rumah-nelayan'] },
  {
    jalan: 'nelayan', sisi: 'kiri', mulai: 3, distrik: 'kampung-nelayan', mundur: 0.6,
    isi: ['rumah-nelayan', 'rumah-nelayan', 'rumah-nelayan', '_:2', 'rumah-nelayan', 'lahan:5:4', 'rumah-nelayan'],
  },
  {
    jalan: 'nelayan', sisi: 'kanan', mulai: 3, distrik: 'kampung-nelayan', mundur: 0.6,
    isi: ['rumah-nelayan', 'rumah-nelayan', '_:3', 'rumah-nelayan', 'rumah-nelayan', '_:2', 'smk-negeri'],
  },
  { jalan: 'sekar', sisi: 'kanan', dekat: [28, 58.5], distrik: 'kampung-nelayan', isi: ['sma-negeri'] },
  // Koridor Jalan Raya: dekat pelabuhan, lalu menyeberang Kali Sekar
  { jalan: 'raya', sisi: 'kiri', mulai: 3, distrik: 'niaga', isi: ['bursa-kerja', 'blk'] },
  { jalan: 'raya', sisi: 'kanan', mulai: 3, distrik: 'niaga', isi: ['kafe', 'bengkel'] },
  // Pusat kota mengelilingi alun-alun. Jalan Alun-Alun berputar searah jarum jam, jadi kiri = luar.
  // Tata kota Jawa: Balai Kota di selatan menghadap utara, Masjid Agung di barat menghadap timur, Pasar di utara.
  { jalan: 'alun', sisi: 'kiri', dekat: [73.6, 41.6], distrik: 'pusat-kota', isi: ['pasar-weton'] },
  { jalan: 'alun', sisi: 'kiri', dekat: [82.5, 50], distrik: 'pusat-kota', isi: ['bank-weton'] },
  { jalan: 'alun', sisi: 'kiri', dekat: [82.5, 59.6], distrik: 'pusat-kota', isi: ['koran-weton'] },
  { jalan: 'alun', sisi: 'kiri', dekat: [68, 69.4], distrik: 'pusat-kota', isi: ['balai-kota'] },
  { jalan: 'alun', sisi: 'kiri', dekat: [53, 55], distrik: 'pusat-kota', isi: ['masjid-agung'] },
  // Kampus dan kesehatan
  { jalan: 'kampus', sisi: 'kanan', mulai: 3, distrik: 'kampus', isi: ['rs-weton'] },
  // Kompleks Universitas Weton: semua gedung menghadap Jalan Lingkar Kampus (searah jarum jam, kiri = luar)
  { jalan: 'lingkar-kampus', sisi: 'kanan', dekat: [143, 37], distrik: 'kampus', isi: ['univ-rektorat'] },
  { jalan: 'lingkar-kampus', sisi: 'kiri', mulai: 6, distrik: 'kampus', isi: ['univ-fakultas', '_:2', 'univ-perpustakaan', '_:2', 'univ-fakultas'] },
  { jalan: 'lingkar-kampus', sisi: 'kiri', dekat: [152, 60], distrik: 'kampus', isi: ['univ-fakultas', '_:2', 'univ-fakultas'] },
  // Kampung kost di Jalan Sekar, barat Kali Sekar
  { jalan: 'sekar', sisi: 'kiri', dekat: [33.5, 68], distrik: 'kost', isi: ['kost-melati', 'kost-melati', 'kost-mawar', 'kost-mawar'] },
  { jalan: 'kenari', sisi: 'kiri', dekat: [28, 83], distrik: 'kost', isi: ['lahan:6:4.6'] },
  // Alpa Maret dan Indo April selalu bersebelahan
  { jalan: 'sekar', sisi: 'kiri', dekat: [53, 66.5], distrik: 'kost', isi: ['alpa-maret', 'indo-april'] },
  // Gang Kenari: jalan sempit ke selatan dari Jalan Sekar, kiri = timur
  { jalan: 'kenari', sisi: 'kiri', dekat: [29.5, 74], distrik: 'kost', isi: ['tempat-judi'] },
  { jalan: 'kenari', sisi: 'kanan', dekat: [19.5, 81], distrik: 'kost', isi: ['lokalisasi'] },
  { jalan: 'sekar', sisi: 'kanan', dekat: [45, 57], distrik: 'kost', isi: ['lahan:6:5'] },
  // Perumahan di Jalan Kenanga
  { jalan: 'kenanga', sisi: 'kiri', mulai: 2, distrik: 'perumahan', mundur: 0.5, isi: ['rusun-weton', 'rusun-weton', 'kost-anggrek', 'rumah-menengah', 'minimarket'] },
  {
    jalan: 'kenanga', sisi: 'kanan', mulai: 2, distrik: 'perumahan', mundur: 0.6,
    isi: ['rumah-menengah', 'rumah-menengah', 'kavling', 'kavling', 'kavling', 'kavling', 'lahan:6:4.6'],
  },
  { jalan: 'weton-indah', sisi: 'kanan', dekat: [57.5, 74], distrik: 'pusat-kota', isi: ['dinas-kepegawaian'] },
  // Kawasan industri: kiri = timur
  // Kawasan industri: semua pabrik di Jalan Pabrik (mengarah ke timur, kiri = utara)
  { jalan: 'pabrik', sisi: 'kiri', mulai: 4, distrik: 'industri', isi: ['pabrik-otomotif', '_:3', 'pabrik-garmen', '_:3', 'lahan:12:8'] },
  { jalan: 'pabrik', sisi: 'kanan', mulai: 4, distrik: 'industri', isi: ['pabrik-makanan', '_:3', 'papan-proyek', '_:3', 'lahan:12:8', '_:3', 'lahan:12:8'] },
  { jalan: 'industri', sisi: 'kiri', mulai: 6, distrik: 'industri', isi: ['lahan:9:6', '_:4', 'lahan:9:6'] },
  // Bandara di tenggara (Jalan Bandara mengarah ke timur, kanan = selatan)
  { jalan: 'bandara', sisi: 'kiri', mulai: 6, distrik: 'bandara', isi: ['lahan:9:6', '_:3', 'lahan:9:6', '_:3', 'lahan:9:6'] },
  // Tanah kavling baru di selatan: bisa dibeli pemain atau dibangun aset kota
  { jalan: 'cempaka', sisi: 'kiri', mulai: 3, distrik: 'perumahan', isi: ['lahan:7:5', '_:2', 'lahan:7:5', '_:2', 'lahan:7:5', '_:6', 'lahan:7:5', '_:2', 'lahan:7:5', '_:2', 'lahan:7:5', '_:2', 'lahan:7:5', '_:2', 'lahan:7:5'] },
  { jalan: 'cempaka', sisi: 'kanan', mulai: 3, distrik: 'perumahan', isi: ['lahan:7:6', '_:2', 'lahan:7:6', '_:2', 'lahan:7:6', '_:6', 'lahan:7:6', '_:2', 'lahan:7:6', '_:2', 'lahan:7:6', '_:2', 'lahan:7:6'] },
  { jalan: 'flamboyan', sisi: 'kiri', mulai: 3, distrik: 'perumahan', isi: ['lahan:6:5'] },
  { jalan: 'flamboyan', sisi: 'kanan', mulai: 3, distrik: 'perumahan', isi: ['lahan:6:5'] },
]

/** Benda yang ditaruh tangan: di atas air, atau di tengah ruang terbuka. */
const manual: Array<{ jenis: string; x: number; z: number; rot: number; distrik: string }> = [
  { jenis: 'dermaga', x: 23, z: 6.6, rot: 0, distrik: 'pelabuhan' },
  { jenis: 'kapal-penumpang', x: 18.8, z: 3.2, rot: 180, distrik: 'pelabuhan' },
  { jenis: 'dermaga', x: 39, z: 6.8, rot: 0, distrik: 'pelabuhan' },
  { jenis: 'perahu-nelayan', x: 3.4, z: 10.4, rot: 0, distrik: 'pelabuhan' },
  { jenis: 'perahu-nelayan', x: 7.6, z: 10.8, rot: 0, distrik: 'pelabuhan' },
  { jenis: 'perahu-nelayan', x: 11.4, z: 10.2, rot: 0, distrik: 'pelabuhan' },
  { jenis: 'alun-alun', x: 68, z: 55, rot: 0, distrik: 'pusat-kota' },
  { jenis: 'mercusuar', x: 108, z: 7.4, rot: 0, distrik: 'pantai' },
]

/** Jenis yang boleh tidak menghadap jalan: ruang terbuka dan penanda kota. */
export const BEBAS_MUKA = new Set(['alun-alun', 'mercusuar'])

function ukur(id: string): readonly [number, number] {
  const j = jenisById.get(id)
  if (!j) throw new Error(`Jenis tidak dikenal di tata letak: ${id}`)
  return j.ukuran
}

export type Lahan = Kotak & { id: string; distrik: string }

type Mentah = { jenis: string; x: number; z: number; rot: number; distrik: string }

/** Isi deret yang tidak mendapat tempat. Dilaporkan oleh `pnpm cek`; peta tetap tampil tanpanya. */
export const galatTataLetak: string[] = []

function susun() {
  const terpakai: Kotak[] = manual.filter((m) => !jenisById.get(m.jenis)!.diLaut).map((m) => ({ x: m.x, z: m.z, rot: m.rot, w: ukur(m.jenis)[0], d: ukur(m.jenis)[1] }))
  const bangunan: Mentah[] = []
  const lahan: Lahan[] = []
  for (const dr of deret) {
    const j = jalanById.get(dr.jalan)
    if (!j) throw new Error(`Jalan tidak dikenal di deret: ${dr.jalan}`)
    const tanda = dr.sisi === 'kiri' ? 1 : -1
    let s = dr.dekat ? sDekat(j.garis, dr.dekat[0], dr.dekat[1]) - (dr.isi[0].startsWith('lahan') ? Number(dr.isi[0].split(':')[1] ?? 6) : ukur(dr.isi[0])[0]) / 2 : (dr.mulai ?? 0)
    for (const isi of dr.isi) {
      const [kepala, a, b] = isi.split(':')
      if (kepala === '_') {
        s += Number(a ?? 2)
        continue
      }
      const kosong = kepala === 'lahan'
      const [w, d] = kosong ? [Number(a ?? 6), Number(b ?? 4.6)] : ukur(isi)
      let k: Kotak | null = null
      for (let coba = 0; coba < 160; coba++) {
        if (!j.garis.tutup && s + w > j.garis.panjang) break
        const t = titikPada(j.garis, s + w / 2)
        const nx = t.tz * tanda
        const nz = -t.tx * tanda
        const jauh = j.lebar / 2 + TROTOAR + (dr.mundur ?? 0.8) + d / 2
        const calon: Kotak = { x: t.x + nx * jauh, z: t.z + nz * jauh, rot: (((Math.atan2(-nx, -nz) * 180) / Math.PI) + 360) % 360, w, d }
        if (kotakBebasMedan(calon) && !terpakai.some((p) => tumpang(calon, p, JARAK_BANGUNAN))) {
          k = calon
          break
        }
        s += 0.5
      }
      if (!k) {
        galatTataLetak.push(`tidak ada tempat untuk ${isi} di ${j.nama} sisi ${dr.sisi}`)
        continue
      }
      terpakai.push(k)
      if (kosong) lahan.push({ ...k, id: `lahan-${lahan.length + 1}`, distrik: dr.distrik })
      else bangunan.push({ jenis: isi, x: k.x, z: k.z, rot: k.rot, distrik: dr.distrik })
      s += w + (dr.jarak ?? 1.8)
    }
  }
  return { bangunan, lahan }
}

function beriId(mentah: Mentah[]): Penempatan[] {
  const total = new Map<string, number>()
  for (const m of mentah) total.set(m.jenis, (total.get(m.jenis) ?? 0) + 1)
  const urut = new Map<string, number>()
  return mentah.map((m) => {
    const v = urut.get(m.jenis) ?? 0
    urut.set(m.jenis, v + 1)
    return { ...m, v, id: total.get(m.jenis)! > 1 ? `${m.jenis}-${v + 1}` : m.jenis }
  })
}

// tata letak kustom dari editor menggantikan deret dan benda tangan; tanpa kustom, mesin deret menyusunnya
const tersusun = kustom ? { bangunan: kustom.bangunan, lahan: kustom.lahan } : susun()
export const penempatan: Penempatan[] = beriId([...tersusun.bangunan, ...(kustom ? [] : manual)])
export const penempatanById = new Map(penempatan.map((p) => [p.id, p]))
/** Lahan kosong: petak di tepi jalan yang belum dibangun, cadangan untuk usaha dan rumah warga. */
export const lahanKosong: Lahan[] = tersusun.lahan

export function kotakPenempatan(p: Penempatan): Kotak {
  const [w, d] = ukur(p.jenis)
  return { x: p.x, z: p.z, rot: p.rot, w, d }
}

/** Titik tengah bangunan darat tiap distrik. Distrik tanpa bangunan (mungkin di tata letak kustom) tidak masuk. */
export const pusatDistrik = new Map(
  distrik.flatMap((d) => {
    const ps = penempatan.filter((p) => p.distrik === d.id && !jenisById.get(p.jenis)!.diLaut)
    if (!ps.length) return []
    const sx = ps.reduce((s, p) => s + p.x, 0) / ps.length
    const sz = ps.reduce((s, p) => s + p.z, 0) / ps.length
    return [[d.id, { x: sx, z: sz }] as const]
  }),
)

// ---------------------------------------------------------------- hiasan sebar

function acak(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type TitikHiasan = { x: number; z: number; s: number; r: number }

const halangan: Kotak[] = [...penempatan.filter((p) => !jenisById.get(p.jenis)!.diLaut).map(kotakPenempatan), ...lahanKosong]
const kenaBangunan = (x: number, z: number, m: number) => halangan.some((k) => dalamKotak(k, x, z, m))
const diDarat = (x: number, z: number) => x > 0.8 && x < PETA.lebar - 0.8 && z > zPantai(x) + 0.8 && z < PETA.dalam - 0.6
const diKade = (x: number, z: number) => x > KADE.dari - 0.5 && x < KADE.ke + 0.5 && z < zPantai(x) + 4
const dekatSungai = (x: number, z: number, m: number) => jarakKeSungai(x, z) < m

function sebarHiasan() {
  const r = acak(20261019)
  const rindang: TitikHiasan[] = []
  const kelapa: TitikHiasan[] = []
  const lampu: TitikHiasan[] = []
  const semak: TitikHiasan[] = []
  const bebas = (x: number, z: number, m: number) => diDarat(x, z) && !diKade(x, z) && !kenaBangunan(x, z, m) && !dekatSungai(x, z, m + 0.3)
  const jauhDari = (daftar: TitikHiasan[], x: number, z: number, d2: number) => !daftar.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < d2)

  // kelapa di pasir
  for (let x = 1.5; x < PETA.lebar - 1; x += 2.4 + r() * 1.6) {
    const z = zPantai(x) + 1 + r() * 1.6
    if (bebas(x, z, 0.5) && jarakKeJalan(x, z) > 0.8) kelapa.push({ x, z, s: 0.85 + r() * 0.35, r: r() * 6.28 })
  }
  // lampu jalan di trotoar, selang-seling sisi, lengan menunjuk ke aspal
  for (const j of jalan) {
    let sisi = 1
    for (let s = 4; s < j.garis.panjang - 2; s += 9) {
      const t = titikPada(j.garis, s)
      const nx = t.tz * sisi
      const nz = -t.tx * sisi
      const o = j.lebar / 2 + 0.3
      const x = t.x + nx * o
      const z = t.z + nz * o
      if (bebas(x, z, 0.2) && jarakKeJalanLain(x, z, j.id) > 1.2 && !dekatSungai(x, z, 1.4)) lampu.push({ x, z, s: 1, r: Math.atan2(nz, -nx) })
      sisi = -sisi
    }
  }
  // pohon peneduh di tepi trotoar
  for (const j of jalan) {
    for (let s = 2.5; s < j.garis.panjang - 1.5; s += 4.2) {
      for (const sisi of [-1, 1]) {
        const t = titikPada(j.garis, s)
        const o = j.lebar / 2 + 0.45
        const x = t.x + t.tz * sisi * o
        const z = t.z - t.tx * sisi * o
        if (bebas(x, z, 0.3) && jarakKeJalanLain(x, z, j.id) > 1.8 && jauhDari(lampu, x, z, 1.4) && r() < 0.8) rindang.push({ x, z, s: 0.75 + r() * 0.3, r: r() * 6.28 })
      }
    }
  }
  // pohon di tepi Kali Sekar
  for (let s = 1; s < sungai.garis.panjang; s += 3.4 + r() * 2) {
    for (const sisi of [-1, 1]) {
      const t = titikPada(sungai.garis, s)
      const o = sungai.lebar / 2 + 1.3 + r() * 0.6
      const x = t.x + t.tz * sisi * o
      const z = t.z - t.tx * sisi * o
      if (diDarat(x, z) && !kenaBangunan(x, z, 0.4) && jarakKeJalan(x, z) > 0.9 && r() < 0.75) rindang.push({ x, z, s: 0.8 + r() * 0.35, r: r() * 6.28 })
    }
  }
  // sepasang beringin di alun-alun (waringin kurung)
  for (const x of [63.6, 72.4]) rindang.push({ x, z: 49.9, s: 1.7, r: x })
  // taman dan pekarangan di lahan terbuka
  for (let i = 0; i < 6000 && rindang.length < 640; i++) {
    const x = 1 + r() * (PETA.lebar - 2)
    const z = zPantai(x) + 3.5 + r() * (PETA.dalam - zPantai(x) - 4)
    if (bebas(x, z, 0.9) && jarakKeJalan(x, z) > 1 && jauhDari(rindang, x, z, 4.4) && jauhDari(kelapa, x, z, 4)) rindang.push({ x, z, s: 0.7 + r() * 0.35, r: r() * 6.28 })
  }
  // semak kecil
  for (let i = 0; i < 6000 && semak.length < 360; i++) {
    const x = 1 + r() * (PETA.lebar - 2)
    const z = zPantai(x) + 3 + r() * (PETA.dalam - zPantai(x) - 4)
    if (bebas(x, z, 0.35) && jarakKeJalan(x, z) > 0.5 && jauhDari(rindang, x, z, 1.6) && jauhDari(semak, x, z, 1.6)) semak.push({ x, z, s: 0.8 + r() * 0.7, r: r() * 6.28 })
  }
  return { rindang, kelapa, lampu, semak }
}

export const sebaran = sebarHiasan()

// ---------------------------------------------------------------- rute kendaraan

const titikGaris = (g: Garis): Array<[number, number]> => g.x.map((x, i) => [x, g.z[i]])

const bolakBalik = (t: Array<[number, number]>) => (t.length < 2 ? [] : [...t, ...[...t].reverse().slice(1, -1)])

/**
 * Jalur tertutup untuk kendaraan (lajur kiri dihitung di adegan). Tata letak kustom dari editor bisa tidak punya
 * Jalan Raya, alun-alun, atau Jalan Pantai; kendaraan lalu bolak-balik di jalan terpanjang. Jalur kosong = tanpa kendaraan.
 */
export const rute = (() => {
  const terpanjang = [...jalan].filter((j) => !j.garis.tutup).sort((a, b) => b.garis.panjang - a.garis.panjang)
  const raya = jalanById.get('raya')
  const alun = jalanById.get('alun')
  const pantai = jalanById.get('pantai') ?? terpanjang.find((j) => j !== (raya ?? terpanjang[0])) ?? terpanjang[0]
  let kota: Array<[number, number]>
  if (raya && alun) {
    const r = titikGaris(raya.garis)
    const cincin = titikGaris(alun.garis).slice(0, -1)
    const [ex, ez] = r[r.length - 1]
    let i0 = 0
    cincin.forEach(([x, z], i) => {
      if ((x - ex) ** 2 + (z - ez) ** 2 < (cincin[i0][0] - ex) ** 2 + (cincin[i0][1] - ez) ** 2) i0 = i
    })
    const putar = [...cincin.slice(i0), ...cincin.slice(0, i0), cincin[i0]]
    // dari pelabuhan lewat Jalan Raya, mengelilingi alun-alun, lalu kembali
    kota = [...r, ...putar.slice(1), ...[...r].reverse().slice(1, -1)]
  } else {
    const j = raya ?? terpanjang[0]
    kota = j ? bolakBalik(titikGaris(j.garis)) : []
  }
  return { kota, pantai: pantai ? bolakBalik(titikGaris(pantai.garis)) : [] }
})()
