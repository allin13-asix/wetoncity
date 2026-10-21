// Membuat (atau memperbarui) akun Wali Kota untuk pengembang. Jalankan: pnpm walikota
// Pilihan: --nama "Khairul Wianto" --email walikota@weton.test --sandi walikota123
// Aman dijalankan ulang: akun yang sudah ada dipulihkan (peran, Keahlian 10, Tenaga penuh, dana, dan kata sandi diatur ulang).
// Kata sandi bawaan sengaja mudah dan hanya boleh untuk basis data lokal. Untuk server lain (Supabase), wajib --sandi
// yang bukan sandi bawaan, dan pemakaian lewat session pooler: DATABASE_URL=... pnpm walikota --sandi "...".
import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { KURSUS } from '../src/data/ekonomi.ts'
import { daftar } from '../src/server/akun.ts'
import { WALIKOTA, bersihkanEmail, cekDaftar, tenagaMaks } from '../src/server/aturan.ts'
import { buatSql } from '../src/server/db.ts'
import { catat } from '../src/server/game.ts'
import { hashSandi } from '../src/server/sandi.ts'
import type { Warga } from '../src/server/tipe.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL belum diisi (.env.local).')
  process.exit(1)
}
const SANDI_BAWAAN = 'walikota123'
const { values: a } = parseArgs({
  options: {
    nama: { type: 'string', default: 'Khairul Wianto' },
    email: { type: 'string', default: 'walikota@weton.test' },
    sandi: { type: 'string', default: SANDI_BAWAAN },
  },
})
const lokal = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
if (!lokal && a.sandi === SANDI_BAWAAN) {
  console.error('Ditolak: untuk basis data selain lokal, berikan --sandi sendiri (sandi bawaan terlalu mudah).')
  process.exit(1)
}
const email = bersihkanEmail(a.email)
const salah = cekDaftar({ email, nama: a.nama!, sandi: a.sandi! })
if (salah) {
  console.error(salah)
  process.exit(1)
}

const sql = buatSql(url, { max: 1 })
try {
  const now = new Date()
  const [ada] = await sql<{ id: string }[]>`select id from warga where lower(email) = ${email}`
  const id = ada?.id ?? (await daftar(sql, { email, nama: a.nama, sandi: a.sandi }, now))
  const hash = await hashSandi(a.sandi!)
  await sql.begin(async (tx) => {
    const [w] = await tx<Warga[]>`select * from warga where id = ${id} for update`
    await tx`
      update warga set peran = 'walikota', nama = ${a.nama!}, sandi_hash = ${hash}, hunian_id = coalesce(hunian_id, 'kost-anggrek'),
        keahlian = ${KURSUS.skillMaks}, keahlian6_sejak = coalesce(keahlian6_sejak, ${now}),
        tenaga = ${tenagaMaks(null, 'walikota')}, tenaga_pada = ${now}
      where id = ${id}`
    if (w.kas < WALIKOTA.danaAwal) {
      await catat(tx, w, { akun: 'kas', jenis: 'dana_walikota', jumlah: WALIKOTA.danaAwal - w.kas, rincian: { sebab: 'dana awal Wali Kota' } }, now)
    }
    await tx`delete from percobaan_masuk where kunci = ${email}`
  })
  const [k] = await sql<{ kas: number }[]>`select kas from warga where id = ${id}`
  console.log(`${ada ? 'Akun Wali Kota dipulihkan' : 'Akun Wali Kota dibuat'}: ${a.nama}`)
  console.log(`  email      ${email}`)
  console.log(`  kata sandi ${a.sandi}`)
  console.log(`  uang       Rp ${k.kas.toLocaleString('id-ID')}`)
  console.log(lokal ? 'Masuk di http://localhost:3600/masuk' : `Basis data: ${new URL(url).hostname}`)
} finally {
  await sql.end()
}
