// Smoke HTTP: melewati alur pemain baru lewat API server yang sedang berjalan. Jalankan: pnpm smoke
// Butuh server dev di http://localhost:3600 (atau BASE_URL) dan DATABASE_URL yang sama dengan server.
// Akun uji dibuat lewat API lalu dihapus lewat DB (ledger ikut terhapus berantai).
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { MODAL_AWAL } from '../src/data/ekonomi.ts'
import { koran } from '../src/data/koran.ts'
import { tanggalWIB } from '../src/server/aturan.ts'
import { buatSql } from '../src/server/db.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const BASE = process.env.BASE_URL ?? 'http://localhost:3600'
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL belum diisi (.env.local).')
  process.exit(1)
}
const sql = buatSql(url, { max: 1 })

const jar = new Map<string, string>()
const simpanKuki = (res: Response) => {
  for (const baris of res.headers.getSetCookie()) {
    const [pasangan] = baris.split(';')
    const [nama, ...nilai] = pasangan.split('=')
    if (/max-age=0/i.test(baris) || /expires=thu, 01 jan 1970/i.test(baris)) jar.delete(nama.trim())
    else jar.set(nama.trim(), nilai.join('='))
  }
}
const kuki = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')

type Opsi = { body?: unknown; mentah?: string; tipe?: string | null; origin?: string | null; tanpaKuki?: boolean }
async function api(path: string, metode: 'GET' | 'POST', o: Opsi = {}) {
  const kepala: Record<string, string> = {}
  if (!o.tanpaKuki && jar.size) kepala.cookie = kuki()
  if (o.origin !== null) kepala.origin = o.origin ?? BASE
  if (metode === 'POST' && o.tipe !== null) kepala['content-type'] = o.tipe ?? 'application/json'
  const res = await fetch(BASE + path, {
    method: metode,
    headers: kepala,
    body: metode === 'POST' ? (o.mentah ?? JSON.stringify(o.body ?? {})) : undefined,
  })
  simpanKuki(res)
  const teks = await res.text()
  let json: any = null
  try {
    json = JSON.parse(teks)
  } catch {
    // bukan JSON
  }
  return { status: res.status, json, teks, res }
}
const aksi = (path: string, body: Record<string, unknown> = {}, kunci = randomUUID()) => api(path, 'POST', { body: { ...body, kunci } })

const email = `smoke-${randomBytes(4).toString('hex')}@uji.weton`
const sandi = 'rahasia-smoke-123'
let gagal = 0
const langkah = async (nama: string, fn: () => Promise<void>) => {
  try {
    await fn()
    console.log(`  ok     ${nama}`)
  } catch (e) {
    gagal++
    console.log(`  GAGAL  ${nama}\n         ${(e as Error).message.split('\n').slice(0, 3).join('\n         ')}`)
  }
}

try {
  await langkah('tanpa sesi: /api/sesi bilang belum masuk, /api/saya 401', async () => {
    assert.deepEqual((await api('/api/sesi', 'GET')).json, { masuk: false })
    const s = await api('/api/saya', 'GET')
    assert.equal(s.status, 401)
    assert.equal(s.json.galat.kode, 'belum_masuk')
  })

  await langkah('daftar: masukan salah ditolak, Origin asing ditolak, tipe selain JSON ditolak', async () => {
    const a = await api('/api/daftar', 'POST', { body: { email: 'bukan-email', nama: 'Uji', sandi } })
    assert.equal(a.status, 400)
    assert.equal(a.json.galat.kode, 'masukan_tidak_valid')
    const b = await api('/api/daftar', 'POST', { body: { email, nama: 'Uji', sandi }, origin: 'http://evil.example' })
    assert.equal(b.status, 403)
    const c = await api('/api/daftar', 'POST', { mentah: 'email=x', tipe: 'application/x-www-form-urlencoded' })
    assert.equal(c.status, 415)
    const d = await api('/api/daftar', 'POST', { mentah: '{rusak' })
    assert.equal(d.status, 400)
    assert.equal(jar.size, 0)
  })

  let kas = 0
  let upahPerAksi = 0
  await langkah('daftar: akun baru mendapat uang saku, kuki HttpOnly dan SameSite', async () => {
    const r = await api('/api/daftar', 'POST', { body: { email, nama: 'Uji Smoke', sandi } })
    assert.equal(r.status, 201, r.teks)
    assert.equal(r.json.kas, MODAL_AWAL)
    assert.equal(r.json.hunian, null)
    const kukiSesi = r.res.headers.getSetCookie().find((c) => c.startsWith('weton_sid='))
    assert.ok(kukiSesi, 'kuki weton_sid tidak ada')
    assert.match(kukiSesi, /HttpOnly/i)
    assert.match(kukiSesi, /SameSite=Lax/i)
    kas = r.json.kas
    assert.equal((await api('/api/sesi', 'GET')).json.masuk, true)
  })

  await langkah('sebelum memilih tempat tinggal, kerja ditolak', async () => {
    const r = await aksi('/api/kerja', { aksi: 1 })
    assert.equal(r.status, 409)
    assert.equal(r.json.galat.kode, 'belum_mulai')
  })

  await langkah('permintaan tanpa kunci idempotensi ditolak', async () => {
    const r = await api('/api/kerja', 'POST', { body: { aksi: 1 } })
    assert.equal(r.status, 400)
    assert.equal(r.json.galat.kode, 'kunci_tidak_valid')
  })

  await langkah('pilih tempat tinggal dan pekerjaan', async () => {
    const h = await aksi('/api/hunian', { hunian: 'kost-melati' })
    assert.equal(h.status, 200, h.teks)
    assert.equal(h.json.hunian.id, 'kost-melati')
    assert.equal((await aksi('/api/hunian', { hunian: 'numpang' })).json.galat.kode, 'hunian_tidak_ada')
    const p = await aksi('/api/pekerjaan', { pekerjaan: 'kuli-angkut' })
    assert.equal(p.json.pekerjaan.id, 'kuli-angkut')
    upahPerAksi = p.json.pekerjaan.upahPerAksi
    assert.equal((await aksi('/api/pekerjaan', { pekerjaan: 'admin-gudang' })).json.galat.kode, 'keahlian_kurang')
  })

  await langkah('kerja memotong Tenaga, menambah upah, dan idempoten', async () => {
    const kunci = randomUUID()
    const a = await api('/api/kerja', 'POST', { body: { aksi: 2, kunci } })
    assert.equal(a.status, 200, a.teks)
    assert.equal(a.json.kas, kas + 2 * upahPerAksi) // upah mengikuti UMK, jadi dibaca dari server
    assert.equal(a.json.tenaga.nilai, 80)
    const b = await api('/api/kerja', 'POST', { body: { aksi: 2, kunci } })
    assert.deepEqual(b.json, a.json)
    kas = a.json.kas
  })

  await langkah('bonus harian sekali sehari', async () => {
    const a = await aksi('/api/bonus')
    assert.equal(a.status, 200, a.teks)
    assert.equal(a.json.kas, kas + a.json.bonus.jumlah)
    kas = a.json.kas
    assert.equal((await aksi('/api/bonus')).json.galat.kode, 'bonus_sudah_diambil')
  })

  await langkah('kursus dimulai: uang terpotong, Keahlian naik saat kursus selesai', async () => {
    const biaya = (await api('/api/saya', 'GET')).json.kursus.biaya
    const a = await aksi('/api/kursus')
    assert.equal(a.status, 200, a.teks)
    assert.equal(a.json.keahlian, 1)
    assert.equal(a.json.latihan?.target, 2)
    assert.equal(a.json.kas, kas - biaya)
    assert.equal((await aksi('/api/kursus')).json.galat.kode, 'latihan_berjalan')
  })

  await langkah('riwayat memuat catatan ledger terbaru dulu', async () => {
    const r = await api('/api/riwayat?batas=10', 'GET')
    assert.equal(r.status, 200)
    assert.equal(r.json[0].jenis, 'kursus')
    assert.ok(r.json.some((b: { jenis: string }) => b.jenis === 'uang_saku'))
  })

  await langkah('koran: edisi terbaru ada di /api/saya, halaman terbuka tanpa masuk, edisi belum terbit tidak bocor', async () => {
    const s = await api('/api/saya', 'GET')
    assert.ok('koran' in s.json, 'keadaan tidak memuat koran')
    if (s.json.koran) assert.match(s.json.koran.tanggal, /^\d{4}-\d{2}-\d{2}$/)
    const h = await api('/koran', 'GET', { tanpaKuki: true })
    assert.equal(h.status, 200)
    assert.match(h.teks, /Koran Weton/)
    assert.equal((await api('/koran/2099-12-31', 'GET')).status, 404)
    assert.equal((await api('/koran/bukan-tanggal', 'GET')).status, 404)
    const belum = koran.find((e) => e.tanggal > tanggalWIB(new Date()))
    if (belum && !process.env.KORAN_SAMPAI) {
      assert.equal((await api(`/koran/${belum.tanggal}`, 'GET')).status, 404, `edisi ${belum.tanggal} terlihat sebelum waktunya`)
      assert.ok(!h.teks.includes(belum.berita[0].judul), 'berita utama edisi yang belum terbit bocor di /koran')
    }
  })

  await langkah('halaman akun dapat dibuka', async () => {
    for (const p of ['/masuk', '/mulai', '/beranda', '/koran']) {
      const r = await api(p, 'GET')
      assert.equal(r.status, 200, `${p} ${r.status}`)
      assert.ok(r.teks.includes('Weton City'))
    }
  })

  await langkah('keluar menghapus sesi; masuk lagi dengan sandi benar, salah ditolak', async () => {
    assert.equal((await api('/api/keluar', 'POST')).status, 200)
    assert.equal((await api('/api/saya', 'GET')).status, 401)
    const salah = await api('/api/masuk', 'POST', { body: { email, sandi: 'salah-salah-1' } })
    assert.equal(salah.status, 401)
    assert.equal(salah.json.galat.kode, 'masuk_gagal')
    const benar = await api('/api/masuk', 'POST', { body: { email: email.toUpperCase(), sandi } })
    assert.equal(benar.status, 200, benar.teks)
    assert.equal(benar.json.latihan?.target, 2)
    assert.equal((await api('/api/saya', 'GET')).status, 200)
  })
} finally {
  const hapus = await sql`delete from warga where email = ${email}`
  console.log(`  bersih: ${hapus.count} akun uji dihapus`)
  await sql`delete from percobaan_masuk where kunci = ${email}`
  await sql.end()
}
console.log(gagal ? `\n${gagal} langkah gagal` : '\nOK')
process.exit(gagal ? 1 : 0)
