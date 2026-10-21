import { Galat } from '@/server/galat'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'
import { daftarTeman, teman } from '@/server/sistem'

/** Teman, permintaan masuk dan keluar, dan teman sekamar. */
export async function GET() {
  try {
    return jawab(await daftarTeman(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { aksi: 'tambah' | 'terima' | 'tolak' | 'putus', warga } */
export const POST = aksi((id, b, kunci) => {
  if (b.aksi !== 'tambah' && b.aksi !== 'terima' && b.aksi !== 'tolak' && b.aksi !== 'putus') throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return teman(sql, id, kunci, { aksi: b.aksi, warga: String(b.warga ?? '') })
})
