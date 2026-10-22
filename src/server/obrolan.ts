// Obrolan: ruang global kota, ruang per gedung hunian (hanya penghuninya), dan utas pesan pribadi antara dua warga.
// Sengaja tanpa dalamTransaksi: membaca dan mengirim masing-masing satu penerbangan ke basis data, supaya obrolan terasa
// cepat. Batas laju dan hak masuk ruang diperiksa di pernyataan yang sama dengan insert.
import { OBROLAN } from '../data/balans.ts'
import { jenisById } from '../data/bangunan.ts'
import { penempatanById } from '../data/tataletak.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { bungkus } from './kueri.ts'
import { pasangan, wajibUuid } from './sistem-aturan.ts'

const MENIT = 60_000

/** Teks pesan tanpa karakter kendali dan tanda kurung sudut, dipangkas; galat bila kosong atau terlalu panjang. */
function teksPesan(x: unknown): string {
  const t = typeof x === 'string' ? x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, '').trim() : ''
  if (t.length < 1 || t.length > OBROLAN.panjangMaks) throw new Galat('pesan_tidak_valid', `Pesan 1 sampai ${OBROLAN.panjangMaks} karakter.`)
  return t
}

const setelahSah = (x: unknown) => {
  const n = Number(x ?? 0)
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}

export function ruangSah(x: unknown): string {
  if (typeof x === 'string' && /^(global|hunian:[a-z0-9-]{2,60})$/.test(x)) return x
  throw new Galat('ruang_tidak_ada', 'Ruang obrolan itu tidak ada.', 404)
}

/** Nama ruang untuk tampilan: "Kota Weton" atau nama gedung hunian beserta nomornya. */
export function namaRuang(ruang: string): string {
  if (ruang === 'global') return 'Kota Weton'
  const tempat = ruang.slice('hunian:'.length)
  const p = penempatanById.get(tempat)
  const nomor = /-(\d+)$/.exec(tempat)?.[1]
  return p ? `${jenisById.get(p.jenis)?.nama ?? p.jenis}${nomor ? `, gedung ${nomor}` : ''}` : tempat
}

type BarisRuang = { id: number; isi: string; dibuat_pada: Date; warga_id: string; nama: string; level: number }

/** Ruang yang boleh diikuti warga ini: global, dan gedung hunian tempat ia tinggal. */
export async function ruangSaya(sql: Sql, id: string) {
  const [w] = await bungkus(sql)<{ hunian_tempat: string | null }[]>`select hunian_tempat from warga where id = ${id}`
  const ruang = ['global', ...(w?.hunian_tempat ? [`hunian:${w.hunian_tempat}`] : [])]
  return ruang.map((r) => ({ id: r, nama: namaRuang(r) }))
}

/** Pesan terbaru di satu ruang (yang lebih baru dari `setelah` bila diisi), urut lama ke baru. */
export async function bacaRuang(sql: Sql, id: string, ruangMentah: unknown, setelahMentah?: unknown) {
  const ruang = ruangSah(ruangMentah)
  const setelah = setelahSah(setelahMentah)
  const q = bungkus(sql)
  const [[izin], baris] = await Promise.all([
    q<{ boleh: boolean }[]>`select exists (select 1 from warga where id = ${id} and (${ruang} = 'global' or 'hunian:' || hunian_tempat = ${ruang})) as boleh`,
    q<BarisRuang[]>`
      select o.id, o.isi, o.dibuat_pada, w.id as warga_id, w.nama, w.level from obrolan o join warga w on w.id = o.warga_id
      where o.ruang = ${ruang} and o.id > ${setelah} order by o.id desc limit ${OBROLAN.tampil}`,
  ])
  if (!izin?.boleh) throw new Galat('ruang_ditolak', 'Ruang ini hanya untuk penghuni gedungnya.', 403)
  return {
    ruang: { id: ruang, nama: namaRuang(ruang) },
    pesan: [...baris].reverse().map((b) => ({
      id: Number(b.id), isi: b.isi, waktu: b.dibuat_pada.toISOString(), dari: { id: b.warga_id, nama: b.nama, level: b.level }, saya: b.warga_id === id,
    })),
  }
}

/** Kirim ke ruang: hak masuk dan batas laju diperiksa di pernyataan insert yang sama (satu round-trip). */
export async function kirimRuang(sql: Sql, id: string, ruangMentah: unknown, isiMentah: unknown, now = new Date()) {
  const ruang = ruangSah(ruangMentah)
  const isi = teksPesan(isiMentah)
  const q = bungkus(sql)
  const [baru] = await q<{ id: number }[]>`
    with s as (select id from warga where id = ${id} and (${ruang} = 'global' or 'hunian:' || hunian_tempat = ${ruang})),
      l as (select count(*)::int as n from obrolan where warga_id = ${id} and dibuat_pada > ${new Date(now.getTime() - MENIT)})
    insert into obrolan (ruang, warga_id, isi, dibuat_pada) select ${ruang}, s.id, ${isi}, ${now} from s, l where l.n < ${OBROLAN.perMenitMaks}
    returning id`
  if (baru) return { id: Number(baru.id) }
  // jalur jarang: cari tahu kenapa ditolak
  const [izin] = await q<{ boleh: boolean }[]>`select exists (select 1 from warga where id = ${id} and (${ruang} = 'global' or 'hunian:' || hunian_tempat = ${ruang})) as boleh`
  if (!izin?.boleh) throw new Galat('ruang_ditolak', 'Ruang ini hanya untuk penghuni gedungnya.', 403)
  throw new Galat('terlalu_cepat', `Paling banyak ${OBROLAN.perMenitMaks} pesan per menit. Tunggu sebentar.`, 429)
}

// ---------------------------------------------------------------- pesan pribadi

/** Daftar percakapan pribadi: lawan bicara, pesan terakhir, dan jumlah pesan darinya yang belum dibaca. */
export async function daftarPercakapan(sql: Sql, id: string) {
  const baris = await bungkus(sql)<{ lawan: string; nama: string; level: number; isi: string; dari_id: string; dibuat_pada: Date; id: number; belum: number }[]>`
    select t.lawan, w.nama, w.level, t.isi, t.dari_id, t.dibuat_pada, t.id,
      (select count(*)::int from pesan x where x.ke_id = ${id} and x.dari_id = t.lawan and not x.dibaca) as belum
    from (
      select distinct on (lawan) * from (
        select p.*, case when p.dari_id = ${id} then p.ke_id else p.dari_id end as lawan from pesan p where p.dari_id = ${id} or p.ke_id = ${id}
      ) a order by lawan, id desc
    ) t join warga w on w.id = t.lawan
    order by t.id desc limit ${OBROLAN.percakapanTampil}`
  return baris.map((b) => ({
    dengan: { id: b.lawan, nama: b.nama, level: b.level }, terakhir: { isi: b.isi, saya: b.dari_id === id, waktu: b.dibuat_pada.toISOString() }, belum: b.belum,
  }))
}

/** Utas pesan dengan satu warga (yang lebih baru dari `setelah`), urut lama ke baru; pesan darinya ditandai sudah dibaca. */
export async function bacaUtas(sql: Sql, id: string, lawanMentah: unknown, setelahMentah?: unknown) {
  const lawan = wajibUuid(lawanMentah, 'ID warga')
  const setelah = setelahSah(setelahMentah)
  const [a, b] = pasangan(id, lawan)
  const q = bungkus(sql)
  const [[w], baris, [teman]] = await Promise.all([
    q<{ id: string; nama: string; level: number; terakhir_aktif: Date }[]>`select id, nama, level, terakhir_aktif from warga where id = ${lawan}`,
    // tanda dibaca diubah di CTE; baris yang dikembalikan masih menunjukkan keadaan sebelum ditandai
    q<{ id: number; dari_id: string; isi: string; dibaca: boolean; dibuat_pada: Date }[]>`
      with baca as (update pesan set dibaca = true where ke_id = ${id} and dari_id = ${lawan} and not dibaca)
      select id, dari_id, isi, dibaca, dibuat_pada from pesan
      where least(dari_id, ke_id) = ${a}::uuid and greatest(dari_id, ke_id) = ${b}::uuid and id > ${setelah}
      order by id desc limit ${OBROLAN.utasTampil}`,
    q<{ status: string; peminta: string }[]>`select status, peminta from pertemanan where a = ${a}::uuid and b = ${b}::uuid`,
  ])
  if (!w) throw new Galat('warga_tidak_ada', 'Warga itu tidak ditemukan.', 404)
  return {
    dengan: {
      id: w.id, nama: w.nama, level: w.level, aktif: w.terakhir_aktif.toISOString(),
      teman: teman?.status === 'teman' ? 'teman' : teman ? (teman.peminta === id ? 'diminta' : 'meminta') : 'belum',
    },
    pesan: [...baris].reverse().map((p) => ({ id: Number(p.id), isi: p.isi, waktu: p.dibuat_pada.toISOString(), saya: p.dari_id === id, baru: p.dari_id !== id && !p.dibaca })),
  }
}

/** Kirim pesan pribadi ke warga mana pun (teman atau bukan). Batas laju di pernyataan insert yang sama. */
export async function kirimPribadi(sql: Sql, id: string, keMentah: unknown, isiMentah: unknown, now = new Date()) {
  const ke = wajibUuid(keMentah, 'ID penerima')
  if (ke === id) throw new Galat('pesan_sendiri', 'Tidak bisa mengirim pesan ke diri sendiri.')
  const isi = teksPesan(isiMentah)
  const q = bungkus(sql)
  const [hasil] = await q<{ id: number | null; ada: boolean }[]>`
    with t as (select id from warga where id = ${ke}),
      l as (select count(*)::int as n from pesan where dari_id = ${id} and dibuat_pada > ${new Date(now.getTime() - MENIT)}),
      masuk as (
        insert into pesan (dari_id, ke_id, isi, dibuat_pada) select ${id}, t.id, ${isi}, ${now} from t, l where l.n < ${OBROLAN.perMenitMaks} returning id)
    select (select id from masuk) as id, exists (select 1 from t) as ada`
  if (!hasil?.ada) throw new Galat('warga_tidak_ada', 'Penerima tidak ditemukan.', 404)
  if (hasil.id === null) throw new Galat('terlalu_cepat', `Paling banyak ${OBROLAN.perMenitMaks} pesan per menit. Tunggu sebentar.`, 429)
  return { id: Number(hasil.id) }
}
