import { Galat } from '@/server/galat'
import { galatKeJawaban, jawab } from '@/server/http'
import { pekerjaBangunan } from '@/server/sistem'
import { sql } from '@/server/sql'

/** Pekerja (NPC dan pemain) dan lowongan beserta kuotanya di satu bangunan (?tempat=id penempatan atau lahan). Publik. */
export async function GET(req: Request) {
  try {
    const tempat = new URL(req.url).searchParams.get('tempat')
    if (!tempat) throw new Galat('tempat_kosong', 'Sebutkan bangunannya.')
    return jawab(await pekerjaBangunan(sql, tempat))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
