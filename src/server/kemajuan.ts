// Kemajuan pemain: EXP, level, reputasi, hadiah Wali Kota, dan peringkat mingguan. SQL saja (tanpa ledger lewat game.ts).
import { LEVEL, PERINGKAT, type Sumber } from '../data/balans.ts'
import type { Sql } from './db.ts'
import { kirimSurat } from './inventori.ts'
import { bungkus, type Tx } from './kueri.ts'
import { awalPekanWIB, hadiahLevel, hadiahPeringkat, terapkanAktivitas, type HasilAktivitas } from './sistem-aturan.ts'
import type { Warga } from './tipe.ts'

/** Hadiah Wali Kota untuk satu level: satu surat berisi uang dan barang pertama, sisa barang dalam surat terpisah. */
function kirimHadiahLevel(tx: Tx, id: string, level: number, now: Date): void {
  const h = hadiahLevel(level)
  const barang = Object.entries(h.barang)
  const judul = h.kelipatan === 1 ? `Selamat naik ke level ${level}` : `Hadiah besar untuk level ${level}`
  kirimSurat(tx, id, { pengirim: 'Wali Kota Weton', judul, sumber: 'level', uang: h.uang, item: barang[0]?.[0], jumlah: barang[0]?.[1] }, now)
  for (const [item, jumlah] of barang.slice(1)) kirimSurat(tx, id, { pengirim: 'Wali Kota Weton', judul, sumber: 'level', item, jumlah }, now)
}

/**
 * Catat aktivitas: EXP, reputasi (dengan batas harian per sumber), dan hadiah untuk tiap level yang tercapai.
 * Mengubah `w`; kolomnya ikut tersimpan oleh simpan() di game.ts. Pemanggil sudah mengunci baris warga.
 */
export function catatAktivitas(tx: Tx, w: Warga, sumber: Sumber, kali: number, now: Date): HasilAktivitas {
  const hasil = terapkanAktivitas(w, sumber, kali, now)
  for (const level of hasil.naik) kirimHadiahLevel(tx, w.id, level, now)
  return hasil
}

let pekanDicek: string | null = null
let berjalan: Promise<void> | null = null
let gagalPada = 0

/** Gagal atau macet tidak boleh menahan aksi pemain: tunggu paling lama ini, lalu lanjut. */
const BATAS_TUNGGU_MS = 4_000
/** Setelah gagal, jangan coba lagi sebelum jeda ini (supaya tidak diulang di tiap aksi). */
const JEDA_ULANG_MS = 60_000

async function tutupPekan(sql: Sql, now: Date, pekan: string): Promise<void> {
  await sql.begin(async (conn) => {
    const q = bungkus(conn)
    // jangan menunggu kunci baris tanpa batas: koneksi (kolam Vercel hanya satu) harus segera bebas
    // satu penerbangan: dijalankan server sesuai urutan kirim, jadi batas waktu sudah berlaku saat baris kota dikunci
    const [, , [k]] = await Promise.all([
      q.mentah("set local lock_timeout = '3s'"),
      q.mentah("set local statement_timeout = '10s'"),
      q<{ minggu_peringkat: string | null }[]>`select minggu_peringkat from kota where id = 1 for update`,
    ])
    // pekan hanya maju: jam proses yang tertinggal (atau waktu uji yang mundur) tidak boleh menutup pekan yang sudah ditutup
    if (!k || (k.minggu_peringkat !== null && k.minggu_peringkat >= pekan)) return
    if (k.minggu_peringkat) {
      const teratas = await q<{ id: string; nama: string; poin: number }[]>`
        select id, nama, reputasi_minggu as poin from warga
        where peran <> 'walikota' and reputasi_minggu >= ${PERINGKAT.poinMin}
        order by reputasi_minggu desc, dibuat_pada, id limit ${PERINGKAT.topN}`
      for (const [i, t] of teratas.entries()) {
        const hadiah = hadiahPeringkat(i + 1)
        q.tulis`
          insert into peringkat_mingguan (minggu, peringkat, warga_id, nama, poin, hadiah, dibuat_pada)
          values (${k.minggu_peringkat}, ${i + 1}, ${t.id}, ${t.nama}, ${t.poin}, ${hadiah}, ${now})`
        if (hadiah > 0) {
          q.tulis`
            with u as (update warga set kas = kas + ${hadiah} where id = ${t.id} returning id, kas)
            insert into ledger (warga_id, akun, jenis, jumlah, saldo_setelah, kunci, rincian, dibuat_pada)
            select id, 'kas', 'hadiah_mingguan', ${hadiah}, kas, null, ${q.json({ minggu: k.minggu_peringkat, peringkat: i + 1, poin: t.poin })}, ${now} from u`
        }
      }
    }
    q.tulis`update warga set reputasi_minggu = 0 where reputasi_minggu <> 0`
    q.tulis`update kota set minggu_peringkat = ${pekan} where id = 1`
    await q.kirim()
  })
}

/**
 * Tutup pekan peringkat bila pekan WIB berganti: simpan snapshot top-N, bagikan hadiah sesuai tabel, lalu reset poin
 * mingguan. Dijalankan malas sebelum aksi pemain (tanpa cron); baris kota dikunci sehingga hanya satu penutup yang jalan.
 * Setelah diperiksa sekali per pekan, pemanggilan berikutnya di proses yang sama tidak menyentuh basis data. Hanya satu
 * penutup berjalan per proses, menunggunya dibatasi BATAS_TUNGGU_MS, dan kegagalan tidak diulang sebelum JEDA_ULANG_MS.
 */
export async function pastikanPekan(sql: Sql, now: Date): Promise<void> {
  const pekan = awalPekanWIB(now)
  if (pekanDicek === pekan) return
  if (gagalPada && Date.now() - gagalPada < JEDA_ULANG_MS) return
  berjalan ??= tutupPekan(sql, now, pekan)
    .then(() => {
      pekanDicek = pekan
      gagalPada = 0
    })
    .catch((e) => {
      gagalPada = Date.now()
      console.error('pastikanPekan gagal', e)
    })
    .finally(() => {
      berjalan = null
    })
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([berjalan, new Promise<void>((ok) => (timer = setTimeout(ok, BATAS_TUNGGU_MS)))])
  clearTimeout(timer)
}

export type BarisPeringkat = { peringkat: number; id: string; nama: string; level: number; poin: number }

/** Papan peringkat global (reputasi total) dan mingguan, peringkatmu, tabel hadiah, dan snapshot pekan lalu. */
export async function papanPeringkat(sql: Sql, id: string, now: Date) {
  await pastikanPekan(sql, now).catch((e) => console.error(e))
  const q = bungkus(sql)
  const [global, mingguan, [saya], terakhir] = await Promise.all([
    q<{ id: string; nama: string; level: number; poin: number }[]>`
      select id, nama, level, reputasi::int as poin from warga where peran <> 'walikota' and reputasi > 0 order by reputasi desc, dibuat_pada, id limit ${PERINGKAT.tampil}`,
    q<{ id: string; nama: string; level: number; poin: number }[]>`
      select id, nama, level, reputasi_minggu as poin from warga where peran <> 'walikota' and reputasi_minggu > 0 order by reputasi_minggu desc, dibuat_pada, id limit ${PERINGKAT.tampil}`,
    q<{ reputasi: number; reputasi_minggu: number; peringkat: number; peringkat_minggu: number }[]>`
      select w.reputasi::int as reputasi, w.reputasi_minggu,
        (select count(*)::int + 1 from warga x where x.peran <> 'walikota' and x.reputasi > w.reputasi) as peringkat,
        (select count(*)::int + 1 from warga x where x.peran <> 'walikota' and x.reputasi_minggu > w.reputasi_minggu) as peringkat_minggu
      from warga w where w.id = ${id}`,
    q<{ minggu: string; peringkat: number; nama: string; poin: number; hadiah: number }[]>`
      select minggu, peringkat, nama, poin, hadiah::int as hadiah from peringkat_mingguan
      where minggu = (select max(minggu) from peringkat_mingguan) order by peringkat`,
  ])
  const baris = (r: typeof global): BarisPeringkat[] => r.map((x, i) => ({ peringkat: i + 1, id: x.id, nama: x.nama, level: x.level, poin: x.poin }))
  return {
    pekan: awalPekanWIB(now),
    global: baris(global),
    mingguan: baris(mingguan),
    saya: saya ? { reputasi: saya.reputasi, minggu: saya.reputasi_minggu, peringkat: saya.peringkat, peringkatMinggu: saya.peringkat_minggu } : null,
    hadiah: PERINGKAT.hadiah.map((h) => ({ dari: h.dari, sampai: h.sampai, uang: h.uang })),
    snapshot: terakhir.length ? { minggu: terakhir[0].minggu, baris: terakhir.map((t) => ({ peringkat: t.peringkat, nama: t.nama, poin: t.poin, hadiah: t.hadiah })) } : null,
    level: { baseExp: LEVEL.baseExp, pangkat: LEVEL.pangkat },
  }
}
