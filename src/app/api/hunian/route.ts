import { okupansi, pilihHunian } from '@/server/game'
import { aksi, galatKeJawaban, jawab } from '@/server/http'
import { sql } from '@/server/sql'

/** Jumlah penghuni tiap bangunan hunian (id penempatan), untuk panel bangunan di peta. */
export async function GET() {
  try {
    return jawab({ terisi: await okupansi(sql) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { hunian, tempat?, kamar? }: tempat = id bangunan di peta; tanpa tempat dipilih gedung pertama yang masih ada kamar. kamar = nomor kamar. */
export const POST = aksi((id, b, kunci) =>
  pilihHunian(sql, id, kunci, String(b.hunian ?? ''), new Date(), typeof b.tempat === 'string' ? b.tempat : null, typeof b.kamar === 'number' ? b.kamar : null),
)
