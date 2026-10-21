import { Galat } from '@/server/galat'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'
import { inventori, lihatInventori } from '@/server/sistem'

/** Isi inventori, kapasitas, dan surat di mailbox. */
export async function GET() {
  try {
    return jawab(await lihatInventori(sql, await wargaId()))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { aksi: 'pakai' | 'buang' | 'kirim' | 'klaim', barang?, jumlah?, ke?, surat? } */
export const POST = aksi((id, b, kunci) => {
  const barang = String(b.barang ?? '')
  switch (b.aksi) {
    case 'pakai':
      return inventori(sql, id, kunci, { aksi: 'pakai', barang })
    case 'buang':
      return inventori(sql, id, kunci, { aksi: 'buang', barang, jumlah: Number(b.jumlah) })
    case 'kirim':
      return inventori(sql, id, kunci, { aksi: 'kirim', ke: String(b.ke ?? ''), barang, jumlah: Number(b.jumlah) })
    case 'klaim':
      return inventori(sql, id, kunci, { aksi: 'klaim', surat: typeof b.surat === 'string' ? b.surat : null })
  }
  throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
})
