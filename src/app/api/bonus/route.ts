import { klaimBonus } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, _b, kunci) => klaimBonus(sql, id, kunci))
