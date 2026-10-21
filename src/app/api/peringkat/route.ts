import { cariSesi } from '@/server/akun'
import { galatKeJawaban, jawab, tokenSesi } from '@/server/http'
import { papanPeringkat } from '@/server/kemajuan'
import { sql } from '@/server/sql'

/** Peringkat reputasi global dan mingguan, tabel hadiah mingguan, dan snapshot pekan lalu. Publik; peringkatmu terisi bila sudah masuk. */
export async function GET() {
  try {
    const id = (await cariSesi(sql, await tokenSesi())) ?? '00000000-0000-0000-0000-000000000000'
    return jawab(await papanPeringkat(sql, id, new Date()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
