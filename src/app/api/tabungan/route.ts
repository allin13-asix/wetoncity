import { Galat } from '@/server/galat'
import { tabungan } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, b, kunci) => {
  if (b.aksi !== 'setor' && b.aksi !== 'tarik') throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return tabungan(sql, id, kunci, b.aksi, Number(b.jumlah))
})
