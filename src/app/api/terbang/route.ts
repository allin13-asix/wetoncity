import { terbang } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, b, kunci) => terbang(sql, id, kunci, String(b.tujuan ?? '')))
