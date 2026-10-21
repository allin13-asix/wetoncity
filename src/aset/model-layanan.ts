// Bangunan layanan kota dan usaha tambahan: polisi, kodim, damkar, dinas, rumah makan Padang,
// minimarket waralaba, tempat judi, dan kompleks Gang Kenari. Depan menghadap +z.
import { P } from './palet.ts'
import { Rakit, badan, type Pembuat } from './rakit.ts'

const COKELAT_POLRI = '#5b3d2a'
const HIJAU_TNI = '#5f7a45'
const MERAH_DAMKAR = '#c8372d'

/** Tiang bendera merah putih. */
function bendera(r: Rakit, x: number, z: number, tinggi: number, y = 0.06) {
  r.tiang(x, z, tinggi, 0.035, P.abu, y)
  r.kotak(x + 0.27, y + tinggi - 0.32, z, 0.5, 0.26, 0.03, P.merah)
  r.kotak(x + 0.27, y + tinggi - 0.58, z, 0.5, 0.26, 0.03, P.putih)
}

export const layanan: Record<string, Pembuat> = {
  'kantor-polisi': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const bz = -0.6
    const top = badan(r, { w: 5.6, d: 3.0, lantai: 2, warna: '#f1efe9', z: bz, sisi: ['u', 't', 'b'] })
    r.jendela('s', 5.6, 3.0, 1.45, 4, { cz: bz, lj: 0.6, tj: 0.55 })
    r.jendela('s', 5.6, 3.0, 0.4, 4, { cz: bz, lj: 0.6, tj: 0.55, margin: 0.4 })
    r.kotak(0, 0.06, bz + 1.53, 1.3, 1.0, 0.05, P.kacaTua)
    r.kotak(0, 1.05, bz + 1.54, 5.6, 0.12, 0.06, COKELAT_POLRI)
    r.kotak(0, top, bz, 5.8, 0.25, 3.2, COKELAT_POLRI)
    // serambi dan papan nama
    r.kotak(0, 1.0, 1.45, 2.4, 0.1, 1.0, COKELAT_POLRI)
    r.tiang(-1.1, 1.85, 1.0, 0.05, P.putih, 0.06)
    r.tiang(1.1, 1.85, 1.0, 0.05, P.putih, 0.06)
    r.kotak(0, 1.1, 1.93, 2.2, 0.35, 0.06, COKELAT_POLRI)
    r.kotak(0, 1.22, 1.97, 1.8, 0.1, 0.02, P.kuning)
    // lampu rotator dan antena di atap
    r.kotak(-0.3, top + 0.25, 0.3, 0.32, 0.15, 0.22, P.merah)
    r.kotak(0.1, top + 0.25, 0.3, 0.32, 0.15, 0.22, P.biru)
    r.tiang(1.9, -1.5, 1.6, 0.04, P.abuTua, top + 0.25)
    bendera(r, -2.8, 1.75, 3.0)
    // mobil patroli
    r.kotak(2.3, 0.14, 1.55, 0.72, 0.34, 1.25, P.putih)
    r.kotak(2.3, 0.3, 1.55, 0.74, 0.08, 1.27, P.biru)
    r.kotak(2.3, 0.48, 1.5, 0.62, 0.25, 0.7, P.kacaTua)
    r.kotak(2.3, 0.73, 1.5, 0.42, 0.06, 0.16, P.merah)
    for (const z of [1.12, 1.98]) r.silinderX(2.3, 0.13, z, 0.13, 0.76, P.hitam, 8)
    return r
  },

  'markas-kodim': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, '#b9b39a')
    r.kotak(0, 0.06, 0.8, 6.2, 0.02, 3.0, '#cfcabb')
    // tembok keliling dengan gerbang di tengah depan
    const tembok = '#7c8a5c'
    r.kotak(-3.25, 0.06, d / 2 - 0.15, 4.3, 0.9, 0.2, tembok)
    r.kotak(3.25, 0.06, d / 2 - 0.15, 4.3, 0.9, 0.2, tembok)
    r.kotak(0, 0.06, -d / 2 + 0.15, w - 0.2, 0.9, 0.2, tembok)
    r.kotak(-w / 2 + 0.15, 0.06, 0, 0.2, 0.9, d - 0.2, tembok)
    r.kotak(w / 2 - 0.15, 0.06, 0, 0.2, 0.9, d - 0.2, tembok)
    for (const x of [-1.15, 1.15]) r.kotak(x, 0.06, d / 2 - 0.15, 0.35, 1.4, 0.35, '#5f6b45')
    for (let i = 0; i < 5; i++) r.kotak(-0.8 + i * 0.4, 0.72, d / 2 - 0.05, 0.4, 0.09, 0.08, i % 2 ? P.putih : P.merah)
    // pos jaga
    r.kotak(2.3, 0.06, d / 2 - 1.0, 1.0, 1.3, 1.0, '#e9e3cf')
    r.kotak(2.3, 0.6, d / 2 - 0.49, 0.6, 0.4, 0.03, P.kacaTua)
    r.perisai(2.3, 1.36, d / 2 - 1.0, 1.2, 0.4, 1.2, P.hijauTua, 0.2)
    // gedung markas
    const z0 = -d / 2 + 2.0
    const top = badan(r, { w: 7.2, d: 3.2, lantai: 2, warna: HIJAU_TNI, z: z0, sisi: ['s', 't', 'b'], kaca: P.kremTua })
    r.kotak(0, top, z0, 7.4, 0.2, 3.4, '#e9e3cf')
    r.perisai(0, top + 0.2, z0, 7.4, 0.9, 3.4, P.hijauTua, 0.3)
    r.kotak(0, 0.06, z0 + 1.63, 1.2, 1.0, 0.06, P.kayuTua)
    r.kotak(0, 0.06, z0 + 1.95, 1.8, 0.12, 0.6, '#d9d3bf')
    bendera(r, -0.3, 1.0, 3.6)
    // menara pengawas di pojok belakang
    const mx = w / 2 - 1.0
    const mz = -d / 2 + 1.0
    for (const sx of [-0.35, 0.35]) for (const sz of [-0.35, 0.35]) r.tiang(mx + sx, mz + sz, 3.0, 0.05, '#5f6b45')
    r.kotak(mx, 3.0, mz, 1.0, 0.7, 1.0, tembok)
    r.perisai(mx, 3.7, mz, 1.2, 0.4, 1.2, P.hijauTua, 0.2)
    // truk tentara
    r.kotak(-3.2, 0.25, 2.7, 0.9, 0.7, 0.8, '#55663f')
    r.kotak(-3.2, 0.62, 3.11, 0.8, 0.28, 0.02, P.kacaTua)
    r.kotak(-3.2, 0.3, 1.55, 0.95, 0.45, 1.5, '#55663f')
    r.kotak(-3.2, 0.75, 1.55, 0.95, 0.45, 1.5, '#6f7d52')
    for (const z of [2.75, 1.95, 1.15]) r.silinderX(-3.2, 0.18, z, 0.18, 1.0, P.hitam, 8)
    return r
  },

  damkar: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const bz = -0.7
    r.kotak(0, 0.06, bz, 6.4, 2.2, 3.4, MERAH_DAMKAR)
    r.kotak(0, 2.26, bz, 6.4, 1.1, 3.4, '#e9e5dc')
    r.jendela('s', 6.4, 3.4, 2.5, 5, { cz: bz, lj: 0.6, tj: 0.55 })
    r.jendela('t', 6.4, 3.4, 2.5, 2, { cz: bz, lj: 0.6, tj: 0.55 })
    r.kotak(0, 3.36, bz, 6.6, 0.18, 3.6, '#8f241c')
    // tiga pintu garasi
    for (const i of [-1, 0, 1]) {
      const x = i * 2.05
      r.kotak(x, 0.06, bz + 1.72, 1.7, 1.78, 0.05, P.putih)
      r.kotak(x, 0.06, bz + 1.74, 1.5, 1.62, 0.05, '#e3e3e3')
      for (let k = 0; k < 4; k++) r.kotak(x, 0.35 + k * 0.35, bz + 1.77, 1.5, 0.04, 0.02, '#c4c4c4')
    }
    r.kotak(0, 1.92, bz + 1.75, 3.6, 0.26, 0.04, P.putih)
    r.kotak(0, 1.98, bz + 1.78, 3.0, 0.1, 0.02, MERAH_DAMKAR)
    // menara jemur selang
    r.kotak(-2.85, 0.06, bz - 1.15, 0.9, 5.0, 0.9, MERAH_DAMKAR)
    r.kotak(-2.85, 3.8, bz - 0.68, 0.4, 0.5, 0.03, P.kacaTua)
    r.kotak(-2.85, 5.06, bz - 1.15, 1.1, 0.15, 1.1, '#8f241c')
    r.kotak(-2.85, 5.21, bz - 1.15, 0.2, 0.5, 0.2, P.kuning)
    // mobil pemadam keluar dari pintu tengah
    r.kotak(0, 0.2, 1.65, 1.1, 0.75, 1.5, '#d62f25')
    r.kotak(0, 0.2, 2.3, 1.05, 0.9, 0.55, '#d62f25')
    r.kotak(0, 0.66, 2.58, 0.9, 0.35, 0.02, P.kaca)
    r.kotak(0, 0.95, 1.55, 0.36, 0.06, 1.5, P.putih)
    for (let k = 0; k < 6; k++) r.kotak(0, 0.98, 0.9 + k * 0.26, 0.36, 0.04, 0.04, P.abu)
    r.kotak(0, 1.1, 2.3, 0.5, 0.06, 0.15, P.biru)
    r.kotak(0, 0.45, 1.65, 1.12, 0.08, 1.52, P.putih)
    for (const z of [1.2, 2.25]) r.silinderX(0, 0.17, z, 0.17, 1.12, P.hitam, 8)
    return r
  },

  dinas: ({ w, d, varian }) => {
    const aksen = String(varian.warna ?? P.biru)
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.3, 5.2, 0.25, 3.2, '#d8d3c3')
    const bz = -0.35
    const top = badan(r, { w: 5.0, d: 2.9, lantai: 2, warna: P.putih, z: bz, y0: 0.31, sisi: ['u', 't', 'b'], kaca: P.kacaTua })
    r.jendela('s', 5.0, 2.9, 1.66, 4, { cz: bz, lj: 0.55, tj: 0.55, warna: P.kacaTua })
    for (const x of [-1.8, 1.8]) r.kotak(x, 0.6, bz + 1.47, 0.6, 0.55, 0.05, P.kacaTua)
    r.kotak(0, top, bz, 5.2, 0.15, 3.1, aksen)
    r.perisai(0, top + 0.15, bz, 5.4, 0.9, 3.3, P.genteng, 0.3)
    // serambi bertiang
    r.kotak(0, 0.31, 1.45, 2.2, 0.08, 1.0, '#e8e4d6')
    for (const x of [-0.9, -0.3, 0.3, 0.9]) r.silinder(x, 0.31, 1.85, 0.08, 0.08, 1.8, P.putih, 8)
    r.kotak(0, 2.11, 1.45, 2.4, 0.18, 1.0, P.putih)
    r.pelana(0, 2.29, 1.45, 2.4, 0.5, 1.0, aksen)
    r.kotak(0, 0.31, bz + 1.48, 1.0, 1.3, 0.06, P.kayuTua)
    r.kotak(0, 0.06, 2.0, 1.8, 0.12, 0.3, '#e8e4d6')
    // papan nama berwarna dinas
    r.kotak(-1.95, 0.06, 1.9, 0.08, 0.55, 0.08, P.abuTua)
    r.kotak(-1.95, 0.4, 1.92, 1.3, 0.45, 0.08, aksen)
    r.kotak(-1.95, 0.6, 1.97, 1.0, 0.08, 0.02, P.putih)
    bendera(r, 2.4, 1.75, 3.0)
    return r
  },

  'rm-padang': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const bz = -0.4
    r.kotak(0, 0.06, bz, 4.8, 1.9, 2.8, '#efe3c8')
    // etalase: piring lauk bertumpuk di balik kaca
    r.kotak(-0.8, 0.06, 1.02, 2.6, 1.3, 0.05, P.kaca)
    const lauk = ['#7a3b1f', '#e8833a', '#4f9b62', '#d6493a', '#f4c430']
    for (let baris = 0; baris < 3; baris++) {
      for (let k = 0; k < 5; k++) {
        const x = -1.85 + k * 0.52
        const y = 0.3 + baris * 0.32
        r.silinder(x, y, 0.82, 0.17, 0.17, 0.04, P.putih, 8)
        r.silinder(x, y + 0.04, 0.82, 0.13, 0.11, 0.07, lauk[(baris + k) % 5], 8)
      }
    }
    r.kotak(1.4, 0.06, 1.02, 1.0, 1.5, 0.05, P.kayuTua)
    // pita ukiran merah dan emas
    r.kotak(0, 1.6, 1.03, 4.8, 0.3, 0.05, '#b3261e')
    r.kotak(0, 1.68, 1.06, 4.6, 0.06, 0.02, P.emas)
    // atap gonjong: tanduk melengkung naik di ujung punggung atap
    const ijuk = '#3b2f2a'
    r.atapPelana(0, 1.96, bz, 5.0, 3.0, 0.9, ijuk, 'x')
    const yp = 1.96 + 0.9
    for (const sx of [-1, 1]) {
      r.kotakPutar(sx * 2.15, yp + 0.25, bz, 0.9, 0.16, 0.5, ijuk, 0, 0, sx * 0.7)
      r.kerucut(sx * 2.49, yp + 0.5, bz, 0.07, 0.35, P.emas, 6)
      r.kotakPutar(sx * 1.1, yp + 0.12, bz, 0.7, 0.14, 0.45, ijuk, 0, 0, sx * 0.45)
      r.kerucut(sx * 1.36, yp + 0.25, bz, 0.06, 0.28, P.emas, 6)
    }
    // papan nama berdiri
    r.kotak(-2.2, 0.06, 1.8, 0.1, 1.1, 0.1, P.kayuTua)
    r.kotak(-2.2, 0.75, 1.86, 0.95, 0.45, 0.05, '#b3261e')
    r.kotak(-2.2, 0.9, 1.89, 0.7, 0.08, 0.02, P.emas)
    return r
  },

  /** Minimarket waralaba. varian.merek: 'alpa' (merah) atau 'indo' (biru). */
  waralaba: ({ w, d, varian }) => {
    const alpa = varian.merek === 'alpa'
    const utama = alpa ? '#d7262a' : '#1f4fa8'
    const pita = alpa ? '#1f4fa8' : '#d7262a'
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.1, 4.0, 2.0, 3.0, P.putih)
    r.kotak(0, 1.55, 1.42, 4.02, 0.35, 0.05, utama)
    r.kotak(0, 1.42, 1.43, 4.02, 0.12, 0.05, P.kuning)
    r.kotak(0, 1.32, 1.43, 4.02, 0.08, 0.05, pita)
    r.kotak(alpa ? 0.3 : -0.3, 0.06, 1.42, 2.6, 1.2, 0.05, P.kaca)
    r.kotak(alpa ? -1.5 : 1.5, 0.06, 1.42, 0.8, 1.3, 0.06, P.kacaTua)
    r.kotak(0, 2.06, -0.1, 4.2, 0.1, 3.2, P.abuTua)
    r.kotak(0, 2.16, 1.2, 3.4, 0.55, 0.12, utama)
    r.kotak(0, 2.36, 1.27, 2.6, 0.14, 0.03, P.putih)
    r.kotak(0, 2.24, 1.27, 1.8, 0.05, 0.03, P.kuning)
    r.kotak(alpa ? 1.6 : -1.6, 2.16, -0.8, 0.6, 0.4, 0.5, P.abu)
    // ATM dan tempat parkir motor
    r.kotak(alpa ? -1.85 : 1.85, 0.06, 1.68, 0.45, 1.0, 0.3, P.abuTua)
    r.kotak(alpa ? -1.85 : 1.85, 0.55, 1.84, 0.3, 0.25, 0.02, P.kaca)
    for (let i = 0; i < 3; i++) r.kotak((alpa ? 0.6 : -1.2) + i * 0.4, 0.15, 1.85, 0.12, 0.25, 0.55, [P.merah, P.hitam, P.biru][i])
    return r
  },

  'tempat-judi': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, '#5a5560')
    const bz = -0.3
    const top = badan(r, { w: 4.2, d: 3.0, lantai: 2, warna: '#3b2d4d', z: bz, sisi: ['u', 't', 'b'], kaca: '#7a3fa0' })
    r.jendela('s', 4.2, 3.0, 1.75, 3, { cz: bz, warna: '#c46bff', lj: 0.7, tj: 0.5 })
    // folding gate setengah tertutup
    r.kotak(-0.6, 0.06, 1.22, 2.4, 1.0, 0.05, '#8d8f96')
    for (let k = 0; k < 5; k++) r.kotak(-0.6, 0.15 + k * 0.18, 1.25, 2.4, 0.04, 0.02, '#6d7078')
    r.kotak(-0.6, 1.06, 1.22, 2.4, 0.3, 0.05, '#1c1424')
    r.kotak(1.4, 0.06, 1.22, 0.7, 1.3, 0.05, '#1c1424')
    // papan neon
    r.kotak(0, 1.42, 1.27, 3.6, 0.32, 0.06, '#24182f')
    r.kotak(0, 1.52, 1.31, 3.0, 0.07, 0.02, '#ff3fa4')
    r.kotak(0, 1.43, 1.31, 2.2, 0.05, 0.02, '#3fe0ff')
    // dadu raksasa di atap
    r.kotak(-0.8, top, -0.4, 0.8, 0.8, 0.8, P.putih)
    for (const [x, y] of [[-1.0, 0.2], [-0.8, 0.4], [-0.6, 0.6]] as const) r.kotak(x, top + y - 0.05, 0.01, 0.12, 0.12, 0.02, P.hitam)
    for (const [x, z] of [[-1.0, -0.6], [-0.6, -0.6], [-1.0, -0.2], [-0.6, -0.2]] as const) r.kotak(x, top + 0.8, z, 0.12, 0.02, 0.12, P.hitam)
    r.kotakPutar(0.55, top + 0.36, -0.5, 0.7, 0.7, 0.7, P.merah, 0, 0.5, 0)
    r.kotak(0.55, top + 0.71, -0.5, 0.12, 0.02, 0.12, P.putih)
    // lampu sorot kecil
    for (const x of [-1.9, 1.9]) r.bola(x, 2.1, 1.2, 0.1, P.kuning, 0)
    return r
  },

  /** Bandara: landasan di belakang, apron dan pesawat di tengah, terminal di depan menghadap jalan. */
  bandara: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.04, d, '#a9c07f')
    // landasan pacu
    const lz = -d / 2 + 2.2
    r.kotak(0, 0.04, lz, w - 1, 0.04, 3.2, P.aspal)
    for (let x = -w / 2 + 3; x < w / 2 - 3; x += 2.2) r.kotak(x, 0.081, lz, 1.1, 0.01, 0.12, P.marka)
    for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) r.kotak(sx * (w / 2 - 1.6), 0.081, lz - 1.2 + k * 0.48, 1.2, 0.01, 0.22, P.marka)
    // taxiway dan apron
    r.kotak(4, 0.04, lz + 3.1, 2.0, 0.04, 3.2, P.aspal)
    r.kotak(-2, 0.04, -0.6, 20, 0.04, 4.6, '#c9cfcf')
    // terminal penumpang
    const tz = d / 2 - 2.6
    r.kotak(0, 0.06, tz, 12, 2.4, 3.6, '#eef3f6')
    r.kotak(0, 0.3, tz + 1.82, 11, 1.6, 0.05, P.kaca)
    for (let i = 0; i <= 11; i++) r.kotak(-5.5 + i, 0.3, tz + 1.85, 0.06, 1.6, 0.04, P.putih)
    r.kotak(0, 2.46, tz, 12.4, 0.2, 4.0, P.biru)
    for (let i = 0; i < 4; i++) r.kotakPutar(-4.5 + i * 3, 2.95, tz, 2.6, 0.9, 3.6, P.putih, 0, 0, 0.25)
    r.kotak(0, 1.95, tz + 2.05, 5, 0.35, 0.06, P.biruTua)
    r.kotak(0, 2.05, tz + 2.09, 3.8, 0.12, 0.02, P.putih)
    // garbarata ke apron
    r.kotak(-2, 1.2, tz - 2.6, 0.8, 0.7, 1.8, '#d4d8d6')
    // menara kontrol
    r.silinder(13, 0.06, tz - 0.4, 0.75, 0.6, 5.2, '#e6e9ea', 10)
    r.silinder(13, 5.26, tz - 0.4, 1.2, 1.0, 0.9, P.kacaTua, 10)
    r.silinder(13, 6.16, tz - 0.4, 1.25, 1.25, 0.18, P.putih, 10)
    r.tiang(13, tz - 0.4, 1.0, 0.04, P.merah, 6.34)
    // hanggar
    r.kotak(-14, 0.04, -1.2, 6.5, 2.2, 4.6, '#b9c3ca')
    r.atapPelana(-14, 2.24, -1.2, 6.7, 4.8, 1.0, P.abuTua, 'x')
    r.kotak(-14, 0.04, 1.12, 4.6, 1.9, 0.05, '#8f9aa1')
    // pesawat di apron, hidung ke timur
    const px = 1
    const pz = -0.8
    r.silinderX(px, 0.95, pz, 0.45, 6.4, P.putih, 12)
    r.kotakPutar(px + 3.45, 0.95, pz, 0.6, 0.62, 0.62, P.putih, Math.PI / 4, 0, 0)
    r.kotak(px + 3.5, 1.05, pz, 0.35, 0.18, 0.7, P.kacaTua)
    r.kotak(px - 0.2, 0.75, pz, 1.4, 0.1, 6.2, '#dfe6ea')
    r.kotak(px - 2.9, 1.1, pz, 0.9, 1.2, 0.12, P.biru)
    r.kotak(px - 2.9, 1.0, pz, 0.6, 0.08, 2.2, '#dfe6ea')
    r.kotak(px, 0.95, pz, 6.4, 0.12, 0.92, P.biru)
    for (const z of [pz - 1.6, pz + 1.6]) r.silinderX(px + 0.4, 0.58, z, 0.22, 0.8, P.abuTua, 10)
    for (const [x, z] of [[px + 2.3, pz], [px - 0.6, pz - 0.8], [px - 0.6, pz + 0.8]] as const) r.tiang(x, z, 0.5, 0.04, P.hitam)
    // kaus angin
    r.tiang(17, lz + 2.4, 1.6, 0.04, P.abu)
    r.kotakPutar(17.35, 1.5, lz + 2.4, 0.7, 0.2, 0.2, P.oranye, 0, 0, -0.2)
    // drop-off dan parkir di depan
    r.kotak(0, 0.04, d / 2 - 0.45, 14, 0.05, 0.7, P.aspal)
    for (let i = 0; i < 6; i++) r.kotak(8 + i * 0.9, 0.08, d / 2 - 0.9, 0.5, 0.35, 0.9, [P.merah, P.putih, P.biru, P.hitam, P.kuning, P.teal][i])
    return r
  },

  /** Kompleks rumah petak di ujung Gang Kenari, sedang ditertibkan Pemkot. */
  'gang-kenari': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, '#bdb4a6')
    const warna = ['#f2b8c6', '#d9c3ef', '#bfe6d6']
    for (let i = 0; i < 3; i++) {
      const x = -2.2 + i * 2.2
      r.kotak(x, 0.06, -0.5, 2.1, 1.7, 2.6, warna[i])
      r.kotak(x - 0.45, 0.06, 0.82, 0.6, 1.2, 0.05, P.kayuTua)
      r.kotak(x + 0.45, 0.7, 0.82, 0.6, 0.5, 0.05, '#f08a9a')
      r.bola(x, 1.42, 1.0, 0.09, '#ff2d55', 0)
      r.kotak(x, 0.06, 1.15, 2.0, 0.08, 0.6, '#d8d0c4')
    }
    r.atapPelana(0, 1.76, -0.5, 6.9, 2.9, 0.7, P.sirap, 'x')
    for (let k = 0; k < 11; k++) r.bola(-3.3 + k * 0.66, 1.58, 0.98, 0.05, k % 2 ? '#ff2d55' : '#ffd23f', 0)
    // gapura gang dan pagar rendah
    for (const x of [-3.6, -2.5]) r.kotak(x, 0.06, 1.9, 0.22, 2.0, 0.22, P.putih)
    r.kotak(-3.05, 1.8, 1.9, 1.4, 0.35, 0.18, '#7a5c8f')
    r.kotak(-3.05, 1.92, 2.0, 1.0, 0.1, 0.02, P.kuning)
    r.kotak(0.8, 0.06, 1.95, 5.6, 0.45, 0.08, P.putih)
    // spanduk penertiban Pemkot
    r.kotak(2.6, 0.06, 1.75, 0.06, 1.2, 0.06, P.abuTua)
    r.kotak(3.3, 0.06, 1.75, 0.06, 1.2, 0.06, P.abuTua)
    r.kotak(2.95, 0.8, 1.77, 0.8, 0.4, 0.03, P.putih)
    r.kotak(2.95, 0.95, 1.79, 0.6, 0.06, 0.02, P.merah)
    return r
  },
}
