// Pemeriksaan tata letak kiriman editor Wali Kota, dipakai rute simpan dan rute slot.
import { jenisById } from '@/data/bangunan'
import type { TataLetakKustom } from '@/data/tataletak-kustom'
import { adalahWalikota } from './akun'
import { Galat } from './galat'
import { tokenSesi } from './http'
import { sql } from './sql'

/** Editor hanya untuk Wali Kota di server pengembangan. */
export async function izinEditor() {
  if (process.env.NODE_ENV === 'production') throw new Galat('hanya_dev', 'Editor tata letak hanya berjalan di server pengembangan.', 403)
  if (!(await adalahWalikota(sql, await tokenSesi()))) throw new Galat('bukan_walikota', 'Hanya Wali Kota yang boleh menyusun tata letak.', 403)
}

const angka = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const teks = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 80

export function periksa(b: Record<string, unknown>): TataLetakKustom | null {
  if (b.kustom === null) return null
  const k = b.kustom as TataLetakKustom
  if (!k || !Array.isArray(k.jalan) || !Array.isArray(k.bangunan) || !Array.isArray(k.lahan)) throw new Galat('masukan_tidak_valid', 'Format tata letak tidak dikenal.')
  const idJalan = new Set<string>()
  for (const j of k.jalan) {
    if (!teks(j.id) || !teks(j.nama) || !angka(j.lebar) || j.lebar < 1 || j.lebar > 6) throw new Galat('masukan_tidak_valid', `Jalan tidak valid: ${j.nama ?? j.id}`)
    if (idJalan.has(j.id)) throw new Galat('masukan_tidak_valid', `Id jalan ganda: ${j.id}`)
    idJalan.add(j.id)
    if (!Array.isArray(j.titik) || j.titik.length < 2 || !j.titik.every((t) => Array.isArray(t) && angka(t[0]) && angka(t[1]))) throw new Galat('masukan_tidak_valid', `${j.nama} butuh paling sedikit dua titik.`)
  }
  for (const x of k.bangunan) {
    if (!jenisById.has(x.jenis) || !angka(x.x) || !angka(x.z) || !angka(x.rot) || !teks(x.distrik)) throw new Galat('masukan_tidak_valid', `Bangunan tidak valid: ${x.jenis}`)
  }
  const idLahan = new Set<string>()
  for (const l of k.lahan) {
    if (!/^lahan-\d+$/.test(l.id) || idLahan.has(l.id) || ![l.x, l.z, l.rot, l.w, l.d].every(angka) || !teks(l.distrik)) throw new Galat('masukan_tidak_valid', `Lahan tidak valid: ${l.id}`)
    idLahan.add(l.id)
  }
  const bulat = (n: number) => Math.round(n * 100) / 100
  return {
    jalan: k.jalan.map((j) => ({ id: j.id, nama: j.nama, lebar: bulat(j.lebar), titik: j.titik.map(([a, c]) => [bulat(a), bulat(c)] as [number, number]), ...(j.tutup ? { tutup: true } : {}) })),
    bangunan: k.bangunan.map((x) => ({ jenis: x.jenis, x: bulat(x.x), z: bulat(x.z), rot: bulat(((x.rot % 360) + 360) % 360), distrik: x.distrik })),
    lahan: k.lahan.map((l) => ({ id: l.id, x: bulat(l.x), z: bulat(l.z), rot: bulat(((l.rot % 360) + 360) % 360), w: bulat(l.w), d: bulat(l.d), distrik: l.distrik })),
  }
}

