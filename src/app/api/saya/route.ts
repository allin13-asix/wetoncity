import { muat } from '@/server/game'
import { galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    return jawab(await muat(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
