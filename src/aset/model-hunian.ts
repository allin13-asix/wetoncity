import { P, RAGAM_ATAP, RAGAM_DINDING } from './palet.ts'
import { Rakit, type Pembuat } from './rakit.ts'

export const hunian: Record<string, Pembuat> = {
  kost: ({ w, d, varian }) => {
    const lv = Number(varian.level ?? 1)
    const warna = lv === 1 ? '#f1e9d2' : lv === 2 ? P.pinkMuda : P.putih
    const aksen = lv === 1 ? '#6fb37a' : lv === 2 ? P.pink : P.ungu
    const lantai = lv + 1
    const tl = 1.05
    const bw = w - 0.4
    const bd = d - 1.1
    const z0 = -d / 2 + 0.1 + bd / 2
    const zf = z0 + bd / 2
    const H = lantai * tl
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, z0, bw, H, bd, warna)
    for (let f = 0; f < lantai; f++) {
      const y = 0.06 + f * tl
      for (let i = 0; i < 4; i++) {
        const x = -bw / 2 + 0.55 + (i * (bw - 1.1)) / 3
        if (i % 2 === 0) r.kotak(x, y, zf + 0.03, 0.5, 0.85, 0.05, lv === 3 ? P.kacaTua : P.kayuTua)
        else r.kotak(x, y + 0.25, zf + 0.03, 0.5, 0.5, 0.05, P.kaca)
      }
      if (f >= 1) {
        r.kotak(0, y - 0.08, zf + 0.35, bw, 0.08, 0.7, P.beton)
        r.kotak(0, y, zf + 0.68, bw, 0.38, 0.04, lv === 3 ? P.kaca : aksen)
      }
    }
    const atas = 0.06 + H
    // lampu lorong tiap lantai
    r.menyala(1.5, (q) => {
      for (let f = 0; f < lantai; f++) q.kotak(0, 0.06 + f * tl + 0.85, zf + 0.05, 0.16, 0.08, 0.06, P.kuning)
    })
    if (lv === 1) {
      r.atapPelana(0, atas, z0, bw + 0.3, bd + 0.3, 0.6, P.sirap, 'x')
      r.tiang(bw / 2 - 0.1, zf + 0.7, 0.9, 0.03, P.kayu, 0.06)
      r.kotak(bw / 2 - 0.1, 0.8, zf + 0.7, 0.9, 0.03, 0.03, P.putih)
      r.kotak(bw / 2 - 0.5, 0.4, zf + 0.7, 0.3, 0.3, 0.02, aksen)
      r.bola(-bw / 2 + 0.2, 0.06, zf + 0.6, 0.18, P.hijau, 0)
    } else if (lv === 2) {
      r.kotak(0, atas, z0, bw + 0.1, 0.12, bd + 0.1, P.putih)
      r.silinder(-1.2, atas + 0.12, z0 - 0.3, 0.4, 0.4, 0.8, P.biruMuda, 10)
      r.kotak(0.9, atas + 0.12, z0 + 0.2, 0.5, 0.4, 0.4, P.abu)
      r.kotak(1.5, atas + 0.12, z0 - 0.4, 0.5, 0.4, 0.4, P.abu)
      r.kotak(-1.3, 0.35, zf + 0.34, 0.5, 0.35, 0.3, P.abuTua)
    } else {
      r.kotak(0, atas, z0, bw + 0.1, 0.12, bd + 0.1, P.putih)
      r.kotak(-0.8, atas + 0.12, z0, 2.2, 0.12, 1.8, P.hijauMuda)
      for (const [x, z] of [[-1.9, -0.8], [0.3, -0.8], [-1.9, 0.8], [0.3, 0.8]] as const) r.tiang(x, z0 + z, 1.0, 0.04, P.abuTua, atas + 0.12)
      r.kotak(-0.8, atas + 1.12, z0, 2.4, 0.06, 2.0, P.kayu)
      r.bola(1.5, atas + 0.12, z0 + 0.4, 0.3, P.daun, 0)
      // carport dan mobil
      r.kotak(-1.2, 1.0, zf + 0.9, 2.4, 0.08, 1.0, P.abuTua)
      r.tiang(-2.3, zf + 1.3, 0.94, 0.04, P.abu, 0.06)
      r.tiang(-0.1, zf + 1.3, 0.94, 0.04, P.abu, 0.06)
      r.kotak(-1.2, 0.12, zf + 0.9, 0.8, 0.28, 1.6, P.biruTua)
      r.kotak(-1.2, 0.4, zf + 0.9, 0.7, 0.25, 0.8, P.kaca)
      r.kotak(1.9, 0.06, zf + 0.55, 0.6, 0.9, 0.5, P.kayuTua)
    }
    return r
  },

  rusun: ({ w, d }) => {
    const bw = w - 0.4
    const bd = d - 1.2
    const z0 = -d / 2 + 0.1 + bd / 2
    const zf = z0 + bd / 2
    const tl = 1.05
    const H = 4 * tl
    const lantai = [P.biru, P.teal, P.kuning, P.oranye]
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, z0, bw, H, bd, '#d9e8e0')
    for (let f = 0; f < 4; f++) {
      const y = 0.06 + f * tl
      r.kotak(0, y - 0.06, zf + 0.4, bw, 0.08, 0.8, P.beton)
      r.kotak(0, y, zf + 0.78, bw, 0.4, 0.04, lantai[f])
      for (let i = 0; i < 8; i++) {
        const x = -bw / 2 + 0.5 + (i * (bw - 1.0)) / 7
        if (Math.abs(x) < 0.9) continue
        r.kotak(x - 0.17, y, zf + 0.03, 0.4, 0.8, 0.05, P.kayuTua)
        r.kotak(x + 0.25, y + 0.25, zf + 0.03, 0.3, 0.4, 0.05, P.kaca)
      }
      r.kotak(-2.4 + f * 1.1, y + 0.4, zf + 0.76, 0.5, 0.22, 0.03, [P.merah, P.putih, P.kuning, P.pink][f])
    }
    r.kotak(0, 0.06, zf + 0.5, 1.5, H + 0.5, 1.0, P.biru)
    for (let f = 0; f < 4; f++) r.kotak(0, 0.5 + f * tl, zf + 1.02, 0.18, 0.6, 0.04, P.kaca)
    r.kotak(0, 0.06 + H + 0.5, zf + 0.5, 1.7, 0.1, 1.2, P.biruTua)
    r.kotak(0, 0.06 + H, z0, bw + 0.1, 0.12, bd + 0.1, P.putih)
    for (const x of [-2.4, 2.4]) {
      r.silinder(x, 0.06 + H + 0.12, z0, 0.5, 0.5, 0.9, P.abu, 10)
      r.kerucut(x, 0.06 + H + 1.02, z0, 0.55, 0.25, P.abuTua, 10)
    }
    return r
  },

  'rumah-nelayan': ({ w, d, v }) => {
    const dinding = RAGAM_DINDING[v % RAGAM_DINDING.length]
    const atap = RAGAM_ATAP[(v + 2) % RAGAM_ATAP.length]
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.05, d, '#cbb98f')
    for (const x of [-1.1, 1.1]) for (const z of [-0.8, 0.8]) r.silinder(x, 0.05, z, 0.09, 0.09, 0.6, P.kayuTua, 6)
    r.kotak(0, 0.65, 0, 2.6, 0.1, 2.0, P.kayu)
    r.kotak(0, 0.75, -0.1, 2.2, 1.2, 1.6, dinding)
    r.atapPelana(0, 1.95, -0.1, 2.9, 2.1, 0.8, atap, 'x')
    r.kotak(-0.3, 0.75, 0.71, 0.5, 0.9, 0.05, P.kayuTua)
    r.kotak(0.6, 1.1, 0.71, 0.5, 0.4, 0.05, P.kaca)
    r.kotak(0, 0.3, 1.15, 0.5, 0.05, 0.4, P.kayu)
    r.menyala(1.6, (q) => q.kotak(0.15, 1.72, 0.74, 0.12, 0.12, 0.08, P.kuning))
    r.kotak(0, 0.05, 1.3, 0.5, 0.05, 0.3, P.kayu)
    r.tiang(-1.4, 1.2, 1.1, 0.03, P.kayuTua, 0.05)
    r.tiang(-0.6, 1.2, 1.1, 0.03, P.kayuTua, 0.05)
    r.kotak(-1.0, 1.0, 1.2, 0.9, 0.03, 0.03, P.kayu)
    for (let i = 0; i < 3; i++) r.kotak(-1.2 + i * 0.25, 0.75, 1.2, 0.08, 0.22, 0.03, '#cfd6d9')
    return r
  },

  rumah: ({ w, d, v }) => {
    const dinding = RAGAM_DINDING[v % RAGAM_DINDING.length]
    const atap = RAGAM_ATAP[v % RAGAM_ATAP.length]
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.05, d, '#cfe3b4')
    r.kotak(-0.4, 0.05, -0.4, 3.2, 2.1, 2.4, dinding)
    r.kotak(1.6, 0.05, -0.2, 1.4, 1.1, 1.8, P.krem)
    r.perisai(-0.4, 2.15, -0.4, 3.6, 0.9, 2.8, atap, 0.25)
    r.atapPelana(1.6, 1.15, -0.2, 1.6, 2.0, 0.5, atap, 'x')
    r.kotak(-0.9, 0.05, 0.81, 0.55, 0.95, 0.05, P.kayuTua)
    r.menyala(1.6, (q) => q.kotak(-0.45, 0.95, 0.84, 0.12, 0.12, 0.08, P.kuning))
    r.kotak(0.3, 0.35, 0.81, 0.7, 0.55, 0.05, P.kaca)
    r.kotak(-0.9, 1.25, 0.81, 0.6, 0.55, 0.05, P.kaca)
    r.kotak(0.3, 1.25, 0.81, 0.7, 0.55, 0.05, P.kaca)
    r.kotak(1.6, 0.05, 0.71, 1.0, 0.8, 0.05, P.abuTua)
    r.kotak(0, 0.05, 1.85, w - 0.4, 0.3, 0.05, P.putih)
    r.bola(-1.7, 0.05, 1.3, 0.28, P.daun, 0)
    r.bola(1.9, 0.05, 1.6, 0.22, P.daunTua, 0)
    return r
  },

  kavling: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.05, d, '#c9b38a')
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) r.tiang(x * (w / 2 - 0.3), z * (d / 2 - 0.3), 0.55, 0.03, P.kuning, 0.05)
    for (const z of [-1, 1]) r.kotak(0, 0.5, z * (d / 2 - 0.3), w - 0.6, 0.03, 0.03, P.merah)
    for (const x of [-1, 1]) r.kotak(x * (w / 2 - 0.3), 0.5, 0, 0.03, 0.03, d - 0.6, P.merah)
    r.tiang(1.0, 1.1, 1.1, 0.04, P.kayuTua, 0.05)
    r.kotak(1.0, 0.85, 1.1, 1.1, 0.5, 0.05, P.kuning)
    r.kotak(1.0, 1.0, 1.14, 0.8, 0.07, 0.03, P.hitam)
    r.kotak(1.0, 0.88, 1.14, 0.5, 0.07, 0.03, P.hitam)
    for (let i = 0; i < 6; i++) r.kotak(-1.3 + (i % 3) * 0.32, 0.05 + Math.floor(i / 3) * 0.14, -0.9, 0.3, 0.12, 0.16, P.bata)
    return r
  },
}
