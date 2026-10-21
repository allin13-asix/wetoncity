import { riwayat } from '@/server/game'
import { galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET(req: Request) {
  try {
    const batas = Number(new URL(req.url).searchParams.get('batas') ?? 30)
    return jawab(await riwayat(sql, await wargaId(), batas))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
