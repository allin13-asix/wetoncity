// Simulasi ekonomi Weton City per hari. Jalankan: pnpm sim
// Memakai angka dari src/data. Gagal (exit 1) bila angka melanggar maksud desain di docs/EKONOMI.md.
// Cakupan: kerja, kursus, kuliah, tagihan, pajak, bonus harian, perjalanan, usaha, rumah sendiri, dan tabungan.
// Pasar antarwarga dan numpang hanya memindahkan uang antarwarga (bukan faucet), jadi tidak disimulasikan.
import assert from 'node:assert/strict'
import {
  AKSI_SEBULAN, BONUS_HARIAN, HARI_PER_SIKLUS, KURSUS, MODAL_AWAL, gajiTier, SYARAT_KEAHLIAN, TENAGA, USAHA,
  kursusBiaya, labaHarian, pajakBulanan, pengaliUpah, rupiah, upgradeBalikModal, upgradeBiaya, type Tier,
} from '../src/data/ekonomi.ts'
import { biayaBulan, hunian, type Hunian } from '../src/data/hunian.ts'
import { KULIAH, jurusan } from '../src/data/pendidikan.ts'
import {
  AKSI_CULABAYA, BANK, HASIL_SOLOE, JENIS_USAHA, LAHAN, TERBANG, TUJUAN, USAHA_ATURAN, biayaUpgradeUsaha, hargaLahan, labaSiklus, type JenisUsaha,
} from '../src/server/aturan.ts'

type Pemain = {
  /** 1 sesi sehari (santai) atau 2 sesi (aktif) */
  sesi: 1 | 2
  hunianId: string
  kuliah?: { jurusanId: string; mulaiHari: number }
  /** false: tidak ikut kursus sama sekali (uji kesetaraan server; kursus di server kini berdurasi dan bersyarat atribut) */
  kursus?: boolean
}
type Hasil = ReturnType<typeof simulasi>

const bulatRibu = (n: number) => Math.round(n / 1000) * 1000
export const tagihanDasar = (h: Hunian) => biayaBulan(h)
/** Sama dengan upahAksi di server: gaji tier sebulan dibagi 70 aksi, dikali bonus Keahlian. */
const upahSim = (tier: Tier, skill: number, aksi: number) => aksi * Math.round((gajiTier(tier) / AKSI_SEBULAN) * pengaliUpah(skill))

function tierDari(skill: number, gelar: 'D3' | 'S1' | null): Tier {
  let tier: Tier = 1
  for (const t of [2, 3] as const) if (skill >= SYARAT_KEAHLIAN[t]) tier = t
  if (gelar === 'D3' && skill >= SYARAT_KEAHLIAN[4]) tier = 4
  if (gelar === 'S1' && skill >= SYARAT_KEAHLIAN[5]) tier = 5
  return tier
}

export function simulasi(p: Pemain, hari: number) {
  const h = hunian.find((x) => x.id === p.hunianId)!
  const tagihan = tagihanDasar(h)
  const tenagaMaks = TENAGA.maks + h.tenagaMaks
  const tenagaHarian = p.sesi === 1 ? tenagaMaks : Math.min(2 * tenagaMaks, TENAGA.pulihPerJam * 24)
  const jur = p.kuliah ? jurusan.find((j) => j.id === p.kuliah!.jurusanId)! : undefined

  let kas = MODAL_AWAL
  let skill = 1
  let gelar: 'D3' | 'S1' | null = null
  let upahMinggu = 0
  let kasbon = 0
  let faucet = 0
  let sink = 0
  let kasMin = kas
  let semesterSelesai = 0
  let hariKuliah = -1 // -1 berarti tidak sedang dalam semester
  const tierHari: Partial<Record<Tier, number>> = {}
  let hariGelar: number | undefined
  const kasHarian: number[] = []

  for (let d = 1; d <= hari; d++) {
    kas += BONUS_HARIAN
    faucet += BONUS_HARIAN
    let t = tenagaHarian

    // kuliah: UKT dibayar di awal semester, kehadiran memakai Tenaga pada 5 hari pertama
    if (jur && !gelar) {
      if (hariKuliah < 0 && d >= p.kuliah!.mulaiHari && kas >= jur.ukt + tagihan) {
        kas -= jur.ukt
        sink += jur.ukt
        hariKuliah = 0
      }
      if (hariKuliah >= 0) {
        hariKuliah++
        if (hariKuliah <= KULIAH.sesiPerSemester) t -= KULIAH.tenagaPerSesi
        if (hariKuliah >= KULIAH.hariPerSemester) {
          hariKuliah = -1
          semesterSelesai++
          if (semesterSelesai === jur.semester) {
            gelar = jur.jenjang
            hariGelar = d
          }
        }
      }
    }

    // kursus: sampai level 6 selama kas aman, sesudahnya hanya bila kas longgar (3 kali tagihan)
    while (p.kursus !== false && skill < KURSUS.skillMaks && t >= TENAGA.kursus) {
      const biaya = bulatRibu(kursusBiaya(skill) * (1 - h.kursusDiskon))
      const aman = skill < 6 ? tagihan : tagihan * 3
      if (kas - biaya < aman) break
      kas -= biaya
      sink += biaya
      t -= TENAGA.kursus
      skill++
    }

    const tier = tierDari(skill, gelar)
    tierHari[tier] ??= d
    const aksi = Math.floor(Math.max(0, t) / TENAGA.aksiKerja)
    const upah = upahSim(tier, skill, aksi)
    kas += upah
    faucet += upah
    upahMinggu += upah

    if (d % HARI_PER_SIKLUS === 0) {
      const tagih = tagihan + pajakBulanan(upahMinggu)
      if (kas >= tagih) kas -= tagih
      else {
        kasbon += tagih - kas
        kas = 0
      }
      sink += tagih
      upahMinggu = 0
    }
    kasMin = Math.min(kasMin, kas)
    kasHarian.push(kas)
  }
  return { tierHari, hariGelar, kas, kasMin, kasbon, faucet, sink, rasio: sink / faucet, skill, kasHarian }
}

/**
 * Pemain aktif (dua sesi sehari, Kost Melati) yang memakai fitur kota: setelah Keahlian 6 membuka perahu lalu warung,
 * menaikkan level usaha, membeli lahan dan membangun rumah lalu pindah ke rumah sendiri, dan menabung kelebihan uang.
 * `soloe`: ikut penerbangan Soloe tiap malam (sekali sehari). kasHarian di sini = kas + tabungan.
 */
export function simulasiLengkap(hari: number, soloe: boolean) {
  const kost = hunian.find((x) => x.id === 'kost-melati')!
  const rumahSendiri = hunian.find((x) => x.id === 'rumah-sendiri')!
  let tagihan = tagihanDasar(kost)
  const tenagaHarian = Math.min(2 * TENAGA.maks, TENAGA.pulihPerJam * 24)
  const hargaRumah = hargaLahan({ w: 6, d: 4.6 }) + LAHAN.biayaRumah
  const urutan: JenisUsaha[] = ['perahu', 'warung']
  const usaha: Array<{ jenis: JenisUsaha; level: number }> = []
  let kas = MODAL_AWAL
  let tabungan = 0
  let skill = 1
  let upahMinggu = 0
  let kasbon = 0
  let faucet = 0
  let sink = 0
  let rumah = false
  let usahaHari: number | undefined
  let rumahHari: number | undefined
  const kasHarian: number[] = []
  const keluar = (n: number) => {
    kas -= n
    sink += n
  }
  const masuk = (n: number) => {
    kas += n
    faucet += n
  }

  for (let d = 1; d <= hari; d++) {
    masuk(BONUS_HARIAN)
    let t = tenagaHarian
    while (skill < KURSUS.skillMaks && t >= TENAGA.kursus) {
      const biaya = bulatRibu(kursusBiaya(skill))
      if (kas - biaya < (skill < 6 ? tagihan : tagihan * 3)) break
      keluar(biaya)
      t -= TENAGA.kursus
      skill++
    }
    // ambil hasil usaha sekali sehari (6 siklus), 5 Tenaga per usaha
    for (const u of usaha) {
      t -= USAHA_ATURAN.tenagaAmbil
      masuk(USAHA_ATURAN.simpanMaks * labaSiklus(u.jenis, u.level))
    }
    const tier = tierDari(skill, null)
    const upah = upahSim(tier, skill, Math.floor(Math.max(0, t) / TENAGA.aksiKerja))
    masuk(upah)
    upahMinggu += upah
    if (soloe && kas >= TUJUAN.soloe.tiket + tagihan) {
      keluar(TUJUAN.soloe.tiket)
      masuk(HASIL_SOLOE)
    }

    // keputusan belanja besar setelah mapan, selalu menyisakan tiga kali tagihan
    const cadangan = tagihan * 3
    if (skill >= 6) {
      const berikut = urutan[usaha.length]
      if (berikut && kas >= JENIS_USAHA[berikut].modal + cadangan) {
        keluar(JENIS_USAHA[berikut].modal)
        usaha.push({ jenis: berikut, level: 1 })
        usahaHari ??= d
      }
      if (!rumah && usaha.length === urutan.length && kas + tabungan >= hargaRumah + cadangan) {
        const ambil = Math.max(0, hargaRumah + cadangan - kas)
        tabungan -= ambil
        kas += ambil
        keluar(hargaRumah)
        rumah = true
        rumahHari = d
        tagihan = tagihanDasar(rumahSendiri)
      }
      const termurah = [...usaha].sort((a, b) => a.level - b.level)[0]
      if (rumah && termurah && termurah.level < USAHA_ATURAN.levelMaks && kas >= biayaUpgradeUsaha(termurah.jenis, termurah.level) + cadangan) {
        keluar(biayaUpgradeUsaha(termurah.jenis, termurah.level))
        termurah.level++
      }
    }

    if (d % HARI_PER_SIKLUS === 0) {
      const bunga = Math.floor(tabungan * BANK.bungaPerSiklus)
      tabungan += bunga
      faucet += bunga
      const tagih = tagihan + pajakBulanan(upahMinggu)
      if (kas >= tagih) keluar(tagih)
      else {
        kasbon += tagih - kas
        sink += tagih
        kas = 0
      }
      upahMinggu = 0
      // kelebihan di atas sepuluh kali tagihan disimpan di bank
      const lebih = kas - tagihan * 10
      if (lebih > 0 && rumah) {
        kas -= lebih
        tabungan += lebih
      }
    }
    kasHarian.push(kas + tabungan)
  }
  return { kas, tabungan, kasbon, faucet, sink, rasio: sink / faucet, skill, kasHarian, usahaHari, rumahHari }
}

const jt = (n: number) => `${(n / 1_000_000).toFixed(1)} jt`
const hariTier = (r: Hasil, t: Tier) => (r.tierHari[t] === undefined ? '-' : String(r.tierHari[t]))
/** Hari pertama (setelah hari 70) saat kas a sudah mencapai kas b. 0 bila tidak pernah. */
const susul = (a: Hasil, b: Hasil) => a.kasHarian.findIndex((k, i) => i > 70 && k >= b.kasHarian[i]) + 1

if (process.argv[1]?.endsWith('sim-ekonomi.ts')) {
  console.log(`Uang saku ${rupiah(MODAL_AWAL)}, bonus harian ${rupiah(BONUS_HARIAN)}\n`)

  // 1. Pilihan tempat tinggal
  console.log('Tempat tinggal: tagihan dasar per bulan kota (7 hari), hari mencapai tier 2 dan 3, kas hari 30, kasbon')
  const tinggal: Record<string, { santai: Hasil; aktif: Hasil }> = {}
  for (const h of hunian.filter((x) => x.fase === 0)) {
    const santai = simulasi({ sesi: 1, hunianId: h.id }, 180)
    const aktif = simulasi({ sesi: 2, hunianId: h.id }, 180)
    tinggal[h.id] = { santai, aktif }
    const baris = (nama: string, r: Hasil) =>
      `   ${nama.padEnd(7)} T2 hari ${hariTier(r, 2).padStart(2)}  T3 hari ${hariTier(r, 3).padStart(2)}  kas30 ${jt(r.kasHarian[29]).padStart(8)}  kasbon ${jt(r.kasbon)}`
    console.log(`${h.nama.padEnd(16)} ${rupiah(tagihanDasar(h)).padStart(13)}/bulan`)
    console.log(baris('santai', santai))
    console.log(baris('aktif', aktif))
  }

  // 2. Kerja saja dibanding kuliah
  console.log('\nKerja saja dibanding kuliah (Kost Melati, mulai kuliah hari 8)')
  const kost = 'kost-melati'
  const daftar: Array<[string, Pemain]> = []
  for (const [label, sesi] of [['santai', 1], ['aktif', 2]] as const) {
    daftar.push([`${label} kerja`, { sesi, hunianId: kost }])
    for (const [nama, jurusanId] of [['D3 Perawat', 'd3-keperawatan'], ['S1 Akuntansi', 's1-akuntansi'], ['S1 Sipil', 's1-teknik-sipil']] as const) {
      daftar.push([`${label} ${nama}`, { sesi, hunianId: kost, kuliah: { jurusanId, mulaiHari: 8 } }])
    }
  }
  const h: Record<string, Hasil> = Object.fromEntries(daftar.map(([nama, p]) => [nama, simulasi(p, 360)]))
  for (const [nama, r] of Object.entries(h)) {
    console.log(
      `${nama.padEnd(20)} lulus ${String(r.hariGelar ?? '-').padStart(3)}  kas90 ${jt(r.kasHarian[89]).padStart(7)}  kas180 ${jt(r.kasHarian[179]).padStart(7)}  kas360 ${jt(r.kasHarian[359]).padStart(7)}  rasio ${r.rasio.toFixed(2)}  kasbon ${jt(r.kasbon)}`,
    )
  }
  console.log('\nHari kas menyusul kerja saja (0 = belum dalam 360 hari):')
  for (const label of ['santai', 'aktif']) {
    const kerja = h[`${label} kerja`]
    console.log(`  ${label}: D3 ${susul(h[`${label} D3 Perawat`], kerja)}, S1 Akuntansi ${susul(h[`${label} S1 Akuntansi`], kerja)}, S1 Sipil ${susul(h[`${label} S1 Sipil`], kerja)}; S1 Akuntansi menyusul D3 hari ${susul(h[`${label} S1 Akuntansi`], h[`${label} D3 Perawat`])}`)
  }

  // 3. Uang menganggur pemain aktif tanpa sink kekayaan lain
  const ak = h['aktif kerja']
  const target = 0.85
  console.log(`\nPemain aktif kerja: kas hari 90 ${jt(ak.kasHarian[89])}, hari 180 ${jt(ak.kasHarian[179])}, hari 360 ${jt(ak.kasHarian[359])}`)
  console.log(`Rasio sink per faucet 360 hari ${ak.rasio.toFixed(2)} (target ${target}); sink kekayaan yang perlu diserap per tahun: ${jt(target * ak.faucet - ak.sink)}`)

  // 4. Usaha (Fase 1): rumus saja, belum ikut simulasi pemain
  console.log('\nUsaha: laba per hari, balik modal, biaya dan balik modal upgrade')
  for (const [nama, u] of Object.entries(USAHA)) {
    const upg = [1, 2, 3, 4].map((lv) => `${lv}>${lv + 1}: ${rupiah(upgradeBiaya(u, lv))} (${upgradeBalikModal(u, lv).toFixed(0)} hari)`)
    console.log(`${nama.padEnd(15)} modal ${rupiah(u.modal)}, laba ${rupiah(labaHarian(u))}/hari, balik modal ${(u.modal / labaHarian(u)).toFixed(1)} hari | ${upg.join(' | ')}`)
  }

  // 5. Fitur kota: perjalanan, usaha, rumah sendiri, tabungan
  const tierSantai3 = upahSim(3, 6, 10) // satu sesi sehari, Tenaga 100
  const netSoloe = HASIL_SOLOE - TUJUAN.soloe.tiket
  console.log(`\nPerjalanan (sekali sehari): Soloe untung ${rupiah(netSoloe)} tanpa Tenaga; upah santai tier 3 sehari ${rupiah(tierSantai3)}`)
  const culabaya = ([1, 2, 3, 4, 5] as Tier[]).map((t) => {
    const skill = t >= 3 ? 8 : t === 2 ? 4 : 1
    const borongan = upahSim(t, skill, AKSI_CULABAYA) - TUJUAN.culabaya.tiket
    const aktif = upahSim(t, skill, 24)
    console.log(`  Culabaya tier ${t}: borongan bersih ${rupiah(borongan)} dibanding kerja aktif sehari ${rupiah(aktif)}`)
    return { borongan, aktif }
  })
  console.log(`  Jakarte ${rupiah(TUJUAN.jakarte.tiket)} untuk Keahlian di bawah ${TERBANG.jakarteMaksKeahlian}; kursus 5 ke 6 ${rupiah(kursusBiaya(5))}`)

  const lengkap = simulasiLengkap(360, false)
  const lengkapSoloe = simulasiLengkap(360, true)
  for (const [nama, r] of [['aktif kerja saja', { ...ak, tabungan: 0, rumahHari: undefined, usahaHari: undefined }], ['aktif lengkap', lengkap], ['aktif lengkap + Soloe', lengkapSoloe]] as const) {
    console.log(
      `${nama.padEnd(22)} kekayaan90 ${jt(r.kasHarian[89]).padStart(7)}  kekayaan180 ${jt(r.kasHarian[179]).padStart(7)}  kekayaan360 ${jt(r.kasHarian[359]).padStart(7)}  rasio ${r.rasio.toFixed(2)}` +
        (r.usahaHari ? `  usaha hari ${r.usahaHari}` : '') + (r.rumahHari ? `  rumah hari ${r.rumahHari}` : ''),
    )
  }
  if (lengkap.kasHarian[359] > 2 * ak.kasHarian[359]) console.log(`  PERINGATAN: usaha melipatgandakan kekayaan (${jt(lengkap.kasHarian[359])} dibanding ${jt(ak.kasHarian[359])} kerja saja). Laba usaha level 5 per hari: perahu ${rupiah(USAHA_ATURAN.simpanMaks * labaSiklus('perahu', 5))}, warung ${rupiah(USAHA_ATURAN.simpanMaks * labaSiklus('warung', 5))}. Perlu batas permintaan kota atau biaya perawatan sebelum dibuka luas.`)
  if (lengkap.rasio < 0.75) console.log(`  CATATAN: rasio sink per faucet ${lengkap.rasio.toFixed(2)} di bawah 0,75. Sink kekayaan Fase 2 (gotong royong, kendaraan) masih dibutuhkan.`)

  // ---- maksud desain
  assert.ok(netSoloe <= tierSantai3 * 0.25, 'Soloe tidak boleh menyaingi kerja: untung paling banyak 25% upah santai tier 3 sehari')
  assert.ok(culabaya.every((c) => c.borongan <= c.aktif), 'Culabaya tidak boleh lebih untung daripada kerja aktif sehari')
  assert.ok(TUJUAN.jakarte.tiket >= kursusBiaya(TERBANG.jakarteMaksKeahlian - 1), 'Jakarte tidak boleh lebih murah daripada kursus yang digantikannya')
  assert.equal(lengkap.kasbon, 0, 'pemain lengkap tidak boleh kasbon')
  assert.ok(lengkap.usahaHari !== undefined && lengkap.rumahHari !== undefined, 'pemain aktif harus bisa membuka usaha dan membangun rumah dalam setahun')
  for (const u of Object.values(USAHA)) {
    const hari = u.modal / labaHarian(u)
    assert.ok(hari >= 10 && hari <= 25, 'usaha: balik modal 10 sampai 25 hari')
    const upg = [1, 2, 3, 4].map((lv) => upgradeBalikModal(u, lv))
    assert.ok(upg.every((x, i) => i === 0 || x > upg[i - 1]), 'usaha: upgrade makin lama balik modal')
  }
  for (const hn of hunian.filter((x) => x.fase === 0)) {
    const { santai, aktif } = tinggal[hn.id]
    assert.equal(santai.kasbon + aktif.kasbon, 0, `${hn.nama}: pemain normal tidak boleh kasbon`)
    assert.ok(Number(hariTier(santai, 2)) <= 7, `${hn.nama}: tier 2 santai paling lambat hari 7`)
    assert.ok(Number(hariTier(aktif, 3)) <= 14, `${hn.nama}: tier 3 aktif paling lambat hari 14`)
  }
  assert.ok(Number(hariTier(tinggal['kost-anggrek'].santai, 3)) > Number(hariTier(tinggal['kost-melati'].santai, 3)), 'kost mahal harus memperlambat kemajuan')
  assert.equal(h['santai kerja'].tierHari[4], undefined, 'tanpa gelar tidak ada tier 4')
  assert.equal(h['santai kerja'].tierHari[5], undefined, 'tanpa gelar tidak ada tier 5')
  for (const label of ['santai', 'aktif']) {
    for (const [nama, tier] of [['D3 Perawat', 4], ['S1 Akuntansi', 5], ['S1 Sipil', 5]] as const) {
      const r = h[`${label} ${nama}`]
      assert.ok(r.hariGelar !== undefined, `${label} ${nama}: harus bisa lulus`)
      assert.ok(r.tierHari[tier] !== undefined, `${label} ${nama}: harus mencapai tier ${tier}`)
      assert.equal(r.kasbon, 0, `${label} ${nama}: kuliah tidak boleh membuat kasbon`)
      assert.ok(susul(r, h[`${label} kerja`]) > 0, `${label} ${nama}: harus menyusul kerja saja dalam 360 hari`)
    }
    assert.ok(susul(h[`${label} S1 Akuntansi`], h[`${label} D3 Perawat`]) > 0, `${label}: S1 harus akhirnya mengungguli D3`)
  }
  console.log('\nOK')
}
