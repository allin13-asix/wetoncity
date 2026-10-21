import { buatSesi, masuk } from '@/server/akun'
import { muat } from '@/server/game'
import { bacaJson, galatKeJawaban, jawab, pasangKuki } from '@/server/http'
import { sql } from '@/server/sql'

export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    const id = await masuk(sql, b.email, b.sandi)
    const { token, kedaluwarsa } = await buatSesi(sql, id)
    await pasangKuki(token, kedaluwarsa)
    return jawab(await muat(sql, id))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
