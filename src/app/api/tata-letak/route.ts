// Simpan tata letak dari editor Wali Kota. Hanya di mode pengembangan: berkas src/data/tataletak-kustom.ts ditulis ulang,
// server dev memuat ulang peta, lalu tata letak ikut ter-commit seperti data lain.
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { bacaJson, galatKeJawaban, jawab } from '@/server/http'
import { izinEditor, periksa } from '@/server/tataletak-editor'

export async function POST(req: Request) {
  try {
    const b = await bacaJson(req, 512_000)
    await izinEditor()
    const k = periksa(b)
    const isi = k
      ? `{\n  "jalan": [\n${k.jalan.map((j) => `    ${JSON.stringify(j)}`).join(',\n')}\n  ],\n  "bangunan": [\n${k.bangunan.map((x) => `    ${JSON.stringify(x)}`).join(',\n')}\n  ],\n  "lahan": [\n${k.lahan.map((l) => `    ${JSON.stringify(l)}`).join(',\n')}\n  ]\n}`
      : 'null'
    const berkas = `// Tata letak kustom dari editor Wali Kota (/editor). Berkas ini ditulis ulang oleh editor saat menyimpan.
// null berarti memakai tata letak otomatis (deret di tataletak.ts). Pohon, semak, dan lampu selalu dihitung ulang dari jalan.

export type JalanKustom = { id: string; nama: string; lebar: number; titik: Array<[number, number]>; tutup?: boolean }
export type BangunanKustom = { jenis: string; x: number; z: number; rot: number; distrik: string }
export type LahanKustom = { id: string; x: number; z: number; rot: number; w: number; d: number; distrik: string }
export type TataLetakKustom = { jalan: JalanKustom[]; bangunan: BangunanKustom[]; lahan: LahanKustom[] }

export const kustom: TataLetakKustom | null = ${isi}
`
    await writeFile(join(process.cwd(), 'src', 'data', 'tataletak-kustom.ts'), berkas, 'utf8')
    return jawab({ ok: true, kustom: k !== null })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
