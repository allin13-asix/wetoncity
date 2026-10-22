import { ambilPekerjaan, pekerjaanPenuh } from '@/server/game'
import { aksi, galatKeJawaban, jawab } from '@/server/http'
import { sql } from '@/server/sql'

/** { penuh: id pekerjaan yang semua bangunannya penuh kuota }: tur tidak menawarkan pekerjaan yang tidak bisa langsung diambil. */
export async function GET() {
  try {
    return jawab({ penuh: await pekerjaanPenuh(sql) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { pekerjaan, tempat? }: tempat = id bangunan (penempatan atau lahan) tempat bekerja; tanpa tempat dipilih yang masih ada kursi. */
export const POST = aksi((id, b, kunci) => ambilPekerjaan(sql, id, kunci, String(b.pekerjaan ?? ''), new Date(), typeof b.tempat === 'string' ? b.tempat : null))
