import { Galat } from '@/server/galat'
import { daftarKamarTamu, numpang, type PerintahNumpang } from '@/server/game'
import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'

const uuid = (x: unknown) => {
  const s = String(x ?? '')
  if (!/^[0-9a-f-]{36}$/.test(s)) throw new Galat('tidak_ditemukan', 'Data itu tidak ditemukan.', 404)
  return s
}

export async function GET() {
  try {
    return jawab({ rumah: await daftarKamarTamu(sql, await wargaId()) })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

export const POST = aksi((id, b, kunci) => {
  const p: PerintahNumpang | null =
    b.aksi === 'atur' ? { aksi: 'atur', terima: b.terima === true, uangDapur: Number(b.uangDapur) }
    : b.aksi === 'setujui' || b.aksi === 'tolak' ? { aksi: b.aksi, permintaan: uuid(b.permintaan) }
    : b.aksi === 'minta' ? { aksi: 'minta', pemilik: uuid(b.pemilik) }
    : b.aksi === 'berhenti' ? { aksi: 'berhenti' }
    : null
  if (!p) throw new Galat('perintah_tidak_dikenal', 'Perintah tidak dikenal.')
  return numpang(sql, id, kunci, p)
})
