// Uji integrasi server Fase 0, fitur kota (migrasi 004), dan Fase 1 awal (migrasi 005). Jalankan: pnpm uji:server
// Memakai DATABASE_URL_UJI, satu skema sementara per jalan, waktu dipalsukan lewat parameter `sekarang`.
// Gagal (exit 1) bila ada pemeriksaan yang tidak terpenuhi. RINCI=1 menampilkan jejak galat lengkap; SARING=teks hanya menjalankan uji yang namanya memuat teks itu.
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { BONUS_HARIAN, MODAL_AWAL, TENAGA, UMK_AWAL, pajakBulanan } from '../src/data/ekonomi.ts'
import { LATIHAN } from '../src/data/balans.ts'
import { koran } from '../src/data/koran.ts'
import { SESI_CACHE_MS, buatSesi, cariSesi, daftar, hapusSesi, masuk } from '../src/server/akun.ts'
import {
  AKSI_MAKS, HARI_MS, JUDI, MAKAN, SIKLUS_MS, TENAGA_SELANG_MS, WALIKOTA, biayaKursus, hunianById, pasaran, pulihkanTenaga, rincianTagihan, tanggalPanjang, tanggalWIB,
  BANK, HASIL_SOLOE, kapasitasHunian, JENIS_USAHA, RSUD, SESI_KULIAH, TUJUAN, USAHA_ATURAN, biayaLapak, hargaLahan, hargaNpc, ikanPerSiklus, labaSiklus, pekerjaanById, upahAksi,
} from '../src/server/aturan.ts'
import { buatSql } from '../src/server/db.ts'
import { Galat } from '../src/server/galat.ts'
import {
  ambilPekerjaan, bayarKasbon, berjudi, berobat, catat, kantorWalikota, makanPadang, keadaan, kerja, klaimBonus, kuliah, kursus, lahan, muat, numpang, pasar, pilihHunian,
  tabungan, terbang, usaha, infoKota, tetapkanUmk, pilihSekolah, AKSI_LOG_SIMPAN_MS,
} from '../src/server/game.ts'
import { edisiTanggal, galatEdisi, segarkanKoran, terbaru, terbit } from '../src/server/koran.ts'
import { bungkus, literal } from '../src/server/kueri.ts'
import { lahanKosong, penempatan } from '../src/data/tataletak.ts'
import { isiPengingat, kirimPengingat } from '../src/server/push.ts'
import { jalankanMigrasi } from '../src/server/migrasi.ts'
import { sha256 } from '../src/server/sandi.ts'
import type { Keadaan, Warga } from '../src/server/tipe.ts'
import { simulasi } from './sim-ekonomi.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const url = process.env.DATABASE_URL_UJI
if (!url) {
  console.error('DATABASE_URL_UJI belum diisi (.env.local). Role dan database dibuat lewat db/siapkan.sql.')
  process.exit(1)
}

const skema = `uji_${randomBytes(4).toString('hex')}`
const admin = buatSql(url, { max: 1 })
await admin.unsafe(`create schema ${skema}`)
const sql = buatSql(url, { max: 25, schema: skema })

// ---------------------------------------------------------------- pembantu

const T0 = new Date('2026-10-18T03:00:00Z') // 10.00 WIB
const menit = (n: number) => n * 60_000
const jam = (n: number) => n * 3_600_000
const hari = (n: number) => n * HARI_MS
const sesudah = (ms: number) => new Date(T0.getTime() + ms)
const kunci = () => randomUUID()
let nomor = 0
const email = () => `u${++nomor}-${randomBytes(3).toString('hex')}@uji.weton`

const baru = (t = T0) => daftar(sql, { email: email(), nama: 'Uji', sandi: 'rahasia123' }, t)
// langsung lewat SQL tanpa kamar tertentu, supaya puluhan warga uji tidak memenuhi kuota kamar; kuota diuji tersendiri
const mulai = async (id: string, h = 'kost-melati', _t = T0) => {
  await sql`update warga set hunian_id = ${h} where id = ${id}`
  return id
}
const baris = async (id: string) => (await sql<Warga[]>`select * from warga where id = ${id}`)[0]
const jenisLedger = (id: string) => sql<{ akun: string; jenis: string; jumlah: number }[]>`select akun, jenis, jumlah from ledger where warga_id = ${id} order by id`
const upahKuli = (n: number) => upahAksi(pekerjaanById('kuli-angkut')!, 1, n)
const hitung = async (kueri: Promise<{ n: number }[]>) => (await kueri)[0].n
/**
 * Muat pada `t` untuk warga yang selalu makan cukup. Uji tagihan melompati hari tanpa makan; tanpa ini warga uji
 * kelaparan dan biaya rawat inap mencemari angka tagihan yang sedang diuji (lapar diuji tersendiri).
 */
const kenyang = (id: string, t: Date) => sql`update warga set lapar = 100, lapar_pada = ${t}, lapar_hukum_pada = null where id = ${id}`
const muatKenyang = async (id: string, t: Date) => {
  await kenyang(id, t)
  return muat(sql, id, t)
}
/** Kursus Keahlian berturut-turut sampai `sampai`, menunggu tiap kursus dan masa jedanya. Mengembalikan keadaan dan waktunya. */
async function naikKeahlian(id: string, sampai: number, t: Date): Promise<{ k: Keadaan; t: Date }> {
  // syarat Kecerdasan dan Disiplin naik tiap level; uji ini tentang kursus Keahlian, jadi atribut dibuat cukup
  await sql`update warga set kecerdasan = 20, disiplin = 20 where id = ${id}`
  let k = await muatKenyang(id, t)
  while (k.keahlian < sampai) {
    await kenyang(id, t)
    k = await kursus(sql, id, kunci(), t)
    t = new Date(Date.parse(k.latihan!.selesai) + LATIHAN.cooldownMs + 1000)
    k = await muatKenyang(id, t)
  }
  return { k, t }
}

async function galat(kode: string, p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    assert.ok(e instanceof Galat, `bukan Galat: ${String(e)}`)
    assert.equal(e.kode, kode)
    return
  }
  assert.fail(`seharusnya gagal dengan kode ${kode}`)
}

/** Menyuntik atau mengambil uang lewat ledger agar saldo tetap sama dengan jumlah ledger. */
const suntik = (id: string, jumlah: number, t: Date) =>
  sql.begin(async (tx) => {
    const [w] = await tx<Warga[]>`select * from warga where id = ${id} for update`
    await catat(tx, w, { akun: 'kas', jenis: jumlah > 0 ? 'bonus_harian' : 'kursus', jumlah, rincian: { uji: true } }, t)
  })

type Uji = { nama: string; fn: () => Promise<void> }
const daftarUji: Uji[] = []
const uji = (nama: string, fn: () => Promise<void>) => daftarUji.push({ nama, fn })

// ---------------------------------------------------------------- aturan murni

uji('aturan: pemulihan Tenaga menyimpan sisa waktu dan menjepit di maksimum', async () => {
  const a = pulihkanTenaga({ tenaga: 50, pada: T0 }, 100, TENAGA_SELANG_MS, sesudah(3 * TENAGA_SELANG_MS + 100_000))
  assert.equal(a.tenaga, 53)
  assert.equal(a.pada.getTime(), T0.getTime() + 3 * TENAGA_SELANG_MS)
  const b = pulihkanTenaga({ tenaga: 95, pada: T0 }, 100, TENAGA_SELANG_MS, sesudah(jam(5)))
  assert.equal(b.tenaga, 100)
  assert.equal(b.pada.getTime(), T0.getTime() + jam(5))
  assert.equal(pulihkanTenaga({ tenaga: 40, pada: T0 }, 100, TENAGA_SELANG_MS, sesudah(-1000)).tenaga, 40)
  assert.equal(pulihkanTenaga({ tenaga: 110, pada: T0 }, 100, TENAGA_SELANG_MS, T0).tenaga, 100)
})

uji('aturan: tanggal WIB berganti pukul 17.00 UTC', async () => {
  assert.equal(tanggalWIB(new Date('2026-10-18T16:59:59Z')), '2026-10-18')
  assert.equal(tanggalWIB(new Date('2026-10-18T17:00:00Z')), '2026-10-19')
})

uji('aturan: hari pasaran Jawa dan tanggal panjang', async () => {
  assert.equal(pasaran('1945-08-17'), 'Legi') // Jumat Legi, hari proklamasi
  assert.equal(pasaran('1970-01-01'), 'Wage') // Kamis Wage
  assert.equal(pasaran('1969-12-31'), 'Pon') // sebelum 1970 siklusnya tetap berputar
  assert.deepEqual(['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map(pasaran), ['Pon', 'Wage', 'Kliwon', 'Legi', 'Pahing', 'Pon'])
  assert.equal(tanggalPanjang('2026-10-18'), 'Minggu Pon, 18 Oktober 2026')
})

const edisiUji = ['2026-10-18', '2026-10-19', '2026-10-21'].map((tanggal) => ({ tanggal, berita: [{ judul: 'J', isi: ['p'] }] }))

uji('koran: edisi terbit pukul 00.00 WIB, yang belum waktunya tidak terlihat', async () => {
  delete process.env.KORAN_SAMPAI
  const tgl = (iso: string) => terbit(new Date(iso), edisiUji).map((e) => e.tanggal)
  assert.deepEqual(tgl('2026-10-18T16:59:59Z'), ['2026-10-18'])
  assert.deepEqual(tgl('2026-10-18T17:00:00Z'), ['2026-10-19', '2026-10-18']) // 00.00 WIB tanggal 19
  assert.equal(terbaru(new Date('2026-10-20T10:00:00Z'), edisiUji)?.tanggal, '2026-10-19') // tanggal 20 tidak punya edisi
  assert.equal(edisiTanggal('2026-10-21', new Date('2026-10-20T10:00:00Z'), edisiUji), null) // belum terbit
  assert.equal(edisiTanggal('2026-10-19', new Date('2026-10-20T10:00:00Z'), edisiUji)?.tanggal, '2026-10-19')
  assert.equal(terbaru(new Date('2026-10-17T10:00:00Z'), edisiUji), null)
  process.env.KORAN_SAMPAI = '2026-10-21' // pratinjau lokal
  try {
    assert.equal(terbaru(new Date('2026-10-17T10:00:00Z'), edisiUji)?.tanggal, '2026-10-21')
  } finally {
    delete process.env.KORAN_SAMPAI
  }
})

uji('koran: keadaan memuat berita utama edisi terbaru yang sudah terbit', async () => {
  delete process.env.KORAN_SAMPAI
  const w = await baris(await baru())
  const akhir = koran[koran.length - 1]
  assert.deepEqual(keadaan(w, new Date('2099-01-01T00:00:00Z')).koran, { tanggal: akhir.tanggal, judul: akhir.berita[0].judul })
  assert.equal(keadaan(w, new Date('2000-01-01T00:00:00Z')).koran, null)
})

// ---------------------------------------------------------------- akun

uji('daftar: uang saku lewat ledger, Tenaga penuh, tagihan 7 hari lagi', async () => {
  const em = email()
  const id = await daftar(sql, { email: ` ${em.toUpperCase()} `, nama: '  Ani  ', sandi: 'rahasia123' }, T0)
  const w = await baris(id)
  assert.equal(w.email, em)
  assert.equal(w.nama, 'Ani')
  assert.equal(w.kas, MODAL_AWAL)
  assert.equal(w.tenaga, TENAGA.maks)
  assert.equal(w.tagihan_berikut.getTime(), T0.getTime() + SIKLUS_MS)
  assert.ok(w.sandi_hash.startsWith('s1$') && !w.sandi_hash.includes('rahasia'))
  assert.deepEqual((await jenisLedger(id)).map((l) => ({ ...l })), [{ akun: 'kas', jenis: 'uang_saku', jumlah: MODAL_AWAL }])
  await galat('email_dipakai', daftar(sql, { email: em, nama: 'Lain', sandi: 'rahasia123' }, T0))
  await galat('masukan_tidak_valid', daftar(sql, { email: 'bukan-email', nama: 'Ani', sandi: 'rahasia123' }, T0))
  await galat('masukan_tidak_valid', daftar(sql, { email: email(), nama: 'A', sandi: 'rahasia123' }, T0))
  await galat('masukan_tidak_valid', daftar(sql, { email: email(), nama: 'Ani', sandi: 'pendek' }, T0))
})

uji('masuk: sandi benar, salah, dan pembatas percobaan', async () => {
  const em = email()
  const id = await daftar(sql, { email: em, nama: 'Budi', sandi: 'rahasia123' }, T0)
  assert.equal(await masuk(sql, em, 'rahasia123', T0), id)
  assert.equal(await masuk(sql, em.toUpperCase(), 'rahasia123', T0), id)
  await galat('masuk_gagal', masuk(sql, 'tidak-ada@uji.weton', 'rahasia123', T0))
  for (let i = 0; i < 5; i++) await galat('masuk_gagal', masuk(sql, em, 'salah-salah', T0))
  await galat('terlalu_banyak_percobaan', masuk(sql, em, 'rahasia123', T0)) // sandi benar pun ditahan
  assert.equal(await masuk(sql, em, 'rahasia123', sesudah(menit(16))), id) // jendela 15 menit lewat
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*) as n from percobaan_masuk where kunci = ${em}`), 0)
})

uji('sesi: token acak disimpan sebagai hash, berlaku 30 hari', async () => {
  const id = await baru()
  const { token } = await buatSesi(sql, id, T0)
  assert.equal(await cariSesi(sql, token, sesudah(hari(29))), id)
  assert.equal(await cariSesi(sql, token, sesudah(hari(31))), null)
  assert.equal(await cariSesi(sql, 'token-palsu', T0), null)
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*) as n from sesi where token_hash = ${token}`), 0)
  await hapusSesi(sql, token)
  assert.equal(await cariSesi(sql, token, T0), null)
})

// ---------------------------------------------------------------- hunian dan pekerjaan

uji('aksi diblokir sebelum memilih tempat tinggal', async () => {
  const id = await baru()
  await galat('belum_mulai', kerja(sql, id, kunci(), 1, T0))
  await galat('belum_mulai', kursus(sql, id, kunci(), T0))
  await galat('belum_mulai', klaimBonus(sql, id, kunci(), T0))
  await galat('belum_mulai', ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0))
})

uji('hunian: pilihan pertama langsung, pindah menunggu siklus berikutnya', async () => {
  const id = await baru()
  await galat('hunian_tidak_ada', pilihHunian(sql, id, kunci(), 'numpang', T0))
  await galat('hunian_tidak_ada', pilihHunian(sql, id, kunci(), 'tidak-ada', T0))
  let k = await pilihHunian(sql, id, kunci(), 'kost-melati', T0)
  assert.equal(k.hunian?.id, 'kost-melati')
  assert.equal(k.hunianBerikut, null)
  k = await pilihHunian(sql, id, kunci(), 'kost-mawar', T0)
  assert.equal(k.hunian?.id, 'kost-melati')
  assert.equal(k.hunianBerikut?.id, 'kost-mawar')
  k = await pilihHunian(sql, id, kunci(), 'kost-melati', T0) // batal pindah
  assert.equal(k.hunianBerikut, null)
})

uji('pekerjaan: hanya yang sudah dibuka dan Keahliannya cukup', async () => {
  const id = await mulai(await baru())
  await galat('keahlian_kurang', ambilPekerjaan(sql, id, kunci(), 'admin-gudang', T0)) // Tier 2
  await galat('pekerjaan_tidak_ada', ambilPekerjaan(sql, id, kunci(), 'buruh-ikan', T0)) // Fase 1
  await galat('pekerjaan_tidak_ada', ambilPekerjaan(sql, id, kunci(), 'perawat', T0)) // butuh gelar
  await galat('pekerjaan_tidak_ada', ambilPekerjaan(sql, id, kunci(), 'operator-mesin', T0)) // terkunci
  const k = await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  assert.equal(k.pekerjaan?.id, 'kuli-angkut')
  assert.equal(k.pekerjaan?.upahPerAksi, upahKuli(1))
  assert.equal(k.pekerjaan?.gajiBulan, UMK_AWAL)
  assert.ok(k.lowongan.every((l) => (l.tier === 1) === l.boleh)) // Keahlian 1: hanya Tier 1 yang boleh
})

uji('Rusunawa: Keahlian 6 ke atas tidak memenuhi syarat', async () => {
  const mapan = await baru()
  await sql`update warga set keahlian = 6 where id = ${mapan}`
  await galat('rusun_syarat', pilihHunian(sql, mapan, kunci(), 'rusun-weton', T0))
})

uji('Rusunawa: wajib pindah 28 hari setelah Keahlian 6', async () => {
  const id = await baru()
  await sql`update warga set hunian_id = 'rusun-weton', keahlian = 6, keahlian6_sejak = ${new Date(T0.getTime() - hari(29))} where id = ${id}`
  const k = await muatKenyang(id, sesudah(SIKLUS_MS))
  assert.equal(k.hunian?.id, 'kost-melati')
  assert.equal(k.kas, MODAL_AWAL - rincianTagihan(hunianById('rusun-weton')!).total) // siklus itu masih tarif Rusunawa
})

// ---------------------------------------------------------------- kerja, Tenaga, idempotensi

uji('kerja: upah, Tenaga, dan pemulihan tanpa kehilangan sisa waktu', async () => {
  const id = await mulai(await baru())
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  let k = await kerja(sql, id, kunci(), 1, T0)
  assert.equal(k.kas, MODAL_AWAL + upahKuli(1))
  assert.equal(k.tenaga.nilai, 90)
  assert.equal(k.upahSiklus, upahKuli(1))
  k = await kerja(sql, id, kunci(), 9, T0)
  assert.equal(k.tenaga.nilai, 0)
  assert.equal(k.kas, MODAL_AWAL + upahKuli(10))
  await galat('tenaga_kurang', kerja(sql, id, kunci(), 1, T0))
  for (const salah of [0, 11, 1.5]) await galat('aksi_tidak_valid', kerja(sql, id, kunci(), salah, T0))
  k = await muatKenyang(id, sesudah(3 * TENAGA_SELANG_MS + 100_000))
  assert.equal(k.tenaga.nilai, 3)
  assert.equal(Date.parse(k.tenaga.pada), T0.getTime() + 3 * TENAGA_SELANG_MS) // jam pulih maju tepat 3 selang
  k = await muatKenyang(id, sesudah(jam(1)))
  assert.equal(k.tenaga.nilai, 10)
  k = await muatKenyang(id, sesudah(jam(30)))
  assert.equal(k.tenaga.nilai, TENAGA.maks)
  const lain = await mulai(await baru())
  await galat('belum_punya_kerja', kerja(sql, lain, kunci(), 1, T0))
})

uji('idempotensi: kunci yang sama menghasilkan satu efek dan jawaban sama', async () => {
  const id = await mulai(await baru())
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  const k1 = kunci()
  const a = await kerja(sql, id, k1, 1, T0)
  const b = await kerja(sql, id, k1, 1, sesudah(menit(5)))
  assert.deepEqual(b, a)
  const serentak = await Promise.all(Array.from({ length: 6 }, () => kerja(sql, id, k1, 1, T0)))
  for (const s of serentak) assert.deepEqual(s, a)
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*) as n from ledger where warga_id = ${id} and jenis = 'upah'`), 1)
  assert.equal((await baris(id)).tenaga, 90)
  const c = await kerja(sql, id, kunci(), 1, T0) // kunci berbeda berarti aksi baru
  assert.equal(c.tenaga.nilai, 80)
})

uji('konkurensi: 20 aksi serentak dengan Tenaga 100 menghasilkan tepat 10 yang berhasil', async () => {
  const id = await mulai(await baru())
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  const hasil = await Promise.allSettled(Array.from({ length: 20 }, () => kerja(sql, id, kunci(), 1, T0)))
  assert.equal(hasil.filter((h) => h.status === 'fulfilled').length, 10)
  for (const h of hasil) if (h.status === 'rejected') assert.equal((h.reason as Galat).kode, 'tenaga_kurang')
  const w = await baris(id)
  assert.equal(w.tenaga, 0)
  assert.equal(w.kas, MODAL_AWAL + upahKuli(10))
})

uji('kamar: kuota per gedung dijaga, termasuk saat dua pemain berebut kamar terakhir; tanpa gedung dipilih yang masih kosong', async () => {
  const gedung = penempatan.filter((p) => p.jenis === 'kost-anggrek').map((p) => p.id)
  if (!gedung.length) return console.log('         (dilewati: tata letak aktif tidak punya Kost Anggrek)')
  const g = gedung[0]
  const kap = kapasitasHunian(hunianById('kost-anggrek')!)!
  assert.equal(kap, 8)
  const n = await hitung(sql<{ n: number }[]>`select count(*)::int as n from warga where hunian_tempat = ${g} or hunian_tempat_berikut = ${g}`)
  const susulan = new Date(T0.getTime() + SIKLUS_MS)
  await sql`
    insert into warga (email, nama, sandi_hash, dibuat_pada, terakhir_aktif, tenaga, tenaga_pada, tagihan_berikut, hunian_id, hunian_tempat)
    select 'kamar' || g || '@uji.weton', 'Dummy', 'x', ${T0}, ${T0}, 100, ${T0}, ${susulan}, 'kost-anggrek', ${g} from generate_series(1, ${kap - 1 - n}::int) g`
  const a = await baru()
  const b = await baru()
  const hasil = await Promise.allSettled([pilihHunian(sql, a, kunci(), 'kost-anggrek', T0, g), pilihHunian(sql, b, kunci(), 'kost-anggrek', T0, g)])
  assert.equal(hasil.filter((h) => h.status === 'fulfilled').length, 1)
  const ditolak = hasil.find((h): h is PromiseRejectedResult => h.status === 'rejected')
  assert.equal((ditolak?.reason as Galat).kode, 'hunian_penuh')
  const ok = hasil.find((h) => h.status === 'fulfilled') as PromiseFulfilledResult<Keadaan>
  assert.equal(ok.value.hunian?.tempat, g)
  await galat('tempat_tidak_cocok', pilihHunian(sql, await baru(), kunci(), 'kost-anggrek', T0, gedung[0].replace('anggrek', 'melati')))
  if (gedung.length === 1) await galat('hunian_penuh', pilihHunian(sql, await baru(), kunci(), 'kost-anggrek', T0))
  // walikota tidak memakai kamar
  const wk = await baru()
  await sql`update warga set peran = 'walikota' where id = ${wk}`
  const kw = await pilihHunian(sql, wk, kunci(), 'kost-anggrek', T0)
  assert.equal(kw.hunian?.tempat, null)
})

uji('Rusunawa: bila semua gedung penuh, pendatang tetap dapat kamar tambahan; gedung yang diminta tetap dijaga kuotanya', async () => {
  const gedung = penempatan.filter((p) => p.jenis === 'rusun-weton').map((p) => p.id)
  if (!gedung.length) return console.log('         (dilewati: tata letak aktif tidak punya Rusunawa)')
  const h = hunianById('rusun-weton')!
  const susulan = new Date(T0.getTime() + SIKLUS_MS)
  for (const g of gedung) {
    await sql`delete from warga where hunian_tempat = ${g} or hunian_tempat_berikut = ${g}`
    await sql`
      insert into warga (email, nama, sandi_hash, dibuat_pada, terakhir_aktif, tenaga, tenaga_pada, tagihan_berikut, hunian_id, hunian_tempat, hunian_kamar)
      select 'rusun' || g || '-' || ${g} || '@uji.weton', 'Dummy', 'x', ${T0}, ${T0}, 100, ${T0}, ${susulan}, 'rusun-weton', ${g}, (g + 1) / 2
      from generate_series(1, ${kapasitasHunian(h)!}::int) g`
  }
  await galat('hunian_penuh', pilihHunian(sql, await baru(), kunci(), 'rusun-weton', T0, gedung[0]))
  const a = await pilihHunian(sql, await baru(), kunci(), 'rusun-weton', T0)
  assert.ok(a.hunian?.tempat && gedung.includes(a.hunian.tempat))
  assert.equal(a.hunian?.kamar, h.kamar! + 1)
  // pendatang berikutnya disebar ke gedung tersepi, dan kamar tambahan tetap berisi paling banyak dua warga
  const lain = [a]
  for (let i = 0; i < 5; i++) lain.push(await pilihHunian(sql, await baru(), kunci(), 'rusun-weton', T0))
  const isi = new Map<string, number>()
  for (const x of lain) {
    assert.ok(x.hunian!.kamar! > h.kamar!)
    const kunciK = `${x.hunian!.tempat}|${x.hunian!.kamar}`
    isi.set(kunciK, (isi.get(kunciK) ?? 0) + 1)
  }
  assert.ok([...isi.values()].every((n) => n <= h.penghuni))
})

uji('kuli angkut: lowongan tanpa batas, pendatang selalu bisa bekerja', async () => {
  const gudang = penempatan.filter((p) => p.jenis === 'gudang-pelabuhan').map((p) => p.id)
  if (!gudang.length) return console.log('         (dilewati: tata letak aktif tidak punya Gudang Pelabuhan)')
  await sql`
    insert into warga (email, nama, sandi_hash, dibuat_pada, terakhir_aktif, tenaga, tenaga_pada, tagihan_berikut, hunian_id, pekerjaan_id, tempat_kerja)
    select 'kuli' || g || '-' || t || '@uji.weton', 'Dummy', 'x', ${T0}, ${T0}, 100, ${T0}, ${sesudah(SIKLUS_MS)}, 'kost-melati', 'kuli-angkut', t
    from generate_series(1, 50) g, unnest(${gudang}::text[]) t`
  const id = await mulai(await baru())
  const k = await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  assert.equal(k.pekerjaan?.id, 'kuli-angkut')
})

uji('lapar: pemain yang lama pergi dirawat selagi pergi, ditagih sekali, dan tidak terkunci saat kembali', async () => {
  const id = await mulai(await baru())
  await suntik(id, 2_000_000, T0)
  const t = sesudah(hari(3))
  let k = await muat(sql, id, t)
  assert.equal(k.dirawat, null)
  const rawat = (await jenisLedger(id)).filter((l) => l.jenis === 'rawat_inap')
  assert.equal(rawat.length, 1)
  // muat lagi pada saat yang sama tidak menagih lagi, dan pemain langsung bisa beraksi
  const kas = k.kas
  k = await muat(sql, id, t)
  assert.equal(k.kas, kas)
  k = await klaimBonus(sql, id, kunci(), t)
  assert.equal(k.kas, kas + BONUS_HARIAN)
  assert.equal((await jenisLedger(id)).filter((l) => l.jenis === 'rawat_inap').length, 1)
})

// ---------------------------------------------------------------- kursus, bonus

uji('kursus: biaya, diskon hunian, Tenaga, uang, dan Keahlian 6', async () => {
  const id = await mulai(await baru(), 'kost-mawar') // WiFi: diskon kursus 10%
  const mawar = hunianById('kost-mawar')
  assert.equal(biayaKursus(1, mawar), 90_000)
  let k = await kursus(sql, id, kunci(), T0)
  // kursus berjalan selama durasinya: Keahlian naik saat selesai, lalu ada masa jeda
  assert.equal(k.keahlian, 1)
  assert.equal(k.latihan?.target, 2)
  assert.equal(k.kas, MODAL_AWAL - 90_000)
  assert.equal(k.tenaga.nilai, TENAGA.maks - TENAGA.kursus)
  await galat('latihan_berjalan', kursus(sql, id, kunci(), T0))
  const selesai = new Date(Date.parse(k.latihan!.selesai))
  k = await muatKenyang(id, selesai)
  assert.equal(k.keahlian, 2)
  assert.equal(k.latihan, null)
  await galat('latihan_jeda', kursus(sql, id, kunci(), selesai))
  k = await kursus(sql, id, kunci(), new Date(selesai.getTime() + LATIHAN.cooldownMs + 1000)) // Keahlian 3: atribut awal 5 cukup
  const t4 = new Date(Date.parse(k.latihan!.selesai) + LATIHAN.cooldownMs + 1000)
  await kenyang(id, t4)
  await galat('stat_kurang', kursus(sql, id, kunci(), t4)) // Keahlian 4 butuh Kecerdasan dan Disiplin 6
  await suntik(id, 5_000_000, T0)
  k = (await naikKeahlian(id, 6, t4)).k
  assert.equal(k.keahlian, 6)
  assert.ok((await baris(id)).keahlian6_sejak)

  const miskin = await mulai(await baru())
  await suntik(miskin, -950_000, T0)
  await galat('uang_kurang', kursus(sql, miskin, kunci(), T0))

  const lelah = await mulai(await baru())
  await ambilPekerjaan(sql, lelah, kunci(), 'kuli-angkut', T0)
  await kerja(sql, lelah, kunci(), 10, T0)
  await galat('tenaga_kurang', kursus(sql, lelah, kunci(), T0))

  const maks = await mulai(await baru())
  await suntik(maks, 30_000_000, T0)
  const { k: km, t: tm } = await naikKeahlian(maks, 10, T0)
  assert.equal(km.keahlian, 10)
  assert.equal(km.kursus, null)
  await galat('keahlian_maks', kursus(sql, maks, kunci(), tm))
})

uji('bonus harian: sekali per tanggal WIB, tengah malam WIB membuka lagi', async () => {
  const id = await mulai(await baru())
  let k = await klaimBonus(sql, id, kunci(), T0) // 10.00 WIB
  assert.equal(k.kas, MODAL_AWAL + BONUS_HARIAN)
  assert.equal(k.bonus.siap, false)
  await galat('bonus_sudah_diambil', klaimBonus(sql, id, kunci(), sesudah(jam(13) + menit(30)))) // 23.30 WIB
  k = await klaimBonus(sql, id, kunci(), sesudah(jam(14) + menit(30))) // 00.30 WIB hari berikut
  assert.equal(k.kas, MODAL_AWAL + 2 * BONUS_HARIAN)
})

// ---------------------------------------------------------------- tagihan

uji('tagihan: sewa, listrik, dan makan jatuh tempo setelah 7 hari, tidak ditagih dua kali', async () => {
  const id = await mulai(await baru())
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  await kerja(sql, id, kunci(), 5, T0)
  const t = rincianTagihan(hunianById('kost-melati')!).total
  assert.equal(t, 450_000 + 60_000 + 750_000) // sewa, listrik, makan 30 hari pada UMK awal
  let k = await muatKenyang(id, sesudah(SIKLUS_MS - 1000)) // belum jatuh tempo
  assert.equal(k.kas, MODAL_AWAL + upahKuli(5))
  await suntik(id, 1_000_000, sesudah(SIKLUS_MS - 500))
  k = await muatKenyang(id, sesudah(SIKLUS_MS)) // tepat jatuh tempo
  assert.equal(k.kas, MODAL_AWAL + 1_000_000 + upahKuli(5) - t)
  assert.equal(k.kasbon, 0)
  assert.equal(Date.parse(k.tagihan!.jatuhTempo), T0.getTime() + 2 * SIKLUS_MS)
  assert.equal(k.upahSiklus, 0)
  assert.deepEqual((await jenisLedger(id)).map((l) => l.jenis), ['uang_saku', 'upah', 'bonus_harian', 'tagihan_hidup'])
  k = await muatKenyang(id, sesudah(SIKLUS_MS))
  assert.equal(k.kas, MODAL_AWAL + 1_000_000 + upahKuli(5) - t)
})

uji('pajak penghasilan bertingkat atas upah siklus', async () => {
  const id = await mulai(await baru())
  await suntik(id, 2_000_000, T0)
  await sql`update warga set upah_siklus = 6000000 where id = ${id}`
  const k = await muatKenyang(id, sesudah(SIKLUS_MS))
  assert.equal(pajakBulanan(4_500_000), 0)
  assert.equal(pajakBulanan(6_000_000), 75_000)
  assert.equal(pajakBulanan(12_000_000), 275_000 + 300_000)
  assert.equal(k.kas, MODAL_AWAL + 2_000_000 - rincianTagihan(hunianById('kost-melati')!).total - 75_000)
  assert.equal((await jenisLedger(id)).find((l) => l.jenis === 'pajak')?.jumlah, -75_000)
})

uji('kasbon: selisih tagihan, bunga 10%, macet memperlambat Tenaga, lalu dilunasi', async () => {
  const id = await mulai(await baru())
  const t = rincianTagihan(hunianById('kost-melati')!).total
  await suntik(id, -950_000, T0) // sisa Rp 50.000
  let k = await muatKenyang(id, sesudah(SIKLUS_MS))
  assert.equal(k.kas, 0)
  const awal = t - 50_000
  assert.equal(k.kasbon, awal)
  assert.deepEqual((await jenisLedger(id)).slice(-2).map((l) => l.jenis), ['tagihan_hidup', 'kasbon_baru'])
  assert.equal(k.kasbonMacet, false)
  assert.equal(k.tenaga.selangMs, TENAGA_SELANG_MS)

  const t2 = sesudah(2 * SIKLUS_MS + 1000)
  k = await muatKenyang(id, t2) // bunga 10%, lalu tagihan seluruhnya menjadi kasbon
  const total = awal + Math.round(awal * 0.1) + t
  assert.equal(k.kasbon, total)
  assert.equal(k.kasbonMacet, true)
  assert.equal(k.tenaga.selangMs, TENAGA_SELANG_MS * 2)

  await suntik(id, 600_000, t2)
  await galat('melebihi_kasbon', bayarKasbon(sql, id, kunci(), 99_999_999, t2))
  k = await bayarKasbon(sql, id, kunci(), 500_000, t2)
  assert.equal(k.kasbon, total - 500_000)
  assert.equal(k.kas, 100_000)
  await galat('uang_kurang', bayarKasbon(sql, id, kunci(), total - 500_000, t2))
  await suntik(id, total, t2)
  k = await bayarKasbon(sql, id, kunci(), total - 500_000, t2)
  assert.equal(k.kasbon, 0)
  assert.equal((await baris(id)).kasbon_sejak, null)
  assert.equal(k.kasbonMacet, false)
})

uji('mudik: pemain yang lama pergi hanya ditagih 2 siklus', async () => {
  const id = await mulai(await baru())
  await suntik(id, 10_000_000, T0)
  const k = await muatKenyang(id, sesudah(hari(30)))
  assert.equal(k.kas, MODAL_AWAL + 10_000_000 - 2 * rincianTagihan(hunianById('kost-melati')!).total)
  assert.equal(k.kasbon, 0)
  assert.equal((await jenisLedger(id)).filter((l) => l.jenis === 'tagihan_hidup').length, 2)
  assert.ok(Date.parse(k.tagihan!.jatuhTempo) > sesudah(hari(30)).getTime())
  const k2 = await muatKenyang(id, sesudah(hari(31)))
  assert.equal(k2.kas, k.kas)
})

uji('pindah hunian berlaku mulai siklus berikutnya', async () => {
  const id = await mulai(await baru(), 'kost-melati')
  await suntik(id, 5_000_000, T0)
  await pilihHunian(sql, id, kunci(), 'kost-mawar', T0)
  const melati = rincianTagihan(hunianById('kost-melati')!).total
  const mawar = rincianTagihan(hunianById('kost-mawar')!).total
  let k = await muatKenyang(id, sesudah(SIKLUS_MS)) // siklus pertama masih tarif Melati
  assert.equal(k.kas, MODAL_AWAL + 5_000_000 - melati)
  assert.equal(k.hunian?.id, 'kost-mawar')
  assert.equal(k.hunianBerikut, null)
  k = await muatKenyang(id, sesudah(2 * SIKLUS_MS)) // siklus kedua tarif Mawar
  assert.equal(k.kas, MODAL_AWAL + 5_000_000 - melati - mawar)
})

uji('makan Padang: bayar, Tenaga bertambah, dua kali per tanggal WIB, tidak saat Tenaga penuh', async () => {
  const id = await mulai(await baru())
  await galat('tenaga_penuh', makanPadang(sql, id, kunci(), T0))
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  await kerja(sql, id, kunci(), 3, T0)
  let k = await makanPadang(sql, id, kunci(), T0)
  assert.equal(k.tenaga.nilai, TENAGA.maks - 3 * TENAGA.aksiKerja + MAKAN.tenaga)
  assert.equal(k.makanSisa, 1)
  const kas = k.kas
  k = await makanPadang(sql, id, kunci(), T0)
  assert.equal(k.kas, kas - MAKAN.harga)
  assert.equal(k.makanSisa, 0)
  await galat('makan_habis', makanPadang(sql, id, kunci(), T0))
  // T0 pukul 10.00 WIB; 14 jam kemudian tanggal WIB berganti dan jatah kembali
  const besok = sesudah(jam(14) + menit(1))
  await kerja(sql, id, kunci(), 2, besok)
  k = await makanPadang(sql, id, kunci(), besok)
  assert.equal(k.makanSisa, 1)
  assert.ok((await jenisLedger(id)).filter((l) => l.jenis === 'makan').length === 3)
})

uji('judi: menang menambah sebesar taruhan, kalah dan razia kehilangan taruhan, tidak mengocok ulang', async () => {
  const id = await mulai(await baru())
  const kunciMenang = kunci()
  let k = await berjudi(sql, id, kunciMenang, 100_000, T0, () => 0.1)
  assert.equal(k.kas, MODAL_AWAL + 100_000)
  assert.deepEqual(k.judi, { menang: true, razia: false, taruhan: 100_000 })
  assert.equal(k.tenaga.nilai, TENAGA.maks - JUDI.tenaga)
  assert.deepEqual(await berjudi(sql, id, kunciMenang, 100_000, T0, () => 0.99), k)
  k = await berjudi(sql, id, kunci(), 50_000, T0, () => 0.5)
  assert.deepEqual(k.judi, { menang: false, razia: false, taruhan: 50_000 })
  k = await berjudi(sql, id, kunci(), 50_000, T0, () => 0.95)
  assert.deepEqual(k.judi, { menang: false, razia: true, taruhan: 50_000 })
  assert.equal(k.kas, MODAL_AWAL)
  await galat('jumlah_tidak_valid', berjudi(sql, id, kunci(), 5_000, T0))
  await galat('jumlah_tidak_valid', berjudi(sql, id, kunci(), JUDI.taruhanMaks + 1, T0))
  k = await berjudi(sql, id, kunci(), 1_000_000, T0, () => 0.7)
  assert.equal(k.kas, 0)
  await galat('uang_kurang', berjudi(sql, id, kunci(), 10_000, T0))
  // peluang dan razia: rumah selalu menang rata-rata 10%
  assert.ok(Math.abs(JUDI.peluang * 2 - 1 + 0.1) < 1e-9)
})

uji('walikota: rumah dinas tanpa tagihan, Tenaga besar, dana lewat ledger, hanya untuk peran walikota', async () => {
  const id = await mulai(await baru(), 'kost-anggrek')
  await galat('bukan_walikota', kantorWalikota(sql, id, kunci(), { aksi: 'uang', jumlah: 1000 }, T0))
  await sql`update warga set peran = 'walikota' where id = ${id}`

  let k = await kantorWalikota(sql, id, kunci(), { aksi: 'uang', jumlah: 500_000_000 }, T0)
  assert.equal(k.peran, 'walikota')
  assert.equal(k.kas, MODAL_AWAL + 500_000_000)
  assert.equal(k.tenaga.maks, WALIKOTA.tenagaMaks)
  assert.equal(k.tenaga.selangMs, WALIKOTA.selangMs)
  await galat('jumlah_tidak_valid', kantorWalikota(sql, id, kunci(), { aksi: 'uang', jumlah: WALIKOTA.danaMaksPerAksi + 1 }, T0))
  await galat('jumlah_tidak_valid', kantorWalikota(sql, id, kunci(), { aksi: 'uang', jumlah: -5 }, T0))
  await galat('masukan_tidak_valid', kantorWalikota(sql, id, kunci(), { aksi: 'keahlian', nilai: 11 }, T0))

  k = await kantorWalikota(sql, id, kunci(), { aksi: 'tenaga' }, T0)
  assert.equal(k.tenaga.nilai, WALIKOTA.tenagaMaks)
  k = await kantorWalikota(sql, id, kunci(), { aksi: 'keahlian', nilai: 10 }, T0)
  assert.equal(k.keahlian, 10)

  // kerja memakai Tenaga, lalu pulih 1 poin per menit
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  k = await kerja(sql, id, kunci(), AKSI_MAKS, T0)
  assert.equal(k.tenaga.nilai, WALIKOTA.tenagaMaks - AKSI_MAKS * TENAGA.aksiKerja)
  k = await muat(sql, id, sesudah(menit(30)))
  assert.equal(k.tenaga.nilai, WALIKOTA.tenagaMaks - AKSI_MAKS * TENAGA.aksiKerja + 30)

  // tiga siklus tagihan lewat: kas tidak berkurang sepeser pun
  const kasSebelum = k.kas
  k = await muat(sql, id, sesudah(hari(22)))
  assert.equal(k.kas, kasSebelum)
  const jenis = (await jenisLedger(id)).map((l) => l.jenis)
  assert.ok(jenis.includes('dana_walikota'))
  assert.ok(!jenis.includes('tagihan_hidup') && !jenis.includes('pajak'))
})

// ---------------------------------------------------------------- kesetaraan dengan simulasi ekonomi

/**
 * Pemain santai satu sesi per hari, kebijakan sama dengan scripts/sim-ekonomi.ts (`kursus: false`): bonus, pekerjaan Tier
 * tertinggi yang boleh, lalu habiskan Tenaga untuk bekerja. Bertindak pada t0 + d hari - 1 menit, lalu memuat keadaan
 * 30 menit setelah hari ke-d agar tagihan yang jatuh tempo ikut selesai sebelum dibandingkan. Simulasi tidak memodelkan
 * lapar dan kursus berdurasi, jadi bot selalu kenyang dan tidak ikut kursus; yang dibandingkan adalah inti ekonomi:
 * upah, bonus, tagihan, pajak, dan kasbon.
 */
async function jalankanBot(hunianId: string, jumlahHari: number): Promise<number[]> {
  const id = await mulai(await baru(), hunianId)
  const kasPerHari: number[] = []
  for (let d = 1; d <= jumlahHari; d++) {
    const t = new Date(T0.getTime() + d * HARI_MS - 60_000)
    await kenyang(id, t)
    await klaimBonus(sql, id, kunci(), t)
    let k = await muat(sql, id, t)
    const terbaik = k.lowongan.filter((l) => l.boleh).reduce((m, l) => (l.tier > m.tier ? l : m))
    if (k.pekerjaan?.tier !== terbaik.tier) k = await ambilPekerjaan(sql, id, kunci(), terbaik.id, t)
    let sisa = Math.floor(k.tenaga.nilai / TENAGA.aksiKerja)
    while (sisa > 0) {
      const n = Math.min(sisa, AKSI_MAKS)
      k = await kerja(sql, id, kunci(), n, t)
      sisa -= n
    }
    k = await muatKenyang(id, new Date(T0.getTime() + d * HARI_MS + menit(30)))
    kasPerHari.push(k.kas)
  }
  return kasPerHari
}

for (const hid of ['kost-melati', 'kost-mawar', 'kost-anggrek']) {
  uji(`kesetaraan: server dan simulasi memberi kas yang sama tiap hari (${hid}, 60 hari)`, async () => {
    const sim = simulasi({ sesi: 1, hunianId: hid, kursus: false }, 60).kasHarian
    const bot = await jalankanBot(hid, 60)
    for (let d = 0; d < 60; d++) assert.equal(bot[d], sim[d], `${hid} hari ${d + 1}: server ${bot[d]}, simulasi ${sim[d]}`)
  })
}

// ---------------------------------------------------------------- ledger dan basis data

// ---------------------------------------------------------------- fitur kota (migrasi 004)

uji('terbang: tiket, tidak bisa beraksi selama pergi, hasil saat pulang, sekali sehari, Jakarte di bawah Keahlian 6', async () => {
  const id = await mulai(await baru())
  await suntik(id, 5_000_000, T0)
  let k = await terbang(sql, id, kunci(), 'soloe', T0)
  assert.equal(k.kas, MODAL_AWAL + 5_000_000 - TUJUAN.soloe.tiket)
  assert.equal(k.perjalanan?.tujuan, 'soloe')
  await galat('sedang_pergi', klaimBonus(sql, id, kunci(), sesudah(jam(1))))
  k = await muat(sql, id, sesudah(jam(TUJUAN.soloe.jam) + menit(1)))
  assert.equal(k.perjalanan, null)
  assert.equal(k.kas, MODAL_AWAL + 5_000_000 - TUJUAN.soloe.tiket + HASIL_SOLOE)
  await galat('sudah_terbang', terbang(sql, id, kunci(), 'soloe', sesudah(jam(TUJUAN.soloe.jam) + menit(2))))
  // besok: Jakarte menambah Keahlian
  k = await terbang(sql, id, kunci(), 'jakarte', sesudah(hari(1)))
  k = await muat(sql, id, sesudah(hari(1) + jam(TUJUAN.jakarte.jam) + menit(1)))
  assert.equal(k.keahlian, 2)
  await sql`update warga set keahlian = 6 where id = ${id}`
  await galat('keahlian_tinggi', terbang(sql, id, kunci(), 'jakarte', sesudah(hari(2))))
  await galat('tujuan_tidak_ada', terbang(sql, id, kunci(), 'bali', sesudah(hari(2))))
})

uji('kuliah: UKT tiap semester, satu sesi per hari, lulus memberi ijazah dan membuka pekerjaan D3', async () => {
  const id = await mulai(await baru())
  await suntik(id, 20_000_000, T0)
  let k = await kuliah(sql, id, kunci(), { aksi: 'daftar', jurusan: 'd3-keperawatan' }, T0)
  assert.equal(k.kuliah?.semester, 1)
  await galat('ukt_belum', kuliah(sql, id, kunci(), { aksi: 'sesi' }, T0))
  await galat('sedang_kuliah', kuliah(sql, id, kunci(), { aksi: 'daftar', jurusan: 's1-akuntansi' }, T0))
  let d = 0
  for (let semester = 1; semester <= 6; semester++) {
    k = await kuliah(sql, id, kunci(), { aksi: 'ukt' }, sesudah(hari(d)))
    assert.equal(k.kuliah?.uktLunas, true)
    for (let s = 0; s < SESI_KULIAH.perSemester; s++) {
      k = await kuliah(sql, id, kunci(), { aksi: 'sesi' }, sesudah(hari(d)))
      if (semester === 1 && s === 0) await galat('sesi_sudah', kuliah(sql, id, kunci(), { aksi: 'sesi' }, sesudah(hari(d) + jam(1))))
      d++
    }
  }
  assert.equal(k.kuliah, null)
  assert.equal(k.ijazah?.id, 'd3-keperawatan')
  assert.ok(k.lowongan.some((p) => p.id === 'perawat'))
  const ukt = (await jenisLedger(id)).filter((l) => l.jenis === 'ukt')
  assert.equal(ukt.length, 6)
})

uji('tabungan: setor, tarik, dan bunga tiap siklus tagihan', async () => {
  const id = await mulai(await baru())
  let k = await tabungan(sql, id, kunci(), 'setor', 400_000, T0)
  assert.equal(k.kas, MODAL_AWAL - 400_000)
  assert.equal(k.tabungan, 400_000)
  await galat('uang_kurang', tabungan(sql, id, kunci(), 'setor', 10_000_000, T0))
  await galat('tabungan_kurang', tabungan(sql, id, kunci(), 'tarik', 500_000, T0))
  k = await tabungan(sql, id, kunci(), 'tarik', 100_000, T0)
  assert.equal(k.tabungan, 300_000)
  k = await muat(sql, id, sesudah(hari(7) + menit(1)))
  assert.equal(k.tabungan, 300_000 + Math.floor(300_000 * BANK.bungaPerSiklus))
})

uji('berobat: Tenaga penuh seketika, sekali per tanggal WIB, tidak saat Tenaga penuh', async () => {
  const id = await mulai(await baru())
  await galat('tenaga_penuh', berobat(sql, id, kunci(), T0))
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  await kerja(sql, id, kunci(), 5, T0)
  const k = await berobat(sql, id, kunci(), T0)
  assert.equal(k.tenaga.nilai, k.tenaga.maks)
  assert.equal(k.kas, MODAL_AWAL + upahKuli(5) - RSUD.harga)
  await kerja(sql, id, kunci(), 1, T0)
  await galat('sudah_berobat', berobat(sql, id, kunci(), T0))
})

uji('usaha: modal, produksi tiap 4 jam disimpan paling banyak 6 siklus, slot, upgrade, ikan ke gudang', async () => {
  const id = await mulai(await baru())
  await suntik(id, 20_000_000, T0)
  let k = await usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'perahu' }, T0)
  const u = k.usaha[0]
  assert.equal(k.kas, MODAL_AWAL + 20_000_000 - JENIS_USAHA.perahu.modal)
  await galat('belum_ada_hasil', usaha(sql, id, kunci(), { aksi: 'ambil', usaha: u.id }, sesudah(jam(3))))
  k = await muat(sql, id, sesudah(jam(30)))
  assert.equal(k.usaha[0].siklusSiap, USAHA_ATURAN.simpanMaks)
  const sebelum = k.kas
  k = await usaha(sql, id, kunci(), { aksi: 'ambil', usaha: u.id }, sesudah(jam(30)))
  assert.equal(k.kas, sebelum + USAHA_ATURAN.simpanMaks * labaSiklus('perahu', 1))
  assert.equal(k.usaha[0].siklusSiap, 0)
  // ke gudang: ikan masuk, solar dibayar tunai
  k = await usaha(sql, id, kunci(), { aksi: 'ambil', usaha: u.id, ke: 'gudang' }, sesudah(jam(38)))
  assert.equal(k.gudang.ikan, 2 * ikanPerSiklus(1))
  k = await usaha(sql, id, kunci(), { aksi: 'upgrade', usaha: u.id }, sesudah(jam(38)))
  assert.equal(k.usaha[0].level, 2)
  await usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'warung' }, sesudah(jam(38)))
  await galat('slot_penuh', usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'warung' }, sesudah(jam(38))))
  await galat('usaha_tidak_ada', usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'tambang' }, sesudah(jam(38))))
})

uji('lahan: beli, tidak bisa dibeli dua warga, bangun rumah, lalu pindah ke rumah sendiri', async () => {
  const l = lahanKosong[0]
  if (!l) return console.log('         (dilewati: tata letak aktif tidak punya lahan kosong)')
  const a = await mulai(await baru())
  const b = await mulai(await baru())
  await suntik(a, 30_000_000, T0)
  await suntik(b, 30_000_000, T0)
  await galat('belum_punya_rumah', pilihHunian(sql, a, kunci(), 'rumah-sendiri', T0))
  let k = await lahan(sql, a, kunci(), 'beli', l.id, T0)
  assert.equal(k.kas, MODAL_AWAL + 30_000_000 - hargaLahan(l))
  await galat('lahan_terjual', lahan(sql, b, kunci(), 'beli', l.id, T0))
  await galat('bukan_milik', lahan(sql, b, kunci(), 'rumah', l.id, T0))
  k = await lahan(sql, a, kunci(), 'rumah', l.id, T0)
  // konstruksi butuh waktu: rumah belum bisa ditinggali sampai selesai
  assert.equal(k.punyaRumah, false)
  assert.equal(k.lahan[0].bangun?.jenis, 'rumah')
  await galat('rumah_ada', lahan(sql, a, kunci(), 'rumah', l.id, T0))
  await galat('belum_punya_rumah', pilihHunian(sql, a, kunci(), 'rumah-sendiri', T0))
  const jadi = new Date(Date.parse(k.lahan[0].bangun!.selesai) + 1000)
  k = await muatKenyang(a, jadi)
  assert.equal(k.punyaRumah, true)
  k = await pilihHunian(sql, a, kunci(), 'rumah-sendiri', jadi)
  assert.equal(k.hunianBerikut?.id, 'rumah-sendiri')
})

// ---------------------------------------------------------------- Fase 1 (migrasi 005)

uji('pasar: beli dan jual ke NPC, lapak dalam pita harga, uang lapak cair ke penjual dipotong biaya', async () => {
  const jual = await mulai(await baru())
  const beli = await mulai(await baru())
  const h = hargaNpc('ikan', tanggalWIB(T0))
  let k = await pasar(sql, jual, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 10 }, T0)
  assert.equal(k.gudang.ikan, 10)
  assert.equal(k.kas, MODAL_AWAL - 10 * h.jual)
  k = await pasar(sql, jual, kunci(), { aksi: 'jual_npc', barang: 'ikan', jumlah: 2 }, T0)
  assert.equal(k.gudang.ikan, 8)
  assert.equal(k.kas, MODAL_AWAL - 10 * h.jual + 2 * h.beli)
  await galat('barang_kurang', pasar(sql, jual, kunci(), { aksi: 'jual_npc', barang: 'ikan', jumlah: 100 }, T0))
  await galat('harga_tidak_valid', pasar(sql, jual, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 5, harga: 99_000 }, T0))
  k = await pasar(sql, jual, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 8, harga: 30_000 }, T0)
  assert.equal(k.gudang.ikan ?? 0, 0)
  const lapakId = k.lapak[0].id
  const kasJual = k.kas
  await galat('lapak_sendiri', pasar(sql, jual, kunci(), { aksi: 'beli_lapak', lapak: lapakId, jumlah: 1 }, T0))
  k = await pasar(sql, beli, kunci(), { aksi: 'beli_lapak', lapak: lapakId, jumlah: 3 }, T0)
  assert.equal(k.gudang.ikan, 3)
  assert.equal(k.kas, MODAL_AWAL - 90_000)
  await galat('stok_kurang', pasar(sql, beli, kunci(), { aksi: 'beli_lapak', lapak: lapakId, jumlah: 6 }, T0))
  // penjual membuka game: hasil lapak cair, lalu tutup lapak mengembalikan sisa
  k = await muat(sql, jual, sesudah(menit(1)))
  assert.equal(k.kas, kasJual + 90_000 - biayaLapak(90_000))
  k = await pasar(sql, jual, kunci(), { aksi: 'tutup_lapak', lapak: lapakId }, sesudah(menit(2)))
  assert.equal(k.gudang.ikan, 5)
  assert.equal(k.lapak.length, 0)
})

uji('warung: bahan dari gudang mengganti biaya bahan', async () => {
  const id = await mulai(await baru())
  await suntik(id, 20_000_000, T0)
  let k = await usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'warung' }, T0)
  await pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 2 }, T0)
  k = await pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'beras', jumlah: 5 }, T0)
  const sebelum = k.kas
  k = await usaha(sql, id, kunci(), { aksi: 'ambil', usaha: k.usaha[0].id }, sesudah(jam(12)))
  assert.equal(k.kas, sebelum + 3 * labaSiklus('warung', 1) + 2 * JENIS_USAHA.warung.bahan)
  assert.deepEqual(k.gudang, { beras: 3 })
})

uji('numpang: izin pemilik, pindah siklus berikutnya, uang dapur ke pemilik, berhenti dengan pemberitahuan 1 hari', async () => {
  const pemilik = await mulai(await baru())
  const tamu = await mulai(await baru())
  await suntik(pemilik, 5_000_000, T0)
  await suntik(tamu, 5_000_000, T0)
  await galat('belum_punya_rumah', numpang(sql, pemilik, kunci(), { aksi: 'atur', terima: true, uangDapur: 50_000 }, T0))
  await sql`insert into lahan_milik (lahan_id, warga_id, dibeli_pada, rumah) values (${`lahan-uji-${randomBytes(3).toString('hex')}`}, ${pemilik}, ${T0}, true)`
  await galat('tidak_menerima', numpang(sql, tamu, kunci(), { aksi: 'minta', pemilik }, T0))
  await numpang(sql, pemilik, kunci(), { aksi: 'atur', terima: true, uangDapur: 50_000 }, T0)
  let k = await numpang(sql, tamu, kunci(), { aksi: 'minta', pemilik }, T0)
  assert.equal(k.numpang?.status, 'minta')
  await galat('sudah_numpang', numpang(sql, tamu, kunci(), { aksi: 'minta', pemilik }, T0))
  let kp = await muat(sql, pemilik, T0)
  const minta = kp.kamarTamu.penumpang[0]
  kp = await numpang(sql, pemilik, kunci(), { aksi: 'setujui', permintaan: minta.id }, T0)
  assert.equal(kp.kamarTamu.penumpang[0].status, 'aktif')
  k = await muat(sql, tamu, sesudah(menit(1)))
  assert.equal(k.hunianBerikut?.id, 'numpang')
  // dua siklus: siklus pertama masih kost, siklus kedua di rumah pemilik dengan uang dapur
  k = await muat(sql, tamu, sesudah(hari(14) + menit(1)))
  assert.equal(k.hunian?.id, 'numpang')
  assert.ok((await jenisLedger(tamu)).some((l) => l.jenis === 'uang_dapur' && l.jumlah === -50_000))
  kp = await muat(sql, pemilik, sesudah(hari(14) + menit(2)))
  assert.ok((await jenisLedger(pemilik)).some((l) => l.jenis === 'uang_dapur' && l.jumlah === 50_000))
  k = await numpang(sql, tamu, kunci(), { aksi: 'berhenti' }, sesudah(hari(14) + menit(3)))
  assert.ok(k.numpang?.berakhir)
  k = await muat(sql, tamu, sesudah(hari(15) + menit(4)))
  assert.equal(k.numpang, null)
  assert.equal(k.hunian?.id, 'kost-melati')
})

uji('push: isi pengingat, jeda 20 jam, jam tenang, langganan mati dibuang', async () => {
  const id = await mulai(await baru())
  const w = await baris(id)
  assert.equal(isiPengingat(w, T0, 0, null)?.judul, 'Tenagamu sudah penuh')
  assert.equal(isiPengingat(w, T0, 1, null)?.judul, 'Hasil usahamu sudah menumpuk')
  assert.equal(isiPengingat({ ...w, perjalanan_tujuan: 'soloe' }, T0, 1, null), null)
  await sql`insert into push_langganan (endpoint, warga_id, p256dh, auth) values ('https://push.uji/1', ${id}, 'p', 'a')`
  const terkirim: string[] = []
  const palsu = async (s: { endpoint: string }, isi: string) => {
    terkirim.push(`${s.endpoint} ${JSON.parse(isi).judul}`)
  }
  assert.equal((await kirimPengingat(sql, T0, palsu)).terkirim >= 1, true)
  const n = terkirim.length
  await kirimPengingat(sql, sesudah(jam(1)), palsu)
  assert.equal(terkirim.length, n, 'tidak dikirim lagi sebelum 20 jam')
  assert.deepEqual(await kirimPengingat(sql, sesudah(jam(12)), palsu), { terkirim: 0, dibuang: 0, dilewati: 0 }) // 22.00 WIB
  const mati = async () => {
    throw Object.assign(new Error('gone'), { statusCode: 410 })
  }
  assert.ok((await kirimPengingat(sql, sesudah(jam(21)), mati)).dibuang >= 1) // 07.00 WIB besok
  assert.equal(await hitung(sql`select count(*)::int as n from push_langganan where warga_id = ${id}`), 0)
})

uji('koran: edisi tulisan Wali Kota dari basis data menggantikan edisi berkas bertanggal sama', async () => {
  assert.equal(galatEdisi({ tanggal: '2026-02-30', berita: [] }), 'Tanggal tidak valid (YYYY-MM-DD).')
  assert.match(galatEdisi({ tanggal: '2026-10-18', berita: [{ judul: 'x', isi: [''] }] }) ?? '', /isi/)
  assert.match(galatEdisi({ tanggal: '2026-10-18', berita: [{ judul: 'Judul', isi: ['a'], penulis: 'Orang Asing' }] }) ?? '', /NPC/)
  const e = { tanggal: tanggalWIB(T0), berita: [{ judul: 'Edisi uji dari meja redaksi', isi: ['Paragraf.'] }] }
  assert.equal(galatEdisi(e), null)
  await sql`insert into koran_edisi (tanggal, berita) values (${e.tanggal}, ${sql.json(e.berita)})`
  await segarkanKoran(sql, true)
  assert.equal(terbaru(T0)?.berita[0].judul, 'Edisi uji dari meja redaksi')
  await sql`delete from koran_edisi`
  await segarkanKoran(sql, true)
  assert.notEqual(terbaru(T0)?.berita[0].judul, 'Edisi uji dari meja redaksi')
})

uji('UMK: hanya Wali Kota, dalam rentang tren, sekali per 7 hari; gaji dan tagihan ikut UMK', async () => {
  const wk = await mulai(await baru())
  const warga = await mulai(await baru())
  await galat('bukan_walikota', tetapkanUmk(sql, warga, 2_600_000, null, T0))
  await sql`update warga set peran = 'walikota' where id = ${wk}`
  const info = await infoKota(sql, T0)
  assert.equal(info.umk, UMK_AWAL)
  await galat('umk_di_luar_rentang', tetapkanUmk(sql, wk, info.maks + 10_000, null, T0))
  await galat('umk_di_luar_rentang', tetapkanUmk(sql, wk, info.maks - 5_000, null, T0))
  const baru2 = await tetapkanUmk(sql, wk, info.maks, 'uji', T0)
  assert.equal(baru2.umk, info.maks)
  await galat('terlalu_sering', tetapkanUmk(sql, wk, info.min, null, sesudah(hari(6))))
  // gaji Tier 1 sama dengan UMK baru, tagihan naik 40% dari kenaikan UMK
  await ambilPekerjaan(sql, warga, kunci(), 'kuli-angkut', T0)
  const k = await kerja(sql, warga, kunci(), 1, T0)
  assert.equal(k.pekerjaan?.gajiBulan, Math.round(info.maks / 10_000) * 10_000)
  assert.equal(k.pekerjaan?.upahPerAksi, upahAksi(pekerjaanById('kuli-angkut')!, 1, 1, info.maks))
  assert.equal(k.tagihan?.sewa, rincianTagihan(hunianById('kost-melati')!, info.maks).sewa)
  assert.ok(k.tagihan!.sewa > 450_000)
  // kembalikan UMK agar uji lain tidak terpengaruh
  await sql`update kota set umk = ${UMK_AWAL}`
  await sql`delete from kebijakan_umk`
})

uji('barang: konsumsi menambah Tenaga paling banyak 3 kali sehari, koleksi tidak bisa dipakai', async () => {
  const id = await mulai(await baru())
  await suntik(id, 2_000_000, T0)
  await pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'kopi-tubruk', jumlah: 5 }, T0)
  await pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'wayang-kulit', jumlah: 1 }, T0)
  await galat('tenaga_penuh', pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, T0))
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  await kerja(sql, id, kunci(), 5, T0)
  let k = await pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, T0)
  assert.equal(k.tenaga.nilai, 55)
  assert.equal(k.gudang['kopi-tubruk'], 4)
  assert.equal(k.konsumsiSisa, 2)
  await pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, T0)
  await pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, T0)
  await galat('konsumsi_habis', pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, T0))
  await galat('bukan_konsumsi', pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'wayang-kulit' }, T0))
  await galat('barang_tidak_ada', pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'emas-batangan', jumlah: 1 }, T0))
  await kerja(sql, id, kunci(), 5, sesudah(jam(15)))
  k = await pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, sesudah(jam(15))) // tanggal WIB berikutnya
  assert.equal(k.konsumsiSisa, 2)
})

uji('alur pemain baru: daftar, pilih sekolah, kamar otomatis di gedung kosong, ambil kerja cocok sekolah, kerja', async () => {
  const id = await baru()
  let k = await muat(sql, id, T0)
  assert.equal(k.hunian, null)
  assert.equal(k.sekolah, null)
  await galat('sekolah_tidak_ada', pilihSekolah(sql, id, kunci(), 'smp', T0))
  k = await pilihSekolah(sql, id, kunci(), 'smk-otomotif', T0)
  assert.equal(k.sekolah?.id, 'smk-otomotif')
  await galat('sekolah_sudah', pilihSekolah(sql, id, kunci(), 'sma', T0))
  // montir Tier 2 (Keahlian 3) terbuka sejak awal untuk lulusan SMK Otomotif
  const montir = k.lowongan.find((l) => l.id === 'montir')!
  assert.equal(montir.cocok, true)
  assert.equal(montir.minKeahlian, 1)
  assert.equal(montir.boleh, true)
  await galat('belum_mulai', ambilPekerjaan(sql, id, kunci(), 'montir', T0))
  if (penempatan.some((p) => p.jenis === 'rusun-weton')) {
    k = await pilihHunian(sql, id, kunci(), 'rusun-weton', T0)
    assert.ok(k.hunian?.tempat?.startsWith('rusun-weton'))
  } else k = await pilihHunian(sql, id, kunci(), 'kost-melati', T0)
  k = await ambilPekerjaan(sql, id, kunci(), 'montir', T0)
  assert.equal(k.pekerjaan?.upahPerAksi, upahAksi(pekerjaanById('montir')!, 1, 1, UMK_AWAL, 'smk-otomotif'))
  assert.ok(k.pekerjaan!.upahPerAksi > upahAksi(pekerjaanById('montir')!, 1, 1))
  k = await kerja(sql, id, kunci(), 10, T0)
  assert.equal(k.kesehatan.nilai, 90)
  assert.equal(k.tenaga.nilai, 0)
})

uji('kesehatan: turun saat kerja, pulih 1 per 2 jam, sakit memperlambat Tenaga, RSUD dan jamu memulihkan', async () => {
  const id = await mulai(await baru())
  await suntik(id, 5_000_000, T0)
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  await sql`update warga set kesehatan = 35, kesehatan_pada = ${T0} where id = ${id}`
  let k = await kerja(sql, id, kunci(), 10, T0)
  assert.equal(k.kesehatan.nilai, 25)
  assert.equal(k.kesehatan.sakit, true)
  assert.equal(k.tenaga.selangMs, TENAGA_SELANG_MS * 2)
  k = await muat(sql, id, sesudah(jam(4) + menit(1)))
  assert.equal(k.kesehatan.nilai, 27)
  k = await pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'jamu-kunyit', jumlah: 1 }, sesudah(jam(4) + menit(2)))
  k = await pasar(sql, id, kunci(), { aksi: 'pakai', barang: 'jamu-kunyit' }, sesudah(jam(4) + menit(2)))
  assert.equal(k.kesehatan.nilai, 37)
  assert.equal(k.kesehatan.sakit, false)
  k = await berobat(sql, id, kunci(), sesudah(jam(4) + menit(3)))
  assert.equal(k.kesehatan.nilai, 100)
  assert.equal(k.tenaga.nilai, k.tenaga.maks)
})

uji('aksi_log: jawaban lebih tua dari 2 hari dibuang saat warga beraksi lagi, yang baru tetap idempoten', async () => {
  const id = await mulai(await baru())
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  const lama = kunci()
  await kerja(sql, id, lama, 1, T0)
  const baru1 = kunci()
  const a = await kerja(sql, id, baru1, 1, sesudah(hari(2) + jam(1)))
  const ada = (k: string) => hitung(sql<{ n: number }[]>`select count(*)::int as n from aksi_log where warga_id = ${id} and kunci = ${k}`)
  assert.equal(await ada(lama), 0)
  assert.equal(await ada(baru1), 1)
  // kunci yang masih disimpan tetap mengembalikan jawaban yang sama tanpa efek kedua
  const b = await kerja(sql, id, baru1, 1, sesudah(hari(2) + jam(2)))
  assert.deepEqual(b, a)
  // warga lain tidak tersentuh
  const lain = await mulai(await baru())
  await ambilPekerjaan(sql, lain, kunci(), 'kuli-angkut', T0)
  const kunciLain = kunci()
  await kerja(sql, lain, kunciLain, 1, T0)
  await kerja(sql, id, kunci(), 1, sesudah(hari(5)))
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*)::int as n from aksi_log where warga_id = ${lain} and kunci = ${kunciLain}`), 1)
  assert.equal(AKSI_LOG_SIMPAN_MS, 2 * HARI_MS)
})

// ---------------------------------------------------------------- kueri literal, penerbangan, dan inti transaksi

const teksNakal = [
  "O'Brien", "'; drop table warga; --", '\\', "\\'", "''", '\\\\\\', '$$', '$1', "E'x'", '\\u0041', 'baris\nbaru\r\n', '日本語 😀    ', '%_', '', ' ',
  "';select pg_sleep(30);--", 'x'.repeat(20_000),
]

uji('kueri: literal meng-escape teks, angka, tanggal, dan JSON; NUL dan tipe asing ditolak', async () => {
  const q = bungkus(sql)
  for (const t of teksNakal) assert.equal((await q<{ a: string }[]>`select ${t}::text as a`)[0].a, t)
  // acak dari abjad yang memusuhi escape: kutip, garis miring, dolar, titik koma, kontrol, unicode
  const abjad = ["'", '"', '\\', '$', ';', '-', '*', '\n', '\r', ' ', 'E', 'e', 'u', '0', '%', '(', '日', '😀', '\u2028', '\u0085', '\u001f']
  let benih = 12345
  const acak = (n: number) => (benih = (benih * 1103515245 + 12345) % 2 ** 31) % n
  const campur = Array.from({ length: 300 }, () => Array.from({ length: acak(40) }, () => abjad[acak(abjad.length)]).join(''))
  const balik = await Promise.all(campur.map((t) => q<{ a: string; j: { t: string } }[]>`select ${t}::text as a, ${q.json({ t })}::jsonb as j`))
  campur.forEach((t, i) => {
    assert.equal(balik[i][0].a, t)
    assert.equal(balik[i][0].j.t, t)
  })
  const d = new Date('2026-10-18T03:00:00.123Z')
  const json = { k: ["'", '\\', 1, null, true], 'x"y': { z: '  \\u0041' } }
  const [r] = await q<Record<string, unknown>[]>`
    select ${-5}::int as a, ${2 ** 40}::bigint as b, ${1.5}::numeric as c, ${true} as d, ${null}::text as e, ${d} as f, ${q.json(json)} as g, ${-0}::int as h, ${-(2 ** 40)}::bigint as i`
  assert.deepEqual({ ...r }, { a: -5, b: 2 ** 40, c: '1.5', d: true, e: null, f: d, g: json, h: 0, i: -(2 ** 40) })
  for (const salah of ['a\0b', NaN, Infinity, {}, [1], new Date('x'), Symbol('s'), () => 1]) assert.throws(() => literal(salah), TypeError)
  assert.deepEqual([literal(-5), literal(5), literal(10n), literal("it's"), literal('a\\b'), literal(undefined), literal(null), literal(false)], ["'-5'", "'5'", "'10'", "'it''s'", "E'a\\\\b'", 'null', 'null', 'false'])
  await assert.rejects(async () => { await q`select ${1.5}::int` }, /invalid input syntax/) // pecahan ke bilangan bulat tetap galat, tidak dibulatkan
  // teks yang menyerupai SQL tetap hanya data
  const n = () => sql<{ n: number }[]>`select count(*)::int as n from warga`
  const sebelum = (await n())[0].n
  await q`select ${"'; delete from warga; --"}::text`
  assert.equal((await n())[0].n, sebelum)
})

uji('kueri: nama pemain dengan kutip dan garis miring utuh lewat jawaban aksi dan aksi_log', async () => {
  const nama = `O'Brien \\ "x" ';--`
  const id = await mulai(await daftar(sql, { email: email(), nama, sandi: 'rahasia123' }, T0))
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  const k1 = kunci()
  const a = await kerja(sql, id, k1, 1, T0)
  assert.equal(a.warga.nama, nama)
  assert.deepEqual(await kerja(sql, id, k1, 1, sesudah(menit(1))), a)
  assert.equal((await baris(id)).nama, nama)
})

uji('kueri: tulis tertunda dikirim berurutan sebelum kueri berikutnya, dan galatnya membatalkan transaksi', async () => {
  const id = await baru()
  const c = await sql.reserve()
  try {
    const tx = bungkus(c)
    await tx.mentah('begin')
    tx.tulis`update warga set nama = ${'Satu'} where id = ${id}`
    tx.tulis`update warga set nama = nama || ${"'dua\\"} where id = ${id}`
    assert.deepEqual([...tx.tabelDitulis], ['warga'])
    const [w] = await tx<{ nama: string }[]>`select nama from warga where id = ${id}`
    assert.equal(w.nama, "Satu'dua\\")
    // beberapa kueri yang di-await bersamaan satu penerbangan, hasil masing-masing utuh
    const [tulis, baca] = await Promise.all([tx`update warga set kas = kas where id = ${id}`, tx<{ n: number }[]>`select count(*)::int as n from warga where id = ${id}`])
    assert.equal(tulis.count, 1)
    assert.equal(baca[0].n, 1)
    tx.tulis`update warga set nama = ${'Tiga'} where id = ${id}`
    tx.tulis`update warga set kas = -1 where id = ${id}`
    await assert.rejects(async () => { await tx<{ n: number }[]>`select 1 as n` }, /check|violates/i)
    await c.unsafe('rollback')
    tx.tulis`with x as (select 1) update lapak set sisa = sisa where false`
    tx.tulis`insert into ledger (warga_id) values (${id})`
    assert.deepEqual([...tx.tabelDitulis].sort(), ['*', 'ledger', 'warga'])
  } finally {
    c.release()
  }
  assert.equal((await baris(id)).nama, 'Uji')
})

uji('aksi: jawaban tiap aksi sama dengan muat sesudahnya, juga saat aksi menulis tabel milik', async () => {
  const id = await mulai(await baru())
  const tamu = await mulai(await baru())
  const sama = async (nama: string, k: Keadaan, t = T0, w = id) => assert.deepEqual(k, await muat(sql, w, t), nama)
  await suntik(id, 60_000_000, T0)
  await suntik(tamu, 5_000_000, T0)
  await sama('pekerjaan', await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0))
  await sama('kerja', await kerja(sql, id, kunci(), 2, T0))
  await sama('bonus', await klaimBonus(sql, id, kunci(), T0))
  await sama('tabungan', await tabungan(sql, id, kunci(), 'setor', 1_000_000, T0))
  const perahu = await usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'perahu' }, T0)
  await sama('buka perahu', perahu)
  await sama('buka warung', await usaha(sql, id, kunci(), { aksi: 'buka', jenis: 'warung' }, T0))
  await sama('beli ikan', await pasar(sql, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 6 }, T0))
  await sama('pasang lapak', await pasar(sql, id, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 4, harga: 30_000 }, T0))
  await sama('upgrade', await usaha(sql, id, kunci(), { aksi: 'upgrade', usaha: perahu.usaha[0].id }, T0))
  await sql`insert into lahan_milik (lahan_id, warga_id, dibeli_pada, rumah) values (${`lahan-uji-${randomBytes(3).toString('hex')}`}, ${id}, ${T0}, true)`
  await sama('kamar tamu', await numpang(sql, id, kunci(), { aksi: 'atur', terima: true, uangDapur: 50_000 }, T0))
  await sama('minta numpang', await numpang(sql, tamu, kunci(), { aksi: 'minta', pemilik: id }, T0), T0, tamu)
  const minta = (await muat(sql, id, T0)).kamarTamu.penumpang[0]
  await sama('setujui', await numpang(sql, id, kunci(), { aksi: 'setujui', permintaan: minta.id }, T0))
  await sama('hasil usaha', await usaha(sql, id, kunci(), { aksi: 'ambil', usaha: perahu.usaha[0].id }, sesudah(jam(9))), sesudah(jam(9)))
  await sama('tutup lapak', await pasar(sql, id, kunci(), { aksi: 'tutup_lapak', lapak: (await muat(sql, id, sesudah(jam(9)))).lapak[0].id }, sesudah(jam(9))), sesudah(jam(9)))
  // dua siklus lewat: tagihan, numpang berpindah, uang dapur cair ke pemilik
  await sama('siklus penumpang', await muat(sql, tamu, sesudah(hari(14) + menit(1))), sesudah(hari(14) + menit(1)), tamu)
  await sama('siklus pemilik', await kursus(sql, id, kunci(), sesudah(hari(14) + menit(2))), sesudah(hari(14) + menit(2)))
})

uji('pasar: lapak yang habis terjual dicairkan dan dibuang saat penjual beraksi, tanpa kerja bila tidak ada yang tertahan', async () => {
  const jual = await mulai(await baru())
  const beli = await mulai(await baru())
  await pasar(sql, jual, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 8 }, T0)
  let k = await pasar(sql, jual, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 8, harga: 30_000 }, T0)
  const kasJual = k.kas
  await pasar(sql, beli, kunci(), { aksi: 'beli_lapak', lapak: k.lapak[0].id, jumlah: 8 }, T0)
  const ada = () => hitung(sql<{ n: number }[]>`select count(*)::int as n from lapak where penjual_id = ${jual}`)
  assert.equal(await ada(), 1)
  k = await muat(sql, jual, sesudah(menit(1)))
  assert.equal(k.lapak.length, 0)
  assert.equal(await ada(), 0)
  assert.equal(k.kas, kasJual + 240_000 - biayaLapak(240_000))
  const ledger = (await jenisLedger(jual)).filter((l) => l.jenis === 'jual_lapak' || l.jenis === 'biaya_lapak')
  assert.equal(ledger.length, 2)
  await muat(sql, jual, sesudah(menit(2))) // tidak ada lagi yang dicairkan
  assert.equal((await jenisLedger(jual)).filter((l) => l.jenis === 'jual_lapak').length, 1)
})

uji('konkurensi: kunci sama serentak diproses sekali, kunci berbeda berurutan, saldo dan ledger cocok', async () => {
  const id = await mulai(await baru())
  await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
  const [a, b, c] = [kunci(), kunci(), kunci()]
  const panggilan = [a, a, a, b, b, c, a, b]
  const hasil = await Promise.all(panggilan.map((k) => kerja(sql, id, k, 1, T0)))
  for (const [i, k] of panggilan.entries()) assert.deepEqual(hasil[i], hasil[panggilan.indexOf(k)])
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*)::int as n from ledger where warga_id = ${id} and jenis = 'upah'`), 3)
  const w = await baris(id)
  assert.equal(w.tenaga, 70)
  assert.equal(w.kas, MODAL_AWAL + upahKuli(3))
  // aksi berbeda jenis pada pemain yang sama, serentak: tiap efek tepat satu kali, uang tidak negatif
  await suntik(id, 2_000_000, T0)
  const campur = await Promise.allSettled([klaimBonus(sql, id, kunci(), T0), makanPadang(sql, id, kunci(), T0), tabungan(sql, id, kunci(), 'setor', 500_000, T0), kursus(sql, id, kunci(), T0), kerja(sql, id, kunci(), 2, T0)])
  for (const h of campur) if (h.status === 'rejected') assert.ok(h.reason instanceof Galat, String(h.reason))
  const akhir = await baris(id)
  const jumlah = await sql<{ kas: number; tabungan: number }[]>`select coalesce(sum(jumlah) filter (where akun = 'kas'), 0)::bigint as kas, coalesce(sum(jumlah) filter (where akun = 'tabungan'), 0)::bigint as tabungan from ledger where warga_id = ${id}`
  assert.equal(akhir.kas, jumlah[0].kas)
  assert.equal(akhir.tabungan, jumlah[0].tabungan)
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*)::int as n from ledger where warga_id = ${id} and jenis = 'bonus_harian' and kunci is not null`), 1)
})

uji('kolam max 1: aksi serentak dan galat tidak membuat deadlock atau meninggalkan transaksi terbuka', async () => {
  const satu = buatSql(url!, { max: 1, schema: skema })
  try {
    const id = await mulai(await baru())
    await ambilPekerjaan(sql, id, kunci(), 'kuli-angkut', T0)
    const lain = await baru() // belum memilih tempat tinggal: semua aksi ditolak
    const kerjaan = Promise.allSettled([
      kerja(satu, id, kunci(), 1, T0), kerja(satu, lain, kunci(), 1, T0), muat(satu, id, T0), kerja(satu, id, kunci(), 1, T0), kursus(satu, lain, kunci(), T0),
      kerja(satu, id, kunci(), 100, T0), muat(satu, lain, T0),
    ])
    const batas = new Promise<never>((_, tolak) => setTimeout(() => tolak(new Error('macet: kolam max 1 tidak selesai dalam 15 detik')), 15_000).unref())
    const hasil = await Promise.race([kerjaan, batas])
    assert.deepEqual(hasil.map((h) => h.status), ['fulfilled', 'rejected', 'fulfilled', 'fulfilled', 'rejected', 'rejected', 'fulfilled'])
    assert.equal((await baris(id)).tenaga, 80)
    // koneksi kembali ke kolam bersih: di luar transaksi, waktu transaksi sama dengan waktu pernyataan (protokol simple: satu pesan perintah)
    const [{ bersih }] = await bungkus(satu)<{ bersih: boolean }[]>`select now() = statement_timestamp() as bersih`
    assert.equal(bersih, true)
  } finally {
    await satu.end()
  }
})

uji('sesi: hasil positif di-cache sebentar, hapusSesi mencabut seketika; kedaluwarsa dan hasil negatif tidak di-cache', async () => {
  const id = await baru()
  const { token } = await buatSesi(sql, id, T0)
  assert.equal(await cariSesi(sql, token, T0), id)
  if (SESI_CACHE_MS > 0) {
    await sql`delete from sesi where warga_id = ${id}` // dicabut lewat jalan lain: instans ini masih mengingatnya, itulah pertukaran keamanannya
    assert.equal(await cariSesi(sql, token, T0), id)
    assert.equal(await cariSesi(sql, token, sesudah(hari(31))), null) // kedaluwarsa dicek tiap panggilan
  }
  const dua = (await buatSesi(sql, id, T0)).token
  assert.equal(await cariSesi(sql, dua, T0), id)
  await hapusSesi(sql, dua)
  assert.equal(await cariSesi(sql, dua, T0), null)
  const baruToken = `token-baru-${randomBytes(6).toString('hex')}`
  assert.equal(await cariSesi(sql, baruToken, T0), null)
  await sql`insert into sesi (token_hash, warga_id, dibuat_pada, kedaluwarsa) values (${sha256(baruToken)}, ${id}, ${T0}, ${sesudah(hari(30))})`
  assert.equal(await cariSesi(sql, baruToken, T0), id)
})

uji('koran: edisi basis data ikut penerbangan awal transaksi bila cache basi', async () => {
  const id = await mulai(await baru())
  const judul = 'Edisi uji penerbangan awal'
  await sql`insert into koran_edisi (tanggal, berita) values (${tanggalWIB(T0)}, ${sql.json([{ judul, isi: ['Paragraf.'] }])})`
  const asli = Date.now
  Date.now = () => asli() + 5 * 60_000
  try {
    assert.equal((await muat(sql, id, T0)).koran?.judul, judul)
  } finally {
    Date.now = asli
    await sql`delete from koran_edisi`
    await segarkanKoran(sql, true)
  }
})

uji('ledger tidak bisa diubah, kas tidak bisa negatif, hapus berantai boleh', async () => {
  const id = await baru()
  await assert.rejects(async () => { await sql`update ledger set jumlah = 1 where warga_id = ${id}` }, /ledger tidak boleh/)
  await assert.rejects(async () => { await sql`delete from ledger where warga_id = ${id}` }, /ledger tidak boleh/)
  await assert.rejects(async () => { await sql`update warga set kas = -1 where id = ${id}` }, /check|violates/i)
  await sql`delete from warga where id = ${id}`
  assert.equal(await hitung(sql<{ n: number }[]>`select count(*) as n from ledger where warga_id = ${id}`), 0)
})

uji('invarian: kas dan kasbon sama dengan jumlah ledger, dan saldo_setelah baris terakhir', async () => {
  const salah = await sql<{ id: string }[]>`
    select w.id from warga w
    left join lateral (select coalesce(sum(jumlah) filter (where akun = 'kas'), 0)::bigint as kas, coalesce(sum(jumlah) filter (where akun = 'kasbon'), 0)::bigint as kasbon, coalesce(sum(jumlah) filter (where akun = 'tabungan'), 0)::bigint as tabungan from ledger where warga_id = w.id) s on true
    where w.kas <> s.kas or w.kasbon <> s.kasbon or w.tabungan <> s.tabungan or w.kas < 0 or w.kasbon < 0`
  assert.deepEqual([...salah], [])
  const beda = await sql<{ warga_id: string }[]>`
    select l.warga_id from (select distinct on (warga_id, akun) warga_id, akun, saldo_setelah from ledger order by warga_id, akun, id desc) l
    join warga w on w.id = l.warga_id
    where (l.akun = 'kas' and l.saldo_setelah <> w.kas) or (l.akun = 'kasbon' and l.saldo_setelah <> w.kasbon)`
  assert.deepEqual([...beda], [])
})

// ---------------------------------------------------------------- jalankan

let gagal = 0
let jalan = 0
try {
  await jalankanMigrasi(sql, 'db/migrasi')
  // hadiah peringkat mingguan jatuh ke warga uji mana pun yang kebetulan teratas dan mencemari angka kas uji lain;
  // pekan yang "sudah ditutup" sampai jauh ke depan mematikannya untuk seluruh jalan uji
  await sql`update kota set minggu_peringkat = '9999-12-31' where id = 1`
  for (const u of daftarUji) {
    if (process.env.SARING && !u.nama.includes(process.env.SARING)) continue
    jalan++
    try {
      await u.fn()
      console.log(`  ok     ${u.nama}`)
    } catch (e) {
      gagal++
      console.log(`  GAGAL  ${u.nama}\n         ${(e as Error).message.split('\n').slice(0, 4).join('\n         ')}`)
      if (process.env.RINCI) console.log(e)
    }
  }
} finally {
  await sql.end()
  await admin.unsafe(`drop schema ${skema} cascade`)
  await admin.end()
}
console.log(gagal ? `\n${gagal} dari ${jalan} uji gagal` : `\nOK, ${jalan} uji lolos`)
process.exit(gagal ? 1 : 0)
