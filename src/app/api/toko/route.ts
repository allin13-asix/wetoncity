import { beliToko, daftarToko } from '@/server/hiburan'
import { aksi, galatKeJawaban, jawab } from '@/server/http'
import { sql } from '@/server/sql'

/** Tiga minimarket dengan harga, stok, dan promo hari ini. Publik. */
export async function GET() {
  try {
    return jawab(await daftarToko(sql))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { toko, produk, jumlah } */
export const POST = aksi((id, b, kunci) => beliToko(sql, id, kunci, String(b.toko ?? ''), String(b.produk ?? ''), Number(b.jumlah)))
