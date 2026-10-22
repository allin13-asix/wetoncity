import { Galat } from '@/server/galat'
import { kantorWalikota, type Perintah } from '@/server/game'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'
import { alatWalikota, dataWalikota, type PerintahSuper } from '@/server/walikota'

/** Data Kantor Wali Kota: jumlah warga, daftar barang (bawaan dan buatan), dan riwayat bansos. */
export async function GET() {
  try {
    return jawab(await dataWalikota(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

export const POST = aksi((id, b, kunci) => {
  if (b.aksi === 'bansos' || b.aksi === 'barang_baru' || b.aksi === 'barang_hapus' || b.aksi === 'pengumuman') {
    return alatWalikota(sql, id, kunci, b as unknown as PerintahSuper)
  }
  const p: Perintah | null =
    b.aksi === 'uang' ? { aksi: 'uang', jumlah: Number(b.jumlah) }
    : b.aksi === 'tenaga' ? { aksi: 'tenaga' }
    : b.aksi === 'keahlian' ? { aksi: 'keahlian', nilai: Number(b.nilai) }
    : null
  if (!p) throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return kantorWalikota(sql, id, kunci, p)
})
