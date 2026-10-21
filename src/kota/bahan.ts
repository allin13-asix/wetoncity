import { MeshLambertMaterial } from 'three'

/** Kekuatan cahaya malam (0 siang, 1 malam), diperbarui Adegan mengikuti waktu. Dipakai semua material bangunan. */
export const malam = { value: 0 }

/**
 * Pasang cahaya jendela pada material: atribut `nyala` dari perakit model menjadi cahaya hangat dikali `malam`.
 * Geometri tanpa atribut itu (tanah, jalan) membaca 0, jadi tidak menyala.
 */
export function pasangNyala<T extends MeshLambertMaterial>(m: T): T {
  m.onBeforeCompile = (s) => {
    s.uniforms.uMalam = malam
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float nyala;\nvarying float vNyala;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNyala = nyala;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uMalam;\nvarying float vNyala;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.74, 0.36) * vNyala * uMalam;')
  }
  m.customProgramCacheKey = () => 'nyala'
  return m
}

/** Material bersama untuk semua model: warna dari vertex, tampak facet, jendela menyala di malam hari. */
export const bahanPadat = pasangNyala(new MeshLambertMaterial({ vertexColors: true, flatShading: true }))
