import { Galat } from '@/server/galat'
import { pasar, papanPasar, type PerintahPasar } from '@/server/game'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

export async function GET() {
  try {
    return jawab(await papanPasar(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

export const POST = aksi((id, b, kunci) => {
  const n = Number(b.jumlah)
  const p: PerintahPasar | null =
    b.aksi === 'beli_npc' || b.aksi === 'jual_npc' ? { aksi: b.aksi, barang: String(b.barang), jumlah: n }
    : b.aksi === 'buka_lapak' ? { aksi: 'buka_lapak', barang: String(b.barang), jumlah: n, harga: Number(b.harga) }
    : b.aksi === 'tutup_lapak' ? { aksi: 'tutup_lapak', lapak: String(b.lapak) }
    : b.aksi === 'beli_lapak' ? { aksi: 'beli_lapak', lapak: String(b.lapak), jumlah: n }
    : b.aksi === 'pakai' ? { aksi: 'pakai', barang: String(b.barang) }
    : null
  if (!p) throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  if ('lapak' in p && !/^[0-9a-f-]{36}$/.test(p.lapak)) throw new Galat('lapak_tidak_ada', 'Lapak itu tidak ditemukan.', 404)
  return pasar(sql, id, kunci, p)
})
