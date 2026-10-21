// UMK dan kebijakan ekonomi kota. GET untuk semua warga yang masuk; POST hanya Wali Kota.
import { Galat } from '@/server/galat'
import { infoKota, tetapkanUmk } from '@/server/game'
import { bacaJson, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    await wargaId()
    return jawab(await infoKota(sql))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { umk, alasan } menetapkan UMK baru. */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    const id = await wargaId()
    const umk = Number(b.umk)
    if (!Number.isFinite(umk)) throw new Galat('masukan_tidak_valid', 'UMK harus angka.')
    return jawab(await tetapkanUmk(sql, id, umk, typeof b.alasan === 'string' ? b.alasan.trim() : null))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
