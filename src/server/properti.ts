// Properti: tiga jalur kepemilikan.
//  1. Lahan kosong awalnya milik kota dan dibeli di Balai Kota (game.ts: lahan 'beli').
//  2. Rumah milik NPC dibeli lewat dialog dengan NPC pemilik dengan harga tetap (aksi beli_npc).
//  3. Properti milik pemain dijual dengan harga patokan (beli_tetap) atau lewat negosiasi: penawaran, tawar-balik, terima,
//     tolak, atau kedaluwarsa. Perpindahan kepemilikan dan pembayaran terjadi dalam satu transaksi atomik (pindahMilik).
// Konstruksi bangunan ada di game.ts (lahan 'rumah' dan 'bangun'); progresnya dihitung dari waktu server.
import { BANGUN, PROPERTI } from '../data/balans.ts'
import { jenisById } from '../data/bangunan.ts'
import { npc as dataNpc } from '../data/npc.ts'
import { distrik, lahanKosong, penempatan } from '../data/tataletak.ts'
import { HUNIAN_PINDAHAN, LAHAN, hargaLahan } from './aturan.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { catat, dalamTransaksi, wajibMulai } from './game.ts'
import { catatAktivitas } from './kemajuan.ts'
import { bungkus, type Tx } from './kueri.ts'
import { progresBangun, tahapBangun, wajibUuid } from './sistem-aturan.ts'
import type { BarisLahan, Warga } from './tipe.ts'

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

type Tawaran = {
  id: string; lahan_id: string; penjual_id: string; pembeli_id: string; harga: number
  giliran: 'penjual' | 'pembeli'; status: string; babak: number; induk: string | null; dibuat_pada: Date; kedaluwarsa_pada: Date
}

// ---------------------------------------------------------------- properti NPC

/** Rumah NPC yang dijual: bangunan di peta dengan harga di PROPERTI.hargaNpc, tiap rumah milik satu NPC yang tinggal di sekitarnya. */
export const PROPERTI_NPC = penempatan
  .filter((p) => PROPERTI.hargaNpc[p.jenis] !== undefined)
  .map((p, urut) => {
    const cocok = dataNpc.filter((n) => n.tempatTinggal === p.distrik || n.tempatTinggal === p.jenis)
    const kumpulan = cocok.length ? cocok : dataNpc.filter((n) => n.interaktif)
    const n = kumpulan[urut % kumpulan.length]
    return {
      id: p.id, jenis: p.jenis, nama: jenisById.get(p.jenis)?.nama ?? p.jenis, distrik: distrik.find((d) => d.id === p.distrik)?.nama ?? p.distrik,
      harga: PROPERTI.hargaNpc[p.jenis], npc: { id: n.id, nama: n.nama, peran: n.peran },
    }
  })

// ---------------------------------------------------------------- pemindahan milik

/** Tutup tawaran yang tenggatnya lewat. */
function kedaluwarsakan(tx: Tx, now: Date): void {
  tx.tulis`update penawaran_properti set status = 'kedaluwarsa', selesai_pada = ${now} where status = 'terbuka' and kedaluwarsa_pada <= ${now}`
}

/** Penjual tidak punya rumah jadi lagi: akhiri numpang di rumahnya dan pindahkan dari "rumah sendiri". */
async function rapikanPenjual(tx: Tx, penjual: Warga, aktor: Warga, now: Date): Promise<void> {
  const [sisa] = await tx<{ n: number }[]>`select count(*)::int as n from lahan_milik where warga_id = ${penjual.id} and rumah`
  if (sisa.n > 0) return
  tx.tulis`update numpang set status = 'selesai', berakhir_pada = ${now} where pemilik_id = ${penjual.id} and status in ('minta', 'aktif')`
  if (penjual.id === aktor.id) {
    // baris aktor ditulis ulang oleh simpan(), jadi ubah di memori
    aktor.numpang_terima = false
    if (aktor.hunian_id === 'rumah-sendiri') { aktor.hunian_id = HUNIAN_PINDAHAN; aktor.hunian_tempat = null; aktor.hunian_kamar = null }
    if (aktor.hunian_berikut === 'rumah-sendiri') { aktor.hunian_berikut = null; aktor.hunian_tempat_berikut = null; aktor.hunian_kamar_berikut = null }
    return
  }
  tx.tulis`update warga set numpang_terima = false where id = ${penjual.id}`
  tx.tulis`update warga set hunian_id = ${HUNIAN_PINDAHAN}, hunian_tempat = null, hunian_kamar = null where id = ${penjual.id} and hunian_id = 'rumah-sendiri'`
  tx.tulis`update warga set hunian_berikut = null, hunian_tempat_berikut = null, hunian_kamar_berikut = null where id = ${penjual.id} and hunian_berikut = 'rumah-sendiri'`
}

/**
 * Satu transaksi: kepemilikan berpindah dari penjual ke pembeli, uang berpindah lewat ledger kedua pihak, dan semua tawaran
 * terbuka atas properti itu ditutup. Kedua baris warga sudah dikunci pemanggil. `aktor` adalah warga yang sedang beraksi.
 * Bila salah satu langkah gagal, seluruh transaksi dibatalkan.
 */
async function pindahMilik(tx: Tx, pembeli: Warga, penjual: Warga, aktor: Warga, m: BarisLahan, harga: number, kunci: string, now: Date): Promise<void> {
  const [r] = await tx<{ n: number }[]>`select count(*)::int as n from lahan_milik where warga_id = ${pembeli.id}`
  if (r.n >= LAHAN.maksMilik) throw new Galat('lahan_penuh', `Paling banyak ${LAHAN.maksMilik} properti per warga.`, 409)
  if (pembeli.kas < harga) throw new Galat('uang_kurang', 'Uang tidak cukup untuk membeli properti ini.', 409)
  const pindah = await tx`
    update lahan_milik set warga_id = ${pembeli.id}, dibeli_pada = ${now}, jual_mode = 'tidak', jual_harga = null
    where lahan_id = ${m.lahan_id} and warga_id = ${penjual.id}`
  if (pindah.count === 0) throw new Galat('sudah_berpindah', 'Properti itu sudah berpindah tangan.', 409)
  await catat(tx, pembeli, { akun: 'kas', jenis: 'beli_properti', jumlah: -harga, kunci, rincian: { properti: m.lahan_id, dari: penjual.id } }, now)
  await catat(tx, penjual, { akun: 'kas', jenis: 'jual_properti', jumlah: harga, rincian: { properti: m.lahan_id, kepada: pembeli.id } }, now)
  tx.tulis`update penawaran_properti set status = 'dibatalkan', selesai_pada = ${now} where lahan_id = ${m.lahan_id} and status = 'terbuka'`
  await rapikanPenjual(tx, penjual, aktor, now)
}

const cekHarga = (n: number) => {
  if (!Number.isInteger(n) || n < 1 || n > 10_000_000_000) throw new Galat('harga_tidak_valid', 'Harga harus bilangan bulat positif.')
}

/** Penawaran harus berada dalam pita patokan penjual. */
function cekPita(harga: number, patokan: number): void {
  cekHarga(harga)
  const min = Math.ceil(patokan * PROPERTI.tawarMinRasio)
  const maks = Math.floor(patokan * PROPERTI.tawarMaksRasio)
  if (harga < min || harga > maks) throw new Galat('tawaran_di_luar_pita', `Tawaran antara ${rupiah(min)} dan ${rupiah(maks)} (patokan penjual ${rupiah(patokan)}).`)
}

// ---------------------------------------------------------------- aksi

export type PerintahProperti =
  | { aksi: 'beli_npc'; properti: string }
  | { aksi: 'jual'; lahan: string; mode: 'tidak' | 'tetap' | 'negosiasi'; harga?: number }
  | { aksi: 'beli_tetap'; lahan: string }
  | { aksi: 'tawar'; lahan: string; harga: number }
  | { aksi: 'tawar_balik'; tawaran: string; harga: number }
  | { aksi: 'terima' | 'tolak'; tawaran: string }

const jumlahMilik = async (tx: Tx, id: string) => (await tx<{ n: number }[]>`select count(*)::int as n from lahan_milik where warga_id = ${id}`)[0].n

export const properti = (sql: Sql, id: string, kunci: string, p: PerintahProperti, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'properti', now }, async (tx, w) => {
    wajibMulai(w)
    kedaluwarsakan(tx, now)

    if (p.aksi === 'beli_npc') {
      const np = PROPERTI_NPC.find((x) => x.id === p.properti)
      if (!np) throw new Galat('properti_tidak_ada', 'Rumah itu tidak dijual NPC.')
      if ((await jumlahMilik(tx, w.id)) >= LAHAN.maksMilik) throw new Galat('lahan_penuh', `Paling banyak ${LAHAN.maksMilik} properti per warga.`, 409)
      if (w.kas < np.harga) throw new Galat('uang_kurang', 'Uang tidak cukup untuk membeli rumah ini.', 409)
      const masuk = await tx`
        insert into lahan_milik (lahan_id, warga_id, dibeli_pada, rumah, jenis_objek) values (${np.id}, ${w.id}, ${now}, true, 'bangunan')
        on conflict do nothing`
      if (masuk.count === 0) throw new Galat('sudah_terjual', 'Rumah itu sudah dibeli warga lain.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'beli_properti_npc', jumlah: -np.harga, kunci, rincian: { properti: np.id, npc: np.npc.id } }, now)
      catatAktivitas(tx, w, 'transaksi', 1, now)
      return
    }

    if (p.aksi === 'jual') {
      const [m] = await tx<BarisLahan[]>`select * from lahan_milik where lahan_id = ${p.lahan} and warga_id = ${w.id} for update`
      if (!m) throw new Galat('bukan_milik', 'Properti itu bukan milikmu.', 403)
      if (p.mode === 'tidak') {
        tx.tulis`update lahan_milik set jual_mode = 'tidak', jual_harga = null where lahan_id = ${m.lahan_id}`
        tx.tulis`update penawaran_properti set status = 'dibatalkan', selesai_pada = ${now} where lahan_id = ${m.lahan_id} and status = 'terbuka'`
        return
      }
      if (p.mode !== 'tetap' && p.mode !== 'negosiasi') throw new Galat('mode_tidak_dikenal', 'Mode penjualan tidak dikenal.')
      if (m.bangun_selesai && m.bangun_selesai > now) throw new Galat('sedang_dibangun', 'Properti yang sedang dibangun belum bisa dijual.', 409)
      cekHarga(Number(p.harga))
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from lahan_milik where warga_id = ${w.id} and jual_mode <> 'tidak' and lahan_id <> ${m.lahan_id}`
      if (n >= PROPERTI.jualMaks) throw new Galat('jual_penuh', `Paling banyak ${PROPERTI.jualMaks} properti dijual sekaligus.`, 409)
      await tx`update lahan_milik set jual_mode = ${p.mode}, jual_harga = ${p.harga} where lahan_id = ${m.lahan_id}`
      // penawaran yang sudah masuk mengikuti patokan lama atau mode lama: tutup
      tx.tulis`update penawaran_properti set status = 'dibatalkan', selesai_pada = ${now} where lahan_id = ${m.lahan_id} and status = 'terbuka'`
      return
    }

    if (p.aksi === 'beli_tetap') {
      // kunci penjual dulu, baru baris properti, supaya urutan kunci sama dengan transaksi penjual
      const [awal] = await tx<{ warga_id: string }[]>`select warga_id from lahan_milik where lahan_id = ${p.lahan}`
      if (!awal) throw new Galat('tidak_dijual', 'Properti itu tidak dijual.', 409)
      if (awal.warga_id === w.id) throw new Galat('milik_sendiri', 'Itu propertimu sendiri.', 409)
      const [penjual] = await tx<Warga[]>`select * from warga where id = ${awal.warga_id} for update`
      const [m] = await tx<BarisLahan[]>`select * from lahan_milik where lahan_id = ${p.lahan} and warga_id = ${awal.warga_id} for update`
      if (!penjual || !m || m.jual_mode !== 'tetap' || !m.jual_harga) throw new Galat('tidak_dijual', 'Properti itu tidak lagi dijual dengan harga tetap.', 409)
      await pindahMilik(tx, w, penjual, w, m, m.jual_harga, kunci, now)
      catatAktivitas(tx, w, 'transaksi', 1, now)
      return
    }

    if (p.aksi === 'tawar') {
      const [m] = await tx<BarisLahan[]>`select * from lahan_milik where lahan_id = ${p.lahan}`
      if (!m || m.jual_mode !== 'negosiasi' || !m.jual_harga) throw new Galat('tidak_bisa_ditawar', 'Properti itu tidak membuka negosiasi.', 409)
      if (m.warga_id === w.id) throw new Galat('milik_sendiri', 'Itu propertimu sendiri.', 409)
      cekPita(Number(p.harga), m.jual_harga)
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from penawaran_properti where pembeli_id = ${w.id} and status = 'terbuka'`
      if (n >= PROPERTI.tawarTerbukaMaks) throw new Galat('tawaran_penuh', `Paling banyak ${PROPERTI.tawarTerbukaMaks} tawaran terbuka sekaligus.`, 409)
      const masuk = await tx`
        insert into penawaran_properti (lahan_id, penjual_id, pembeli_id, harga, giliran, status, babak, dibuat_pada, kedaluwarsa_pada)
        values (${m.lahan_id}, ${m.warga_id}, ${w.id}, ${p.harga}, 'penjual', 'terbuka', 1, ${now}, ${new Date(now.getTime() + PROPERTI.tawarKedaluwarsaMs)})
        on conflict (lahan_id, pembeli_id) where status = 'terbuka' do nothing`
      if (masuk.count === 0) throw new Galat('sudah_menawar', 'Kamu sudah punya tawaran terbuka untuk properti itu. Tunggu jawaban atau batalkan dulu.', 409)
      catatAktivitas(tx, w, 'interaksi', 1, now)
      return
    }

    // tawar_balik, terima, tolak: bekerja pada satu tawaran yang melibatkan pemain ini
    const [t] = await tx<Tawaran[]>`select * from penawaran_properti where id = ${wajibUuid(p.tawaran, 'ID tawaran')} for update`
    if (!t || t.status !== 'terbuka') throw new Galat('tawaran_tidak_ada', 'Tawaran itu sudah tidak terbuka.', 404)
    const peran = t.penjual_id === w.id ? 'penjual' : t.pembeli_id === w.id ? 'pembeli' : null
    if (!peran) throw new Galat('bukan_pihak', 'Tawaran itu bukan urusanmu.', 403)

    if (p.aksi === 'tolak') {
      const status = t.giliran === peran ? 'ditolak' : 'dibatalkan'
      await tx`update penawaran_properti set status = ${status}, selesai_pada = ${now} where id = ${t.id}`
      catatAktivitas(tx, w, 'interaksi', 1, now)
      return
    }
    if (t.giliran !== peran) throw new Galat('bukan_giliranmu', 'Tunggu pihak lain menjawab dulu.', 409)

    if (p.aksi === 'tawar_balik') {
      if (t.babak >= PROPERTI.babakMaks) throw new Galat('babak_habis', `Tawar-menawar paling banyak ${PROPERTI.babakMaks} babak. Terima atau tolak.`, 409)
      const [m] = await tx<BarisLahan[]>`select * from lahan_milik where lahan_id = ${t.lahan_id} and warga_id = ${t.penjual_id}`
      if (!m || m.jual_mode !== 'negosiasi' || !m.jual_harga) throw new Galat('tidak_bisa_ditawar', 'Properti itu tidak lagi membuka negosiasi.', 409)
      cekPita(Number(p.harga), m.jual_harga)
      await tx`update penawaran_properti set status = 'ditawar_balik', selesai_pada = ${now} where id = ${t.id}`
      await tx`
        insert into penawaran_properti (lahan_id, penjual_id, pembeli_id, harga, giliran, status, babak, induk, dibuat_pada, kedaluwarsa_pada)
        values (${t.lahan_id}, ${t.penjual_id}, ${t.pembeli_id}, ${p.harga}, ${peran === 'penjual' ? 'pembeli' : 'penjual'}, 'terbuka', ${t.babak + 1}, ${t.id}, ${now},
          ${new Date(now.getTime() + PROPERTI.tawarKedaluwarsaMs)})`
      catatAktivitas(tx, w, 'interaksi', 1, now)
      return
    }

    // terima: kunci pihak lawan, lalu baris properti, lalu pindahkan milik dan uang
    const lawanId = peran === 'penjual' ? t.pembeli_id : t.penjual_id
    const [lawan] = await tx<Warga[]>`select * from warga where id = ${lawanId} for update`
    if (!lawan) throw new Galat('warga_tidak_ada', 'Pihak lain tidak ditemukan.', 404)
    const [m] = await tx<BarisLahan[]>`select * from lahan_milik where lahan_id = ${t.lahan_id} and warga_id = ${t.penjual_id} for update`
    if (!m || m.jual_mode !== 'negosiasi') throw new Galat('tidak_bisa_ditawar', 'Properti itu tidak lagi dijual.', 409)
    const pembeli = peran === 'pembeli' ? w : lawan
    const penjual = peran === 'penjual' ? w : lawan
    await pindahMilik(tx, pembeli, penjual, w, m, t.harga, kunci, now)
    await tx`update penawaran_properti set status = 'diterima', selesai_pada = ${now} where id = ${t.id}`
    catatAktivitas(tx, w, 'transaksi', 1, now)
  })

// ---------------------------------------------------------------- bacaan

/** Peta properti untuk panel lahan, dialog NPC, dan daftar tawaran: pemilik, harga, status jual, dan konstruksi. */
export async function daftarProperti(sql: Sql, id: string, now = new Date()) {
  const q = bungkus(sql)
  const [milik, tawaran] = await Promise.all([
    q<Array<BarisLahan & { pemilik_nama: string }>>`select m.*, w.nama as pemilik_nama from lahan_milik m join warga w on w.id = m.warga_id`,
    q<Array<Tawaran & { penjual_nama: string; pembeli_nama: string }>>`
      select t.*, wp.nama as penjual_nama, wb.nama as pembeli_nama
      from penawaran_properti t join warga wp on wp.id = t.penjual_id join warga wb on wb.id = t.pembeli_id
      where t.status = 'terbuka' and t.kedaluwarsa_pada > ${now} and (t.penjual_id = ${id} or t.pembeli_id = ${id}) order by t.dibuat_pada desc`,
  ])
  const peta = new Map(milik.map((m) => [m.lahan_id, m]))
  const bangun = (m: BarisLahan | undefined) => {
    if (!m?.bangun_jenis || !m.bangun_mulai || !m.bangun_selesai) return null
    const progres = progresBangun(m.bangun_mulai, m.bangun_selesai, now)
    const t = tahapBangun(progres)
    return {
      jenis: m.bangun_jenis, nama: BANGUN[m.bangun_jenis]?.nama ?? m.bangun_jenis, mulai: m.bangun_mulai.toISOString(), selesai: m.bangun_selesai.toISOString(),
      progres: Math.round(progres * 1000) / 1000, tahap: t.tahap, tahapNama: t.nama, tampil: t.tampil,
    }
  }
  const status = (m: BarisLahan | undefined, kosong: string) => (!m ? kosong : m.warga_id === id ? 'milikmu' : 'pemain')
  const jual = (m: BarisLahan | undefined) => (m && m.jual_mode !== 'tidak' && m.jual_harga ? { mode: m.jual_mode, harga: m.jual_harga } : null)
  const pemilik = (m: (BarisLahan & { pemilik_nama: string }) | undefined) => (m ? { id: m.warga_id, nama: m.pemilik_nama } : null)
  return {
    lahan: lahanKosong.map((l) => {
      const m = peta.get(l.id)
      return {
        id: l.id, distrik: distrik.find((d) => d.id === l.distrik)?.nama ?? l.distrik, luas: Math.round(l.w * l.d), harga: hargaLahan(l),
        status: status(m, 'kota'), pemilik: pemilik(m), jual: jual(m), bangun: bangun(m),
      }
    }),
    npc: PROPERTI_NPC.map((np) => {
      const m = peta.get(np.id)
      return { ...np, status: status(m, 'dijual'), pemilik: pemilik(m), jual: jual(m) }
    }),
    tawaran: tawaran.map((t) => ({
      id: t.id, lahan: t.lahan_id, harga: t.harga, babak: t.babak, giliran: t.giliran, kedaluwarsa: t.kedaluwarsa_pada.toISOString(),
      saya: t.penjual_id === id ? ('penjual' as const) : ('pembeli' as const), penjual: { id: t.penjual_id, nama: t.penjual_nama }, pembeli: { id: t.pembeli_id, nama: t.pembeli_nama },
      giliranku: (t.penjual_id === id ? 'penjual' : 'pembeli') === t.giliran, bisaTawarBalik: t.babak < PROPERTI.babakMaks,
    })),
    aturan: {
      kedaluwarsaJam: PROPERTI.tawarKedaluwarsaMs / 3_600_000, babakMaks: PROPERTI.babakMaks, tawarMinRasio: PROPERTI.tawarMinRasio, tawarMaksRasio: PROPERTI.tawarMaksRasio,
      jualMaks: PROPERTI.jualMaks, milikMaks: LAHAN.maksMilik,
    },
    dialogNpc: PROPERTI.dialogNpc,
    bangunan: Object.entries(BANGUN).map(([jenis, b]) => ({ jenis, nama: b.nama, biaya: b.biaya, durasiMs: b.durasiMs, hunian: b.hunian })),
  }
}
