// Edisi Koran yang ditulis Wali Kota dari /koran/tulis. Berlaku juga di server produksi, karena disimpan di basis data.
import { koran as edisiBerkas } from '@/data/koran'
import { adalahWalikota, cariSesi } from '@/server/akun'
import { Galat } from '@/server/galat'
import { bacaJson, galatKeJawaban, jawab, tokenSesi } from '@/server/http'
import { daftarKoran, galatEdisi, segarkanKoran } from '@/server/koran'
import { sql } from '@/server/sql'

async function wajibWalikota(): Promise<string> {
  const token = await tokenSesi()
  if (!(await adalahWalikota(sql, token))) throw new Galat('bukan_walikota', 'Hanya Wali Kota yang boleh menulis Koran.', 403)
  return (await cariSesi(sql, token))!
}

async function semua() {
  await segarkanKoran(sql, true)
  const berkas = new Set(edisiBerkas.map((e) => e.tanggal))
  const kota = new Set((await sql<{ tanggal: string }[]>`select tanggal from koran_edisi`).map((r) => r.tanggal))
  return daftarKoran().map((e) => ({ ...e, sumber: kota.has(e.tanggal) ? (berkas.has(e.tanggal) ? 'kota-ganti' : 'kota') : 'berkas' }))
}

export async function GET() {
  try {
    await wajibWalikota()
    return jawab({ edisi: await semua() })
  } catch (e) {
    return galatKeJawaban(e)
  }
}

/** { tanggal, berita, besok } menyimpan atau mengganti; { hapus: tanggal } menghapus edisi tulisan Wali Kota. */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req, 64_000)
    const id = await wajibWalikota()
    if (typeof b.hapus === 'string') {
      await sql`delete from koran_edisi where tanggal = ${b.hapus}`
    } else {
      const pesan = galatEdisi(b)
      if (pesan) throw new Galat('masukan_tidak_valid', pesan)
      const berita = (b.berita as Array<{ judul: string; isi: string[]; penulis?: string }>).map((x) => ({
        judul: x.judul.trim(), isi: x.isi.map((p) => p.trim()), ...(x.penulis ? { penulis: x.penulis } : {}),
      }))
      const besok = typeof b.besok === 'string' && b.besok.trim() ? b.besok.trim() : null
      await sql`
        insert into koran_edisi (tanggal, berita, besok, ditulis_oleh, diubah_pada)
        values (${b.tanggal as string}, ${sql.json(berita)}, ${besok}, ${id}, now())
        on conflict (tanggal) do update set berita = excluded.berita, besok = excluded.besok, ditulis_oleh = excluded.ditulis_oleh, diubah_pada = now()`
    }
    return jawab({ edisi: await semua() })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
