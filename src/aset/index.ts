import { MeshLambertMaterial, type BufferGeometry } from 'three'
import { pelabuhan } from './model-pelabuhan.ts'
import { kota } from './model-kota.ts'
import { hunian } from './model-hunian.ts'
import { usaha } from './model-usaha.ts'
import { hiasan } from './model-hiasan.ts'
import { layanan } from './model-layanan.ts'
import { industri } from './model-industri.ts'
import type { Pembuat } from './rakit.ts'

const pembuat: Record<string, Pembuat> = { ...pelabuhan, ...kota, ...hunian, ...usaha, ...hiasan, ...layanan, ...industri }

const cache = new Map<string, BufferGeometry>()

/** Geometri model (di-cache). v memilih ragam warna untuk jenis yang punya ragam. */
export function geometriModel(model: string, ukuran: readonly [number, number], varian: Record<string, number | string> = {}, v = 0): BufferGeometry {
  const buat = pembuat[model]
  if (!buat) throw new Error(`Model tidak ada: ${model}`)
  const kunci = `${model}|${ukuran.join('x')}|${JSON.stringify(varian)}|${v % 8}`
  let g = cache.get(kunci)
  if (!g) {
    g = buat({ w: ukuran[0], d: ukuran[1], v, varian }).hasil()
    cache.set(kunci, g)
  }
  return g
}

/** Material bersama: warna dari vertex, facet. */
export function bahan() {
  return new MeshLambertMaterial({ vertexColors: true, flatShading: true })
}

export const jumlahSegitiga = (g: BufferGeometry) => Math.round(g.getAttribute('position').count / 3)
