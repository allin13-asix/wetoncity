import { kursus } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

/** { kursus? }: 'keahlian' (bawaan) atau id kursus atribut (lihat LATIHAN.atribut di src/data/balans.ts). */
export const POST = aksi((id, b, kunci) => kursus(sql, id, kunci, new Date(), typeof b.kursus === 'string' ? b.kursus : 'keahlian'))
