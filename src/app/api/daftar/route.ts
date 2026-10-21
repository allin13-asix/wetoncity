import { buatSesi, daftar } from '@/server/akun'
import { Galat } from '@/server/galat'
import { muat } from '@/server/game'
import { bacaJson, galatKeJawaban, jawab, pasangKuki } from '@/server/http'
import { sql } from '@/server/sql'

export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    // Fase warga undangan: bila KODE_UNDANGAN diisi, pendaftaran butuh kode itu.
    const kode = process.env.KODE_UNDANGAN
    if (kode && b.kode !== kode) throw new Galat('kode_undangan_salah', 'Kode undangan salah atau belum diisi.', 403)
    const id = await daftar(sql, { email: b.email, nama: b.nama, sandi: b.sandi })
    const { token, kedaluwarsa } = await buatSesi(sql, id)
    await pasangKuki(token, kedaluwarsa)
    return jawab(await muat(sql, id), 201)
  } catch (e) {
    return galatKeJawaban(e)
  }
}
