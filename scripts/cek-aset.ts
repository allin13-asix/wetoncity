// Audit model 3D: segitiga, ukuran nyata dibanding ukuran di katalog, dan beban seluruh kota.
// Jalankan: pnpm aset. Gagal bila ada model yang keluar dari petaknya lebih dari batas wajar.
import { geometriModel, jumlahSegitiga } from '../src/aset/index.ts'
import { hiasan, jenisById, katalog } from '../src/data/bangunan.ts'
import { penempatan, sebaran } from '../src/data/tataletak.ts'

const BATAS_LUAR = 0.8 // atap menjorok, kanopi, dan derek boleh keluar sejauh ini
const galat: string[] = []
const baris: string[] = []
let kotaSegitiga = 0
let kotaMesh = 0

const hitung = new Map<string, number>()
for (const p of penempatan) hitung.set(p.jenis, (hitung.get(p.jenis) ?? 0) + 1)

for (const j of katalog) {
  const g = geometriModel(j.model, j.ukuran, j.varian ?? {}, 0)
  const b = g.boundingBox!
  const w = b.max.x - b.min.x
  const d = b.max.z - b.min.z
  const keluarX = Math.max(-b.min.x - j.ukuran[0] / 2, b.max.x - j.ukuran[0] / 2)
  const keluarZ = Math.max(-b.min.z - j.ukuran[1] / 2, b.max.z - j.ukuran[1] / 2)
  const tri = jumlahSegitiga(g)
  const n = hitung.get(j.id) ?? 0
  kotaSegitiga += tri * n
  kotaMesh += n
  baris.push(`${j.id.padEnd(20)} ${String(tri).padStart(5)} segitiga  ${w.toFixed(1)} x ${d.toFixed(1)} x ${b.max.y.toFixed(1)}  (katalog ${j.ukuran[0]} x ${j.ukuran[1]})  x${n}`)
  if (keluarX > BATAS_LUAR || keluarZ > BATAS_LUAR) {
    const catatan = `${j.id}: keluar petak ${Math.max(keluarX, keluarZ).toFixed(1)} petak`
    // derek peti kemas dan kapal memang menjorok ke laut
    if (j.id === 'lapangan-kontainer') baris.push(`  catatan: ${catatan} (boom derek di atas kade)`)
    else galat.push(catatan)
  }
}
let hiasanSegitiga = 0
for (const h of hiasan) {
  const tri = jumlahSegitiga(geometriModel(h.model, h.ukuran))
  const n = h.id === 'pohon-rindang' ? sebaran.rindang.length : h.id === 'pohon-kelapa' ? sebaran.kelapa.length : h.id === 'lampu-jalan' ? sebaran.lampu.length : h.id === 'semak' ? sebaran.semak.length : h.id === 'angkot' || h.id === 'mobil' ? 2 : 0
  hiasanSegitiga += tri * n
  baris.push(`${h.id.padEnd(20)} ${String(tri).padStart(5)} segitiga  x${n}`)
}

console.log(baris.join('\n'))
console.log(`\nBangunan: ${kotaMesh} mesh, ${kotaSegitiga.toLocaleString('id-ID')} segitiga`)
console.log(`Hiasan dan kendaraan: ${hiasanSegitiga.toLocaleString('id-ID')} segitiga (pohon dan lampu memakai instancing)`)
console.log(`Total kota: sekitar ${(kotaSegitiga + hiasanSegitiga).toLocaleString('id-ID')} segitiga`)
void jenisById

if (galat.length) {
  console.error(`\n${galat.length} masalah:`)
  for (const g of galat) console.error(' -', g)
  process.exit(1)
}
console.log('OK')
