import { Galat } from '@/server/galat'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { daftarProperti, properti, type PerintahProperti } from '@/server/properti'
import { sql } from '@/server/sql'

/** Semua lahan kota, rumah NPC yang dijual, properti pemain yang dijual, dan tawaranmu. */
export async function GET() {
  try {
    return jawab(await daftarProperti(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** Lihat PerintahProperti di src/server/properti.ts. Pembelian lahan dari kota ada di /api/lahan (aksi 'beli', di Balai Kota). */
export const POST = aksi((id, b, kunci) => {
  const s = (k: string) => String(b[k] ?? '')
  let p: PerintahProperti
  switch (b.aksi) {
    case 'beli_npc':
      p = { aksi: 'beli_npc', properti: s('properti') }
      break
    case 'nama':
      p = { aksi: 'nama', lahan: s('lahan'), nama: b.nama }
      break
    case 'jual':
      p = { aksi: 'jual', lahan: s('lahan'), mode: b.mode as 'tidak' | 'tetap' | 'negosiasi', harga: Number(b.harga) }
      break
    case 'beli_tetap':
      p = { aksi: 'beli_tetap', lahan: s('lahan') }
      break
    case 'tawar':
      p = { aksi: 'tawar', lahan: s('lahan'), harga: Number(b.harga) }
      break
    case 'tawar_balik':
      p = { aksi: 'tawar_balik', tawaran: s('tawaran'), harga: Number(b.harga) }
      break
    case 'terima':
    case 'tolak':
      p = { aksi: b.aksi, tawaran: s('tawaran') }
      break
    default:
      throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  }
  return properti(sql, id, kunci, p)
})
