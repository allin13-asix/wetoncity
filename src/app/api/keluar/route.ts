import { hapusSesi } from '@/server/akun'
import { bacaJson, galatKeJawaban, hapusKuki, jawab, tokenSesi } from '@/server/http'
import { sql } from '@/server/sql'

export async function POST(req: Request) {
  try {
    await bacaJson(req)
    await hapusSesi(sql, await tokenSesi())
    await hapusKuki()
    return jawab({ ok: true })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
