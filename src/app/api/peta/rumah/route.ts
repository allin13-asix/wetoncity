// Rumah warga yang tampil di peta kota. Publik: hanya nama panggilan dan petak lahan.
import { rumahDiPeta } from '@/server/game'
import { galatKeJawaban, jawab } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    return jawab({ rumah: await rumahDiPeta(sql) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
