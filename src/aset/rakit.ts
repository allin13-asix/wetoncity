// Perakit model low-poly: menggabung kotak, silinder, atap, dan kubah
// menjadi satu BufferGeometry berwarna per titik. Satu bangunan = satu draw call.
import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute,
  IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { P } from './palet.ts'

/** s = selatan (+z, depan), u = utara (-z), t = timur (+x), b = barat (-x) */
export type Sisi = 's' | 'u' | 't' | 'b'

export type Opsi = { w: number; d: number; v: number; varian: Record<string, number | string> }
export type Pembuat = (o: Opsi) => Rakit

/** Warna kaca jendela: di malam hari sebagian jendela menyala (atribut nyala, dibaca shader di src/kota/bahan.ts). */
const KACA = new Set<string>([P.kaca, P.kacaTua])
/** Angka 0..1 tetap untuk satu posisi, agar pola jendela menyala tidak berubah tiap muat. */
const acakTetap = (x: number, y: number, z: number) => {
  const t = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return t - Math.floor(t)
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()

let _kotak: BoxGeometry | undefined
const kotakUnit = () => (_kotak ??= new BoxGeometry(1, 1, 1))

// Prisma segitiga alas 1 x 1, tinggi 1, punggung memanjang sepanjang z.
let _prisma: BufferGeometry | undefined
function prismaUnit() {
  if (_prisma) return _prisma
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0, 1, -0.5]
  const D = [-0.5, 0, 0.5], E = [0.5, 0, 0.5], F = [0, 1, 0.5]
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute([...D, ...E, ...F, ...A, ...C, ...B, ...E, ...B, ...C, ...E, ...C, ...F, ...A, ...D, ...F, ...A, ...F, ...C], 3))
  g.computeVertexNormals()
  return (_prisma = g)
}

export class Rakit {
  private bag: BufferGeometry[] = []

  tambah(g: BufferGeometry, warna: string, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): this {
    const geo = g.index ? g.toNonIndexed() : g.clone()
    geo.deleteAttribute('uv')
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz))
    geo.applyMatrix4(_m)
    const c = new Color(warna)
    const n = geo.getAttribute('position').count
    const rgb = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      rgb[i * 3] = c.r
      rgb[i * 3 + 1] = c.g
      rgb[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new Float32BufferAttribute(rgb, 3))
    // kira-kira dua pertiga jendela menyala di malam hari, terangnya sedikit berbeda-beda; nyala > 1 untuk lampu sengaja
    const a = acakTetap(x, y, z)
    const n0 = this.terang ?? (KACA.has(warna) ? (a < 0.66 ? 0.65 + a * 0.5 : 0) : 0)
    geo.setAttribute('nyala', new Float32BufferAttribute(new Float32Array(n).fill(n0), 1))
    this.bag.push(geo)
    return this
  }

  /** Nyala paksa untuk bagian yang ditambahkan di dalam fn (misalnya lampu teras atau papan bercahaya). */
  private terang: number | undefined
  menyala(kuat: number, fn: (r: this) => void): this {
    this.terang = kuat
    fn(this)
    this.terang = undefined
    return this
  }

  /** Kotak. (x, z) pusat, y dasar. */
  kotak(x: number, y: number, z: number, w: number, h: number, d: number, warna: string, ry = 0): this {
    return this.tambah(kotakUnit(), warna, x, y + h / 2, z, w, h, d, 0, ry, 0)
  }

  /** Kotak berputar. (x, y, z) adalah pusat kotak. */
  kotakPutar(x: number, y: number, z: number, w: number, h: number, d: number, warna: string, rx = 0, ry = 0, rz = 0): this {
    return this.tambah(kotakUnit(), warna, x, y, z, w, h, d, rx, ry, rz)
  }

  silinder(x: number, y: number, z: number, rBawah: number, rAtas: number, h: number, warna: string, seg = 10): this {
    return this.tambah(new CylinderGeometry(rAtas, rBawah, h, seg), warna, x, y + h / 2, z)
  }

  /** Silinder rebah sepanjang sumbu x (roda, tong). (x, y, z) pusat. */
  silinderX(x: number, y: number, z: number, r: number, panjang: number, warna: string, seg = 10): this {
    return this.tambah(new CylinderGeometry(r, r, panjang, seg), warna, x, y, z, 1, 1, 1, 0, 0, Math.PI / 2)
  }

  kerucut(x: number, y: number, z: number, r: number, h: number, warna: string, seg = 8): this {
    return this.silinder(x, y, z, r, 0, h, warna, seg)
  }

  /** Setengah bola. sy menipiskan atau meninggikan. */
  kubah(x: number, y: number, z: number, r: number, warna: string, sy = 1, seg = 14): this {
    return this.tambah(new SphereGeometry(1, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), warna, x, y, z, r, r * sy, r)
  }

  /** Gumpalan daun facet. y adalah dasar gumpalan. */
  bola(x: number, y: number, z: number, r: number, warna: string, detail = 0): this {
    return this.tambah(new IcosahedronGeometry(1, detail), warna, x, y + r, z, r, r, r)
  }

  /** Atap pelana. Punggung sepanjang z bila ry = 0. */
  pelana(x: number, y: number, z: number, w: number, h: number, d: number, warna: string, ry = 0): this {
    return this.tambah(prismaUnit(), warna, x, y, z, w, h, d, 0, ry, 0)
  }

  /** Atap pelana di atas bidang W (x) kali D (z). punggung = arah punggung atap. */
  atapPelana(x: number, y: number, z: number, W: number, D: number, h: number, warna: string, punggung: 'x' | 'z' = 'x'): this {
    return punggung === 'z' ? this.pelana(x, y, z, W, h, D, warna, 0) : this.pelana(x, y, z, D, h, W, warna, Math.PI / 2)
  }

  /** Atap perisai (limas terpancung). atas = rasio sisi atas terhadap bawah. */
  perisai(x: number, y: number, z: number, w: number, h: number, d: number, warna: string, atas = 0.2): this {
    const g = new CylinderGeometry(Math.SQRT1_2 * atas, Math.SQRT1_2, 1, 4)
    g.rotateY(Math.PI / 4)
    return this.tambah(g, warna, x, y + h / 2, z, w, h, d)
  }

  /** Limas runcing berdiri tegak (puncak menara). */
  limas(x: number, y: number, z: number, w: number, h: number, d: number, warna: string): this {
    return this.perisai(x, y, z, w, h, d, warna, 0)
  }

  /** Haluan lancip menghadap +z (atau -z bila arah = -1), untuk kapal dan perahu. */
  haluan(x: number, y: number, z: number, lebar: number, tinggi: number, panjang: number, warna: string, arah: 1 | -1 = 1): this {
    const g = new CylinderGeometry(0, Math.SQRT1_2, 1, 4)
    g.rotateY(Math.PI / 4)
    g.rotateX(Math.PI / 2 * arah)
    return this.tambah(g, warna, x, y + tinggi / 2, z + (panjang / 2) * arah, lebar, tinggi, panjang)
  }

  tiang(x: number, z: number, h: number, rad = 0.08, warna: string = P.abu, y = 0): this {
    return this.silinder(x, y, z, rad, rad, h, warna, 6)
  }

  /** Satu baris jendela pada dinding sisi tertentu dari badan w x d berpusat di (0, 0). */
  jendela(sisi: Sisi, w: number, d: number, y: number, jml: number, o: { lj?: number; tj?: number; warna?: string; margin?: number; tebal?: number; cz?: number; cx?: number } = {}): this {
    const lj = o.lj ?? 0.55
    const tj = o.tj ?? 0.6
    const warna = o.warna ?? P.kaca
    const margin = o.margin ?? 0.5
    const tebal = o.tebal ?? 0.06
    const cx = o.cx ?? 0
    const cz = o.cz ?? 0
    const L = sisi === 's' || sisi === 'u' ? w : d
    const pitch = (L - 2 * margin) / jml
    for (let i = 0; i < jml; i++) {
      const c = -L / 2 + margin + pitch * (i + 0.5)
      if (sisi === 's') this.kotak(cx + c, y, cz + d / 2 + tebal / 2 - 0.02, lj, tj, tebal, warna)
      else if (sisi === 'u') this.kotak(cx + c, y, cz - d / 2 - tebal / 2 + 0.02, lj, tj, tebal, warna)
      else if (sisi === 't') this.kotak(cx + w / 2 + tebal / 2 - 0.02, y, cz + c, tebal, tj, lj, warna)
      else this.kotak(cx - w / 2 - tebal / 2 + 0.02, y, cz + c, tebal, tj, lj, warna)
    }
    return this
  }

  hasil(): BufferGeometry {
    // rakitan kosong (misalnya tata letak kustom tanpa lahan atau jembatan): geometri kosong, bukan galat
    if (!this.bag.length) return new BufferGeometry()
    const g = mergeGeometries(this.bag, false)
    for (const b of this.bag) b.dispose()
    this.bag = []
    if (!g) throw new Error('Gagal menggabung geometri model')
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  }
}

/** Jumlah jendela yang muat pada dinding sepanjang L. */
export const jmlJendela = (L: number, pitch = 1.3, margin = 0.5) => Math.max(1, Math.floor((L - 2 * margin) / pitch))

/**
 * Badan bangunan bertingkat dengan jendela di sisi yang dipilih.
 * Mengembalikan tinggi puncak (y) agar atap bisa dipasang.
 */
export function badan(
  r: Rakit,
  o: {
    w: number; d: number; lantai: number; warna: string
    tl?: number; z?: number; x?: number; y0?: number
    sisi?: Sisi[]; kaca?: string; pitch?: number; lj?: number; tj?: number
  },
): number {
  const tl = o.tl ?? 1.05
  const y0 = o.y0 ?? 0.06
  const cx = o.x ?? 0
  const cz = o.z ?? 0
  const h = o.lantai * tl
  r.kotak(cx, y0, cz, o.w, h, o.d, o.warna)
  for (const s of o.sisi ?? ['s', 'u']) {
    const L = s === 's' || s === 'u' ? o.w : o.d
    for (let f = 0; f < o.lantai; f++) {
      r.jendela(s, o.w, o.d, y0 + f * tl + (tl - (o.tj ?? 0.55)) / 2 + 0.05, jmlJendela(L, o.pitch ?? 1.3), {
        lj: o.lj ?? 0.5, tj: o.tj ?? 0.55, warna: o.kaca ?? P.kaca, cx, cz,
      })
    }
  }
  return y0 + h
}

/** Pohon facet untuk dipakai di model (beringin, taman). */
export function pohon(r: Rakit, x: number, z: number, s = 1, daun: string = P.daun, daunTua: string = P.daunTua): void {
  r.silinder(x, 0, z, 0.16 * s, 0.11 * s, 1.2 * s, P.kayuTua, 6)
  r.bola(x, 0.95 * s, z, 0.85 * s, daun, 0)
  r.bola(x + 0.35 * s, 1.5 * s, z - 0.2 * s, 0.6 * s, daunTua, 0)
  r.bola(x - 0.3 * s, 1.35 * s, z + 0.25 * s, 0.55 * s, daun, 0)
}
