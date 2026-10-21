import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'
import { bacaPesan, kirimPesan } from '@/server/sistem'

export async function GET() {
  try {
    return jawab(await bacaPesan(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { ke, isi } */
export const POST = aksi((id, b, kunci) => kirimPesan(sql, id, kunci, String(b.ke ?? ''), b.isi))
