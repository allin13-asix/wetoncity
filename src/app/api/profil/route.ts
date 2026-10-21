import { aksi, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { sql } from '@/server/sql'
import { aturProfil, profilPublik } from '@/server/sistem'

/** Profil publik warga (?id=...); tanpa id, profilmu sendiri. Tanpa uang, inventori, dan stats survival. */
export async function GET(req: Request) {
  try {
    const saya = await wargaId()
    const id = new URL(req.url).searchParams.get('id') || saya
    return jawab(await profilPublik(sql, saya, id))
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { properti: boolean }: tampilkan daftar propertimu di profil publik. */
export const POST = aksi((id, b, kunci) => aturProfil(sql, id, kunci, b.properti === true))
