import { galatKeJawaban, jawab, bacaJson, wargaId } from '@/server/http'
import { bacaUtas, daftarPercakapan, kirimPribadi } from '@/server/obrolan'
import { sql } from '@/server/sql'

/** Tanpa parameter: daftar percakapan pribadi. ?dengan=id&setelah=n: utas dengan satu warga (pesan darinya ditandai dibaca). */
export async function GET(req: Request) {
  try {
    const id = await wargaId()
    const q = new URL(req.url).searchParams
    const dengan = q.get('dengan')
    return jawab(dengan ? await bacaUtas(sql, id, dengan, q.get('setelah')) : { percakapan: await daftarPercakapan(sql, id) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { ke, isi }: kirim pesan pribadi ke warga mana pun, teman atau bukan. */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    return jawab(await kirimPribadi(sql, await wargaId(), b.ke, b.isi))
  } catch (e) {
    return galatKeJawaban(e)
  }
}
