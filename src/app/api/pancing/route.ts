import { Galat } from '@/server/galat'
import { infoPancing, pancing } from '@/server/hiburan'
import { aksi, galatKeJawaban, jawab } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    return jawab(infoPancing())
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { aksi: 'lempar' | 'tarik' | 'batal' } */
export const POST = aksi((id, b, kunci) => {
  if (b.aksi !== 'lempar' && b.aksi !== 'tarik' && b.aksi !== 'batal') throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return pancing(sql, id, kunci, { aksi: b.aksi })
})
