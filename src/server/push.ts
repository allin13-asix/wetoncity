// Web push: pengingat harian supaya warga kembali. Tidak ada cron di dalam server; pengiriman dipicu dari luar
// lewat `pnpm push:kirim` (penjadwal sistem) atau POST /api/push/kirim dengan PUSH_RAHASIA (layanan cron).
// Kunci VAPID dibuat sekali dengan `pnpm push:kunci` lalu diisi di .env.local atau env server.
import webpush from 'web-push'
import { BONUS_HARIAN } from '../data/ekonomi.ts'
import { USAHA_ATURAN, pulihkanTenaga, selangTenaga, tanggalWIB, tenagaMaks, kasbonMacet } from './aturan.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { terbaru } from './koran.ts'
import type { Warga } from './tipe.ts'

export type Langganan = { endpoint: string; keys: { p256dh: string; auth: string } }
export type Pesan = { judul: string; isi: string; url: string }

/** Jeda minimum antarpengingat untuk satu perangkat, dan jam WIB yang boleh (tidak membangunkan orang). */
export const PUSH = { jedaMs: 20 * 3_600_000, jamMulai: 7, jamSelesai: 21 } as const

export function kunciVapid(): { publik: string; rahasia: string; subjek: string } | null {
  const publik = process.env.VAPID_PUBLIK
  const rahasia = process.env.VAPID_RAHASIA
  if (!publik || !rahasia) return null
  return { publik, rahasia, subjek: process.env.VAPID_SUBJEK || 'mailto:walikota@weton.invalid' }
}

export function periksaLangganan(x: unknown): Langganan {
  const s = x as Langganan
  const sah = s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string' && s.keys.p256dh.length < 200 && s.keys.auth.length < 100
  if (!sah) throw new Galat('masukan_tidak_valid', 'Data langganan pengingat tidak valid.')
  return s
}

export async function simpanLangganan(sql: Sql, wargaId: string, s: Langganan): Promise<void> {
  await sql`
    insert into push_langganan (endpoint, warga_id, p256dh, auth) values (${s.endpoint}, ${wargaId}, ${s.keys.p256dh}, ${s.keys.auth})
    on conflict (endpoint) do update set warga_id = excluded.warga_id, p256dh = excluded.p256dh, auth = excluded.auth`
}

export async function hapusLangganan(sql: Sql, wargaId: string, endpoint: string): Promise<void> {
  await sql`delete from push_langganan where endpoint = ${endpoint} and warga_id = ${wargaId}`
}

/**
 * Isi pengingat untuk satu warga, atau null bila tidak ada yang perlu diingatkan. Murni: tanpa basis data.
 * Urutan: tagihan yang tidak tertutup kas, hasil usaha penuh, Tenaga penuh, bonus harian, Koran baru.
 */
export function isiPengingat(w: Warga, now: Date, usahaPenuh: number, koranTanggal: string | null): Pesan | null {
  if (!w.hunian_id || w.perjalanan_tujuan) return null
  const sisaTagihan = w.tagihan_berikut.getTime() - now.getTime()
  if (w.peran !== 'walikota' && sisaTagihan > 0 && sisaTagihan < 24 * 3_600_000 && w.kas < 300_000) {
    return { judul: 'Tagihan mingguan jatuh tempo besok', isi: 'Uangmu belum cukup. Kerja sebentar supaya tidak jadi kasbon.', url: '/beranda' }
  }
  if (usahaPenuh > 0) {
    return { judul: 'Hasil usahamu sudah menumpuk', isi: 'Simpanan produksi penuh dan usaha berhenti. Ambil hasilnya supaya jalan lagi.', url: '/beranda' }
  }
  const t = pulihkanTenaga({ tenaga: w.tenaga, pada: w.tenaga_pada }, tenagaMaks(w.hunian_id, w.peran), selangTenaga(kasbonMacet(w.kasbon, w.kasbon_sejak, now), w.peran), now)
  if (t.tenaga >= tenagaMaks(w.hunian_id, w.peran)) {
    return { judul: 'Tenagamu sudah penuh', isi: 'Tenaga yang penuh tidak bertambah lagi. Waktunya kerja atau kursus.', url: '/beranda' }
  }
  if (w.bonus_tanggal !== tanggalWIB(now)) {
    return { judul: 'Bonus harian menunggu', isi: `Rp ${BONUS_HARIAN.toLocaleString('id-ID')} dari Kantor Wali Kota belum diambil hari ini.`, url: '/beranda' }
  }
  if (koranTanggal && koranTanggal === tanggalWIB(now)) {
    return { judul: 'Koran Weton edisi baru', isi: 'Kabar kota hari ini sudah terbit.', url: '/koran' }
  }
  return null
}

const jamWIB = (now: Date) => new Date(now.getTime() + 7 * 3_600_000).getUTCHours()

type Kirim = (s: webpush.PushSubscription, isi: string) => Promise<unknown>

/** Kirim pengingat ke semua perangkat yang sudah lewat jeda. Mengembalikan jumlah terkirim dan langganan yang dibuang. */
export async function kirimPengingat(sql: Sql, now = new Date(), kirim?: Kirim): Promise<{ terkirim: number; dibuang: number; dilewati: number }> {
  const hasil = { terkirim: 0, dibuang: 0, dilewati: 0 }
  const jam = jamWIB(now)
  if (jam < PUSH.jamMulai || jam >= PUSH.jamSelesai) return hasil
  if (!kirim) {
    const k = kunciVapid()
    if (!k) throw new Galat('vapid_kosong', 'VAPID_PUBLIK dan VAPID_RAHASIA belum diisi. Jalankan pnpm push:kunci.', 500)
    webpush.setVapidDetails(k.subjek, k.publik, k.rahasia)
    kirim = (s, isi) => webpush.sendNotification(s, isi, { TTL: 6 * 3600 })
  }
  const batas = new Date(now.getTime() - PUSH.jedaMs)
  const baris = await sql<Array<Warga & { endpoint: string; p256dh: string; auth: string; usaha_penuh: number }>>`
    select w.*, p.endpoint, p.p256dh, p.auth,
      (select count(*)::int from usaha u where u.warga_id = w.id and u.produksi_pada <= ${new Date(now.getTime() - USAHA_ATURAN.simpanMaks * USAHA_ATURAN.siklusMs)}) as usaha_penuh
    from push_langganan p join warga w on w.id = p.warga_id
    where p.terakhir_kirim is null or p.terakhir_kirim < ${batas}`
  const koran = terbaru(now)?.tanggal ?? null
  for (const b of baris) {
    const pesan = isiPengingat(b, now, b.usaha_penuh, koran)
    if (!pesan) {
      hasil.dilewati++
      continue
    }
    try {
      await kirim({ endpoint: b.endpoint, keys: { p256dh: b.p256dh, auth: b.auth } }, JSON.stringify(pesan))
      await sql`update push_langganan set terakhir_kirim = ${now} where endpoint = ${b.endpoint}`
      hasil.terkirim++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // 404 dan 410: perangkat sudah berhenti berlangganan
      if (status === 404 || status === 410) {
        await sql`delete from push_langganan where endpoint = ${b.endpoint}`
        hasil.dibuang++
      } else console.error('push gagal', status, (e as Error).message)
    }
  }
  return hasil
}
