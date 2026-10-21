// Koran Weton: edisi mana yang sudah terbit. Edisi terbit pukul 00.00 WIB pada tanggalnya,
// dihitung saat dibaca (tanpa cron). Isinya dari src/data/koran.ts ditambah edisi yang ditulis Wali Kota
// di /koran/tulis (tabel koran_edisi); edisi bertanggal sama dari basis data menggantikan edisi berkas.
import { koran, type Berita, type Edisi } from '../data/koran.ts'
import { npc } from '../data/npc.ts'
import { tanggalWIB } from './aturan.ts'
import type { Sql } from './db.ts'

/** Tanggal terakhir yang boleh terlihat. KORAN_SAMPAI (khusus pratinjau lokal) mendahului jam server. */
export const hariTerbit = (now: Date): string => process.env.KORAN_SAMPAI || tanggalWIB(now)

let dariDb: Edisi[] = []
let segarPada = 0
const SEGAR_MS = 30_000

/** Edisi berkas digabung edisi basis data, urut tanggal. */
export function daftarKoran(): Edisi[] {
  const peta = new Map(koran.map((e) => [e.tanggal, e]))
  for (const e of dariDb) peta.set(e.tanggal, e)
  return [...peta.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}

export type BarisKoran = { tanggal: string; berita: Berita[]; besok: string | null }

/** Sudah lewat 30 detik sejak edisi basis data diambil? Transaksi game menyertakan kueri koran hanya bila ya. */
export const koranBasi = (): boolean => Date.now() - segarPada >= SEGAR_MS

export function terapkanKoran(baris: readonly BarisKoran[]): void {
  dariDb = baris.map((b) => ({ tanggal: b.tanggal, berita: b.berita, ...(b.besok ? { besok: b.besok } : {}) }))
  segarPada = Date.now()
}

/** Ambil ulang edisi dari basis data paling sering tiap 30 detik. Galat basis data diabaikan (edisi berkas tetap tampil). */
export async function segarkanKoran(sql: Sql, paksa = false): Promise<void> {
  if (!paksa && !koranBasi()) return
  try {
    terapkanKoran(await sql<BarisKoran[]>`select tanggal, berita, besok from koran_edisi`)
  } catch {
    // tabel belum ada atau basis data mati
  }
}

/** Edisi yang sudah terbit, terbaru dulu. `daftar` bisa diganti untuk uji; `semua` (pratinjau Wali Kota) menyertakan yang belum terbit. */
export function terbit(now: Date, daftar: readonly Edisi[] = daftarKoran(), semua = false): Edisi[] {
  const hari = hariTerbit(now)
  return daftar.filter((e) => semua || e.tanggal <= hari).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
}

export const terbaru = (now: Date, daftar: readonly Edisi[] = daftarKoran(), semua = false): Edisi | null => terbit(now, daftar, semua)[0] ?? null

export const edisiTanggal = (tanggal: string, now: Date, daftar: readonly Edisi[] = daftarKoran(), semua = false): Edisi | null =>
  terbit(now, daftar, semua).find((e) => e.tanggal === tanggal) ?? null

const namaNpc = new Set(npc.map((n) => n.nama))
const tanggalAda = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && new Date(`${t}T00:00:00Z`).toISOString().slice(0, 10) === t

/** Periksa edisi kiriman /koran/tulis. Mengembalikan pesan galat pertama, atau null bila sah. Aturannya sama dengan pnpm cek. */
export function galatEdisi(e: { tanggal?: unknown; berita?: unknown; besok?: unknown }): string | null {
  if (typeof e.tanggal !== 'string' || !tanggalAda(e.tanggal)) return 'Tanggal tidak valid (YYYY-MM-DD).'
  if (!Array.isArray(e.berita) || e.berita.length < 1 || e.berita.length > 6) return 'Satu edisi berisi 1 sampai 6 berita.'
  for (const [i, b] of (e.berita as Berita[]).entries()) {
    const n = `Berita ${i + 1}`
    if (typeof b?.judul !== 'string' || !b.judul.trim() || b.judul.length > 100) return `${n}: judul wajib diisi, paling panjang 100 huruf.`
    if (!Array.isArray(b.isi) || !b.isi.length || b.isi.length > 12 || b.isi.some((p) => typeof p !== 'string' || !p.trim() || p.length > 1500)) {
      return `${n}: isi 1 sampai 12 paragraf, masing-masing tidak kosong dan paling panjang 1.500 huruf.`
    }
    if (b.penulis !== undefined && (typeof b.penulis !== 'string' || !namaNpc.has(b.penulis))) return `${n}: penulis harus nama NPC.`
  }
  if (e.besok !== undefined && e.besok !== null && (typeof e.besok !== 'string' || !e.besok.trim() || e.besok.length > 300)) return 'Teks edisi berikutnya paling panjang 300 huruf.'
  return null
}
