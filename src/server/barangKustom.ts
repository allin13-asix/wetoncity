// Barang buatan Wali Kota (tabel barang_kustom). Definisinya dibaca sekali lalu disimpan sebentar di memori proses, supaya
// pemeriksaan "barang ini ada?" tidak menambah penerbangan di setiap aksi. Barang bawaan tetap di BARANG (aturan.ts).
import type { Bentuk } from '../data/bentuk.ts'
import { BARANG, adalahBarang } from './aturan.ts'
import type { Tx } from './kueri.ts'

export type DefKustom = {
  id: string; nama: string; jenis: 'konsumsi' | 'koleksi' | 'bahan'; dasar: number; satuan: string; ringkas: string
  tenaga: number; kesehatan: number; lapar: number; bentuk: Bentuk; warna: string
}

const SIMPAN_MS = 30_000
let simpanan: { pada: number; peta: Map<string, DefKustom> } | null = null

export async function muatKustom(tx: Tx, paksa = false): Promise<Map<string, DefKustom>> {
  if (!paksa && simpanan && Date.now() - simpanan.pada < SIMPAN_MS) return simpanan.peta
  const baris = await tx<DefKustom[]>`select id, nama, jenis, dasar, satuan, ringkas, tenaga, kesehatan, lapar, bentuk, warna from barang_kustom order by dibuat_pada`
  simpanan = { pada: Date.now(), peta: new Map(baris.map((b) => [b.id, { ...b, dasar: Number(b.dasar) }])) }
  return simpanan.peta
}

/** Definisi tersimpan (tanpa kueri); null bila belum dimuat atau tidak ada. */
export const kustomTersimpan = (id: string) => simpanan?.peta.get(id) ?? null
export const lupakanKustom = () => {
  simpanan = null
}

/** Barang bawaan atau barang buatan Wali Kota yang masih ada. */
export async function barangDikenal(tx: Tx, id: unknown): Promise<boolean> {
  if (adalahBarang(id)) return true
  return typeof id === 'string' && /^k-[a-z0-9-]{2,37}$/.test(id) && (await muatKustom(tx)).has(id)
}

/** Definisi seragam untuk barang bawaan maupun kustom (null bila tidak dikenal). */
export async function defApaSaja(tx: Tx, id: string) {
  if (adalahBarang(id)) {
    const d = BARANG[id] as { nama: string; jenis: string; dasar: number; satuan: string; ringkas: string; tenaga?: number; kesehatan?: number; lapar?: number }
    return { nama: d.nama, jenis: d.jenis, dasar: d.dasar, satuan: d.satuan, ringkas: d.ringkas, tenaga: d.tenaga ?? 0, kesehatan: d.kesehatan ?? 0, lapar: d.lapar ?? 0, ikon: null }
  }
  const k = (await muatKustom(tx)).get(id)
  return k ? { ...k, ikon: { bentuk: k.bentuk, warna: k.warna } } : null
}
