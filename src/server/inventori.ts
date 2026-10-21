// Inventori dan mailbox (SQL saja, tanpa ledger). Inventori memakai tabel `gudang`: satu baris per jenis barang dengan
// kapasitas total dari src/data/balans.ts. Barang yang tidak muat masuk ke tabel `surat` untuk diklaim nanti.
import { INVENTORI } from '../data/balans.ts'
import { BARANG, PASAR, adalahBarang } from './aturan.ts'
import { Galat } from './galat.ts'
import type { Tx } from './kueri.ts'

export type IsiSurat = { pengirim: string; judul: string; sumber: string; item?: string; jumlah?: number; uang?: number }

export const namaBarang = (id: string) => (adalahBarang(id) ? BARANG[id].nama : id)

/** Kirim surat ke mailbox. Ditolak diam-diam bila mailbox penerima sudah penuh. Tidak menunggu hasil. */
export function kirimSurat(tx: Tx, id: string, s: IsiSurat, now: Date): void {
  tx.tulis`
    insert into surat (warga_id, pengirim, judul, item, jumlah, uang, sumber, dibuat_pada)
    select ${id}::uuid, ${s.pengirim}, ${s.judul}, ${s.item ?? null}, ${s.item ? (s.jumlah ?? 0) : 0}, ${s.uang ?? 0}, ${s.sumber}, ${now}
    where (select count(*) from surat where warga_id = ${id}::uuid) < ${INVENTORI.suratMaks}`
}

/** Satuan barang yang sedang disimpan. */
export async function totalInventori(tx: Tx, id: string): Promise<number> {
  const [r] = await tx<{ total: string }[]>`select coalesce(sum(jumlah), 0) as total from gudang where warga_id = ${id}`
  return Number(r.total)
}

/**
 * Masukkan sebanyak yang muat ke inventori (kapasitas total dan batas per jenis) dan kembalikan jumlah yang masuk.
 * Kunci penasihat per pemain mencegah dua transaksi serentak sama-sama melihat ruang kosong yang sama.
 */
export async function isiInventori(tx: Tx, id: string, item: string, jumlah: number): Promise<number> {
  if (!adalahBarang(item)) throw new Galat('barang_tidak_ada', 'Barang itu tidak dikenal.')
  if (!Number.isInteger(jumlah) || jumlah < 1) return 0
  await tx`select pg_advisory_xact_lock(hashtext(${'inv:' + id}))`
  const [r] = await tx<{ total: string; ada: string }[]>`
    select coalesce(sum(jumlah), 0) as total, coalesce(sum(jumlah) filter (where barang = ${item}), 0) as ada from gudang where warga_id = ${id}`
  const masuk = Math.max(0, Math.min(jumlah, INVENTORI.kapasitas - Number(r.total), PASAR.gudangMaks - Number(r.ada)))
  if (masuk > 0) {
    tx.tulis`
      insert into gudang (warga_id, barang, jumlah) values (${id}, ${item}, ${masuk})
      on conflict (warga_id, barang) do update set jumlah = gudang.jumlah + ${masuk}`
  }
  return masuk
}

/** Tambah barang; yang tidak muat dikirim ke mailbox. Dipakai untuk pembelian, hadiah, dan hasil memancing. */
export async function tambahItem(tx: Tx, id: string, item: string, jumlah: number, surat: Omit<IsiSurat, 'item' | 'jumlah'>, now: Date): Promise<{ masuk: number; surat: number }> {
  const masuk = await isiInventori(tx, id, item, jumlah)
  const sisa = jumlah - masuk
  if (sisa > 0) kirimSurat(tx, id, { ...surat, item, jumlah: sisa }, now)
  return { masuk, surat: sisa }
}

/** Kurangi barang dari inventori. Melempar Galat bila tidak cukup. */
export async function kurangiItem(tx: Tx, id: string, item: string, jumlah: number): Promise<void> {
  if (!Number.isInteger(jumlah) || jumlah < 1) throw new Galat('jumlah_tidak_valid', 'Jumlah harus bilangan bulat positif.')
  const [g] = await tx<{ jumlah: number }[]>`select jumlah from gudang where warga_id = ${id} and barang = ${item} for update`
  if (!g || g.jumlah < jumlah) throw new Galat('barang_kurang', `${namaBarang(item)} di inventori tidak cukup.`, 409)
  tx.tulis`update gudang set jumlah = jumlah - ${jumlah} where warga_id = ${id} and barang = ${item}`
}
