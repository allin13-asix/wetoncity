import { berobat } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, _b, kunci) => berobat(sql, id, kunci))
