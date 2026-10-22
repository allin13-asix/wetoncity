// Pembantu rute API: kuki sesi, pembacaan JSON, pemeriksaan asal, dan bentuk jawaban.
import { cookies } from 'next/headers'
import { cariSesi } from './akun.ts'
import { Galat } from './galat.ts'
import { sql } from './sql.ts'
import type { Keadaan } from './tipe.ts'

export const KUKI_SESI = 'weton_sid'

export const jawab = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * Jawaban publik yang sama untuk semua pemain (tanpa kuki): disimpan CDN Vercel sebentar, jadi pembukaan peta beruntun
 * tidak selalu menyentuh basis data. Data boleh terlambat paling lama `detik` (lalu disegarkan di latar).
 */
export const jawabPublik = (data: unknown, detik = 15) =>
  Response.json(data, { headers: { 'Cache-Control': `public, max-age=0, s-maxage=${detik}, stale-while-revalidate=${detik * 4}` } })

export function galatKeJawaban(e: unknown): Response {
  if (e instanceof Galat) return jawab({ galat: { kode: e.kode, pesan: e.message } }, e.status)
  console.error(e)
  return jawab({ galat: { kode: 'galat_server', pesan: 'Terjadi masalah di server. Coba lagi sebentar lagi.' } }, 500)
}

/** Menolak permintaan lintas situs: bila ada, Origin harus sama dengan Host. Kuki SameSite Lax menjadi lapis kedua. */
function asalSah(req: Request): boolean {
  const asal = req.headers.get('origin')
  if (!asal) return true
  try {
    return new URL(asal).host === req.headers.get('host')
  } catch {
    return false
  }
}

export async function bacaJson(req: Request, batas = 4096): Promise<Record<string, unknown>> {
  if (!asalSah(req)) throw new Galat('asal_ditolak', 'Permintaan ditolak.', 403)
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) throw new Galat('tipe_ditolak', 'Permintaan harus berupa JSON.', 415)
  const teks = await req.text()
  if (teks.length > batas) throw new Galat('terlalu_besar', 'Permintaan terlalu besar.', 413)
  try {
    const d: unknown = JSON.parse(teks)
    if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>
  } catch {
    // jatuh ke galat di bawah
  }
  throw new Galat('json_tidak_valid', 'Isi permintaan tidak valid.')
}

export function kunciDari(b: Record<string, unknown>): string {
  const k = b.kunci
  if (typeof k !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(k)) throw new Galat('kunci_tidak_valid', 'Permintaan tidak lengkap. Muat ulang halaman.')
  return k
}

export async function tokenSesi(): Promise<string | undefined> {
  return (await cookies()).get(KUKI_SESI)?.value
}

export async function wargaId(): Promise<string> {
  const id = await cariSesi(sql, await tokenSesi())
  if (!id) throw new Galat('belum_masuk', 'Silakan masuk dulu.', 401)
  return id
}

export async function pasangKuki(token: string, kedaluwarsa: Date): Promise<void> {
  ;(await cookies()).set(KUKI_SESI, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: kedaluwarsa })
}

export async function hapusKuki(): Promise<void> {
  ;(await cookies()).delete(KUKI_SESI)
}

/** Rute POST untuk aksi pemain: butuh sesi dan kunci idempotensi, mengembalikan keadaan baru. */
export function aksi(fn: (id: string, b: Record<string, unknown>, kunci: string) => Promise<Keadaan>) {
  return async (req: Request): Promise<Response> => {
    try {
      const b = await bacaJson(req)
      const id = await wargaId()
      return jawab(await fn(id, b, kunciDari(b)))
    } catch (e) {
      return galatKeJawaban(e)
    }
  }
}
