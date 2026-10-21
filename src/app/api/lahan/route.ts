import { Galat } from '@/server/galat'
import { daftarLahan, lahan } from '@/server/game'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    return jawab(await daftarLahan(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/**
 * { aksi: 'beli', lahan }: beli lahan kota (di Balai Kota); { aksi: 'rumah' | 'bangun', lahan, bangunan? }: dirikan bangunan
 * (konstruksi butuh waktu). Pembelian dari NPC dan antarpemain ada di /api/properti.
 */
export const POST = aksi((id, b, kunci) => {
  if (b.aksi !== 'beli' && b.aksi !== 'rumah' && b.aksi !== 'bangun') throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return lahan(sql, id, kunci, b.aksi, String(b.lahan ?? ''), new Date(), typeof b.bangunan === 'string' ? b.bangunan : 'rumah')
})
