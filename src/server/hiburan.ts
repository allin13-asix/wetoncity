// Hiburan dan belanja: Rumah Judi Mujur (roulette Eropa), memancing di pantai, dan tiga minimarket.
// Semua dihitung di server: angka acak dari sumber kriptografis, waktu dari jam server, uang dan barang dalam satu transaksi.
import { randomInt } from 'node:crypto'
import { MEMANCING, ROULETTE, TOKO } from '../data/balans.ts'
import { BARANG, adalahBarang, tanggalWIB } from './aturan.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { acakAman, catat, dalamTransaksi, umkBerlaku, wajibMulai } from './game.ts'
import { namaBarang, tambahItem } from './inventori.ts'
import { catatAktivitas } from './kemajuan.ts'
import { bungkus } from './kueri.ts'
import {
  buatSesiPancing, cekTaruhan, hargaToko, hitungBelanja, kembaliTaruhan, nilaiTarikan, promoAktif, stokSekarang, taruhanMenang, tokoAda, warnaKantong,
} from './sistem-aturan.ts'
import type { Keadaan } from './tipe.ts'

// ---------------------------------------------------------------- 8. Rumah Judi Mujur: roulette Eropa

const acakKantong = () => randomInt(0, ROULETTE.kantong)

/**
 * Satu putaran roulette Eropa 37 kantong (0 sampai 36), RNG di server. Beberapa taruhan boleh dipasang sekaligus:
 * angka tunggal 35:1; merah/hitam, ganjil/genap, 1-18/19-36 1:1; lusin dan kolom 2:1. Angka 0 mengalahkan semua taruhan luar.
 * Taruhan dibayar di muka, kemenangan (taruhan + untung) dikembalikan; selisihnya satu baris ledger. Tiap putaran dicatat di
 * judi_putaran untuk audit. Hasil tersimpan per kunci idempotensi, jadi permintaan ulang tidak memutar lagi.
 */
export const putarRoulette = (sql: Sql, id: string, kunci: string, masukan: unknown, now = new Date(), acak: () => number = acakKantong) => {
  let hasil: Keadaan['roulette']
  return dalamTransaksi(sql, id, { kunci, aksi: 'roulette', now, tambahan: () => ({ roulette: hasil }) }, async (tx, w) => {
    wajibMulai(w)
    const daftar = cekTaruhan(masukan)
    const total = daftar.reduce((t, x) => t + x.jumlah, 0)
    if (w.kas < total) throw new Galat('uang_kurang', 'Uang tidak cukup untuk taruhan sebesar itu.', 409)
    if (w.tenaga < ROULETTE.tenaga) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${ROULETTE.tenaga}.`, 409)
    w.tenaga -= ROULETTE.tenaga

    const nomor = acak()
    if (!Number.isInteger(nomor) || nomor < 0 || nomor >= ROULETTE.kantong) throw new Error('RNG roulette menghasilkan angka di luar 0 sampai 36')
    const warna = warnaKantong(nomor)
    const rincian = daftar.map((t) => ({ jenis: t.jenis as string, nilai: t.nilai, jumlah: t.jumlah, menang: taruhanMenang(t, nomor), kembali: kembaliTaruhan(t, nomor) }))
    const kembali = rincian.reduce((t, r) => t + r.kembali, 0)
    const bersih = kembali - total
    if (bersih !== 0) {
      await catat(tx, w, { akun: 'kas', jenis: bersih > 0 ? 'judi_menang' : 'judi_kalah', jumlah: bersih, kunci, rincian: { nomor, warna, taruhan: total, kembali } }, now)
    }
    tx.tulis`
      insert into judi_putaran (warga_id, kunci, nomor, warna, taruhan, total_taruhan, total_kembali, dibuat_pada)
      values (${w.id}, ${kunci}, ${nomor}, ${warna}, ${tx.json(rincian)}, ${total}, ${kembali}, ${now})`
    catatAktivitas(tx, w, 'minigame', 1, now)
    hasil = { nomor, warna, taruhan: total, kembali, rincian }
  })
}

/** Panduan roulette (aturan, tabel payout, batas taruhan) dan 20 putaran terakhirmu. */
export async function panduanRoulette(sql: Sql, id: string) {
  const putaran = await bungkus(sql)<{ id: number; nomor: number; warna: string; total_taruhan: number; total_kembali: number; dibuat_pada: Date }[]>`
    select id, nomor, warna, total_taruhan, total_kembali, dibuat_pada from judi_putaran where warga_id = ${id} order by id desc limit 20`
  return {
    kantong: ROULETTE.kantong,
    merah: ROULETTE.merah,
    taruhanMin: ROULETTE.taruhanMin,
    taruhanMaks: ROULETTE.taruhanMaks,
    totalMaks: ROULETTE.totalMaks,
    taruhanPerPutaran: ROULETTE.taruhanPerPutaran,
    tenaga: ROULETTE.tenaga,
    aturan: [
      'Roda Eropa dengan 37 kantong bernomor 0 sampai 36. Angka diundi oleh server dengan pengacak kriptografis.',
      'Pasang beberapa taruhan sekaligus lalu putar. Taruhan dipotong lebih dulu; yang menang dikembalikan beserta untungnya.',
      'Angka 0 (hijau) mengalahkan semua taruhan luar: merah, hitam, ganjil, genap, 1-18, 19-36, lusin, dan kolom.',
      'Lusin 1 = 1-12, lusin 2 = 13-24, lusin 3 = 25-36. Kolom 1 = 1, 4, 7 ... 34; kolom 2 = 2, 5, 8 ... 35; kolom 3 = 3, 6, 9 ... 36.',
      'Keunggulan rumah 2,7% per taruhan dalam jangka panjang. Ini uang game, bukan uang sungguhan.',
    ],
    bayar: [
      { taruhan: 'Angka tunggal (0 sampai 36)', jenis: 'lurus', rasio: `${ROULETTE.bayar.lurus}:1` },
      { taruhan: 'Merah atau Hitam', jenis: 'merah', rasio: `${ROULETTE.bayar.merah}:1` },
      { taruhan: 'Ganjil atau Genap', jenis: 'ganjil', rasio: `${ROULETTE.bayar.ganjil}:1` },
      { taruhan: '1-18 (rendah) atau 19-36 (tinggi)', jenis: 'rendah', rasio: `${ROULETTE.bayar.rendah}:1` },
      { taruhan: 'Lusin (1-12, 13-24, 25-36)', jenis: 'lusin', rasio: `${ROULETTE.bayar.lusin}:1` },
      { taruhan: 'Kolom (tiga kolom meja)', jenis: 'kolom', rasio: `${ROULETTE.bayar.kolom}:1` },
    ],
    putaran: putaran.map((p) => ({ id: p.id, nomor: p.nomor, warna: p.warna, taruhan: p.total_taruhan, kembali: p.total_kembali, waktu: p.dibuat_pada.toISOString() })),
  }
}

// ---------------------------------------------------------------- 9. memancing

export type PerintahPancing = { aksi: 'lempar' | 'tarik' | 'batal' }

/**
 * Memancing: lempar kail (memakai Tenaga; server memilih ikan dari loot table berbobot, lama menunggu, dan zona sasaran),
 * tunggu ikan menggigit, lalu tarik dalam jendela waktu. Mini game timing dinilai di server dari waktu server saat tarik:
 * penanda berayun segitiga mulai dari saat ikan menggigit, dan harus ada di zona sasaran. Hasil masuk inventori (kelebihan ke mailbox).
 */
export const pancing = (sql: Sql, id: string, kunci: string, p: PerintahPancing, now = new Date(), acak: () => number = acakAman) => {
  let tangkapan: Keadaan['tangkapan']
  return dalamTransaksi(sql, id, { kunci, aksi: 'pancing', now, tambahan: () => ({ tangkapan }) }, async (tx, w) => {
    wajibMulai(w)
    if (p.aksi === 'lempar') {
      if (w.pancing && w.pancing.hangus > now.getTime()) throw new Galat('sudah_melempar', 'Kailmu masih di air. Tarik dulu atau batalkan.', 409)
      if (w.tenaga < MEMANCING.tenaga) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${MEMANCING.tenaga}, tersisa ${w.tenaga}.`, 409)
      w.tenaga -= MEMANCING.tenaga
      w.pancing = buatSesiPancing(now, acak)
      return
    }
    const s = w.pancing
    if (!s) throw new Galat('belum_melempar', 'Lempar kail dulu.', 409)
    w.pancing = null // sesi selesai apa pun hasilnya
    if (p.aksi === 'batal') return
    if (s.hangus <= now.getTime()) {
      tangkapan = { berhasil: false, nilai: 'terlambat' }
      return
    }
    const nilai = nilaiTarikan(s, now.getTime())
    if (nilai === 'terlalu_cepat' || nilai === 'terlambat' || nilai === 'meleset') {
      tangkapan = { berhasil: false, nilai: nilai === 'terlalu_cepat' ? 'meleset' : nilai }
    } else {
      const jumlah = 1 + (nilai === 'sempurna' && acak() < MEMANCING.bonusSempurna ? 1 : 0)
      await tambahItem(tx, w.id, s.barang, jumlah, { pengirim: 'Pantai Weton', judul: 'Hasil memancing', sumber: 'memancing' }, now)
      tangkapan = { berhasil: true, barang: s.barang, jumlah, kelangkaan: s.kelangkaan, nilai }
    }
    catatAktivitas(tx, w, 'minigame', 1, now)
  })
}

/** Aturan dan loot table memancing yang diumumkan (tanpa ikan sesi yang sedang berjalan). */
export function infoPancing() {
  const jumlah = MEMANCING.loot.reduce((t, l) => t + l.bobot, 0)
  return {
    tenaga: MEMANCING.tenaga,
    periodeMs: MEMANCING.periodeMs,
    jendelaMs: MEMANCING.jendelaMs,
    loot: MEMANCING.loot.map((l) => ({
      barang: l.barang, nama: namaBarang(l.barang), kelangkaan: l.kelangkaan, peluang: Math.round((l.bobot / jumlah) * 1000) / 10,
      nilai: adalahBarang(l.barang) ? BARANG[l.barang].dasar : 0,
    })),
  }
}

// ---------------------------------------------------------------- 10. tiga minimarket

/** Ketiga minimarket dengan harga, stok, dan promo hari ini, supaya harga bisa dibandingkan. */
export async function daftarToko(sql: Sql, now = new Date()) {
  const umk = await umkBerlaku(sql)
  const hari = tanggalWIB(now)
  const baris = await bungkus(sql)<{ toko: string; produk: string; stok: number; diperbarui_pada: Date }[]>`select toko, produk, stok, diperbarui_pada from toko_stok`
  const stok = new Map(baris.map((b) => [`${b.toko}|${b.produk}`, { stok: b.stok, pada: b.diperbarui_pada }]))
  return Object.entries(TOKO.toko).map(([id, t]) => ({
    id,
    nama: t.nama,
    stokMaks: t.stokMaks,
    produk: Object.keys(t.harga).map((p) => {
      const harga = hargaToko(id, p, umk)!
      const promo = promoAktif(id, p, hari)
      return {
        id: p,
        nama: namaBarang(p),
        harga,
        stok: stokSekarang(id, stok.get(`${id}|${p}`) ?? null, now).stok,
        hargaPromo: hitungBelanja(harga, 1, promo).total,
        promo: promo.map((x) => ({ id: x.id, label: x.label, jenis: x.jenis })),
      }
    }),
    promo: TOKO.promo.filter((x) => x.toko === id).map((x) => ({ id: x.id, label: x.label, produk: x.produk, dari: x.dari, sampai: x.sampai, hari: x.hari ?? null, aktif: promoAktif(id, x.produk === '*' ? Object.keys(t.harga)[0] : x.produk, hari).some((y) => y.id === x.id) })),
  }))
}

/**
 * Beli di minimarket: stok toko berkurang, uang berkurang dengan promo terbaik yang aktif, dan barang masuk inventori
 * (kelebihan ke mailbox) dalam satu transaksi. Baris stok dikunci supaya dua pembeli tidak menjual barang yang sama.
 */
export const beliToko = (sql: Sql, id: string, kunci: string, toko: string, produk: string, jumlah: number, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'toko', now }, async (tx, w) => {
    wajibMulai(w)
    if (!tokoAda(toko)) throw new Galat('toko_tidak_ada', 'Toko itu tidak ada.')
    const cfg = TOKO.toko[toko]
    if (!Object.hasOwn(cfg.harga, produk)) throw new Galat('produk_tidak_ada', `${cfg.nama} tidak menjual itu.`)
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > TOKO.beliMaks) throw new Galat('jumlah_tidak_valid', `Jumlah 1 sampai ${TOKO.beliMaks}.`)
    const harga = hargaToko(toko, produk, w.umk)!
    await tx`insert into toko_stok (toko, produk, stok, diperbarui_pada) values (${toko}, ${produk}, ${cfg.stokAwal}, ${now}) on conflict (toko, produk) do nothing`
    const [baris] = await tx<{ stok: number; diperbarui_pada: Date }[]>`select stok, diperbarui_pada from toko_stok where toko = ${toko} and produk = ${produk} for update`
    const s = stokSekarang(toko, { stok: baris.stok, pada: baris.diperbarui_pada }, now)
    if (s.stok < jumlah) throw new Galat('stok_kurang', `Stok ${namaBarang(produk)} di ${cfg.nama} tinggal ${s.stok}.`, 409)
    const hit = hitungBelanja(harga, jumlah, promoAktif(toko, produk, tanggalWIB(now)))
    if (w.kas < hit.total) throw new Galat('uang_kurang', 'Uang tidak cukup.', 409)
    if (hit.total > 0) {
      await catat(tx, w, { akun: 'kas', jenis: 'beli_toko', jumlah: -hit.total, kunci, rincian: { toko, produk, jumlah, harga, promo: hit.promo, hemat: hit.hemat } }, now)
    }
    tx.tulis`update toko_stok set stok = ${s.stok - jumlah}, diperbarui_pada = ${s.pada} where toko = ${toko} and produk = ${produk}`
    await tambahItem(tx, w.id, produk, jumlah, { pengirim: cfg.nama, judul: `Belanjaan dari ${cfg.nama}`, sumber: 'toko' }, now)
    catatAktivitas(tx, w, 'transaksi', 1, now)
  })
