import { Galat } from '@/server/galat'
import { usaha, type PerintahUsaha } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, b, kunci) => {
  const p: PerintahUsaha | null =
    b.aksi === 'buka' ? { aksi: 'buka', jenis: String(b.jenis ?? '') }
    : b.aksi === 'ambil' ? { aksi: 'ambil', usaha: String(b.usaha ?? ''), ke: b.ke === 'gudang' ? 'gudang' : 'kas' }
    : b.aksi === 'upgrade' ? { aksi: 'upgrade', usaha: String(b.usaha ?? '') }
    : null
  if (!p) throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return usaha(sql, id, kunci, p)
})
