// Akun: pendaftaran, masuk, dan sesi. Login sederhana: email dan kata sandi, sesi lewat token acak.
import { LAPAR } from '../data/balans.ts'
import { MODAL_AWAL, TENAGA } from '../data/ekonomi.ts'
import { HARI_MS, SIKLUS_MS, bersihkanEmail, cekDaftar } from './aturan.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { catat, koneksiMati } from './game.ts'
import { bungkus } from './kueri.ts'
import { cocokSandi, hashSandi, sha256, tokenAcak } from './sandi.ts'
import type { Warga } from './tipe.ts'

export const SESI_HARI = 30
const MASUK_BATAS = 5
const MASUK_JENDELA_MS = 15 * 60_000

let palsu: Promise<string> | undefined
/** Hash tiruan agar waktu respons sama untuk email yang tidak ada. */
const hashPalsu = () => (palsu ??= hashSandi('kata sandi tiruan'))

/** Membuat akun: kas dimulai nol lalu uang saku masuk lewat ledger. Mengembalikan id warga. */
export async function daftar(sql: Sql, masukan: { email: unknown; nama: unknown; sandi: unknown }, now = new Date()): Promise<string> {
  const email = bersihkanEmail(masukan.email)
  const nama = typeof masukan.nama === 'string' ? masukan.nama.trim() : ''
  const sandi = typeof masukan.sandi === 'string' ? masukan.sandi : ''
  const salah = cekDaftar({ email, nama, sandi })
  if (salah) throw new Galat('masukan_tidak_valid', salah)
  const hash = await hashSandi(sandi)
  // dua penerbangan ke basis data: (begin + insert warga), lalu (uang saku + commit)
  const koneksi = await sql.reserve()
  let mati = false
  try {
    const tx = bungkus(koneksi)
    const [, [w]] = await Promise.all([
      tx.mentah('begin'),
      tx<Warga[]>`
        insert into warga (email, nama, sandi_hash, dibuat_pada, terakhir_aktif, tenaga, tenaga_pada, tagihan_berikut, lapar, lapar_pada, kesehatan_pada)
        values (${email}, ${nama}, ${hash}, ${now}, ${now}, ${TENAGA.maks}, ${now}, ${new Date(now.getTime() + SIKLUS_MS)}, ${LAPAR.awal}, ${now}, ${now})
        returning *`,
    ])
    await catat(tx, w, { akun: 'kas', jenis: 'uang_saku', jumlah: MODAL_AWAL, kunci: 'daftar', rincian: { sebab: 'bekal dari kampung halaman' } }, now)
    await tx.mentah('commit')
    return w.id
  } catch (e) {
    mati = koneksiMati(e)
    if (!mati) await koneksi.unsafe('rollback').execute().catch(() => {})
    if ((e as { code?: string }).code === '23505') throw new Galat('email_dipakai', 'Email itu sudah terdaftar.', 409)
    throw e
  } finally {
    if (!mati) koneksi.release()
  }
}

/** Memeriksa email dan kata sandi. Lima kegagalan dalam 15 menit menahan percobaan berikutnya. */
export async function masuk(sql: Sql, emailMentah: unknown, sandi: unknown, now = new Date()): Promise<string> {
  const email = bersihkanEmail(emailMentah)
  const gagal = new Galat('masuk_gagal', 'Email atau kata sandi salah.', 401)
  if (!email || typeof sandi !== 'string' || sandi.length === 0 || sandi.length > 200) throw gagal

  // satu penerbangan: hitungan percobaan dan akun diambil bersamaan
  const q = bungkus(sql)
  const [[p], [w]] = await Promise.all([
    q<{ gagal: number; sejak: Date }[]>`select gagal, sejak from percobaan_masuk where kunci = ${email}`,
    q<{ id: string; sandi_hash: string }[]>`select id, sandi_hash from warga where lower(email) = ${email}`,
  ])
  if (p && p.gagal >= MASUK_BATAS && now.getTime() - p.sejak.getTime() < MASUK_JENDELA_MS) {
    throw new Galat('terlalu_banyak_percobaan', 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429)
  }

  const cocok = await cocokSandi(sandi, w?.sandi_hash ?? (await hashPalsu()))
  if (!w || !cocok) {
    const batas = new Date(now.getTime() - MASUK_JENDELA_MS)
    await q`
      insert into percobaan_masuk (kunci, gagal, sejak) values (${email}, 1, ${now})
      on conflict (kunci) do update set
        gagal = case when percobaan_masuk.sejak < ${batas} then 1 else percobaan_masuk.gagal + 1 end,
        sejak = case when percobaan_masuk.sejak < ${batas} then ${now} else percobaan_masuk.sejak end`
    throw gagal
  }
  if (p) await q`delete from percobaan_masuk where kunci = ${email}`
  return w.id
}

export async function buatSesi(sql: Sql, wargaId: string, now = new Date()): Promise<{ token: string; kedaluwarsa: Date }> {
  const token = tokenAcak()
  const kedaluwarsa = new Date(now.getTime() + SESI_HARI * HARI_MS)
  // satu pernyataan: sesi kedaluwarsa dibuang sambil membuat yang baru
  await bungkus(sql)`
    with buang as (delete from sesi where kedaluwarsa < ${now})
    insert into sesi (token_hash, warga_id, dibuat_pada, kedaluwarsa) values (${sha256(token)}, ${wargaId}, ${now}, ${kedaluwarsa})`
  return { token, kedaluwarsa }
}

/**
 * Lama (ms) hasil cariSesi yang POSITIF diingat di memori proses ini; 0 mematikan cache. Pertukaran keamanan yang disengaja:
 * setiap permintaan berkuki membayar satu round-trip ke basis data hanya untuk menanyakan sesi, dan permintaan beruntun dari
 * pemain yang sama hampir selalu mendarat di instans yang sama. Akibatnya sesi yang dicabut dari instans LAIN (keluar di
 * sana) masih diterima di sini paling lama selama ini. Di instans yang sama hapusSesi mencabut seketika, kedaluwarsa sesi
 * tetap dicek pada tiap panggilan, dan hasil negatif (token tidak dikenal) tidak pernah di-cache. Batas atas yang masuk akal 15 detik.
 */
export const SESI_CACHE_MS = 10_000
const SESI_CACHE_MAKS = 2_000
const cacheSesi = new Map<string, { id: string; kedaluwarsa: Date; sampai: number }>()
// naik tiap hapusSesi: pencarian yang sudah berjalan saat sesi dicabut tidak boleh mengisi cache dengan jawaban lama
let versiCabut = 0

/** Id warga untuk token sesi yang masih berlaku, atau null. */
export async function cariSesi(sql: Sql, token: string | undefined, now = new Date()): Promise<string | null> {
  if (!token || token.length > 200) return null
  const hash = sha256(token)
  const ingat = cacheSesi.get(hash)
  if (ingat) {
    if (ingat.sampai > Date.now() && ingat.kedaluwarsa > now) return ingat.id
    cacheSesi.delete(hash)
  }
  const versi = versiCabut
  const [s] = await bungkus(sql)<{ warga_id: string; kedaluwarsa: Date }[]>`select warga_id, kedaluwarsa from sesi where token_hash = ${hash} and kedaluwarsa > ${now}`
  if (!s) return null
  if (SESI_CACHE_MS > 0 && versi === versiCabut) {
    if (cacheSesi.size >= SESI_CACHE_MAKS) cacheSesi.delete(cacheSesi.keys().next().value!)
    cacheSesi.set(hash, { id: s.warga_id, kedaluwarsa: s.kedaluwarsa, sampai: Date.now() + SESI_CACHE_MS })
  }
  return s.warga_id
}

/** Apakah token sesi milik Wali Kota. Dipakai halaman publik (misalnya pratinjau Koran); tanpa token tidak menyentuh basis data. */
export async function adalahWalikota(sql: Sql, token: string | undefined): Promise<boolean> {
  const id = await cariSesi(sql, token)
  if (!id) return false
  const [w] = await sql<{ peran: string }[]>`select peran from warga where id = ${id}`
  return w?.peran === 'walikota'
}

export async function hapusSesi(sql: Sql, token: string | undefined): Promise<void> {
  if (!token) return
  const hash = sha256(token)
  versiCabut++
  cacheSesi.delete(hash)
  await bungkus(sql)`delete from sesi where token_hash = ${hash}`
  versiCabut++
  cacheSesi.delete(hash)
}
