import { panduanRoulette, putarRoulette } from '@/server/hiburan'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

/** Panduan roulette (aturan, tabel payout, batas taruhan) dan putaran terakhirmu. */
export async function GET() {
  try {
    return jawab(await panduanRoulette(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { taruhan: [{ jenis, nilai?, jumlah }] }: jenis lurus | merah | hitam | ganjil | genap | rendah | tinggi | lusin | kolom. */
export const POST = aksi((id, b, kunci) => putarRoulette(sql, id, kunci, b.taruhan))
