import { aksi } from '@/server/http'
import { ikutSeleksi } from '@/server/sistem'
import { sql } from '@/server/sql'

/** { pekerjaan, tempat? }: ikut seleksi PNS, polisi, atau tentara untuk satu pekerjaan. */
export const POST = aksi((id, b, kunci) => ikutSeleksi(sql, id, kunci, String(b.pekerjaan ?? ''), new Date(), undefined, typeof b.tempat === 'string' ? b.tempat : null))
