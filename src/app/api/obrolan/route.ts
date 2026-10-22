import { bacaJson, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { bacaRuang, kirimRuang, ruangSaya } from '@/server/obrolan'
import { sql } from '@/server/sql'

/** Tanpa parameter: ruang yang boleh kamu ikuti. ?ruang=global|hunian:<gedung>&setelah=n: pesan di ruang itu. */
export async function GET(req: Request) {
  try {
    const id = await wargaId()
    const q = new URL(req.url).searchParams
    const ruang = q.get('ruang')
    return jawab(ruang ? await bacaRuang(sql, id, ruang, q.get('setelah')) : { ruang: await ruangSaya(sql, id) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { ruang, isi } */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    return jawab(await kirimRuang(sql, await wargaId(), b.ruang, b.isi))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
