import { cariSesi } from '@/server/akun'
import { galatKeJawaban, jawab, tokenSesi } from '@/server/http'
import { sql } from '@/server/sql'

/** Ringan: hanya menjawab apakah ada sesi, tanpa menyelesaikan tagihan. Dipakai papan navigasi. */
export async function GET() {
  try {
    const id = await cariSesi(sql, await tokenSesi())
    if (!id) return jawab({ masuk: false })
    const [w] = await sql<{ nama: string }[]>`select nama from warga where id = ${id}`
    return jawab({ masuk: true, nama: w?.nama ?? '' })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
