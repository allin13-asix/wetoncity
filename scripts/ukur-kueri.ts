// Alat ukur round-trip basis data per fitur game. Jalankan: pnpm ukur -- --keluar=/tmp/ukur.json
// Skema sementara di DATABASE_URL_UJI diberi proksi TCP yang menunda tiap arah sebanyak RTT/2, jadi waktu dinding sebuah
// panggilan = RTT x jumlah round-trip berurutan; query yang dipipeline jatuh dalam satu potongan dan hanya membayar sekali.
// Proksi juga membaca pesan protokol Postgres untuk menghitung pernyataan SQL dan "gelombang" (round-trip berurutan) secara pasti.
// Opsi: --rtt=ms (60), --max=N (1, seperti Vercel), --ulang=N (3), --paralel=N (6), --saring=teks, --banding=berkas.json, --keluar=berkas.json
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { dirname } from 'node:path'
import { lahanKosong, penempatan } from '../src/data/tataletak.ts'
import { buatSesi, cariSesi, adalahWalikota, daftar, hapusSesi, masuk } from '../src/server/akun.ts'
import { UMK_AWAL } from '../src/data/ekonomi.ts'
import { SIKLUS_MS, TUJUAN, pitaLapak } from '../src/server/aturan.ts'
import { buatSql, type Sql } from '../src/server/db.ts'
import { Galat } from '../src/server/galat.ts'
import {
  ambilPekerjaan, bayarKasbon, berjudi, berobat, catat, daftarKamarTamu, daftarLahan, infoKota, kantorWalikota, kerja, klaimBonus, kuliah, kursus, lahan,
  makanPadang, muat, numpang, okupansi, papanPasar, pasar, pilihHunian, pilihSekolah, riwayat, rumahDiPeta, tabungan, terbang, tetapkanUmk, usaha,
} from '../src/server/game.ts'
import { segarkanKoran } from '../src/server/koran.ts'
import { jalankanMigrasi } from '../src/server/migrasi.ts'
import type { Warga } from '../src/server/tipe.ts'

// ---------------------------------------------------------------- opsi

const argumen = process.argv.slice(2).filter((a) => a !== '--')
function opsi(nama: string): string | undefined {
  for (let i = 0; i < argumen.length; i++) {
    if (argumen[i].startsWith(`--${nama}=`)) return argumen[i].slice(nama.length + 3)
    if (argumen[i] === `--${nama}` && argumen[i + 1] !== undefined) return argumen[i + 1]
  }
  return undefined
}
function angka(nama: string, bawaan: number, min: number): number {
  const n = Number(opsi(nama) ?? bawaan)
  if (!Number.isFinite(n) || n < min) {
    console.error(`--${nama} harus angka >= ${min}`)
    process.exit(2)
  }
  return n
}
const RTT = angka('rtt', 60, 0)
const MAX = Math.floor(angka('max', 1, 1))
const ULANG = Math.floor(angka('ulang', 3, 1))
const PARALEL = Math.floor(angka('paralel', 6, 1))
const SARING = opsi('saring')
const KELUAR = opsi('keluar')
const BANDING = opsi('banding')

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const url = process.env.DATABASE_URL_UJI
if (!url) {
  console.error('DATABASE_URL_UJI belum diisi (.env.local). Role dan database dibuat lewat db/siapkan.sql.')
  process.exit(1)
}

// ---------------------------------------------------------------- proksi penunda

type Hitungan = { gelombang: number; pernyataan: number; deskripsi: number }
type Proksi = { port: number; atur: () => void; baca: () => Hitungan; tutup: () => Promise<void> }

/**
 * Proksi TCP satu arah-ke-satu: tiap potongan data ditunda RTT/2 dengan urutan tetap. "Gelombang" = potongan dari klien yang
 * dikirim setelah ada jawaban server (satu round-trip berurutan); potongan beruntun tanpa jawaban di antaranya (pipeline) satu gelombang.
 * Pernyataan = pesan Parse atau Query dari klien. Deskripsi = pesan Flush: postgres.js (prepare: false) mengirimnya untuk tiap query
 * berparameter karena harus menanyakan tipe parameter dulu, dan itu menambah satu round-trip serta menghentikan pipeline.
 * SSL tidak dipakai (klien lokal), jadi tidak ada enkripsi yang perlu dibuka.
 */
function buatProksi(hulu: { host: string; port: number }, rtt: number): Promise<Proksi> {
  const tunda = Math.round(rtt / 2)
  // setTimeout dengan jeda sama berjalan berurutan, jadi urutan data terjaga
  const lambat = (fn: () => void) => (tunda > 0 ? void setTimeout(fn, tunda) : fn())
  const hitungan: Hitungan = { gelombang: 0, pernyataan: 0, deskripsi: 0 }
  const hidup = new Set<net.Socket>()

  const server = net.createServer({ allowHalfOpen: true }, (klien) => {
    const dst = net.connect({ host: hulu.host, port: hulu.port, allowHalfOpen: true })
    for (const s of [klien, dst]) {
      s.setNoDelay(true)
      hidup.add(s)
      s.on('close', () => hidup.delete(s))
    }
    let arah: 'klien' | 'server' | null = null
    let awal = true // pesan pembuka tidak punya byte jenis
    let sisa: Buffer = Buffer.alloc(0)

    const bacaPesan = (b: Buffer) => {
      sisa = sisa.length ? Buffer.concat([sisa, b]) : b
      for (;;) {
        if (awal) {
          if (sisa.length < 8) return
          const n = sisa.readInt32BE(0)
          if (sisa.length < n) return
          awal = sisa.readInt32BE(4) === 80877103 // SSLRequest disusul pesan pembuka sebenarnya
          sisa = sisa.subarray(n)
          continue
        }
        if (sisa.length < 5) return
        const n = sisa.readInt32BE(1)
        if (sisa.length < 1 + n) return
        const jenis = sisa[0]
        if (jenis === 0x50 || jenis === 0x51) hitungan.pernyataan++ // 'P' Parse, 'Q' Query
        else if (jenis === 0x48) hitungan.deskripsi++ // 'H' Flush
        sisa = sisa.subarray(1 + n)
      }
    }

    klien.on('data', (b: Buffer) => {
      if (arah !== 'klien') hitungan.gelombang++
      arah = 'klien'
      bacaPesan(b)
      lambat(() => dst.writable && dst.write(b))
    })
    dst.on('data', (b: Buffer) => {
      arah = 'server'
      lambat(() => klien.writable && klien.write(b))
    })
    klien.on('end', () => lambat(() => dst.end()))
    dst.on('end', () => lambat(() => klien.end()))
    klien.on('error', () => dst.destroy())
    dst.on('error', () => klien.destroy())
  })

  return new Promise((selesai, gagal) => {
    server.once('error', gagal)
    server.listen(0, '127.0.0.1', () => {
      selesai({
        port: (server.address() as net.AddressInfo).port,
        atur: () => {
          hitungan.gelombang = 0
          hitungan.pernyataan = 0
          hitungan.deskripsi = 0
        },
        baca: () => ({ ...hitungan }),
        tutup: () => {
          for (const s of hidup) s.destroy()
          return new Promise<void>((r) => server.close(() => r()))
        },
      })
    })
  })
}

// ---------------------------------------------------------------- skema sementara dan klien

const skema = `ukur_${randomBytes(4).toString('hex')}`
const dasar = new URL(url)
const hulu = { host: dasar.hostname, port: Number(dasar.port || 5432) }
const admin = buatSql(url, { max: 1 })
// klien langsung (tanpa tunda) untuk menyiapkan keadaan; yang diukur hanya lewat klien di belakang proksi
const sqlD = buatSql(url, { max: Math.max(10, PARALEL * 2), schema: skema })

type Pekerja = { proksi: Proksi; sqlP: Sql }
const pekerja: Pekerja[] = []

let sudahBersih = false
async function bersih() {
  if (sudahBersih) return
  sudahBersih = true
  for (const w of pekerja) {
    await w.sqlP.end({ timeout: 2 }).catch(() => {})
    await w.proksi.tutup().catch(() => {})
  }
  await sqlD.end({ timeout: 5 }).catch(() => {})
  await admin.unsafe(`drop schema if exists ${skema} cascade`).catch((e) => console.error('gagal membuang skema sementara', e))
  await admin.end({ timeout: 2 }).catch(() => {})
}
for (const sinyal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinyal, () => {
    void bersih().finally(() => process.exit(130))
  })
}

// ---------------------------------------------------------------- pembantu keadaan (sama dengan uji-server)

const T0 = new Date('2026-10-18T03:00:00Z') // 10.00 WIB
const menit = (n: number) => n * 60_000
const jam = (n: number) => n * 3_600_000
const sesudah = (ms: number) => new Date(T0.getTime() + ms)
const kunci = () => randomUUID()
let nomor = 0
const email = () => `u${++nomor}-${randomBytes(3).toString('hex')}@ukur.weton`

const baru = () => daftar(sqlD, { email: email(), nama: 'Uji', sandi: 'rahasia123' }, T0)
// langsung lewat SQL tanpa kamar tertentu, supaya warga uji tidak memenuhi kuota kamar
const mulai = async (id: string, h = 'kost-melati') => {
  await sqlD`update warga set hunian_id = ${h} where id = ${id}`
  return id
}

/** Menyuntik atau mengambil uang lewat ledger agar saldo tetap sama dengan jumlah ledger. */
const suntik = (id: string, jumlah: number) =>
  sqlD.begin(async (tx) => {
    const [w] = await tx<Warga[]>`select * from warga where id = ${id} for update`
    await catat(tx, w, { akun: 'kas', jenis: jumlah > 0 ? 'bonus_harian' : 'kursus', jumlah, rincian: { ukur: true } }, T0)
  })
const tambahKasbon = (id: string, jumlah: number) =>
  sqlD.begin(async (tx) => {
    const [w] = await tx<Warga[]>`select * from warga where id = ${id} for update`
    await catat(tx, w, { akun: 'kasbon', jenis: 'kasbon_baru', jumlah, rincian: { ukur: true } }, T0)
  })

const baruMulai = async () => mulai(await baru())
const pekerjaKuli = async () => {
  const id = await baruMulai()
  await ambilPekerjaan(sqlD, id, kunci(), 'kuli-angkut', T0)
  return id
}
const hargaIkan = () => pitaLapak('ikan')[0]
/** Warga yang sudah punya usaha, gudang, lapak, dan rumah: semua tabel milikWarga berisi. */
async function mapan() {
  const id = await pekerjaKuli()
  await suntik(id, 30_000_000)
  await usaha(sqlD, id, kunci(), { aksi: 'buka', jenis: 'perahu' }, T0)
  await usaha(sqlD, id, kunci(), { aksi: 'buka', jenis: 'warung' }, T0)
  await pasar(sqlD, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 10 }, T0)
  await pasar(sqlD, id, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 4, harga: hargaIkan() }, T0)
  await rumahBaru(id)
  return id
}
const rumahBaru = (id: string) =>
  sqlD`insert into lahan_milik (lahan_id, warga_id, dibeli_pada, rumah) values (${`lahan-ukur-${randomBytes(3).toString('hex')}`}, ${id}, ${T0}, true)`
async function pemilikRumah(terima = true) {
  const id = await baruMulai()
  await suntik(id, 5_000_000)
  await rumahBaru(id)
  if (terima) await numpang(sqlD, id, kunci(), { aksi: 'atur', terima: true, uangDapur: 50_000 }, T0)
  return id
}
async function walikota() {
  const id = await baruMulai()
  await sqlD`update warga set peran = 'walikota' where id = ${id}`
  return id
}
/** Penjual dengan lapak ikan terbuka. */
async function penjualLapak() {
  const id = await pekerjaKuli()
  await pasar(sqlD, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 10 }, T0)
  const k = await pasar(sqlD, id, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 8, harga: hargaIkan() }, T0)
  return { id, lapak: k.lapak[0].id }
}
async function wargaKerjaSebagian(aksi: number) {
  const id = await pekerjaKuli()
  await kerja(sqlD, id, kunci(), aksi, T0)
  return id
}

// ---------------------------------------------------------------- daftar skenario

type Kelompok = 'akun' | 'keadaan' | 'aksi' | 'baca'
type Skenario = {
  nama: string
  kelompok: Kelompok
  /** berjalan sendirian setelah yang lain selesai: menyentuh kunci bersama, tabel kota, atau mengukur waktu CPU (scrypt) */
  serial: boolean
  siapkan: () => Promise<unknown>
  jalan: (konteks: any, p: Sql) => Promise<unknown>
  /** kode Galat yang diharapkan: mengukur jalur penolakan */
  galat?: string
  bersihkan?: (konteks: any) => Promise<void>
}
const skenario: Skenario[] = []
const dilewati: string[] = []

function tambah<C>(
  nama: string, kelompok: Kelompok,
  d: { siapkan: () => Promise<C>; jalan: (c: C, p: Sql) => Promise<unknown>; serial?: boolean; galat?: string; bersihkan?: (c: C) => Promise<void> },
) {
  if (SARING && !nama.toLowerCase().includes(SARING.toLowerCase())) return
  skenario.push({ nama, kelompok, serial: false, ...d } as Skenario)
}
const tanpa = async () => null

// akun
tambah('daftar', 'akun', { serial: true, siapkan: tanpa, jalan: (_c, p) => daftar(p, { email: email(), nama: 'Uji', sandi: 'rahasia123' }, T0) })
tambah('masuk (berhasil)', 'akun', {
  serial: true,
  siapkan: async () => {
    const em = email()
    await daftar(sqlD, { email: em, nama: 'Uji', sandi: 'rahasia123' }, T0)
    return em
  },
  jalan: (em, p) => masuk(p, em, 'rahasia123', T0),
})
tambah('masuk (sandi salah)', 'akun', {
  serial: true,
  galat: 'masuk_gagal',
  siapkan: async () => {
    const em = email()
    await daftar(sqlD, { email: em, nama: 'Uji', sandi: 'rahasia123' }, T0)
    return em
  },
  jalan: (em, p) => masuk(p, em, 'salah-salah', T0),
})
tambah('buatSesi', 'akun', { siapkan: baru, jalan: (id, p) => buatSesi(p, id, T0) })
tambah('cariSesi', 'akun', {
  siapkan: async () => (await buatSesi(sqlD, await baru(), T0)).token,
  jalan: async (token, p) => assert.ok(await cariSesi(p, token, T0)),
})
tambah('adalahWalikota', 'akun', {
  siapkan: async () => (await buatSesi(sqlD, await walikota())).token,
  jalan: async (token, p) => assert.equal(await adalahWalikota(p, token), true),
})
tambah('hapusSesi', 'akun', { siapkan: async () => (await buatSesi(sqlD, await baru(), T0)).token, jalan: (token, p) => hapusSesi(p, token) })

// keadaan
tambah('muat (tanpa tagihan)', 'keadaan', { siapkan: mapan, jalan: (id, p) => muat(p, id, T0) })
tambah('muat (tagihan jatuh tempo)', 'keadaan', {
  siapkan: async () => {
    const id = await mapan()
    await tabungan(sqlD, id, kunci(), 'setor', 400_000, T0)
    await sqlD`update warga set upah_siklus = 6000000 where id = ${id}`
    return id
  },
  jalan: (id, p) => muat(p, id, sesudah(SIKLUS_MS)),
})
tambah('muat (dua siklus jadi kasbon)', 'keadaan', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await suntik(id, -950_000)
    return id
  },
  jalan: (id, p) => muat(p, id, sesudah(2 * SIKLUS_MS + 1000)),
})
tambah('muat (pulang dari perjalanan)', 'keadaan', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await suntik(id, 5_000_000)
    await terbang(sqlD, id, kunci(), 'culabaya', T0)
    return id
  },
  jalan: (id, p) => muat(p, id, sesudah(jam(TUJUAN.culabaya.jam) + menit(1))),
})

// aksi dasar
tambah('pilihSekolah', 'aksi', { siapkan: baru, jalan: (id, p) => pilihSekolah(p, id, kunci(), 'smk-otomotif', T0) })
const hunianKamar = penempatan.some((x) => x.jenis === 'rusun-weton') ? 'rusun-weton' : 'kost-melati'
tambah('pilihHunian (pertama, pilih kamar)', 'aksi', { serial: true, siapkan: baru, jalan: (id, p) => pilihHunian(p, id, kunci(), hunianKamar, T0) })
tambah('pilihHunian (pindah)', 'aksi', { serial: true, siapkan: baruMulai, jalan: (id, p) => pilihHunian(p, id, kunci(), 'kost-mawar', T0) })
tambah('ambilPekerjaan', 'aksi', { siapkan: baruMulai, jalan: (id, p) => ambilPekerjaan(p, id, kunci(), 'kuli-angkut', T0) })
tambah('kerja', 'aksi', { siapkan: mapan, jalan: (id, p) => kerja(p, id, kunci(), 1, T0) })
tambah('kerja (kunci diulang)', 'aksi', {
  siapkan: async () => {
    const id = await mapan()
    const k = kunci()
    await kerja(sqlD, id, k, 1, T0)
    return { id, k }
  },
  jalan: ({ id, k }, p) => kerja(p, id, k, 1, T0),
})
tambah('kerja (ditolak: tenaga_kurang)', 'aksi', { galat: 'tenaga_kurang', siapkan: () => wargaKerjaSebagian(10), jalan: (id, p) => kerja(p, id, kunci(), 1, T0) })
tambah('kursus', 'aksi', { siapkan: pekerjaKuli, jalan: (id, p) => kursus(p, id, kunci(), T0) })
tambah('klaimBonus', 'aksi', { siapkan: pekerjaKuli, jalan: (id, p) => klaimBonus(p, id, kunci(), T0) })
tambah('bayarKasbon', 'aksi', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await tambahKasbon(id, 500_000)
    return id
  },
  jalan: (id, p) => bayarKasbon(p, id, kunci(), 200_000, T0),
})
tambah('makanPadang', 'aksi', { siapkan: () => wargaKerjaSebagian(3), jalan: (id, p) => makanPadang(p, id, kunci(), T0) })
tambah('berjudi', 'aksi', { siapkan: pekerjaKuli, jalan: (id, p) => berjudi(p, id, kunci(), 100_000, T0, () => 0.1) })
tambah('terbang (soloe)', 'aksi', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await suntik(id, 5_000_000)
    return id
  },
  jalan: (id, p) => terbang(p, id, kunci(), 'soloe', T0),
})
tambah('berobat', 'aksi', { siapkan: () => wargaKerjaSebagian(5), jalan: (id, p) => berobat(p, id, kunci(), T0) })
tambah('tabungan (setor)', 'aksi', { siapkan: pekerjaKuli, jalan: (id, p) => tabungan(p, id, kunci(), 'setor', 400_000, T0) })
tambah('tabungan (tarik)', 'aksi', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await tabungan(sqlD, id, kunci(), 'setor', 400_000, T0)
    return id
  },
  jalan: (id, p) => tabungan(p, id, kunci(), 'tarik', 100_000, T0),
})

// kuliah
const kuliahDaftar = async () => {
  const id = await pekerjaKuli()
  await suntik(id, 20_000_000)
  return id
}
tambah('kuliah (daftar)', 'aksi', { siapkan: kuliahDaftar, jalan: (id, p) => kuliah(p, id, kunci(), { aksi: 'daftar', jurusan: 'd3-keperawatan' }, T0) })
tambah('kuliah (ukt)', 'aksi', {
  siapkan: async () => {
    const id = await kuliahDaftar()
    await kuliah(sqlD, id, kunci(), { aksi: 'daftar', jurusan: 'd3-keperawatan' }, T0)
    return id
  },
  jalan: (id, p) => kuliah(p, id, kunci(), { aksi: 'ukt' }, T0),
})
tambah('kuliah (sesi)', 'aksi', {
  siapkan: async () => {
    const id = await kuliahDaftar()
    await kuliah(sqlD, id, kunci(), { aksi: 'daftar', jurusan: 'd3-keperawatan' }, T0)
    await kuliah(sqlD, id, kunci(), { aksi: 'ukt' }, T0)
    return id
  },
  jalan: (id, p) => kuliah(p, id, kunci(), { aksi: 'sesi' }, T0),
})

// usaha
const usahaBaru = async (jenis: 'perahu' | 'warung') => {
  const id = await pekerjaKuli()
  await suntik(id, 20_000_000)
  const k = await usaha(sqlD, id, kunci(), { aksi: 'buka', jenis }, T0)
  return { id, uid: k.usaha[0].id }
}
tambah('usaha (buka)', 'aksi', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await suntik(id, 20_000_000)
    return id
  },
  jalan: (id, p) => usaha(p, id, kunci(), { aksi: 'buka', jenis: 'perahu' }, T0),
})
// satu siklus saja: perahu kadang menemukan mutiara per siklus, jadi makin banyak siklus makin acak jumlah queriesnya
tambah('usaha (ambil hasil, perahu)', 'aksi', { siapkan: () => usahaBaru('perahu'), jalan: ({ id, uid }, p) => usaha(p, id, kunci(), { aksi: 'ambil', usaha: uid }, sesudah(jam(5))) })
tambah('usaha (ambil ikan ke gudang)', 'aksi', { siapkan: () => usahaBaru('perahu'), jalan: ({ id, uid }, p) => usaha(p, id, kunci(), { aksi: 'ambil', usaha: uid, ke: 'gudang' }, sesudah(jam(5))) })
tambah('usaha (ambil hasil, warung dengan bahan gudang)', 'aksi', {
  siapkan: async () => {
    const u = await usahaBaru('warung')
    await pasar(sqlD, u.id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 2 }, T0)
    await pasar(sqlD, u.id, kunci(), { aksi: 'beli_npc', barang: 'beras', jumlah: 5 }, T0)
    return u
  },
  jalan: ({ id, uid }, p) => usaha(p, id, kunci(), { aksi: 'ambil', usaha: uid }, sesudah(jam(12))),
})
tambah('usaha (naik level)', 'aksi', { siapkan: () => usahaBaru('perahu'), jalan: ({ id, uid }, p) => usaha(p, id, kunci(), { aksi: 'upgrade', usaha: uid }, T0) })

// lahan: petak sungguhan dilepas lagi setelah tiap jalan supaya skenario bisa diulang
if (lahanKosong.length >= 2) {
  const [petakBeli, petakRumah] = lahanKosong
  const lepas = (id: string) => sqlD`delete from lahan_milik where lahan_id = ${id}`.then(() => {})
  tambah('lahan (beli)', 'aksi', {
    serial: true,
    siapkan: async () => {
      const id = await pekerjaKuli()
      await suntik(id, 30_000_000)
      return id
    },
    jalan: (id, p) => lahan(p, id, kunci(), 'beli', petakBeli.id, T0),
    bersihkan: () => lepas(petakBeli.id),
  })
  tambah('lahan (rumah)', 'aksi', {
    serial: true,
    siapkan: async () => {
      const id = await pekerjaKuli()
      await suntik(id, 50_000_000)
      await lahan(sqlD, id, kunci(), 'beli', petakRumah.id, T0)
      return id
    },
    jalan: (id, p) => lahan(p, id, kunci(), 'rumah', petakRumah.id, T0),
    bersihkan: () => lepas(petakRumah.id),
  })
} else {
  dilewati.push('lahan (beli), lahan (rumah): tata letak aktif punya kurang dari 2 lahan kosong')
}

// pasar
tambah('pasar (beli dari NPC)', 'aksi', { siapkan: pekerjaKuli, jalan: (id, p) => pasar(p, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 10 }, T0) })
tambah('pasar (jual ke NPC)', 'aksi', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await pasar(sqlD, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 10 }, T0)
    return id
  },
  jalan: (id, p) => pasar(p, id, kunci(), { aksi: 'jual_npc', barang: 'ikan', jumlah: 4 }, T0),
})
tambah('pasar (pasang lapak)', 'aksi', {
  siapkan: async () => {
    const id = await pekerjaKuli()
    await pasar(sqlD, id, kunci(), { aksi: 'beli_npc', barang: 'ikan', jumlah: 10 }, T0)
    return id
  },
  jalan: (id, p) => pasar(p, id, kunci(), { aksi: 'buka_lapak', barang: 'ikan', jumlah: 8, harga: hargaIkan() }, T0),
})
tambah('pasar (beli dari lapak)', 'aksi', {
  siapkan: async () => ({ ...(await penjualLapak()), pembeli: await baruMulai() }),
  jalan: ({ lapak, pembeli }, p) => pasar(p, pembeli, kunci(), { aksi: 'beli_lapak', lapak, jumlah: 3 }, T0),
})
tambah('pasar (tutup lapak, uang cair)', 'aksi', {
  siapkan: async () => {
    const j = await penjualLapak()
    await pasar(sqlD, await baruMulai(), kunci(), { aksi: 'beli_lapak', lapak: j.lapak, jumlah: 3 }, T0)
    return j
  },
  jalan: ({ id, lapak }, p) => pasar(p, id, kunci(), { aksi: 'tutup_lapak', lapak }, sesudah(menit(2))),
})
tambah('pasar (pakai konsumsi)', 'aksi', {
  siapkan: async () => {
    const id = await wargaKerjaSebagian(5)
    await pasar(sqlD, id, kunci(), { aksi: 'beli_npc', barang: 'kopi-tubruk', jumlah: 2 }, T0)
    return id
  },
  jalan: (id, p) => pasar(p, id, kunci(), { aksi: 'pakai', barang: 'kopi-tubruk' }, T0),
})

// numpang
const mintaNumpang = async () => {
  const pemilik = await pemilikRumah()
  const tamu = await baruMulai()
  await numpang(sqlD, tamu, kunci(), { aksi: 'minta', pemilik }, T0)
  const permintaan = (await muat(sqlD, pemilik, T0)).kamarTamu.penumpang[0].id
  return { pemilik, tamu, permintaan }
}
tambah('numpang (atur kamar tamu)', 'aksi', { siapkan: () => pemilikRumah(false), jalan: (id, p) => numpang(p, id, kunci(), { aksi: 'atur', terima: true, uangDapur: 50_000 }, T0) })
tambah('numpang (minta)', 'aksi', {
  siapkan: async () => ({ pemilik: await pemilikRumah(), tamu: await baruMulai() }),
  jalan: ({ pemilik, tamu }, p) => numpang(p, tamu, kunci(), { aksi: 'minta', pemilik }, T0),
})
tambah('numpang (setujui)', 'aksi', { siapkan: mintaNumpang, jalan: ({ pemilik, permintaan }, p) => numpang(p, pemilik, kunci(), { aksi: 'setujui', permintaan }, T0) })
tambah('numpang (tolak)', 'aksi', { siapkan: mintaNumpang, jalan: ({ pemilik, permintaan }, p) => numpang(p, pemilik, kunci(), { aksi: 'tolak', permintaan }, T0) })
tambah('numpang (berhenti)', 'aksi', {
  siapkan: async () => {
    const m = await mintaNumpang()
    await numpang(sqlD, m.pemilik, kunci(), { aksi: 'setujui', permintaan: m.permintaan }, T0)
    return m
  },
  jalan: ({ tamu }, p) => numpang(p, tamu, kunci(), { aksi: 'berhenti' }, sesudah(menit(3))),
})

// Wali Kota
tambah('kantorWalikota (dana)', 'aksi', { siapkan: walikota, jalan: (id, p) => kantorWalikota(p, id, kunci(), { aksi: 'uang', jumlah: 500_000_000 }, T0) })
tambah('kantorWalikota (Tenaga penuh)', 'aksi', { siapkan: walikota, jalan: (id, p) => kantorWalikota(p, id, kunci(), { aksi: 'tenaga' }, T0) })
tambah('kantorWalikota (Keahlian)', 'aksi', { siapkan: walikota, jalan: (id, p) => kantorWalikota(p, id, kunci(), { aksi: 'keahlian', nilai: 10 }, T0) })
tambah('tetapkanUmk', 'aksi', {
  serial: true,
  siapkan: async () => ({ id: await walikota(), maks: (await infoKota(sqlD, T0)).maks }),
  jalan: ({ id, maks }, p) => tetapkanUmk(p, id, maks, 'ukur', T0),
  bersihkan: async () => {
    await sqlD`update kota set umk = ${UMK_AWAL}`
    await sqlD`delete from kebijakan_umk`
  },
})

// baca
tambah('infoKota', 'baca', { siapkan: tanpa, jalan: (_c, p) => infoKota(p, T0) })
tambah('riwayat', 'baca', { siapkan: () => wargaKerjaSebagian(5), jalan: (id, p) => riwayat(p, id) })
tambah('papanPasar', 'baca', { siapkan: baruMulai, jalan: (id, p) => papanPasar(p, id, T0) })
tambah('daftarLahan', 'baca', { siapkan: baruMulai, jalan: (id, p) => daftarLahan(p, id) })
tambah('daftarKamarTamu', 'baca', { siapkan: baruMulai, jalan: (id, p) => daftarKamarTamu(p, id) })
tambah('rumahDiPeta', 'baca', { siapkan: tanpa, jalan: (_c, p) => rumahDiPeta(p) })
tambah('okupansi', 'baca', { siapkan: tanpa, jalan: (_c, p) => okupansi(p) })
tambah('segarkanKoran (paksa)', 'baca', { siapkan: tanpa, jalan: (_c, p) => segarkanKoran(p, true) })

// ---------------------------------------------------------------- pengukuran

type Jalan = { ms: number; roundTrip: number; pernyataan: number; deskripsi: number }
type Hasil = {
  nama: string
  kelompok: Kelompok
  roundTrip: number | null
  pernyataan: number | null
  /** query berparameter: tiap satu memakai round-trip tambahan untuk describe dan tidak bisa dipipeline */
  deskripsi: number | null
  ms: number | null
  /** perkiraan dari waktu dinding: ms / RTT; ikut menghitung kerja CPU lokal (mis. scrypt) */
  rtWaktu: number | null
  jalan: Jalan[]
  galat: string | null
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)]

async function ukur(s: Skenario, w: Pekerja): Promise<Hasil> {
  const jalan: Jalan[] = []
  const hasil: Hasil = { nama: s.nama, kelompok: s.kelompok, roundTrip: null, pernyataan: null, deskripsi: null, ms: null, rtWaktu: null, jalan, galat: null }
  try {
    for (let i = 0; i < ULANG; i++) {
      const konteks = await s.siapkan()
      try {
        // koran segar supaya penyegaran 30 detik tidak ikut terhitung; barisnya sendiri diukur di skenario segarkanKoran
        await segarkanKoran(sqlD, true)
        await w.sqlP`select 1` // membuka atau menghangatkan koneksi di belakang proksi
        w.proksi.atur()
        const t0 = performance.now()
        let galatDapat: unknown = null
        try {
          await s.jalan(konteks, w.sqlP)
        } catch (e) {
          galatDapat = e
        }
        const ms = performance.now() - t0
        const h = w.proksi.baca()
        if (s.galat) assert.ok(galatDapat instanceof Galat && galatDapat.kode === s.galat, `seharusnya gagal dengan kode ${s.galat}, dapat: ${String(galatDapat)}`)
        else if (galatDapat) throw galatDapat
        jalan.push({ ms, roundTrip: h.gelombang, pernyataan: h.pernyataan, deskripsi: h.deskripsi })
      } finally {
        await s.bersihkan?.(konteks)
      }
    }
    hasil.roundTrip = median(jalan.map((j) => j.roundTrip))
    hasil.pernyataan = median(jalan.map((j) => j.pernyataan))
    hasil.deskripsi = median(jalan.map((j) => j.deskripsi))
    hasil.ms = Math.round(median(jalan.map((j) => j.ms)))
    hasil.rtWaktu = RTT > 0 ? Math.round((hasil.ms / RTT) * 10) / 10 : null
  } catch (e) {
    hasil.galat = (e as Error).message.split('\n')[0]
  }
  return hasil
}

// ---------------------------------------------------------------- tampilan

type Berkas = { fitur: { nama: string; roundTrip: number | null; pernyataan: number | null }[] }
function bacaBanding(): Map<string, { roundTrip: number | null; pernyataan: number | null }> | null {
  if (!BANDING) return null
  try {
    const b = JSON.parse(readFileSync(BANDING, 'utf8')) as Berkas
    return new Map(b.fitur.map((f) => [f.nama, f]))
  } catch (e) {
    console.error(`--banding tidak bisa dibaca: ${(e as Error).message}`)
    return null
  }
}

function cetak(hasil: Hasil[], waktuTotal: number) {
  const banding = bacaBanding()
  const lebar = Math.max(...hasil.map((h) => h.nama.length), 5) + 2
  const kolom = (x: number | string | null, n: number) => String(x ?? '-').padStart(n)
  const awal = (h: Hasil) => banding?.get(h.nama)
  console.log(`\nRTT ${RTT} ms, pool max ${MAX}, ${ULANG} jalan per fitur (median), skema ${skema}`)
  console.log('RT = round-trip berurutan (dihitung di proksi); ~ms/RTT = waktu dinding / RTT (ikut kerja CPU lokal); SQL = pernyataan; DSC = query berparameter (masing-masing +1 RT)')
  console.log(`${'fitur'.padEnd(lebar)}${kolom('RT', 5)}${kolom('~ms/RTT', 9)}${kolom('SQL', 5)}${kolom('DSC', 5)}${kolom('ms', 7)}${banding ? kolom('RT awal', 9) + kolom('SQL awal', 10) : ''}`)
  let kelompok = ''
  for (const h of hasil) {
    if (h.kelompok !== kelompok) {
      kelompok = h.kelompok
      console.log(`-- ${kelompok}`)
    }
    if (h.galat) {
      console.log(`${h.nama.padEnd(lebar)}GAGAL: ${h.galat}`)
      continue
    }
    const a = awal(h)
    console.log(`${h.nama.padEnd(lebar)}${kolom(h.roundTrip, 5)}${kolom(h.rtWaktu, 9)}${kolom(h.pernyataan, 5)}${kolom(h.deskripsi, 5)}${kolom(h.ms, 7)}${banding ? kolom(a?.roundTrip ?? null, 9) + kolom(a?.pernyataan ?? null, 10) : ''}`)
  }
  const ok = hasil.filter((h) => !h.galat)
  const aksi = ok.filter((h) => h.kelompok === 'aksi').map((h) => h.roundTrip!)
  if (aksi.length) {
    console.log(`\naksi: ${aksi.length} fitur, RT median ${median(aksi)}, min ${Math.min(...aksi)}, maks ${Math.max(...aksi)}, jumlah ${aksi.reduce((t, n) => t + n, 0)}`)
  }
  console.log(`selesai dalam ${(waktuTotal / 1000).toFixed(1)} detik`)
}

// ---------------------------------------------------------------- jalankan

let kode = 0
try {
  if (!skenario.length) throw new Error(`tidak ada skenario yang cocok dengan --saring=${SARING}`)
  await admin.unsafe(`create schema ${skema}`)
  await jalankanMigrasi(sqlD, 'db/migrasi')
  for (let i = 0; i < PARALEL; i++) {
    const proksi = await buatProksi(hulu, RTT)
    const lewatProksi = new URL(url)
    lewatProksi.hostname = '127.0.0.1'
    lewatProksi.port = String(proksi.port)
    pekerja.push({ proksi, sqlP: buatSql(lewatProksi.toString(), { max: MAX, schema: skema }) })
  }
  // isi dunia secukupnya supaya kueri bacaan melihat data lintas warga
  for (let i = 0; i < 3; i++) await pemilikRumah()

  const mulaiPada = performance.now()
  const hasil: Hasil[] = new Array(skenario.length)
  let selesai = 0
  const catatKemajuan = () => {
    if (process.stderr.isTTY) process.stderr.write(`\r  ${++selesai}/${skenario.length}`)
  }
  const paralel = skenario.map((s, i) => ({ s, i })).filter((x) => !x.s.serial)
  let sel = 0
  await Promise.all(
    pekerja.map(async (w) => {
      for (;;) {
        const x = paralel[sel++]
        if (!x) return
        hasil[x.i] = await ukur(x.s, w)
        catatKemajuan()
      }
    }),
  )
  for (const [i, s] of skenario.entries()) {
    if (!s.serial) continue
    hasil[i] = await ukur(s, pekerja[0])
    catatKemajuan()
  }
  if (process.stderr.isTTY) process.stderr.write('\r')

  cetak(hasil, performance.now() - mulaiPada)
  for (const d of dilewati) console.log(`dilewati: ${d}`)
  const gagal = hasil.filter((h) => h.galat)
  if (gagal.length) {
    kode = 1
    console.log(`\n${gagal.length} fitur gagal diukur`)
  }
  if (KELUAR) {
    const ok = hasil.filter((h) => !h.galat)
    const aksi = ok.filter((h) => h.kelompok === 'aksi').map((h) => h.roundTrip!)
    mkdirSync(dirname(KELUAR), { recursive: true })
    writeFileSync(KELUAR, JSON.stringify({
      dibuat: new Date().toISOString(), rtt: RTT, max: MAX, ulang: ULANG, paralel: PARALEL,
      ringkasan: {
        fitur: hasil.length, gagal: gagal.length,
        aksi: aksi.length ? { jumlah: aksi.length, rtMedian: median(aksi), rtMin: Math.min(...aksi), rtMaks: Math.max(...aksi), rtTotal: aksi.reduce((t, n) => t + n, 0) } : null,
      },
      dilewati,
      fitur: hasil,
    }, null, 2))
    console.log(`JSON ditulis ke ${KELUAR}`)
  }
} catch (e) {
  console.error(process.env.RINCI ? e : (e as Error).message)
  kode = 1
} finally {
  await bersih()
}
process.exit(kode)
