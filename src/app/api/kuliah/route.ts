import { Galat } from '@/server/galat'
import { kuliah, type PerintahKuliah } from '@/server/game'
import { aksi } from '@/server/http'
import { sql } from '@/server/sql'

export const POST = aksi((id, b, kunci) => {
  const p: PerintahKuliah | null =
    b.aksi === 'daftar' ? { aksi: 'daftar', jurusan: String(b.jurusan ?? '') }
    : b.aksi === 'ukt' || b.aksi === 'sesi' || b.aksi === 'berhenti' ? { aksi: b.aksi }
    : null
  if (!p) throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return kuliah(sql, id, kunci, p)
})
