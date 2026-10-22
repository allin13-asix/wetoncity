import { galatKeJawaban, jawab, wargaId } from '@/server/http'
import { cariWarga } from '@/server/sistem'
import { sql } from '@/server/sql'

/** ?cari=nama: warga (pemain) beserta status pertemanannya; tanpa kata kunci, yang paling baru aktif. */
export async function GET(req: Request) {
  try {
    return jawab({ warga: await cariWarga(sql, await wargaId(), new URL(req.url).searchParams.get('cari')) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
