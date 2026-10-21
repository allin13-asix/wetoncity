// Wali Kota boleh membaca edisi Koran yang belum terbit. Tanpa sesi tidak menyentuh basis data; galat basis data berarti bukan pratinjau.
import { adalahWalikota } from './akun.ts'
import { tokenSesi } from './http.ts'
import { sql } from './sql.ts'

export async function bolehPratinjau(): Promise<boolean> {
  try {
    return await adalahWalikota(sql, await tokenSesi())
  } catch {
    return false
  }
}
