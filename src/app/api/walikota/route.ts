import { Galat } from '@/server/galat'
import { kantorWalikota, type Perintah } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, b, kunci) => {
  const p: Perintah | null =
    b.aksi === 'uang' ? { aksi: 'uang', jumlah: Number(b.jumlah) }
    : b.aksi === 'tenaga' ? { aksi: 'tenaga' }
    : b.aksi === 'keahlian' ? { aksi: 'keahlian', nilai: Number(b.nilai) }
    : null
  if (!p) throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return kantorWalikota(sql, id, kunci, p)
})
