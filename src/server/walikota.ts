// Alat super Wali Kota: bansos uang atau barang lewat mailbox, barang buatan sendiri dengan ikon 2D, dan pengumuman kota.
// Uang bansos dicetak kota (diklaim penerima sebagai hadiah_surat), bukan dipotong dari kas Wali Kota.
import { INVENTORI, OBROLAN, WALIKOTA_SUPER } from '../data/balans.ts'
import { adalahBentuk, NAMA_BENTUK, BENTUK } from '../data/bentuk.ts'
import { BARANG } from './aturan.ts'
import { lupakanKustom, muatKustom, barangDikenal } from './barangKustom.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { dalamTransaksi } from './game.ts'
import { namaBarang } from './inventori.ts'
import { bungkus, type Tx } from './kueri.ts'
import type { Warga } from './tipe.ts'
import { wajibUuid } from './sistem-aturan.ts'

const HARI = 86_400_000
const wajibWalikota = (w: Warga) => {
  if (w.peran !== 'walikota') throw new Galat('bukan_walikota', 'Hanya Wali Kota yang boleh memakai alat ini.', 403)
}

/** Ringkasan untuk halaman Kantor Wali Kota. */
export async function dataWalikota(sql: Sql, id: string, now = new Date()) {
  const q = bungkus(sql)
  const [[w], [jumlah], kustom, riwayat] = await Promise.all([
    q<{ peran: string }[]>`select peran from warga where id = ${id}`,
    q<{ semua: number; aktif: number }[]>`
      select count(*)::int as semua, count(*) filter (where terakhir_aktif > ${new Date(now.getTime() - WALIKOTA_SUPER.aktifHari * HARI)})::int as aktif
      from warga where peran = 'warga' and hunian_id is not null`,
    q<{ id: string; nama: string; jenis: string; dasar: number; satuan: string; ringkas: string; tenaga: number; kesehatan: number; lapar: number; bentuk: string; warna: string }[]>`
      select id, nama, jenis, dasar, satuan, ringkas, tenaga, kesehatan, lapar, bentuk, warna from barang_kustom order by dibuat_pada desc`,
    q<{ id: number; sasaran: string; item: string | null; jumlah: number; uang: number; penerima: number; pesan: string | null; dibuat_pada: Date }[]>`
      select id, sasaran, item, jumlah, uang, penerima, pesan, dibuat_pada from bansos order by id desc limit 15`,
  ])
  if (w?.peran !== 'walikota') throw new Galat('bukan_walikota', 'Hanya Wali Kota yang boleh membuka kantor ini.', 403)
  await muatKustom(q)
  return {
    warga: jumlah,
    batas: WALIKOTA_SUPER,
    bentuk: BENTUK.map((b) => ({ id: b, nama: NAMA_BENTUK[b] })),
    barang: [
      ...Object.entries(BARANG).map(([id, b]) => ({ id, nama: b.nama, jenis: b.jenis as string, kustom: false, ikon: null as { bentuk: string; warna: string } | null })),
      ...kustom.map((k) => ({ id: k.id, nama: k.nama, jenis: k.jenis, kustom: true, ikon: { bentuk: k.bentuk, warna: k.warna } })),
    ],
    kustom: kustom.map((k) => ({ ...k, dasar: Number(k.dasar) })),
    riwayat: riwayat.map((r) => ({
      id: Number(r.id), sasaran: r.sasaran, item: r.item ? namaBarang(r.item) : null, jumlah: r.jumlah, uang: Number(r.uang), penerima: r.penerima, pesan: r.pesan,
      waktu: r.dibuat_pada.toISOString(),
    })),
  }
}

export type PerintahSuper =
  | { aksi: 'bansos'; sasaran: 'aktif' | 'semua' | 'warga'; warga?: unknown; uang?: unknown; item?: unknown; jumlah?: unknown; pesan?: unknown }
  | { aksi: 'barang_baru'; nama: unknown; jenis: unknown; dasar: unknown; satuan: unknown; ringkas?: unknown; tenaga?: unknown; kesehatan?: unknown; lapar?: unknown; bentuk: unknown; warna: unknown }
  | { aksi: 'barang_hapus'; barang: unknown }
  | { aksi: 'pengumuman'; isi: unknown }

const bulat = (x: unknown, min: number, maks: number, nama: string) => {
  const n = Number(x ?? 0)
  if (!Number.isInteger(n) || n < min || n > maks) throw new Galat('masukan_tidak_valid', `${nama} harus bilangan bulat ${min.toLocaleString('id-ID')} sampai ${maks.toLocaleString('id-ID')}.`)
  return n
}
const teks = (x: unknown, min: number, maks: number, nama: string) => {
  const t = typeof x === 'string' ? x.replace(/[\u0000-\u001f<>]/g, '').trim() : ''
  if (t.length < min || t.length > maks) throw new Galat('masukan_tidak_valid', `${nama} ${min} sampai ${maks} karakter.`)
  return t
}

async function bansos(tx: Tx, w: Warga, p: Extract<PerintahSuper, { aksi: 'bansos' }>, now: Date): Promise<number> {
  const uang = bulat(p.uang, 0, WALIKOTA_SUPER.bansosUangMaks, 'Uang per warga')
  const item = p.item ? String(p.item) : null
  const jumlah = item ? bulat(p.jumlah, 1, WALIKOTA_SUPER.bansosBarangMaks, 'Jumlah barang per warga') : 0
  if (item && !(await barangDikenal(tx, item))) throw new Galat('barang_tidak_ada', 'Barang itu tidak dikenal.')
  if (uang === 0 && !item) throw new Galat('masukan_tidak_valid', 'Isi uang atau barang bansos.')
  const pesan = p.pesan ? teks(p.pesan, 0, 80, 'Pesan') : ''
  const judul = pesan || `Bansos dari Pemerintah Kota Weton`
  const sasaran = p.sasaran === 'warga' ? wajibUuid(p.warga, 'ID warga') : p.sasaran === 'semua' ? 'semua' : 'aktif'
  const batasAktif = new Date(now.getTime() - WALIKOTA_SUPER.aktifHari * HARI)
  // satu pernyataan untuk semua penerima; mailbox yang sudah penuh dilewati
  const masuk = await tx<{ warga_id: string }[]>`
    insert into surat (warga_id, pengirim, judul, item, jumlah, uang, sumber, dibuat_pada)
    select w.id, 'Pemerintah Kota Weton', ${judul}, ${item}, ${jumlah}, ${uang}, 'bansos', ${now} from warga w
    where w.peran = 'warga' and w.hunian_id is not null
      and (${sasaran} = 'semua' or (${sasaran} = 'aktif' and w.terakhir_aktif > ${batasAktif}) or w.id::text = ${sasaran})
      and (select count(*) from surat s where s.warga_id = w.id) < ${INVENTORI.suratMaks}
    returning warga_id`
  if (sasaran !== 'semua' && sasaran !== 'aktif' && masuk.length === 0) throw new Galat('warga_tidak_ada', 'Warga itu tidak ditemukan atau mailboxnya penuh.', 404)
  tx.tulis`
    insert into bansos (walikota_id, sasaran, item, jumlah, uang, penerima, pesan, dibuat_pada)
    values (${w.id}, ${sasaran}, ${item}, ${jumlah}, ${uang}, ${masuk.length}, ${pesan || null}, ${now})`
  return masuk.length
}

async function barangBaru(tx: Tx, w: Warga, p: Extract<PerintahSuper, { aksi: 'barang_baru' }>, now: Date) {
  const nama = teks(p.nama, 3, 40, 'Nama barang')
  const jenis = p.jenis === 'konsumsi' || p.jenis === 'koleksi' || p.jenis === 'bahan' ? p.jenis : null
  if (!jenis) throw new Galat('masukan_tidak_valid', 'Jenis barang: konsumsi, koleksi, atau bahan.')
  if (!adalahBentuk(p.bentuk)) throw new Galat('masukan_tidak_valid', 'Pilih bentuk ikon.')
  const warna = typeof p.warna === 'string' && /^#[0-9a-f]{6}$/i.test(p.warna) ? p.warna.toLowerCase() : null
  if (!warna) throw new Galat('masukan_tidak_valid', 'Warna ikon tidak valid.')
  const dasar = bulat(p.dasar, 100, 100_000_000, 'Harga dasar')
  const satuan = teks(p.satuan, 2, 12, 'Satuan')
  const ringkas = p.ringkas ? teks(p.ringkas, 0, 120, 'Keterangan') : ''
  const tenaga = jenis === 'konsumsi' ? bulat(p.tenaga, 0, 50, 'Tenaga') : 0
  const kesehatan = jenis === 'konsumsi' ? bulat(p.kesehatan, 0, 50, 'Kesehatan') : 0
  const lapar = jenis === 'konsumsi' ? bulat(p.lapar, 0, 60, 'Kenyang') : 0
  if (jenis === 'konsumsi' && tenaga + kesehatan + lapar === 0) throw new Galat('masukan_tidak_valid', 'Barang konsumsi harus menambah Tenaga, Kesehatan, atau kenyang.')
  const slug = nama.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'barang'
  const id = `k-${slug}`
  const [[n], [ada]] = await Promise.all([
    tx<{ n: number }[]>`select count(*)::int as n from barang_kustom`,
    tx<{ id: string }[]>`select id from barang_kustom where id = ${id}`,
  ])
  if (n.n >= WALIKOTA_SUPER.barangKustomMaks) throw new Galat('terlalu_banyak', `Paling banyak ${WALIKOTA_SUPER.barangKustomMaks} barang buatan.`, 409)
  if (ada) throw new Galat('barang_ada', 'Sudah ada barang dengan nama itu.', 409)
  tx.tulis`
    insert into barang_kustom (id, nama, jenis, dasar, satuan, ringkas, tenaga, kesehatan, lapar, bentuk, warna, dibuat_oleh, dibuat_pada)
    values (${id}, ${nama}, ${jenis}, ${dasar}, ${satuan}, ${ringkas}, ${tenaga}, ${kesehatan}, ${lapar}, ${p.bentuk}, ${warna}, ${w.id}, ${now})`
  lupakanKustom()
}

async function barangHapus(tx: Tx, p: Extract<PerintahSuper, { aksi: 'barang_hapus' }>) {
  const id = typeof p.barang === 'string' && p.barang.startsWith('k-') ? p.barang : null
  if (!id) throw new Galat('masukan_tidak_valid', 'Hanya barang buatan Wali Kota yang bisa dihapus.')
  // barang ditarik dari seluruh kota: inventori, lapak tidak dipakai barang kustom, surat berisi barang itu kehilangan barangnya
  tx.tulis`delete from gudang where barang = ${id}`
  tx.tulis`delete from surat where item = ${id} and uang = 0`
  tx.tulis`update surat set item = null, jumlah = 0 where item = ${id}`
  const hapus = await tx<{ id: string }[]>`delete from barang_kustom where id = ${id} returning id`
  if (!hapus.length) throw new Galat('barang_tidak_ada', 'Barang itu tidak ditemukan.', 404)
  lupakanKustom()
}

/** Satu aksi alat super. Penerima bansos dikembalikan di `walikota.penerima`. */
export const alatWalikota = (sql: Sql, id: string, kunci: string, p: PerintahSuper, now = new Date()) => {
  let penerima: number | undefined
  return dalamTransaksi(sql, id, { kunci, aksi: 'walikota', now, tambahan: () => ({ walikota: { penerima } }) }, async (tx, w) => {
    wajibWalikota(w)
    if (p.aksi === 'bansos') penerima = await bansos(tx, w, p, now)
    else if (p.aksi === 'barang_baru') await barangBaru(tx, w, p, now)
    else if (p.aksi === 'barang_hapus') await barangHapus(tx, p)
    else {
      const isi = teks(p.isi, 1, Math.min(WALIKOTA_SUPER.pengumumanMaks, OBROLAN.panjangMaks - 14), 'Pengumuman')
      tx.tulis`insert into obrolan (ruang, warga_id, isi, dibuat_pada) values ('global', ${w.id}, ${`[Pengumuman] ${isi}`}, ${now})`
    }
  })
}
