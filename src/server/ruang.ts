// Ruang obrolan berwujud: Alun-Alun dan Taman Kota (beberapa ruang paralel, masing-masing paling banyak RUANG.kapasitas orang)
// serta ruang dalam gedung hunian (hanya penghuninya). Kehadiran dan posisi di tabel ruang_hadir; dianggap pergi bila detaknya
// basi, jadi tanpa cron. Tiap detak satu penerbangan: perbarui kehadiran (dengan cek kapasitas), lalu baca hadirin dan pesan baru.
import { OBROLAN, RUANG } from '../data/balans.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { bungkus } from './kueri.ts'
import { namaRuang, ruangSah } from './obrolan.ts'

export type JenisAdegan = 'alun' | 'taman' | 'hunian'
const JENIS: readonly JenisAdegan[] = ['alun', 'taman', 'hunian']

const batas = (now: Date) => new Date(now.getTime() - RUANG.hadirMs)
const koordinat = (v: unknown, cadangan: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(Math.min(0.97, Math.max(0.03, n)) * 1000) / 1000 : cadangan
}
const jenisDari = (ruang: string): JenisAdegan => ruang.slice(0, ruang.indexOf(':')) as JenisAdegan

/** Ruang alun-alun dan taman yang sedang ada isinya (plus satu ruang kosong berikutnya), dan ruang gedung hunianmu. */
export async function daftarAdegan(sql: Sql, id: string, now = new Date()) {
  const q = bungkus(sql)
  const [isi, [w]] = await Promise.all([
    q<{ ruang: string; n: number }[]>`select ruang, count(*)::int as n from ruang_hadir where terakhir > ${batas(now)} and warga_id <> ${id} group by ruang`,
    q<{ hunian_tempat: string | null }[]>`select hunian_tempat from warga where id = ${id}`,
  ])
  const peta = new Map(isi.map((r) => [r.ruang, r.n]))
  const instans = (jenis: 'alun' | 'taman') => {
    const ada = isi.filter((r) => r.ruang.startsWith(`${jenis}:`)).map((r) => Number(r.ruang.slice(jenis.length + 1)))
    const sampai = Math.min(RUANG.instansMaks, Math.max(1, ...ada) + 1)
    return Array.from({ length: sampai }, (_, i) => `${jenis}:${i + 1}`)
      .filter((r, i) => i === 0 || peta.has(r) || i === sampai - 1)
      .map((r) => ({ ruang: r, nama: namaRuang(r), isi: peta.get(r) ?? 0 }))
  }
  const hunian = w?.hunian_tempat ? `hunian:${w.hunian_tempat}` : null
  return {
    kapasitas: RUANG.kapasitas,
    alun: instans('alun'),
    taman: instans('taman'),
    hunian: hunian ? { ruang: hunian, nama: namaRuang(hunian), isi: peta.get(hunian) ?? 0 } : null,
  }
}

/**
 * Hadir di satu ruang (masuk atau berdetak), dengan cek kapasitas di pernyataan yang sama. Mengembalikan false bila penuh atau
 * tidak berhak (ruang gedung hanya untuk penghuninya).
 */
async function hadir(sql: Sql, id: string, ruang: string, x: number, y: number, now: Date): Promise<boolean> {
  const [r] = await bungkus(sql)<{ ruang: string }[]>`
    insert into ruang_hadir (warga_id, ruang, x, y, terakhir)
    select ${id}, ${ruang}, ${x}, ${y}, ${now}
    where (select count(*) from ruang_hadir where ruang = ${ruang} and terakhir > ${batas(now)} and warga_id <> ${id}) < ${RUANG.kapasitas}
      and (${ruang} not like 'hunian:%' or exists (select 1 from warga where id = ${id} and 'hunian:' || hunian_tempat = ${ruang}))
    on conflict (warga_id) do update set ruang = excluded.ruang, x = excluded.x, y = excluded.y, terakhir = excluded.terakhir
    returning ruang`
  return !!r
}

/** Masuk ke ruang tertentu, atau (tanpa `ruang`) ke ruang alun-alun/taman pertama yang belum penuh. */
export async function masukAdegan(sql: Sql, id: string, jenisMentah: unknown, ruangMentah?: unknown, now = new Date()) {
  const jenis = JENIS.find((j) => j === jenisMentah)
  if (!jenis) throw new Galat('ruang_tidak_ada', 'Ruang obrolan itu tidak ada.', 404)
  const x = Math.round((0.3 + Math.random() * 0.4) * 1000) / 1000
  const y = Math.round((0.55 + Math.random() * 0.3) * 1000) / 1000
  let calon: string[]
  if (jenis === 'hunian') {
    const [w] = await bungkus(sql)<{ hunian_tempat: string | null }[]>`select hunian_tempat from warga where id = ${id}`
    if (!w?.hunian_tempat) throw new Galat('tanpa_hunian', 'Kamu belum tinggal di gedung mana pun.', 409)
    calon = [`hunian:${w.hunian_tempat}`]
  } else if (ruangMentah) {
    const r = ruangSah(ruangMentah)
    if (jenisDari(r) !== jenis || Number(r.slice(jenis.length + 1)) > RUANG.instansMaks) throw new Galat('ruang_tidak_ada', 'Ruang obrolan itu tidak ada.', 404)
    calon = [r]
  } else {
    const d = await daftarAdegan(sql, id, now)
    const daftar = d[jenis]
    calon = daftar.filter((r) => r.isi < RUANG.kapasitas).map((r) => r.ruang)
    const berikut = `${jenis}:${Math.min(RUANG.instansMaks, daftar.length + 1)}`
    if (!calon.includes(berikut)) calon.push(berikut)
  }
  for (const ruang of calon) {
    if (await hadir(sql, id, ruang, x, y, now)) return { ruang, nama: namaRuang(ruang), x, y, kapasitas: RUANG.kapasitas }
  }
  throw new Galat('ruang_penuh', `Ruang ini sudah penuh (${RUANG.kapasitas} orang). Coba ruang lain.`, 409)
}

type BarisHadir = { warga_id: string; nama: string; level: number; peran: string; x: number; y: number }
type BarisPesan = { id: number; isi: string; dibuat_pada: Date; warga_id: string; nama: string }

/**
 * Detak: tetap hadir (posisi terbaru) lalu baca hadirin dan pesan lebih baru dari `setelah`, semuanya satu penerbangan.
 * `hadir: false` berarti ruang penuh atau kamu bukan penghuninya; klien sebaiknya masuk ulang lewat masukAdegan.
 */
export async function detakAdegan(sql: Sql, id: string, ruangMentah: unknown, setelahMentah: unknown, xm: unknown, ym: unknown, now = new Date()) {
  const ruang = ruangSah(ruangMentah)
  if (ruang === 'global') throw new Galat('ruang_tidak_ada', 'Ruang obrolan itu tidak ada.', 404)
  const setelah = Number.isSafeInteger(Number(setelahMentah)) && Number(setelahMentah) > 0 ? Number(setelahMentah) : 0
  const q = bungkus(sql)
  const x = koordinat(xm, 0.5)
  const y = koordinat(ym, 0.7)
  // kehadiran sendiri diperbarui di CTE yang sama dengan pembacaan hadirin, jadi selalu terlihat posisi terbarunya
  const [orang, pesan] = await Promise.all([
    q<BarisHadir[]>`
      with saya as (
        insert into ruang_hadir (warga_id, ruang, x, y, terakhir)
        select ${id}, ${ruang}, ${x}, ${y}, ${now}
        where (select count(*) from ruang_hadir where ruang = ${ruang} and terakhir > ${batas(now)} and warga_id <> ${id}) < ${RUANG.kapasitas}
          and (${ruang} not like 'hunian:%' or exists (select 1 from warga where id = ${id} and 'hunian:' || hunian_tempat = ${ruang}))
        on conflict (warga_id) do update set ruang = excluded.ruang, x = excluded.x, y = excluded.y, terakhir = excluded.terakhir
        returning warga_id, x, y)
      select h.warga_id, w.nama, w.level, w.peran, h.x, h.y from ruang_hadir h join warga w on w.id = h.warga_id
      where h.ruang = ${ruang} and h.terakhir > ${batas(now)} and h.warga_id <> ${id}
      union all
      select s.warga_id, w.nama, w.level, w.peran, s.x, s.y from saya s join warga w on w.id = s.warga_id
      limit ${RUANG.kapasitas + 5}`,
    q<BarisPesan[]>`
      select o.id, o.isi, o.dibuat_pada, w.id as warga_id, w.nama from obrolan o join warga w on w.id = o.warga_id
      where o.ruang = ${ruang} and o.id > ${setelah} order by o.id desc limit ${OBROLAN.tampil}`,
  ])
  const ada = orang.some((o) => o.warga_id === id)
  return {
    ruang: { id: ruang, nama: namaRuang(ruang), jenis: jenisDari(ruang), kapasitas: RUANG.kapasitas },
    hadir: ada,
    orang: orang.map((o) => ({ id: o.warga_id, nama: o.nama, level: o.level, walikota: o.peran === 'walikota', x: o.x, y: o.y, saya: o.warga_id === id })),
    pesan: [...pesan].reverse().map((p) => ({ id: Number(p.id), isi: p.isi, waktu: p.dibuat_pada.toISOString(), dari: { id: p.warga_id, nama: p.nama }, saya: p.warga_id === id })),
  }
}

/** Keluar dari ruang berwujud mana pun. */
export async function keluarAdegan(sql: Sql, id: string) {
  await bungkus(sql)`delete from ruang_hadir where warga_id = ${id}`
  return { ok: true }
}
