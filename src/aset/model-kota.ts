import { P } from './palet.ts'
import { Rakit, badan, pohon, type Pembuat } from './rakit.ts'

export const kota: Record<string, Pembuat> = {
  'balai-kota': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, 0, w - 0.4, 0.3, d - 0.4, '#d8d3c3')
    const y1 = 0.36
    r.kotak(0, y1, -0.5, 6.8, 2.5, 3.6, P.krem)
    for (const s of ['t', 'b', 'u'] as const) {
      for (let f = 0; f < 2; f++) r.jendela(s, 6.8, 3.6, y1 + 0.35 + f * 1.15, s === 'u' ? 5 : 3, { lj: 0.5, tj: 0.65, cz: -0.5 })
    }
    for (let i = 0; i < 6; i++) r.silinder(-1.5 + i * 0.6, y1, 1.75, 0.13, 0.12, 2.5, P.putih, 8)
    r.kotak(0, y1 + 2.5, 1.6, 4.0, 0.2, 1.4, P.putih)
    r.pelana(0, y1 + 2.7, 1.6, 4.0, 0.8, 1.4, P.putih)
    r.perisai(0, y1 + 2.5, -0.5, 7.0, 0.9, 3.8, P.genteng, 0.35)
    r.kotak(0, y1, 1.31, 2.2, 1.6, 0.06, P.kayuTua)
    r.kotak(-1.9, y1 + 0.5, 1.31, 0.9, 0.9, 0.05, P.kacaTua)
    r.kotak(1.9, y1 + 0.5, 1.31, 0.9, 0.9, 0.05, P.kacaTua)
    r.kotak(0, 0.06, 2.55, 3.4, 0.15, 0.3, '#e8e4d6')
    r.kotak(0, 0.06, 2.4, 3.4, 0.3, 0.3, '#e8e4d6')
    r.tiang(-3.2, 2.3, 3.6, 0.04, P.abu, 0.36)
    r.kotak(-2.95, 3.6, 2.3, 0.5, 0.28, 0.03, P.merah)
    r.kotak(-2.95, 3.32, 2.3, 0.5, 0.28, 0.03, P.putih)
    return r
  },

  masjid: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0.4, 0.06, 0.2, 5.2, 0.3, 4.8, '#e8e4d6')
    r.kotak(0.4, 0.36, 0.2, 4.6, 2.3, 4.2, P.putih)
    r.jendela('s', 4.6, 4.2, 0.9, 3, { cx: 0.4, cz: 0.2, lj: 0.5, tj: 1.0, warna: P.teal })
    r.jendela('u', 4.6, 4.2, 0.9, 3, { cx: 0.4, cz: 0.2, lj: 0.5, tj: 1.0, warna: P.teal })
    r.jendela('t', 4.6, 4.2, 0.9, 3, { cx: 0.4, cz: 0.2, lj: 0.5, tj: 1.0, warna: P.teal })
    r.jendela('b', 4.6, 4.2, 0.9, 3, { cx: 0.4, cz: 0.2, lj: 0.5, tj: 1.0, warna: P.teal })
    r.kotak(0.4, 0.36, 2.31, 1.2, 1.5, 0.06, P.hijauTua)
    r.silinder(0.4, 2.66, 0.2, 1.75, 1.75, 0.4, P.putih, 16)
    r.kubah(0.4, 3.06, 0.2, 1.7, P.hijau, 1.0, 16)
    r.kerucut(0.4, 4.76, 0.2, 0.07, 0.8, P.emas, 6)
    for (const dx of [-1.85, 1.85]) {
      for (const dz of [-1.7, 1.7]) {
        r.silinder(0.4 + dx, 2.66, 0.2 + dz, 0.5, 0.5, 0.3, P.putih, 10)
        r.kubah(0.4 + dx, 2.96, 0.2 + dz, 0.5, P.hijau, 1.0, 10)
      }
    }
    // menara
    r.kotak(-3.0, 0, -1.8, 0.9, 0.5, 0.9, P.krem)
    r.silinder(-3.0, 0.5, -1.8, 0.4, 0.33, 3.6, P.putih, 10)
    r.silinder(-3.0, 4.1, -1.8, 0.55, 0.55, 0.14, P.hijauTua, 10)
    r.silinder(-3.0, 4.24, -1.8, 0.3, 0.26, 1.2, P.putih, 10)
    r.kerucut(-3.0, 5.44, -1.8, 0.42, 0.9, P.hijau, 10)
    r.kerucut(-3.0, 6.34, -1.8, 0.06, 0.6, P.emas, 6)
    return r
  },

  alun: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.08, d, '#e4dfd0')
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) r.kotak(sx * 1.95, 0.08, sz * 1.5, 3.2, 0.07, 2.3, P.hijauMuda)
    r.kotak(0, 0.14, 0, 0.9, 0.3, 0.9, P.abu)
    r.silinder(0, 0.44, 0, 0.28, 0.2, 1.7, P.putih, 8)
    r.kerucut(0, 2.14, 0, 0.24, 0.6, P.emas, 8)
    pohon(r, -2.9, -1.9, 1.4, '#2f7a45', '#256a3a')
    pohon(r, 2.9, 1.9, 1.4, '#2f7a45', '#256a3a')
    for (const x of [-1.2, 1.2]) {
      r.kotak(x, 0.08, 2.75, 1.0, 0.22, 0.28, P.kayu)
      r.kotak(x, 0.08, -2.75, 1.0, 0.22, 0.28, P.kayu)
    }
    return r
  },

  bank: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.1, 4.4, 3.2, 3.0, '#e8eef2')
    r.kotak(0, 0.06, 1.42, 4.0, 3.0, 0.06, P.kaca)
    for (let i = 0; i <= 4; i++) r.kotak(-2.0 + i, 0.06, 1.45, 0.07, 3.0, 0.05, P.putih)
    for (let f = 1; f < 3; f++) r.kotak(0, 0.06 + f * 1.05, 1.45, 4.0, 0.07, 0.05, P.putih)
    r.kotak(0, 3.26, -0.1, 4.5, 0.5, 3.1, P.biru)
    r.kotak(0, 3.36, 1.46, 3.0, 0.22, 0.04, P.putih)
    r.kotak(0, 1.5, 1.8, 2.2, 0.1, 0.7, P.biruTua)
    r.tiang(-1.0, 2.1, 1.5, 0.05)
    r.tiang(1.0, 2.1, 1.5, 0.05)
    r.kotak(-2.0, 0.06, 1.3, 0.6, 1.5, 0.5, P.biruTua)
    r.kotak(-2.0, 0.9, 1.56, 0.4, 0.3, 0.03, P.kacaTua)
    return r
  },

  pasar: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.08, d, '#c9cdc8')
    for (let i = 0; i < 5; i++) {
      const x = -w / 2 + 0.35 + (i * (w - 0.7)) / 4
      for (const z of [-d / 2 + 0.35, d / 2 - 0.35]) r.silinder(x, 0.08, z, 0.1, 0.1, 2.2, P.abu, 8)
    }
    r.atapPelana(0, 2.3, -d / 4, w + 0.3, d / 2 + 0.1, 0.9, '#3fa28c', 'x')
    r.atapPelana(0, 2.3, d / 4, w + 0.3, d / 2 + 0.1, 0.9, '#35897a', 'x')
    const tenda = [P.merah, P.kuning, P.hijau, P.biru, P.oranye, P.pink]
    for (let i = 0; i < 6; i++) {
      const x = -3.4 + i * 1.36
      r.kotak(x, 0.08, d / 2 - 0.65, 1.0, 0.45, 0.6, P.kayu)
      r.kotak(x, 1.25, d / 2 - 0.55, 1.15, 0.08, 0.95, tenda[i])
      r.tiang(x - 0.5, d / 2 - 0.2, 1.2, 0.03, P.abu, 0.08)
      r.tiang(x + 0.5, d / 2 - 0.2, 1.2, 0.03, P.abu, 0.08)
      r.bola(x - 0.2, 0.53, d / 2 - 0.65, 0.16, tenda[(i + 2) % 6], 0)
      r.bola(x + 0.2, 0.53, d / 2 - 0.65, 0.14, tenda[(i + 4) % 6], 0)
    }
    r.kotak(0, 1.85, -d / 2 + 0.2, 3.2, 0.38, 0.06, P.putih)
    r.kotak(0, 1.94, -d / 2 + 0.23, 2.8, 0.14, 0.03, '#35897a')
    return r
  },

  koran: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const top = badan(r, { w: 3.6, d: 3.2, lantai: 2, warna: P.bata, sisi: ['s', 'u', 't', 'b'], kaca: P.kremTua })
    r.kotak(0, top, 0, 3.8, 0.12, 3.4, P.putih)
    r.kotak(0.2, top + 0.12, 0.3, 3.0, 0.8, 0.12, '#f7f1e1')
    for (let i = 0; i < 3; i++) r.kotak(0.2, top + 0.24 + i * 0.2, 0.37, 2.6 - i * 0.4, 0.07, 0.03, P.hitam)
    r.tiang(-0.2, 0.3, 0.8, 0.04, P.abu, top + 0.12)
    r.silinder(1.3, top + 0.12, -1.0, 0.22, 0.2, 1.8, P.abuTua, 8)
    r.kotak(0, 0.06, 1.62, 0.9, 1.2, 0.07, P.kayuTua)
    r.kotak(0, 1.35, 1.9, 1.8, 0.08, 0.6, P.merah)
    return r
  },

  bursa: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const top = badan(r, { w: 4.6, d: 3.0, lantai: 2, warna: '#cfe6f2', z: -0.1, tj: 0.5, lj: 0.5, sisi: ['u', 't', 'b'] })
    r.kotak(0, 0.06, 1.41, 3.2, 1.0, 0.06, P.kaca)
    r.kotak(0, 1.2, 1.41, 3.2, 0.9, 0.06, '#cfe6f2')
    r.jendela('s', 4.6, 3.0, 1.35, 3, { cz: -0.1, lj: 0.6, tj: 0.5 })
    r.kotak(0, top, -0.1, 4.8, 0.12, 3.2, P.biruTua)
    r.kotak(0, 1.45, 1.85, 3.0, 0.1, 0.8, P.kuning)
    r.tiang(-1.4, 2.2, 1.4, 0.05)
    r.tiang(1.4, 2.2, 1.4, 0.05)
    r.kotak(0, top + 0.12, 0.5, 3.0, 0.7, 0.12, P.kuning)
    r.kotak(0, top + 0.3, 0.57, 2.4, 0.1, 0.03, P.hitam)
    r.kotak(0, top + 0.5, 0.57, 1.6, 0.08, 0.03, P.hitam)
    for (const x of [-2.3, 2.3]) {
      r.tiang(x, 1.5, 2.6, 0.03, P.abuTua, 0.06)
      r.kotak(x + (x > 0 ? -0.2 : 0.2), 1.9, 1.5, 0.35, 0.8, 0.03, x > 0 ? P.merah : P.hijau)
    }
    r.kotak(-1.8, 0.06, 2.1, 1.0, 0.3, 0.4, P.kayu)
    return r
  },

  blk: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, 0, 5.2, 2.0, 3.2, '#e6efe3')
    for (let i = 0; i < 4; i++) {
      const x = -1.95 + i * 1.3
      r.pelana(x, 2.06, 0, 1.3, 0.75, 3.3, P.hijauTua, 0)
      r.kotak(x + 0.64, 2.06, 0, 0.05, 0.6, 3.0, P.kaca)
    }
    r.kotak(-1.3, 0.06, 1.61, 2.2, 1.7, 0.07, P.hijau)
    r.kotak(1.5, 0.06, 1.61, 1.6, 1.7, 0.07, P.hijau)
    r.jendela('s', 5.2, 3.2, 1.0, 1, { lj: 0.6, tj: 0.7, margin: 2.2 })
    r.kotak(0, 1.75, 1.64, 2.0, 0.34, 0.05, P.putih)
    r.kotak(0, 1.83, 1.67, 1.6, 0.14, 0.03, P.hijauTua)
    r.kotak(0.05, 0.06, 2.1, 0.9, 0.3, 0.4, P.kayu)
    r.silinder(2.1, 0.06, 2.0, 0.18, 0.18, 0.35, P.oranye, 8)
    return r
  },

  rektorat: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, 0, 5.4, 3.0, 3.9, '#e9dcc0')
    for (const f of [0, 1, 2]) {
      r.jendela('s', 5.4, 3.9, 0.35 + f * 1.0, 5, { lj: 0.5, tj: 0.55 })
      r.jendela('u', 5.4, 3.9, 0.35 + f * 1.0, 5, { lj: 0.5, tj: 0.55 })
    }
    for (const sx of [-1, 1]) {
      r.kotak(sx * 3.2, 0.06, 0, 1.6, 3.4, 4.2, '#d6c49e')
      for (const f of [0, 1, 2]) r.jendela('s', 1.6, 4.2, 0.35 + f * 1.1, 1, { cx: sx * 3.2, lj: 0.5, tj: 0.6, margin: 0.4 })
      r.perisai(sx * 3.2, 3.46, 0, 1.8, 0.8, 4.4, P.genteng, 0.3)
    }
    r.kotak(0, 3.06, 0.1, 1.6, 1.9, 1.6, '#e9dcc0')
    r.kotak(0, 4.1, 0.92, 0.7, 0.7, 0.05, P.putih)
    r.kotak(0, 4.42, 0.96, 0.05, 0.28, 0.03, P.hitam)
    r.kotak(0.1, 4.4, 0.96, 0.2, 0.05, 0.03, P.hitam)
    r.limas(0, 4.96, 0.1, 1.8, 1.4, 1.8, P.biruTua)
    r.tiang(0, 0.1, 0.7, 0.03, P.emas, 6.36)
    r.kotak(0, 0.06, 2.0, 1.8, 1.7, 0.08, '#5b4a35')
    for (const x of [-1.1, 1.1]) r.silinder(x, 0.06, 2.12, 0.12, 0.12, 2.2, P.putih, 8)
    r.kotak(0, 2.26, 2.12, 3.0, 0.16, 0.5, P.putih)
    r.kotak(0, 0.06, 2.4, 3.0, 0.14, 0.4, '#e8e4d6')
    return r
  },

  fakultas: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, 0, 5.8, 3.4, 4.0, '#e9e6df')
    for (const f of [0, 1, 2]) {
      r.kotak(0.3, 0.45 + f * 1.1, 2.02, 5.0, 0.6, 0.05, P.kaca)
      r.kotak(0.3, 0.45 + f * 1.1, -2.02, 5.0, 0.6, 0.05, P.kaca)
    }
    r.kotak(-2.55, 0.06, 2.03, 0.6, 3.4, 0.1, P.ungu)
    for (let x = -1.6; x < 2.6; x += 0.5) r.kotak(x, 0.1, 2.12, 0.05, 3.2, 0.2, '#f6f4ee')
    r.kotak(0, 3.46, 0, 6.2, 0.14, 4.4, P.putih)
    r.kotak(1.4, 3.6, -0.6, 0.9, 0.4, 0.6, P.abuTua)
    r.kotak(-1.2, 3.6, 0.5, 0.9, 0.4, 0.6, P.abuTua)
    r.kotak(0.3, 0.06, 2.15, 1.2, 1.2, 0.05, P.kacaTua)
    r.kotak(0.3, 1.3, 2.35, 2.0, 0.08, 0.6, P.ungu)
    return r
  },

  perpustakaan: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.silinder(0, 0.06, -0.6, 1.95, 1.95, 2.0, '#e7ddc8', 16)
    r.silinder(0, 1.2, -0.6, 1.97, 1.97, 0.7, P.kaca, 16)
    r.silinder(0, 2.06, -0.6, 2.05, 2.05, 0.14, P.putih, 16)
    r.kubah(0, 2.2, -0.6, 1.9, P.ungu, 0.35, 16)
    r.kotak(0, 0.06, 1.45, 2.4, 1.7, 1.2, P.krem)
    r.kotak(0, 0.06, 2.06, 1.0, 1.2, 0.05, P.kacaTua)
    r.pelana(0, 1.76, 1.45, 2.6, 0.5, 1.4, P.ungu, 0)
    for (const i of [0, 1, 2]) r.kotak(0, 0.06 + i * 0.1, 2.3 - i * 0.12, 2.0, 0.1, 0.3, '#e8e4d6')
    return r
  },

  sekolah: ({ w, d, varian }) => {
    const smk = varian.jenis === 'smk'
    const dinding = smk ? '#e7f1ef' : '#f4ecd6'
    const atap = smk ? P.teal : P.merah
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    r.kotak(0, 0.06, -0.9, w - 0.6, 1.9, 2.2, dinding)
    r.jendela('s', w - 0.6, 2.2, 0.7, Math.floor((w - 0.6) / 1.2), { cz: -0.9, lj: 0.5, tj: 0.7 })
    r.atapPelana(0, 1.96, -0.9, w - 0.2, 2.5, 0.9, atap, 'x')
    r.kotak(0, 0.06, 0.9, w - 0.6, 0.12, 1.2, '#d5d9d7')
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.5; x += 1.2) r.silinder(x, 0.18, 1.35, 0.07, 0.07, 1.8, P.putih, 6)
    r.kotak(0, 1.98, 0.9, w - 0.4, 0.1, 1.4, atap)
    r.kotak(0, 1.2, -0.9 + 1.11, 1.0, 1.3, 0.05, P.kayuTua)
    r.kotak(0, 2.1, 1.62, 2.2, 0.4, 0.06, smk ? P.biruTua : P.kuning)
    r.tiang(-w / 2 + 0.6, 2.0, 3.4, 0.04, P.abu, 0.06)
    r.kotak(-w / 2 + 0.85, 3.12, 2.0, 0.5, 0.28, 0.03, P.merah)
    r.kotak(-w / 2 + 0.85, 2.84, 2.0, 0.5, 0.28, 0.03, P.putih)
    return r
  },

  rs: ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const top = badan(r, { w: 7.4, d: 4.0, lantai: 4, warna: P.putih, z: -0.3, x: -0.4, sisi: ['s', 'u'], kaca: P.teal, lj: 0.55, tj: 0.5, pitch: 1.2 })
    r.kotak(-0.4, top, -0.3, 7.6, 0.14, 4.2, P.abuTua)
    r.kotak(-0.4, 1.95, 1.72, 2.2, 1.2, 0.04, P.putih)
    r.kotak(-0.4, 3.0, 1.74, 1.3, 0.38, 0.04, P.merah)
    r.kotak(-0.4, 2.84, 1.74, 0.38, 1.3, 0.04, P.merah)
    r.kotak(-0.4, 1.35, 2.0, 2.4, 0.1, 0.8, P.merah)
    r.tiang(-1.4, 2.35, 1.35, 0.05)
    r.tiang(0.6, 2.35, 1.35, 0.05)
    r.kotak(-0.4, 0.06, 1.72, 1.2, 1.1, 0.06, P.kacaTua)
    // sayap rendah dan ambulans
    r.kotak(3.8, 0.06, 0.4, 1.4, 1.6, 2.6, '#e3e8e6')
    r.kotak(3.8, 1.66, 0.4, 1.5, 0.1, 2.7, P.abuTua)
    r.kotak(3.8, 0.1, 2.0, 1.2, 0.5, 0.7, P.putih)
    r.kotak(3.8, 0.6, 2.0, 0.9, 0.3, 0.5, P.putih)
    r.kotak(3.8, 0.4, 2.36, 1.22, 0.1, 0.02, P.merah)
    r.kotak(3.8, 0.9, 2.0, 0.3, 0.06, 0.12, P.biru)
    // helipad
    r.silinder(-1.8, top + 0.14, -0.3, 1.0, 1.0, 0.05, P.biruTua, 16)
    r.kotak(-2.1, top + 0.19, -0.3, 0.1, 0.01, 0.8, P.putih)
    r.kotak(-1.5, top + 0.19, -0.3, 0.1, 0.01, 0.8, P.putih)
    r.kotak(-1.8, top + 0.19, -0.3, 0.6, 0.01, 0.1, P.putih)
    r.silinder(2.1, top + 0.14, -0.9, 0.35, 0.35, 0.5, P.abu, 8)
    return r
  },
}
