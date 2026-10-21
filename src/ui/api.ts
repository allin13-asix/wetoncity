// Pemanggil API untuk komponen klien. Jawaban selalu berbentuk ok atau galat, tidak pernah melempar.
import type { Keadaan } from '@/server/tipe'

export type GalatApi = { kode: string; pesan: string }
export type Hasil<T> = { ok: true; data: T } | { ok: false; status: number; galat: GalatApi }

export async function panggil<T = Keadaan>(url: string, badan?: Record<string, unknown>): Promise<Hasil<T>> {
  try {
    const res = await fetch(url, {
      method: badan ? 'POST' : 'GET',
      headers: badan ? { 'content-type': 'application/json' } : undefined,
      body: badan ? JSON.stringify(badan) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const json: unknown = await res.json().catch(() => null)
    if (res.ok) return { ok: true, data: json as T }
    const galat = (json as { galat?: GalatApi } | null)?.galat
    return { ok: false, status: res.status, galat: galat ?? { kode: 'galat', pesan: 'Terjadi masalah. Coba lagi sebentar lagi.' } }
  } catch {
    return { ok: false, status: 0, galat: { kode: 'jaringan', pesan: 'Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.' } }
  }
}

/** Kunci idempotensi baru untuk satu aksi. Aksi yang diulang dengan kunci sama tidak diproses dua kali. */
export const kunciBaru = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`

/** "3 jam 12 menit", "2 hari 5 jam", "kurang dari semenit". */
export function lamaWaktu(ms: number): string {
  if (ms < 60_000) return 'kurang dari semenit'
  const menit = Math.floor(ms / 60_000)
  const hari = Math.floor(menit / 1440)
  const jam = Math.floor((menit % 1440) / 60)
  const sisa = menit % 60
  if (hari > 0) return `${hari} hari${jam ? ` ${jam} jam` : ''}`
  if (jam > 0) return `${jam} jam${sisa ? ` ${sisa} menit` : ''}`
  return `${sisa} menit`
}
