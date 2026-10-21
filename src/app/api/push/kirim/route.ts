// Pemicu pengiriman pengingat untuk layanan cron dari luar: POST dengan header Authorization: Bearer <PUSH_RAHASIA>.
// Aman dipanggil tiap jam; tiap perangkat paling banyak menerima satu pengingat per 20 jam, hanya pukul 07.00 sampai 21.00 WIB.
import { timingSafeEqual } from 'node:crypto'
import { Galat } from '@/server/galat'
import { galatKeJawaban, jawab } from '@/server/http'
import { kirimPengingat } from '@/server/push'
import { sql } from '@/server/sql'

export async function POST(req: Request) {
  try {
    const rahasia = process.env.PUSH_RAHASIA
    const dikirim = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '')
    if (!rahasia || dikirim.length !== Buffer.byteLength(rahasia) || !timingSafeEqual(dikirim, Buffer.from(rahasia))) {
      throw new Galat('ditolak', 'Ditolak.', 401)
    }
    return jawab(await kirimPengingat(sql))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
