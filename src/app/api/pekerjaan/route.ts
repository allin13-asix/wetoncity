import { ambilPekerjaan } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

/** { pekerjaan, tempat? }: tempat = id bangunan (penempatan atau lahan) tempat bekerja; tanpa tempat dipilih yang masih ada kursi. */
export const POST = aksi((id, b, kunci) => ambilPekerjaan(sql, id, kunci, String(b.pekerjaan ?? ''), new Date(), typeof b.tempat === 'string' ? b.tempat : null))
