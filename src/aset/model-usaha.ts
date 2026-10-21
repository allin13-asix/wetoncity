import { P } from './palet.ts'
import { Rakit, badan, type Pembuat } from './rakit.ts'

export const usaha: Record<string, Pembuat> = {
  minimarket: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.1, 4.0, 2.0, 3.0, P.putih)
    r.kotak(0, 1.55, 1.42, 4.02, 0.35, 0.05, P.merah)
    r.kotak(0, 1.35, 1.42, 4.02, 0.2, 0.05, P.biru)
    r.kotak(-0.3, 0.06, 1.42, 2.6, 1.2, 0.05, P.kaca)
    r.kotak(1.5, 0.06, 1.42, 0.8, 1.3, 0.06, P.kacaTua)
    r.kotak(0, 2.06, -0.1, 4.2, 0.1, 3.2, P.abuTua)
    r.kotak(0, 2.16, 1.2, 3.2, 0.5, 0.1, P.merah)
    r.kotak(0, 2.3, 1.26, 2.4, 0.12, 0.03, P.putih)
    r.kotak(-1.6, 2.16, -0.8, 0.6, 0.4, 0.5, P.abu)
    r.kotak(1.6, 0.06, 1.75, 0.8, 0.5, 0.3, P.biru)
    r.kotak(-1.8, 0.06, 1.75, 0.7, 0.35, 0.3, P.merah)
    return r
  },

  kafe: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.5, 3.4, 1.9, 2.2, P.tealMuda)
    r.kotak(0, 0.06, 0.61, 2.4, 1.1, 0.05, P.kaca)
    r.kotak(1.4, 0.06, 0.61, 0.6, 1.3, 0.06, P.kayuTua)
    for (let i = 0; i < 7; i++) r.kotak(-1.5 + i * 0.5, 1.5, 0.95, 0.5, 0.08, 0.8, i % 2 ? P.putih : P.teal)
    r.kotak(0, 1.96, -0.5, 3.6, 0.1, 2.4, P.hijauTua)
    r.kotak(0, 2.06, 0.55, 2.0, 0.4, 0.08, P.putih)
    r.kotak(0, 2.12, 0.6, 1.5, 0.12, 0.03, P.teal)
    for (const x of [-1.1, 0.7]) {
      r.silinder(x, 0.06, 1.35, 0.25, 0.25, 0.04, P.kayu, 8)
      r.tiang(x, 1.35, 0.5, 0.025, P.abu, 0.06)
      r.silinder(x - 0.4, 0.06, 1.35, 0.1, 0.1, 0.25, P.kayuTua, 6)
      r.silinder(x + 0.4, 0.06, 1.35, 0.1, 0.1, 0.25, P.kayuTua, 6)
      r.kerucut(x, 1.0, 1.35, 0.55, 0.2, x < 0 ? P.merah : P.kuning, 8)
      r.tiang(x, 1.35, 0.95, 0.025, P.abu, 0.06)
    }
    r.bola(-1.75, 0.06, 1.3, 0.2, P.daun, 0)
    return r
  },

  bengkel: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, '#c7cccb')
    r.kotak(0, 0.06, -0.3, 4.2, 2.0, 3.0, '#d9dde0')
    r.kotak(-1.1, 0.06, 1.24, 1.7, 1.5, 0.06, P.mustard)
    r.kotak(1.1, 0.06, 1.24, 1.7, 1.5, 0.06, P.mustard)
    for (const x of [-1.1, 1.1]) for (let i = 0; i < 4; i++) r.kotak(x, 0.3 + i * 0.35, 1.28, 1.6, 0.04, 0.03, '#c58f24')
    r.kotak(0, 1.75, 1.26, 3.4, 0.4, 0.06, P.merah)
    r.kotak(0, 1.83, 1.3, 2.8, 0.12, 0.03, P.putih)
    r.kotak(0, 2.06, -0.3, 4.4, 0.12, 3.2, P.abuTua)
    for (let i = 0; i < 4; i++) r.silinder(1.9, 0.06 + i * 0.17, 1.75, 0.24, 0.24, 0.15, P.hitam, 10)
    r.silinder(-0.2, 0.06, 1.8, 0.2, 0.2, 0.5, P.biru, 8)
    r.silinder(0.2, 0.06, 1.8, 0.2, 0.2, 0.5, P.merah, 8)
    // motor di depan
    r.silinderX(-1.8, 0.2, 1.6, 0.2, 0.08, P.hitam, 8)
    r.silinderX(-1.8, 0.2, 2.2, 0.2, 0.08, P.hitam, 8)
    r.kotak(-1.8, 0.25, 1.9, 0.18, 0.2, 0.9, P.biruTua)
    return r
  },

  warung: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.05, d, P.pasir)
    for (const x of [-1.3, 1.3]) for (const z of [-1.0, 1.0]) r.tiang(x, z, 1.9, 0.06, P.kayuTua, 0.05)
    r.atapPelana(0, 1.9, 0, w, d, 0.7, P.jerami, 'x')
    r.kotak(0, 0.05, -0.6, 2.4, 0.7, 0.6, P.kayu)
    r.kotak(0, 0.75, -0.6, 2.6, 0.06, 0.8, P.kayuTua)
    r.kotak(-0.7, 0.8, -0.6, 0.5, 0.35, 0.4, P.biruMuda)
    r.bola(0.5, 0.81, -0.6, 0.18, P.hijauMuda, 0)
    r.bola(0.9, 0.81, -0.6, 0.18, P.hijauMuda, 0)
    for (const x of [-0.7, 0.7]) {
      r.kotak(x, 0.05, 0.7, 0.9, 0.25, 0.3, P.kayu)
      r.kotak(x, 0.3, 0.84, 0.9, 0.2, 0.04, P.kayu)
    }
    r.kotak(0, 1.35, 1.12, 1.6, 0.4, 0.04, P.merah)
    r.kotak(0, 1.45, 1.15, 1.2, 0.08, 0.02, P.putih)
    return r
  },

  resto: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.05, d, P.pasir)
    r.kotak(0, 0.05, 0, w - 0.4, 0.2, d - 0.4, P.kayu)
    for (const x of [-2.4, 0, 2.4]) for (const z of [-1.5, 1.5]) r.tiang(x, z, 2.1, 0.08, P.kayuTua, 0.25)
    r.atapPelana(0, 2.35, 0, w, d, 1.1, P.jerami, 'x')
    r.kotak(-1.9, 0.25, -1.3, 1.6, 1.4, 1.0, '#e9dcc0')
    r.kotak(-1.9, 1.65, -1.3, 1.8, 0.1, 1.2, P.biruTua)
    r.silinder(-1.9, 1.75, -1.5, 0.12, 0.1, 0.5, P.abuTua, 8)
    for (const [x, z] of [[-0.3, -0.2], [1.0, -0.2], [2.0, 0.9], [-0.3, 1.2], [1.0, 1.2]] as const) {
      r.kotak(x, 0.25, z, 0.6, 0.35, 0.6, P.putih)
      r.kotak(x, 0.6, z, 0.65, 0.03, 0.65, P.biruMuda)
    }
    r.kotak(0, 2.0, d / 2 - 0.05, 2.8, 0.4, 0.06, P.biruTua)
    r.kotak(0, 2.1, d / 2 - 0.02, 2.2, 0.12, 0.03, P.putih)
    for (const x of [-2.4, -0.8, 0.8, 2.4]) r.bola(x, 1.7, d / 2 - 0.3, 0.1, P.kuning, 0)
    return r
  },

  hotel: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const bd = 3.0
    const z0 = -d / 2 + 0.2 + bd / 2
    const zf = z0 + bd / 2
    const top = badan(r, { w: w - 0.5, d: bd, lantai: 3, warna: '#fff8e8', z: z0, sisi: ['u'], tl: 1.1 })
    for (let f = 0; f < 3; f++) {
      const y = 0.06 + f * 1.1
      r.kotak(0, y - 0.04, zf + 0.35, w - 0.5, 0.08, 0.7, P.beton)
      r.kotak(0, y, zf + 0.68, w - 0.5, 0.4, 0.04, P.kaca)
      for (let i = 0; i < 6; i++) {
        const x = -w / 2 + 0.8 + (i * (w - 1.6)) / 5
        r.kotak(x, y + 0.1, zf + 0.03, 0.55, 0.8, 0.05, P.kacaTua)
      }
    }
    r.kotak(0, top, z0, w - 0.3, 0.14, bd + 0.2, P.teal)
    r.kotak(0, top + 0.14, zf - 0.4, 3.2, 0.4, 0.1, P.putih)
    // kolam renang
    r.kotak(-1.4, 0.06, 1.55, 3.0, 0.04, 1.0, P.biruMuda)
    r.kotak(-1.4, 0.04, 1.55, 3.2, 0.1, 1.2, P.putih)
    r.kotak(-1.4, 0.1, 1.55, 3.0, 0.03, 1.0, '#7fd3ee')
    for (const x of [1.0, 1.7]) {
      r.kotak(x, 0.06, 1.6, 0.3, 0.12, 0.7, P.putih)
      r.kotak(x, 0.1, 1.45, 0.3, 0.18, 0.02, P.putih)
    }
    r.silinder(2.9, 0.06, 1.7, 0.1, 0.07, 1.6, P.kayuTua, 6)
    r.bola(2.9, 1.4, 1.7, 0.45, P.daun, 0)
    return r
  },

  'papan-proyek': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.05, d, '#c9b38a')
    for (let i = 0; i < 9; i++) {
      r.kotak(-w / 2 + 0.3 + i * ((w - 0.6) / 8), 0.05, d / 2 - 0.1, 0.4, 0.7, 0.05, i % 2 ? P.oranye : P.putih)
    }
    r.tiang(-1.4, -0.2, 1.8, 0.05, P.kayuTua, 0.05)
    r.tiang(1.0, -0.2, 1.8, 0.05, P.kayuTua, 0.05)
    r.kotak(-0.2, 1.0, -0.2, 3.0, 1.0, 0.08, P.biruTua)
    r.kotak(-0.2, 1.65, -0.15, 2.4, 0.12, 0.03, P.kuning)
    r.kotak(-0.2, 1.4, -0.15, 1.8, 0.08, 0.03, P.putih)
    r.kotak(-0.2, 1.2, -0.15, 2.0, 0.08, 0.03, P.putih)
    // derek menara kecil
    r.kotak(1.9, 0.05, -0.2, 0.2, 3.4, 0.2, P.kuning)
    r.kotak(1.2, 3.35, -0.2, 2.2, 0.14, 0.14, P.kuning)
    r.kotak(2.2, 3.35, -0.2, 0.5, 0.14, 0.14, P.abuTua)
    r.kotak(0.7, 2.7, -0.2, 0.03, 0.65, 0.03, P.hitam)
    for (const x of [-1.8, -1.5]) r.kerucut(x, 0.05, 0.5, 0.12, 0.3, P.oranye, 6)
    return r
  },
}
