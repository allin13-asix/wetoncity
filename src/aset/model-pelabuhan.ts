import { P } from './palet.ts'
import { Rakit, type Pembuat } from './rakit.ts'

export const pelabuhan: Record<string, Pembuat> = {
  terminal: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.3, 6.4, 2.6, 3.4, P.putih)
    r.kotak(0, 2.66, -0.3, 6.7, 0.2, 3.7, P.biruTua)
    r.kotak(0, 0.5, 1.41, 5.2, 1.7, 0.06, P.kaca)
    for (let i = 0; i <= 4; i++) r.kotak(-2.6 + i * 1.3, 0.5, 1.44, 0.08, 1.7, 0.05, P.putih)
    r.kotak(0, 0.06, 1.44, 1.0, 1.2, 0.07, P.kacaTua)
    r.kotak(0, 2.3, 1.95, 4.6, 0.14, 1.0, P.kuning)
    r.tiang(-2.1, 2.35, 2.25, 0.08)
    r.tiang(2.1, 2.35, 2.25, 0.08)
    r.kotak(-3.4, 0.06, 0.2, 1.0, 1.5, 2.8, P.krem)
    r.kotak(3.4, 0.06, 0.2, 1.0, 1.5, 2.8, P.krem)
    r.kotak(2.4, 2.86, -1.2, 1.2, 1.4, 1.2, P.putih)
    r.kotak(2.4, 4.26, -1.2, 1.5, 0.7, 1.5, P.kacaTua)
    r.kotak(2.4, 4.96, -1.2, 1.7, 0.12, 1.7, P.biruTua)
    r.kotak(-1.5, 2.86, 0.5, 2.8, 0.55, 0.12, P.biruTua)
    r.kotak(-1.5, 3.02, 0.57, 2.4, 0.12, 0.03, P.putih)
    r.tiang(-3.3, 2.0, 3.4, 0.04)
    r.kotak(-3.05, 3.1, 2.0, 0.5, 0.28, 0.03, P.merah)
    r.kotak(-3.05, 2.82, 2.0, 0.5, 0.28, 0.03, P.putih)
    for (const x of [-3.2, 3.2]) r.silinder(x, 0.06, 2.2, 0.11, 0.11, 0.35, P.kuning, 8)
    return r
  },

  tpi: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.12, d, '#b9c3c7')
    const px = w / 2 - 0.3
    const pz = d / 2 - 0.3
    for (const x of [-px, 0, px]) for (const z of [-pz, pz]) r.silinder(x, 0.12, z, 0.1, 0.1, 2.1, P.abu, 8)
    r.atapPelana(0, 2.22, 0, w + 0.4, d + 0.4, 1.05, P.biru, 'x')
    const warna = [P.biru, P.oranye, P.putih, P.biruMuda]
    for (let i = 0; i < 6; i++) {
      r.kotak(-2.0 + (i % 3) * 0.62, 0.12 + Math.floor(i / 3) * 0.32, 0.9, 0.5, 0.3, 0.36, warna[i % 4])
    }
    r.kotak(1.6, 0.12, -0.8, 0.9, 0.5, 0.7, P.putih)
    r.kotak(1.6, 0.62, -0.8, 0.9, 0.04, 0.7, P.biruMuda)
    r.kotak(-1.2, 0.12, -0.9, 1.4, 0.55, 0.6, P.kayu)
    r.kotak(0, 1.85, d / 2 + 0.02, 2.4, 0.34, 0.06, P.putih)
    r.kotak(0, 1.93, d / 2 + 0.05, 2.0, 0.14, 0.03, P.biruTua)
    return r
  },

  gudang: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const bw = w - 0.6
    const bd = d - 0.8
    const zf = -0.2 + bd / 2
    r.kotak(0, 0.06, -0.2, bw, 2.4, bd, '#8aa0b4')
    for (let x = -bw / 2 + 0.4; x < bw / 2; x += 0.8) r.kotak(x, 0.06, zf + 0.02, 0.1, 2.4, 0.04, '#7d93a8')
    r.atapPelana(0, 2.46, -0.2, bw + 0.4, bd + 0.4, 0.9, P.genteng, 'x')
    r.kotak(-1.2, 0.06, zf + 0.05, 3.0, 1.9, 0.07, P.mustard)
    r.kotak(2.4, 0.06, zf + 0.05, 0.9, 1.6, 0.07, P.biruTua)
    r.kotak(-1.2, 0.06, d / 2 - 0.25, 3.4, 0.22, 0.5, '#bcc3c4')
    const dus = [P.kayu, P.krem, P.kremTua]
    for (let i = 0; i < 5; i++) r.kotak(2.6 + (i % 2) * 0.55, 0.06 + Math.floor(i / 2) * 0.36, d / 2 - 0.35, 0.5, 0.34, 0.45, dus[i % 3])
    r.kotak(0, 2.0, zf + 0.04, 2.2, 0.32, 0.05, P.putih)
    return r
  },

  kontainer: ({ w, d, v }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, '#aab3b8')
    const warna = [P.merah, P.biru, P.hijau, P.kuning, P.oranye, P.abuTua]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const tinggi = 1 + ((i * 2 + j + v) % 3)
        for (let t = 0; t < tinggi; t++) r.kotak(-1.9 + i * 1.9, 0.06 + t * 0.5, -0.2 + j * 0.85, 1.7, 0.5, 0.7, warna[(i * 3 + j * 2 + t) % warna.length])
      }
    }
    // derek gantry
    for (const x of [-2.5, 2.5]) for (const z of [-1.7, 1.5]) r.kotak(x, 0.06, z, 0.18, 3.1, 0.18, P.kuning)
    for (const z of [-1.7, 1.5]) r.kotak(0, 3.1, z, 5.4, 0.2, 0.2, P.kuning)
    for (const x of [-2.5, 2.5]) r.kotak(x, 3.1, -0.1, 0.2, 0.2, 3.4, P.kuning)
    r.kotak(0, 3.3, -3.0, 0.3, 0.16, 3.0, P.abuTua)
    r.kotak(0, 3.3, 0.0, 0.5, 0.5, 0.9, P.hitam)
    r.kotak(1.0, 2.2, -2.6, 0.04, 1.1, 0.04, P.hitam)
    return r
  },

  dermaga: ({ w, d }) => {
    const r = new Rakit()
    const n = Math.floor(d / 0.6)
    for (let i = 0; i < n; i++) r.kotak(0, 0, -d / 2 + 0.3 + i * 0.6, w, 0.16, 0.56, i % 2 ? P.kayu : '#9a6a40')
    for (let z = -d / 2 + 0.6; z < d / 2; z += 1.5) {
      r.silinder(-w / 2 + 0.15, -1.1, z, 0.1, 0.1, 1.2, P.kayuTua, 6)
      r.silinder(w / 2 - 0.15, -1.1, z, 0.1, 0.1, 1.2, P.kayuTua, 6)
    }
    for (let z = -d / 2 + 1.0; z < d / 2 - 0.5; z += 3) {
      r.silinder(-w / 2 + 0.25, 0.16, z, 0.1, 0.1, 0.3, P.hitam, 8)
      r.silinder(w / 2 - 0.25, 0.16, z, 0.1, 0.1, 0.3, P.hitam, 8)
    }
    r.tiang(-w / 2 + 0.2, -d / 2 + 0.5, 1.9, 0.05, P.abuTua, 0.16)
    r.kotak(-w / 2 + 0.2, 2.0, -d / 2 + 0.5, 0.3, 0.14, 0.3, P.kuning)
    r.tiang(w / 2 - 0.2, -d / 2 + 0.5, 1.9, 0.05, P.abuTua, 0.16)
    r.kotak(w / 2 - 0.2, 2.0, -d / 2 + 0.5, 0.3, 0.14, 0.3, P.kuning)
    return r
  },

  kapal: ({ d }) => {
    const r = new Rakit()
    const z0 = -d / 2 + 0.6
    const L = 8.6
    r.kotak(0, -0.9, z0 + L / 2, 3.2, 0.8, L, '#27487a')
    r.kotak(0, -0.1, z0 + L / 2, 3.2, 0.9, L, P.putih)
    r.kotak(0, -0.12, z0 + L / 2, 3.24, 0.1, L, P.merah)
    r.haluan(0, -0.9, z0 + L, 3.2, 1.7, 2.6, P.putih)
    r.kotak(0, 0.8, z0 + L / 2 - 0.6, 2.8, 0.8, 5.6, P.putih)
    r.kotak(0, 1.6, z0 + L / 2 - 0.9, 2.4, 0.8, 4.2, P.putih)
    r.kotak(0, 2.4, z0 + L / 2 + 0.3, 2.2, 0.8, 1.8, P.putih)
    r.kotak(0, 2.6, z0 + L / 2 + 1.22, 2.0, 0.4, 0.05, P.kacaTua)
    r.kotak(0, 3.2, z0 + L / 2 + 0.3, 2.4, 0.1, 2.0, P.biruTua)
    r.silinder(0, 2.4, z0 + L / 2 - 1.5, 0.5, 0.42, 1.5, '#e84f3d', 10)
    r.silinder(0, 3.5, z0 + L / 2 - 1.5, 0.43, 0.43, 0.3, P.hitam, 10)
    r.tiang(0, z0 + L / 2 + 0.4, 1.4, 0.05, P.abu, 3.3)
    for (const x of [-1.45, 1.45]) {
      for (let z = z0 + 1.0; z < z0 + L - 0.5; z += 0.9) r.kotak(x, 0.25, z, 0.05, 0.22, 0.3, P.kacaTua)
      r.kotak(x * 0.96, 0.8, z0 + L / 2 - 1.8, 0.14, 0.4, 0.9, P.oranye)
    }
    return r
  },

  perahu: ({ v }) => {
    const r = new Rakit()
    const warna = [P.biru, P.merah, P.hijau, P.kuning][v % 4]
    r.kotak(0, -0.2, 0, 0.6, 0.55, 2.2, warna)
    r.kotak(0, 0.1, 0, 0.64, 0.12, 2.2, P.putih)
    r.haluan(0, -0.2, 1.1, 0.6, 0.55, 0.9, warna)
    r.haluan(0, -0.2, -1.1, 0.6, 0.55, 0.7, warna, -1)
    r.kotak(0, 0.2, -0.35, 0.5, 0.4, 0.7, P.putih)
    r.kotak(0, 0.6, -0.35, 0.6, 0.08, 0.8, P.kayuTua)
    r.kotak(0, 0.2, 0.55, 1.5, 0.04, 0.05, P.kayu)
    r.kotak(0, 0.2, -0.25, 1.5, 0.04, 0.05, P.kayu)
    for (const x of [-0.72, 0.72]) r.kotak(x, 0.08, 0.15, 0.1, 0.1, 1.9, P.kayuTua)
    r.tiang(0.2, 0.35, 1.0, 0.025, P.kayuTua, 0.12)
    return r
  },

  mercusuar: () => {
    const r = new Rakit()
    r.kotak(0, 0, 0, 2.2, 0.9, 2.2, P.putih)
    r.kotak(0, 0.9, 0, 2.4, 0.12, 2.4, P.merah)
    const seg = 7
    for (let i = 0; i < seg; i++) {
      const rb = 0.95 - i * 0.06
      r.silinder(0, 1.0 + i * 1.0, 0, rb, rb - 0.06, 1.0, i % 2 ? P.putih : P.merah, 12)
    }
    r.silinder(0, 8.0, 0, 0.85, 0.85, 0.14, P.hitam, 12)
    r.silinder(0, 8.14, 0, 0.5, 0.5, 0.7, '#ffe58a', 8)
    r.kerucut(0, 8.84, 0, 0.62, 0.55, P.merah, 12)
    r.tiang(0, 0, 0.6, 0.03, P.abu, 9.39)
    return r
  },
}
