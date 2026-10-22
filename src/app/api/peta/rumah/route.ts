// Rumah warga dan nama bangunan buatan pemiliknya, untuk peta kota. Publik: hanya nama panggilan, petak lahan, dan nama bangunan.
import { namaBangunan, rumahDiPeta } from '@/server/game'
import { galatKeJawaban, jawabPublik } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    const [rumah, nama] = await Promise.all([rumahDiPeta(sql), namaBangunan(sql)])
    return jawabPublik({ rumah, nama })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
