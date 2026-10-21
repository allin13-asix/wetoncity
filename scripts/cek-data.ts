// Pemeriksa data Weton City. Jalankan: pnpm cek
// Gagal (exit 1) bila tata letak tumpang tindih atau data saling rujuk salah.
import { katalog, hiasan, jenisById } from '../src/data/bangunan.ts'
import {
  BEBAS_MUKA, JARAK_BANGUNAN, PETA, contohKotak, distrik, galatTataLetak, jalan, jarakKeGaris, kotakPenempatan, lahanKosong, penempatan, sungai,
  titikTerdekat, tumpang, zPantai, type Kotak,
} from '../src/data/tataletak.ts'
import { SYARAT_KEAHLIAN } from '../src/data/ekonomi.ts'
import { hunian } from '../src/data/hunian.ts'
import { koran } from '../src/data/koran.ts'
import { npc, npcInteraktif } from '../src/data/npc.ts'
import { pekerjaanProfesional, pekerjaanSmaSmk, semuaPekerjaan } from '../src/data/pekerjaan.ts'
import { jurusan } from '../src/data/pendidikan.ts'
import { tur } from '../src/data/tur.ts'
import { tanggalWIB } from '../src/server/aturan.ts'

const galat: string[] = []
const gagal = (pesan: string) => galat.push(pesan)

// --- katalog
const idKatalog = new Set<string>()
for (const j of [...katalog, ...hiasan]) {
  if (idKatalog.has(j.id)) gagal(`id katalog ganda: ${j.id}`)
  idKatalog.add(j.id)
}

// --- tata letak
for (const g of galatTataLetak) gagal(`tata letak: ${g}`)

/** Jalan terdekat dari titik, dengan jarak bersih ke tepi aspal (tepat, bukan grid). */
function jalanTerdekat(x: number, z: number) {
  let hasil = { nama: '', bersih: Infinity, x: 0, z: 0, d: 1 }
  for (const j of jalan) {
    const t = titikTerdekat(j.garis, x, z)
    if (t.d - j.lebar / 2 < hasil.bersih) hasil = { nama: j.nama, bersih: t.d - j.lebar / 2, x: t.x, z: t.z, d: t.d }
  }
  return hasil
}

function cekMedan(id: string, k: Kotak) {
  for (const [x, z] of contohKotak(k, 0.5)) {
    if (x < 0 || x > PETA.lebar || z > PETA.dalam) return gagal(`${id} keluar peta`)
    if (z < zPantai(x) + 0.5) return gagal(`${id} terlalu dekat laut di x=${x.toFixed(1)}`)
    const j = jalanTerdekat(x, z)
    if (j.bersih < 0.05) return gagal(`${id} menabrak ${j.nama}`)
    if (jarakKeGaris(sungai.garis, x, z) < sungai.lebar / 2 + 0.3) return gagal(`${id} masuk ke ${sungai.nama}`)
  }
}

const idPenempatan = new Set<string>()
const darat: Array<{ id: string; k: Kotak }> = []
for (const p of penempatan) {
  if (idPenempatan.has(p.id)) gagal(`id penempatan ganda: ${p.id}`)
  idPenempatan.add(p.id)
  const j = jenisById.get(p.jenis)
  if (!j) { gagal(`jenis tidak ada: ${p.jenis}`); continue }
  if (!distrik.some((d) => d.id === p.distrik)) gagal(`distrik tidak ada: ${p.distrik} (${p.id})`)
  if (j.diLaut) continue
  const k = kotakPenempatan(p)
  darat.push({ id: p.id, k })
  cekMedan(p.id, k)
  // muka bangunan (sisi +z model) harus menghadap jalan terdekat dan dekat dengannya
  if (!BEBAS_MUKA.has(p.jenis)) {
    const a = (p.rot * Math.PI) / 180
    const ux = Math.sin(a)
    const uz = Math.cos(a)
    const fx = p.x + (ux * k.d) / 2
    const fz = p.z + (uz * k.d) / 2
    const t = jalanTerdekat(fx, fz)
    const arah = ((t.x - fx) * ux + (t.z - fz) * uz) / (t.d || 1)
    if (t.bersih > 3.6) gagal(`${p.id}: muka ${t.bersih.toFixed(1)} petak dari jalan terdekat (${t.nama})`)
    else if (arah < 0.8) gagal(`${p.id}: muka tidak menghadap ${t.nama}`)
  }
}
for (const l of lahanKosong) {
  darat.push({ id: l.id, k: l })
  cekMedan(l.id, l)
  if (!distrik.some((d) => d.id === l.distrik)) gagal(`distrik tidak ada: ${l.distrik} (${l.id})`)
}
// bangunan dan lahan tidak berimpit dan tidak terlalu rapat
for (let a = 0; a < darat.length; a++) {
  for (let b = a + 1; b < darat.length; b++) {
    if (tumpang(darat[a].k, darat[b].k, JARAK_BANGUNAN - 0.05)) gagal(`terlalu rapat: ${darat[a].id} dan ${darat[b].id}`)
  }
}
for (const d of distrik) if (!penempatan.some((p) => p.distrik === d.id)) gagal(`distrik tanpa bangunan: ${d.id}`)

const jenisAda = new Set(penempatan.map((p) => p.jenis))
const idDistrik = new Set(distrik.map((d) => d.id))
const idPenempatanSet = new Set(penempatan.map((p) => p.id))

if (npc.length !== 100) gagal(`jumlah NPC harus 100, sekarang ${npc.length}`)
const idNpc = new Set<string>()
const namaNpc = new Set<string>()
for (const n of npc) {
  if (idNpc.has(n.id)) gagal(`id NPC ganda: ${n.id}`)
  if (namaNpc.has(n.nama)) gagal(`nama NPC ganda: ${n.nama}`)
  idNpc.add(n.id)
  namaNpc.add(n.nama)
  if (n.tempatKerja && !jenisAda.has(n.tempatKerja)) gagal(`${n.nama}: tempat kerja tidak ada di peta: ${n.tempatKerja}`)
  if (!jenisAda.has(n.tempatTinggal) && !idDistrik.has(n.tempatTinggal)) gagal(`${n.nama}: tempat tinggal tidak dikenal: ${n.tempatTinggal}`)
  if (n.interaktif && (!n.interaktif.fungsi || !n.interaktif.tawaran || !n.interaktif.sapaan)) gagal(`${n.nama}: data interaksi tidak lengkap`)
}
if (npcInteraktif.length < 15 || npcInteraktif.length > 25) gagal(`NPC interaktif harus 15 sampai 25, sekarang ${npcInteraktif.length}`)
if (npcInteraktif.filter((n) => n.interaktif?.fungsi === 'pemandu').length !== 1) gagal('harus ada tepat satu NPC pemandu')

const idKerja = new Set<string>()
for (const p of semuaPekerjaan) {
  if (idKerja.has(p.id)) gagal(`id pekerjaan ganda: ${p.id}`)
  idKerja.add(p.id)
  if (!jenisAda.has(p.tempat)) gagal(`${p.id}: tempat kerja tidak ada di peta: ${p.tempat}`)
  if (p.minKeahlian !== SYARAT_KEAHLIAN[p.tier]) gagal(`${p.id}: syarat Keahlian tidak sama dengan tier ${p.tier}`)
  if (pekerjaanSmaSmk.includes(p) && (p.pendidikan !== 'SMA/SMK' || p.tier > 3)) gagal(`${p.id}: pekerjaan SMA/SMK harus Tier 1 sampai 3`)
  if (pekerjaanProfesional.includes(p) && (p.pendidikan === 'SMA/SMK' || p.tier !== (p.pendidikan === 'D3' ? 4 : 5))) gagal(`${p.id}: D3 harus Tier 4 dan S1 harus Tier 5`)
  for (const j of p.jurusan ?? []) if (!jurusan.some((x) => x.id === j)) gagal(`${p.id}: jurusan tidak ada: ${j}`)
}
for (const j of jurusan) {
  for (const idp of j.membuka) {
    const p = semuaPekerjaan.find((x) => x.id === idp)
    if (!p) { gagal(`${j.id}: membuka pekerjaan yang tidak ada: ${idp}`); continue }
    if (p.pendidikan !== j.jenjang) gagal(`${j.id} (${j.jenjang}) membuka ${idp} yang butuh ${p.pendidikan}`)
    if (p.jurusan && !p.jurusan.includes(j.id)) gagal(`${j.id} membuka ${idp}, tetapi ${idp} tidak menerima jurusan itu`)
  }
}
for (const p of pekerjaanProfesional) {
  const dibuka = jurusan.some((j) => j.membuka.includes(p.id))
  if (!dibuka) gagal(`${p.id}: tidak ada jurusan yang membukanya`)
}
for (const h of hunian) for (const b of h.bangunan) if (!jenisAda.has(b)) gagal(`hunian ${h.id}: bangunan tidak ada di peta: ${b}`)
tur.forEach((t, i) => { if (!idPenempatanSet.has(t.bangunan)) gagal(`tur langkah ${i + 1}: bangunan tidak ada: ${t.bangunan}`) })

// Koran Weton: tanggal sah dan menaik, isi tidak kosong, penulis adalah NPC
const tanggalAda = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && new Date(`${t}T00:00:00Z`).toISOString().slice(0, 10) === t
let edisiSebelumnya = ''
for (const e of koran) {
  if (!tanggalAda(e.tanggal)) gagal(`koran: tanggal tidak valid: ${e.tanggal}`)
  else if (e.tanggal <= edisiSebelumnya) gagal(`koran ${e.tanggal}: harus lebih baru dari edisi sebelumnya (${edisiSebelumnya})`)
  edisiSebelumnya = e.tanggal
  if (!e.berita.length) gagal(`koran ${e.tanggal}: tidak ada berita`)
  if (e.besok !== undefined && !e.besok.trim()) gagal(`koran ${e.tanggal}: teks "besok" kosong`)
  e.berita.forEach((b, i) => {
    const id = `koran ${e.tanggal}, berita ${i + 1}`
    if (!b.judul.trim() || b.judul.length > 100) gagal(`${id}: judul kosong atau lebih dari 100 huruf`)
    if (!b.isi.length || b.isi.some((p) => !p.trim())) gagal(`${id}: isi kosong`)
    if (b.penulis && !namaNpc.has(b.penulis)) gagal(`${id}: penulis bukan NPC: ${b.penulis}`)
  })
}
const stokKoran = koran.filter((e) => e.tanggal > tanggalWIB(new Date())).length

console.log(`katalog ${katalog.length} jenis, ${hiasan.length} hiasan, ${penempatan.length} penempatan, ${lahanKosong.length} lahan kosong, ${jalan.length} jalan`)
console.log(`NPC ${npc.length} (${npcInteraktif.length} interaktif), pekerjaan ${semuaPekerjaan.length} (${pekerjaanSmaSmk.length} SMA/SMK), jurusan ${jurusan.length}, hunian ${hunian.length}, tur ${tur.length} langkah`)
console.log(`Koran Weton ${koran.length} edisi, terakhir ${edisiSebelumnya || '-'}, ${stokKoran} edisi menunggu terbit`)
if (stokKoran < 3) console.log('  PERINGATAN: stok edisi Koran Weton hampir habis. Tulis edisi baru di src/data/koran.ts.')

if (galat.length) {
  console.error(`\n${galat.length} masalah:`)
  for (const g of galat) console.error(' -', g)
  process.exit(1)
}
console.log('OK')
