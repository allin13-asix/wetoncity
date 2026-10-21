import { P } from './palet.ts'
import { Rakit, type Pembuat } from './rakit.ts'

export const hiasan: Record<string, Pembuat> = {
  kelapa: () => {
    const r = new Rakit()
    let x = 0
    for (let i = 0; i < 4; i++) {
      r.silinder(x, i * 0.75, 0, 0.14 - i * 0.012, 0.14 - (i + 1) * 0.012, 0.75, P.kayu, 6)
      x += 0.07
    }
    const top = 3.0
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      r.kotakPutar(x + Math.cos(a) * 0.55, top - 0.08, -Math.sin(a) * 0.55, 1.15, 0.04, 0.26, k % 2 ? P.daun : P.hijau, 0, a, -0.45)
    }
    r.bola(x - 0.1, top - 0.3, 0.05, 0.1, P.kayuTua, 0)
    r.bola(x + 0.1, top - 0.28, -0.08, 0.1, P.kayuTua, 0)
    return r
  },

  rindang: () => {
    const r = new Rakit()
    r.silinder(0, 0, 0, 0.16, 0.11, 1.2, P.kayuTua, 6)
    r.bola(0, 0.95, 0, 0.85, P.daun, 0)
    r.bola(0.35, 1.5, -0.2, 0.6, P.daunTua, 0)
    r.bola(-0.3, 1.35, 0.25, 0.55, P.daun, 0)
    return r
  },

  semak: () => {
    const r = new Rakit()
    r.bola(0, 0, 0, 0.32, P.daunTua, 0)
    r.bola(0.28, 0, 0.1, 0.24, P.daun, 0)
    return r
  },

  lampu: () => {
    const r = new Rakit()
    r.silinder(0, 0, 0, 0.06, 0.05, 2.3, P.abuTua, 6)
    r.kotak(0.22, 2.25, 0, 0.5, 0.05, 0.06, P.abuTua)
    r.kotak(0.45, 2.15, 0, 0.26, 0.1, 0.16, P.kuning)
    return r
  },

  payung: () => {
    const r = new Rakit()
    r.tiang(0, 0, 1.5, 0.03, P.putih)
    r.kerucut(0, 1.3, 0, 0.8, 0.28, P.merah, 8)
    r.kerucut(0, 1.3, 0, 0.62, 0.3, P.putih, 8)
    r.kotak(0.9, 0.0, 0.2, 0.5, 0.03, 1.0, P.biruMuda)
    return r
  },

  angkot: () => {
    const r = new Rakit()
    r.kotak(0, 0.28, -0.1, 1.2, 0.7, 2.2, P.biru)
    r.kotak(0, 0.28, 1.2, 1.1, 0.4, 0.5, P.biru)
    r.kotak(0, 0.98, -0.1, 1.15, 0.5, 1.9, P.biruTua)
    r.kotak(0, 1.02, -0.1, 1.2, 0.34, 1.7, P.kaca)
    r.kotak(0, 0.5, -0.1, 1.22, 0.14, 2.2, P.kuning)
    r.kotak(0, 1.5, -0.2, 1.1, 0.06, 1.7, P.abuTua)
    for (const x of [-0.6, 0.6]) for (const z of [-0.8, 0.9]) r.silinderX(x, 0.25, z, 0.25, 0.14, P.hitam, 10)
    return r
  },

  mobil: () => {
    const r = new Rakit()
    r.kotak(0, 0.22, 0, 1.0, 0.4, 2.1, P.merah)
    r.kotak(0, 0.6, -0.1, 0.9, 0.35, 1.1, P.kaca)
    r.kotak(0, 0.92, -0.1, 0.92, 0.05, 1.0, P.merah)
    for (const x of [-0.5, 0.5]) for (const z of [-0.65, 0.7]) r.silinderX(x, 0.2, z, 0.2, 0.12, P.hitam, 8)
    return r
  },
}
