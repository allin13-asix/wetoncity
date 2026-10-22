import { Galat } from '@/server/galat'
import { bacaJson, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { daftarAdegan, detakAdegan, keluarAdegan, masukAdegan } from '@/server/ruang'
import { sql } from '@/server/sql'

/** Ruang alun-alun, taman, dan gedung hunianmu beserta isinya. */
export async function GET() {
  try {
    return jawab(await daftarAdegan(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { aksi: 'masuk', jenis, ruang? } | { aksi: 'detak', ruang, setelah, x, y } | { aksi: 'keluar' } */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    const id = await wargaId()
    if (b.aksi === 'masuk') return jawab(await masukAdegan(sql, id, b.jenis, b.ruang))
    if (b.aksi === 'detak') return jawab(await detakAdegan(sql, id, b.ruang, b.setelah, b.x, b.y))
    if (b.aksi === 'keluar') return jawab(await keluarAdegan(sql, id))
    throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  } catch (e) {
    return galatKeJawaban(e)
  }
}
