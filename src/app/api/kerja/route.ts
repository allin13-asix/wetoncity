import { kerja } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, b, kunci) => kerja(sql, id, kunci, Number(b.aksi)))
