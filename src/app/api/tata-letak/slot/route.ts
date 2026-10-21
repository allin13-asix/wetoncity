// Slot simpanan tata letak di editor Wali Kota. Disimpan di db/tataletak-slot.json, hanya di server pengembangan.
// Slot tidak langsung mengubah peta; "Terapkan ke peta" di editor tetap lewat /api/tata-letak.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TataLetakKustom } from '@/data/tataletak-kustom'
import { Galat } from '@/server/galat'
import { bacaJson, galatKeJawaban, jawab } from '@/server/http'
import { izinEditor, periksa } from '@/server/tataletak-editor'

const JUMLAH_SLOT = 6
type Slot = { nama: string; waktu: string; kustom: TataLetakKustom }
const BERKAS = join(process.cwd(), 'db', 'tataletak-slot.json')

async function baca(): Promise<Array<Slot | null>> {
  const isi = await readFile(BERKAS, 'utf8').catch(() => '[]')
  const d = JSON.parse(isi) as Array<Slot | null>
  return Array.from({ length: JUMLAH_SLOT }, (_, i) => d[i] ?? null)
}

export async function GET() {
  try {
    await izinEditor()
    return jawab({ slot: await baca() })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { slot, nama, kustom } menyimpan; { slot, hapus: true } mengosongkan. */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req, 512_000)
    await izinEditor()
    const i = b.slot
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= JUMLAH_SLOT) throw new Galat('masukan_tidak_valid', 'Slot tidak dikenal.')
    const semua = await baca()
    if (b.hapus === true) semua[i] = null
    else {
      const k = periksa(b)
      if (!k) throw new Galat('masukan_tidak_valid', 'Slot butuh tata letak.')
      const nama = typeof b.nama === 'string' && b.nama.trim() ? b.nama.trim().slice(0, 40) : `Slot ${i + 1}`
      semua[i] = { nama, waktu: new Date().toISOString(), kustom: k }
    }
    await writeFile(BERKAS, JSON.stringify(semua), 'utf8')
    return jawab({ slot: semua })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
