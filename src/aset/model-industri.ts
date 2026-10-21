// Tiga pabrik besar di Kawasan Industri. Depan menghadap +z.
import { P } from './palet.ts'
import { Rakit, badan, type Pembuat } from './rakit.ts'

export const industri: Record<string, Pembuat> = {
  'pabrik-otomotif': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    // aula perakitan beratap gergaji
    const hx = -1.4
    const hz = -0.9
    r.kotak(hx, 0.06, hz, 9.4, 3.0, 5.6, '#a9b8c4')
    for (let i = 0; i < 7; i++) {
      const x = hx - 4.7 + 0.67 + i * 1.34
      r.pelana(x, 3.06, hz, 1.34, 0.8, 5.7, '#6f7f8c', 0)
      r.kotak(x + 0.55, 3.1, hz, 0.05, 0.6, 5.4, P.kaca)
    }
    r.kotak(hx, 2.3, hz + 2.82, 9.4, 0.45, 0.05, P.merah)
    r.kotak(hx, 2.42, hz + 2.86, 3.2, 0.14, 0.02, P.putih)
    for (const dx of [-2.5, 1.5]) {
      r.kotak(hx + dx, 0.06, hz + 2.82, 2.4, 2.0, 0.06, P.abuTua)
      for (let k = 0; k < 5; k++) r.kotak(hx + dx, 0.35 + k * 0.35, hz + 2.86, 2.4, 0.04, 0.02, '#5d6870')
    }
    // kantor dua lantai
    const top = badan(r, { w: 2.6, d: 3.0, lantai: 2, warna: P.putih, x: 5.0, z: -1.6, sisi: ['s', 't'] })
    r.kotak(5.0, top, -1.6, 2.8, 0.15, 3.2, P.merah)
    // mobil yang baru selesai dirakit
    const warna = [P.merah, P.biru, P.putih, P.kuning, P.hitam, P.teal]
    for (let i = 0; i < 6; i++) {
      const x = 3.6 + (i % 3) * 1.0
      const z = 2.3 + Math.floor(i / 3) * 1.3
      r.kotak(x, 0.1, z, 0.6, 0.3, 1.0, warna[i])
      r.kotak(x, 0.4, z - 0.05, 0.54, 0.22, 0.55, P.kacaTua)
    }
    // menara air
    for (const sx of [-0.4, 0.4]) for (const sz of [-0.4, 0.4]) r.tiang(-5.4 + sx, 3.0 + sz, 2.2, 0.05, P.abuTua)
    r.silinder(-5.4, 2.2, 3.0, 0.65, 0.65, 0.9, P.putih, 12)
    r.kerucut(-5.4, 3.1, 3.0, 0.68, 0.35, P.merah, 12)
    return r
  },

  'pabrik-garmen': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const bz = -1.4
    const top = badan(r, { w: 10.6, d: 4.0, lantai: 3, warna: '#efe1d0', z: bz, sisi: ['s', 'u', 't', 'b'], pitch: 1.0 })
    r.kotak(0, top, bz, 10.8, 0.2, 4.2, '#d98fa6')
    r.atapPelana(0, top + 0.2, bz, 10.8, 4.2, 0.8, P.sirap, 'x')
    r.kotak(0, 2.25, bz + 2.03, 4.0, 0.4, 0.05, '#d98fa6')
    r.kotak(0, 2.36, bz + 2.06, 3.2, 0.12, 0.02, P.putih)
    r.kotak(0, 0.06, bz + 2.03, 1.6, 1.1, 0.06, P.kacaTua)
    r.kotak(0, 1.3, bz + 2.45, 2.4, 0.1, 0.85, '#d98fa6')
    // gulungan kain di dok samping
    const kain = [P.pink, P.biruMuda, P.kuning, P.tealMuda, P.unguMuda]
    for (let i = 0; i < 5; i++) r.silinderX(-4.6 + i * 0.5, 0.22, 1.6, 0.16, 0.45, kain[i], 8)
    // parkir motor karyawan
    const motor = [P.merah, P.hitam, P.biru, P.putih, P.merah, P.hitam, P.biru, P.putih]
    for (let i = 0; i < 8; i++) {
      const x = -1.2 + i * 0.55
      r.kotak(x, 0.14, 2.75, 0.14, 0.24, 0.7, motor[i])
      r.silinderX(x, 0.12, 2.45, 0.11, 0.06, P.hitam, 8)
      r.silinderX(x, 0.12, 3.05, 0.11, 0.06, P.hitam, 8)
    }
    // pos satpam dan gerbang
    r.kotak(4.9, 0.06, 2.8, 1.0, 1.2, 0.9, P.putih)
    r.kotak(4.9, 1.26, 2.8, 1.2, 0.12, 1.1, '#d98fa6')
    r.kotak(3.6, 0.6, 3.5, 1.8, 0.08, 0.08, P.merah)
    return r
  },

  'pabrik-makanan': ({ w, d }) => {
    const r = new Rakit()
    r.kotak(0, 0, 0, w, 0.06, d, P.beton)
    const gx = -2.2
    const gz = -0.8
    const top = badan(r, { w: 6.4, d: 4.2, lantai: 2, warna: P.putih, x: gx, z: gz, sisi: ['s', 't', 'b'] })
    r.kotak(gx, top, gz, 6.6, 0.2, 4.4, P.hijau)
    r.kotak(gx, 1.6, gz + 2.12, 4.0, 0.35, 0.05, P.hijau)
    r.kotak(gx, 1.7, gz + 2.15, 3.0, 0.12, 0.02, P.kuning)
    r.kotak(gx - 1.6, 0.06, gz + 2.12, 1.8, 1.4, 0.06, P.abuTua)
    // tiga silo bahan baku
    for (let i = 0; i < 3; i++) {
      const x = 2.2 + i * 1.3
      r.silinder(x, 0.06, -1.8, 0.6, 0.6, 4.2, '#dfe3e6', 12)
      r.silinder(x, 2.0, -1.8, 0.62, 0.62, 0.14, P.hijau, 12)
      r.kerucut(x, 4.26, -1.8, 0.62, 0.5, P.abu, 12)
    }
    r.kotak(0.95, 3.0, -1.8, 2.3, 0.3, 0.4, P.abuTua)
    // tangki rebah
    for (const x of [2.9, 4.6]) r.kotak(x, 0.06, 1.0, 0.25, 0.5, 0.9, P.abuTua)
    r.silinderX(3.75, 0.95, 1.0, 0.5, 2.6, P.abu, 12)
    // cerobong uap
    r.silinder(-4.9, 0.06, -2.9, 0.3, 0.25, 4.6, P.bata, 10)
    r.bola(-4.9, 4.7, -2.9, 0.35, '#f4f4f4', 0)
    r.bola(-4.7, 5.2, -3.0, 0.28, '#fafafa', 0)
    // truk boks pengiriman
    r.kotak(2.9, 0.25, 3.1, 1.8, 0.9, 0.85, P.putih)
    r.kotak(2.9, 0.6, 3.54, 1.8, 0.14, 0.02, P.hijau)
    r.kotak(4.15, 0.25, 3.1, 0.6, 0.75, 0.82, P.hijau)
    r.kotak(4.46, 0.6, 3.1, 0.02, 0.3, 0.7, P.kaca)
    for (const x of [2.3, 3.6, 4.15]) for (const z of [2.66, 3.54]) r.kotak(x, 0.03, z, 0.34, 0.34, 0.1, P.hitam)
    return r
  },
}
