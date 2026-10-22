// Aksi sistem kehidupan di atas dalamTransaksi: inventori dan mailbox, pertemanan dan teman sekamar, pesan, profil publik,
// pekerja per bangunan, dan seleksi pekerjaan khusus. Angka dari src/data/balans.ts, aturan murni di sistem-aturan.ts.
import { ATRIBUT, HADIAH, INVENTORI, SEKAMAR, SELEKSI } from '../data/balans.ts'
import { jenisById } from '../data/bangunan.ts'
import { npcDi } from '../data/npc.ts'
import { pekerjaanDi } from '../data/pekerjaan.ts'
import { penempatan, penempatanById } from '../data/tataletak.ts'
import { BARANG, adalahBarang, bolehAmbil, lowonganUntuk, minKeahlianUntuk, pekerjaanById, tanggalWIB } from './aturan.ts'
import type { Sql } from './db.ts'
import { Galat } from './galat.ts'
import { acakAman, catat, dalamTransaksi, pakaiBarang, pasangKerja, wajibMulai } from './game.ts'
import { isiInventori, kurangiItem, namaBarang, tambahItem } from './inventori.ts'
import { catatAktivitas } from './kemajuan.ts'
import { bungkus, type Tx } from './kueri.ts'
import { golonganPekerjaan, kuotaLowongan, kunciKamar, nilaiAtribut, nilaiLulusSeleksi, pasangan, skorSeleksi, statKurang, syaratSeleksi, wajibUuid } from './sistem-aturan.ts'
import { penghuniKamar } from './sosial.ts'
import type { Keadaan, Warga } from './tipe.ts'

// ---------------------------------------------------------------- 2. inventori dan mailbox

export type PerintahInventori =
  | { aksi: 'pakai'; barang: string }
  | { aksi: 'buang'; barang: string; jumlah: number }
  | { aksi: 'kirim'; ke: string; barang: string; jumlah: number }
  | { aksi: 'klaim'; surat?: string | null }

type BarisSurat = { id: string; pengirim: string; judul: string; item: string | null; jumlah: number; uang: number; sumber: string; dibuat_pada: Date }

/** Klaim surat di mailbox: uang masuk kas lewat ledger, barang masuk sebanyak yang muat (sisanya tetap di surat). */
async function klaimSurat(tx: Tx, w: Warga, suratId: string | null, kunci: string, now: Date): Promise<void> {
  const daftar = await tx<BarisSurat[]>`
    select * from surat where warga_id = ${w.id} and (${suratId}::uuid is null or id = ${suratId}::uuid) order by dibuat_pada, id for update`
  if (!daftar.length) throw new Galat('surat_kosong', 'Tidak ada surat untuk diklaim.', 404)
  let berubah = false
  for (const s of daftar) {
    let uang = s.uang
    let jumlah = s.jumlah
    if (uang > 0) {
      await catat(tx, w, { akun: 'kas', jenis: 'hadiah_surat', jumlah: uang, kunci, rincian: { surat: s.id, pengirim: s.pengirim, judul: s.judul } }, now)
      uang = 0
      berubah = true
    }
    if (s.item && jumlah > 0) {
      const masuk = await isiInventori(tx, w.id, s.item, jumlah)
      if (masuk > 0) berubah = true
      jumlah -= masuk
    }
    if (jumlah <= 0 && uang <= 0) tx.tulis`delete from surat where id = ${s.id}`
    else if (jumlah !== s.jumlah || uang !== s.uang) tx.tulis`update surat set jumlah = ${jumlah}, uang = ${uang} where id = ${s.id}`
  }
  if (!berubah) throw new Galat('inventori_penuh', 'Inventorimu penuh. Pakai atau buang sesuatu dulu.', 409)
}

const jumlahSah = (n: unknown): number => {
  const j = Number(n)
  if (!Number.isInteger(j) || j < 1 || j > INVENTORI.transferMaks) throw new Galat('jumlah_tidak_valid', `Jumlah 1 sampai ${INVENTORI.transferMaks}.`)
  return j
}

/** Operasi inventori: pakai, buang (remove), kirim ke pemain lain (transfer), dan klaim mailbox. Penambahan (add) ada di inventori.ts. */
export const inventori = (sql: Sql, id: string, kunci: string, p: PerintahInventori, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'inventori', now }, async (tx, w) => {
    wajibMulai(w)
    if (p.aksi === 'klaim') return klaimSurat(tx, w, p.surat ? wajibUuid(p.surat, 'ID surat') : null, kunci, now)
    if (!adalahBarang(p.barang)) throw new Galat('barang_tidak_ada', 'Barang itu tidak dikenal.')
    if (p.aksi === 'pakai') return pakaiBarang(tx, w, p.barang, now)
    const jumlah = jumlahSah(p.jumlah)
    if (p.aksi === 'buang') return kurangiItem(tx, w.id, p.barang, jumlah)
    const ke = wajibUuid(p.ke, 'ID penerima')
    if (ke === w.id) throw new Galat('kirim_sendiri', 'Tidak bisa mengirim ke diri sendiri.')
    // hadiah ke warga lain: paling banyak HADIAH.kaliPerHari kali per tanggal WIB
    const hari = tanggalWIB(now)
    const kali = w.hadiah_tanggal === hari ? w.hadiah_kali : 0
    if (kali >= HADIAH.kaliPerHari) throw new Galat('hadiah_habis', `Hadiah paling banyak ${HADIAH.kaliPerHari} kali sehari. Coba lagi besok.`, 409)
    const [tujuan] = await tx<{ id: string; nama: string }[]>`select id, nama from warga where id = ${ke}`
    if (!tujuan) throw new Galat('warga_tidak_ada', 'Penerima tidak ditemukan.', 404)
    await kurangiItem(tx, w.id, p.barang, jumlah)
    await tambahItem(tx, tujuan.id, p.barang, jumlah, { pengirim: w.nama, judul: `Hadiah ${namaBarang(p.barang)} dari ${w.nama}`, sumber: 'transfer' }, now)
    w.hadiah_tanggal = hari
    w.hadiah_kali = kali + 1
    // penerima melihat hadiahnya di utas obrolan pribadi juga
    tx.tulis`insert into pesan (dari_id, ke_id, isi, dibuat_pada) values (${w.id}, ${tujuan.id}, ${`Mengirim hadiah: ${jumlah} ${namaBarang(p.barang)}`}, ${now})`
    catatAktivitas(tx, w, 'interaksi', 1, now)
  })

/** Isi inventori dengan kapasitasnya dan semua surat di mailbox. */
export async function lihatInventori(sql: Sql, id: string) {
  const q = bungkus(sql)
  const [barang, surat] = await Promise.all([
    q<{ barang: string; jumlah: number }[]>`select barang, jumlah from gudang where warga_id = ${id} and jumlah > 0 order by barang`,
    q<BarisSurat[]>`select * from surat where warga_id = ${id} order by dibuat_pada desc limit ${INVENTORI.suratMaks}`,
  ])
  const dipakai = barang.reduce((t, b) => t + b.jumlah, 0)
  return {
    kapasitas: INVENTORI.kapasitas,
    dipakai,
    barang: barang.map((b) => {
      const def = adalahBarang(b.barang) ? (BARANG[b.barang] as { nama: string; jenis: string; satuan: string; ringkas: string; tenaga?: number; kesehatan?: number; lapar?: number }) : null
      return {
        id: b.barang, jumlah: b.jumlah, nama: def?.nama ?? b.barang, jenis: def?.jenis ?? 'lain', satuan: def?.satuan ?? '', ringkas: def?.ringkas ?? '',
        tenaga: def?.tenaga ?? 0, kesehatan: def?.kesehatan ?? 0, lapar: def?.lapar ?? 0, bisaDipakai: def?.jenis === 'konsumsi',
      }
    }),
    surat: surat.map((s) => ({
      id: s.id, pengirim: s.pengirim, judul: s.judul, item: s.item, namaItem: s.item ? namaBarang(s.item) : null, jumlah: s.jumlah, uang: s.uang,
      sumber: s.sumber, waktu: s.dibuat_pada.toISOString(),
    })),
  }
}

// ---------------------------------------------------------------- 3 dan 16. pertemanan dan teman sekamar

export type PerintahTeman = { aksi: 'tambah' | 'terima' | 'tolak' | 'putus'; warga: string }

type BarisTeman = { a: string; b: string; status: 'minta' | 'teman'; peminta: string; sekamar: string | null }

/**
 * Pemain yang menolak atau memutus pertemanan dengan seseorang yang masih sekamar dengannya melanggar aturan sekamar:
 * ia wajib pindah setelah masa tenggang (SEKAMAR.tenggangMs). Pemindahan dijalankan oleh selesaikan() di game.ts.
 */
async function catatPelanggaranSekamar(tx: Tx, w: Warga, lainId: string, now: Date): Promise<void> {
  if (!w.hunian_tempat || w.hunian_kamar == null || w.wajib_pindah_tenggat) return
  const [o] = await tx<{ hunian_tempat: string | null; hunian_kamar: number | null }[]>`select hunian_tempat, hunian_kamar from warga where id = ${lainId}`
  if (o && o.hunian_tempat === w.hunian_tempat && o.hunian_kamar === w.hunian_kamar) {
    w.wajib_pindah_tenggat = new Date(now.getTime() + SEKAMAR.tenggangMs)
    w.wajib_pindah_dari = kunciKamar(w.hunian_tempat, w.hunian_kamar)
  }
}

/** Kewajiban pindah gugur bila sudah tidak ada teman sekamar yang belum berteman denganmu. */
async function periksaKewajibanPindah(tx: Tx, w: Warga): Promise<void> {
  if (!w.wajib_pindah_tenggat || !w.hunian_tempat || w.hunian_kamar == null) return
  const lain = await penghuniKamar(tx, w.hunian_tempat, w.hunian_kamar, w.id)
  let masihAda = false
  for (const o of lain) {
    const [a, b] = pasangan(w.id, o.id)
    const [r] = await tx<{ status: string }[]>`select status from pertemanan where a = ${a} and b = ${b}`
    if (r?.status !== 'teman') masihAda = true
  }
  if (!masihAda) {
    w.wajib_pindah_tenggat = null
    w.wajib_pindah_dari = null
  }
}

/** Tambah teman, terima atau tolak permintaan, atau putus pertemanan. */
export const teman = (sql: Sql, id: string, kunci: string, p: PerintahTeman, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'teman', now }, async (tx, w) => {
    wajibMulai(w)
    const target = wajibUuid(p.warga, 'ID warga')
    if (target === w.id) throw new Galat('teman_sendiri', 'Itu dirimu sendiri.')
    const [lain] = await tx<{ id: string }[]>`select id from warga where id = ${target}`
    if (!lain) throw new Galat('warga_tidak_ada', 'Warga itu tidak ditemukan.', 404)
    const [a, b] = pasangan(w.id, lain.id)
    const [r] = await tx<BarisTeman[]>`select a, b, status, peminta, sekamar from pertemanan where a = ${a} and b = ${b} for update`

    if (p.aksi === 'tambah') {
      if (r?.status === 'teman') throw new Galat('sudah_berteman', 'Kalian sudah berteman.', 409)
      if (r && r.peminta === w.id) throw new Galat('sudah_diminta', 'Permintaan pertemanan sudah dikirim.', 409)
      if (r) {
        // lawan sudah meminta lebih dulu: saling setuju
        await tx`update pertemanan set status = 'teman' where a = ${a} and b = ${b}`
        await periksaKewajibanPindah(tx, w)
      } else {
        await tx`insert into pertemanan (a, b, status, peminta, dibuat_pada) values (${a}, ${b}, 'minta', ${w.id}, ${now})`
      }
      catatAktivitas(tx, w, 'interaksi', 1, now)
      return
    }
    if (!r) throw new Galat('tidak_berteman', 'Tidak ada permintaan atau pertemanan dengan warga itu.', 404)

    if (p.aksi === 'terima') {
      if (r.status !== 'minta' || r.peminta === w.id) throw new Galat('tidak_ada_permintaan', 'Tidak ada permintaan darinya untuk diterima.', 409)
      await tx`update pertemanan set status = 'teman' where a = ${a} and b = ${b}`
      await periksaKewajibanPindah(tx, w)
      catatAktivitas(tx, w, 'interaksi', 1, now)
      return
    }
    if (p.aksi === 'tolak') {
      if (r.status !== 'minta') throw new Galat('tidak_ada_permintaan', 'Tidak ada permintaan untuk ditolak.', 409)
      await tx`delete from pertemanan where a = ${a} and b = ${b}`
      // menolak permintaan orang yang sekamar = melanggar; membatalkan permintaan sendiri tidak
      if (r.peminta !== w.id) await catatPelanggaranSekamar(tx, w, lain.id, now)
      return
    }
    // putus
    if (r.status !== 'teman') throw new Galat('tidak_berteman', 'Kalian belum berteman.', 409)
    await tx`delete from pertemanan where a = ${a} and b = ${b}`
    await catatPelanggaranSekamar(tx, w, lain.id, now)
  })

/** Teman, permintaan masuk dan keluar, serta teman sekamar (dengan status pertemanannya). */
export async function daftarTeman(sql: Sql, id: string) {
  const q = bungkus(sql)
  const [baris, [saya]] = await Promise.all([
    q<Array<BarisTeman & { id_lain: string; nama_lain: string; level_lain: number; aktif_lain: Date }>>`
      select p.a, p.b, p.status, p.peminta, p.sekamar, w.id as id_lain, w.nama as nama_lain, w.level as level_lain, w.terakhir_aktif as aktif_lain
      from pertemanan p join warga w on w.id = case when p.a = ${id} then p.b else p.a end
      where p.a = ${id} or p.b = ${id} order by p.dibuat_pada desc`,
    q<{ hunian_tempat: string | null; hunian_kamar: number | null; wajib_pindah_tenggat: Date | null }[]>`select hunian_tempat, hunian_kamar, wajib_pindah_tenggat from warga where id = ${id}`,
  ])
  const sekamar = saya?.hunian_tempat && saya.hunian_kamar != null ? await penghuniKamar(q, saya.hunian_tempat, saya.hunian_kamar, id) : []
  const status = new Map(baris.map((b) => [b.id_lain, b.status]))
  return {
    teman: baris
      .filter((b) => b.status === 'teman')
      .sort((x, y) => y.aktif_lain.getTime() - x.aktif_lain.getTime())
      .map((b) => ({ id: b.id_lain, nama: b.nama_lain, level: b.level_lain, aktif: b.aktif_lain.toISOString() })),
    masuk: baris.filter((b) => b.status === 'minta' && b.peminta !== id).map((b) => ({ id: b.id_lain, nama: b.nama_lain, level: b.level_lain, sekamar: b.sekamar !== null })),
    keluar: baris.filter((b) => b.status === 'minta' && b.peminta === id).map((b) => ({ id: b.id_lain, nama: b.nama_lain, level: b.level_lain })),
    sekamar: sekamar.map((s) => ({ id: s.id, nama: s.nama, status: status.get(s.id) ?? 'belum' })),
    wajibPindah: saya?.wajib_pindah_tenggat?.toISOString() ?? null,
    tenggangJam: SEKAMAR.tenggangMs / 3_600_000,
  }
}

/**
 * Cari warga (pemain) menurut nama untuk dijadikan teman atau diajak mengobrol. Tanpa kata kunci: yang paling baru aktif.
 * Status: 'teman', 'diminta' (kamu sudah meminta), 'meminta' (dia meminta kepadamu), atau 'belum'.
 */
export async function cariWarga(sql: Sql, id: string, kataMentah: unknown) {
  const kata = typeof kataMentah === 'string' ? kataMentah.trim().slice(0, 40) : ''
  // % dan _ di kata kunci dicari apa adanya, bukan sebagai pola
  const pola = `%${kata.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const baris = await bungkus(sql)<{ id: string; nama: string; level: number; aktif: Date; status: string | null; peminta: string | null }[]>`
    select w.id, w.nama, w.level, w.terakhir_aktif as aktif, p.status, p.peminta
    from warga w left join pertemanan p on (p.a = least(w.id, ${id}::uuid) and p.b = greatest(w.id, ${id}::uuid))
    where w.id <> ${id} and w.peran <> 'walikota' and w.hunian_id is not null and w.nama ilike ${pola}
    order by w.terakhir_aktif desc limit 20`
  return baris.map((b) => ({
    id: b.id, nama: b.nama, level: b.level, aktif: b.aktif.toISOString(),
    status: b.status === 'teman' ? 'teman' : b.status ? (b.peminta === id ? 'diminta' : 'meminta') : 'belum',
  }))
}

// ---------------------------------------------------------------- 16. profil (pesan ada di obrolan.ts)

/** Atur apa yang tampil di profil publikmu. */
export const aturProfil = (sql: Sql, id: string, kunci: string, properti: boolean, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'profil', now }, async (_tx, w) => {
    w.profil_properti = properti
  })

/**
 * Profil publik: nama, level, reputasi dan peringkat, pekerjaan, keahlian dan atribut, serta properti (hanya bila pemiliknya
 * mengizinkan; properti yang sedang dijual selalu terlihat agar bisa ditawar). Uang, inventori, dan stats survival
 * (Tenaga, Kesehatan, lapar) tidak pernah dikirim.
 */
export async function profilPublik(sql: Sql, pengamat: string, idMasuk: string) {
  const id = wajibUuid(idMasuk, 'ID warga')
  const q = bungkus(sql)
  const [[p], properti, [rel]] = await Promise.all([
    q<Array<Pick<Warga, 'id' | 'nama' | 'level' | 'reputasi' | 'pekerjaan_id' | 'tempat_kerja' | 'keahlian' | 'kekuatan' | 'kecerdasan' | 'karisma' | 'disiplin' | 'profil_properti' | 'peran' | 'dibuat_pada'> & { peringkat: number }>>`
      select w.id, w.nama, w.level, w.reputasi::int as reputasi, w.pekerjaan_id, w.tempat_kerja, w.keahlian, w.kekuatan, w.kecerdasan, w.karisma, w.disiplin,
        w.profil_properti, w.peran, w.dibuat_pada,
        (select count(*)::int + 1 from warga x where x.peran <> 'walikota' and x.reputasi > w.reputasi) as peringkat
      from warga w where w.id = ${id}`,
    q<Array<{ lahan_id: string; jenis_objek: string; bangun_jenis: string | null; rumah: boolean; jual_mode: string; jual_harga: number | null }>>`
      select lahan_id, jenis_objek, bangun_jenis, rumah, jual_mode, jual_harga from lahan_milik where warga_id = ${id} order by dibeli_pada`,
    q<BarisTeman[]>`select a, b, status, peminta, sekamar from pertemanan where a = ${pasangan(pengamat, id)[0]} and b = ${pasangan(pengamat, id)[1]}`,
  ])
  if (!p) throw new Galat('warga_tidak_ada', 'Warga itu tidak ditemukan.', 404)
  const job = pekerjaanById(p.pekerjaan_id)
  const tempat = p.tempat_kerja ? (penempatanById.get(p.tempat_kerja) ? jenisById.get(penempatanById.get(p.tempat_kerja)!.jenis)?.nama : p.tempat_kerja) : null
  const diri = pengamat === id
  return {
    id: p.id,
    nama: p.nama,
    peran: p.peran,
    level: p.level,
    reputasi: p.reputasi,
    peringkat: p.peran === 'walikota' ? null : p.peringkat,
    bergabung: p.dibuat_pada.toISOString(),
    pekerjaan: job ? { id: job.id, nama: job.nama, tier: job.tier, tempat: tempat ?? job.tempat } : null,
    keahlian: { level: p.keahlian, atribut: { kekuatan: p.kekuatan, kecerdasan: p.kecerdasan, karisma: p.karisma, disiplin: p.disiplin } },
    properti: (p.profil_properti || diri ? properti : properti.filter((x) => x.jual_mode !== 'tidak')).map((x) => ({
      id: x.lahan_id, objek: x.jenis_objek, bangunan: x.bangun_jenis, rumah: x.rumah, jual: x.jual_mode !== 'tidak' && x.jual_harga ? { mode: x.jual_mode, harga: x.jual_harga } : null,
    })),
    propertiPublik: p.profil_properti,
    diri,
    hubungan: diri ? 'diri' : rel ? (rel.status === 'teman' ? 'teman' : rel.peminta === pengamat ? 'diminta' : 'meminta') : 'belum',
    // aksi yang tersedia bagi pengamat
    aksi: { tambahTeman: !diri && !rel, kirimPesan: !diri, ajukanPenawaran: !diri && properti.some((x) => x.jual_mode === 'negosiasi') },
  }
}

// ---------------------------------------------------------------- 13 dan 15. pekerja dan lowongan per bangunan

/** Id semua bangunan yang menjadi tempat kerja jenis ini: bangunan di peta dan bangunan pemain yang sudah selesai dibangun. */
async function semuaTempatKerja(sql: Sql, jenis: string, now: Date): Promise<string[]> {
  const dibangun = await bungkus(sql)<{ lahan_id: string }[]>`
    select lahan_id from lahan_milik where jenis_objek = 'lahan' and bangun_jenis = ${jenis} and bangun_selesai <= ${now} order by lahan_id`
  return [...penempatan.filter((x) => x.jenis === jenis).map((x) => x.id), ...dibangun.map((d) => d.lahan_id)]
}

/**
 * Transparansi pekerja: daftar pekerja satu bangunan (NPC dan pemain, pemain dengan id untuk tombol kunjungi profil) dan daftar
 * lowongan dengan kuota, terisi, dan sisa. Lowongan tertutup saat terisi sama dengan kuota. Bangunan yang masih dibangun belum aktif.
 */
export async function pekerjaBangunan(sql: Sql, tempat: string, now = new Date()) {
  const q = bungkus(sql)
  let jenis = penempatanById.get(tempat)?.jenis
  let aktif = true
  let selesai: string | null = null
  if (!jenis && tempat.startsWith('lahan-')) {
    const [m] = await q<{ bangun_jenis: string | null; bangun_selesai: Date | null }[]>`select bangun_jenis, bangun_selesai from lahan_milik where lahan_id = ${tempat} and jenis_objek = 'lahan'`
    if (m?.bangun_jenis && m.bangun_selesai) {
      jenis = m.bangun_jenis
      aktif = m.bangun_selesai <= now
      selesai = m.bangun_selesai.toISOString()
    }
  }
  if (!jenis) throw new Galat('tempat_tidak_ada', 'Bangunan itu tidak ditemukan.', 404)
  const semua = await semuaTempatKerja(sql, jenis, now)
  const urut = Math.max(0, semua.indexOf(tempat))
  const warga = await q<Array<{ id: string; nama: string; level: number; pekerjaan_id: string }>>`
    select id, nama, level, pekerjaan_id from warga where tempat_kerja = ${tempat} and pekerjaan_id is not null order by level desc, nama`
  const pekerjaan = pekerjaanDi(jenis)
  const pegawaiNpc = npcDi(jenis).filter((_, i) => i % Math.max(1, semua.length) === urut)
  return {
    tempat,
    jenis,
    nama: jenisById.get(jenis)?.nama ?? jenis,
    aktif,
    selesai,
    npc: pegawaiNpc.map((n) => ({ id: n.id, nama: n.nama, peran: n.peran })),
    pemain: warga.map((x) => ({ id: x.id, nama: x.nama, level: x.level, pekerjaan: pekerjaan.find((j) => j.id === x.pekerjaan_id)?.nama ?? x.pekerjaan_id })),
    lowongan: pekerjaan.map((j) => {
      const kuota = kuotaLowongan(jenis!, j.tier, j.id)
      const terisi = warga.filter((x) => x.pekerjaan_id === j.id).length
      const gol = golonganPekerjaan(j)
      return {
        id: j.id, nama: j.nama, tier: j.tier, kuota, terisi, sisa: Math.max(0, kuota - terisi), terbuka: aktif && terisi < kuota,
        seleksi: gol ? SELEKSI[gol].nama : null, minKeahlian: j.minKeahlian,
      }
    }),
  }
}

// ---------------------------------------------------------------- 11. seleksi pekerjaan khusus (PNS, polisi, tentara)

/**
 * Seleksi: pelamar harus memenuhi syarat minimum atribut, membayar biaya dan Tenaga, lalu mengikuti tes (skor rata-rata berbobot
 * atribut ditambah acak). Lulus: lulus tercatat dan pekerjaan diambil bila ada kursi. Gagal: cooldown sebelum boleh mencoba lagi.
 */
export const ikutSeleksi = (sql: Sql, id: string, kunci: string, pekerjaanId: string, now = new Date(), acak: () => number = acakAman, tempatDiminta: string | null = null) => {
  let tes: Keadaan['tes']
  return dalamTransaksi(sql, id, { kunci, aksi: 'seleksi', now, tambahan: () => ({ tes }) }, async (tx, w) => {
    wajibMulai(w)
    const p = lowonganUntuk(w.ijazah).find((x) => x.id === pekerjaanId)
    if (!p) throw new Galat('pekerjaan_tidak_ada', 'Pekerjaan itu belum dibuka.')
    const gol = golonganPekerjaan(p)
    if (!gol) throw new Galat('tanpa_seleksi', 'Pekerjaan itu tidak memakai seleksi. Ambil langsung dari Bursa Kerja.')
    if (!bolehAmbil(p, w.keahlian, w.sekolah)) throw new Galat('keahlian_kurang', `Pekerjaan itu butuh Keahlian ${minKeahlianUntuk(p, w.sekolah)}.`, 409)
    const s = SELEKSI[gol]
    const lulusLama = w.seleksi?.lulus ?? []
    const nilai = nilaiLulusSeleksi(gol, p.tier)
    if (lulusLama.includes(p.id)) {
      await pasangKerja(tx, w, p, tempatDiminta, now)
      tes = { lulus: true, skor: nilai, nilaiLulus: nilai }
      return
    }
    const gagalSampai = w.seleksi?.gagal?.[p.id]
    if (gagalSampai && Date.parse(gagalSampai) > now.getTime()) throw new Galat('seleksi_cooldown', 'Kamu belum lulus seleksi sebelumnya. Tunggu masa jeda selesai sebelum mencoba lagi.', 409)
    const kurang = statKurang(nilaiAtribut(w), syaratSeleksi(gol, p.tier))
    if (kurang.length) {
      throw new Galat('stat_kurang', `Syarat ${s.nama}: ${kurang.map((k) => `${k.atribut} ${k.perlu} (kamu ${k.punya})`).join(', ')}.`, 409)
    }
    if (w.tenaga < s.tenaga) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${s.tenaga}, tersisa ${w.tenaga}.`, 409)
    if (w.kas < s.biaya) throw new Galat('uang_kurang', 'Uang tidak cukup untuk biaya seleksi.', 409)
    w.tenaga -= s.tenaga
    await catat(tx, w, { akun: 'kas', jenis: 'biaya_seleksi', jumlah: -s.biaya, kunci, rincian: { seleksi: gol, pekerjaan: p.id } }, now)

    const skor = skorSeleksi(nilaiAtribut(w), gol, acak)
    const lulus = skor >= nilai
    const gagal = { ...(w.seleksi?.gagal ?? {}) }
    if (lulus) {
      delete gagal[p.id]
      w.seleksi = { lulus: [...lulusLama, p.id], gagal }
      // lulus tetap tercatat walaupun kursinya sedang penuh atau ganti pekerjaan sedang dibatasi
      try {
        await pasangKerja(tx, w, p, tempatDiminta, now)
      } catch (e) {
        if (!(e instanceof Galat)) throw e
      }
    } else {
      gagal[p.id] = new Date(now.getTime() + s.cooldownMs).toISOString()
      w.seleksi = { lulus: lulusLama, gagal }
    }
    catatAktivitas(tx, w, 'belajar', 1, now)
    tes = { lulus, skor, nilaiLulus: nilai }
  })
}

export const syaratSeleksiPublik = () =>
  Object.fromEntries(
    (Object.keys(SELEKSI) as Array<keyof typeof SELEKSI>).map((g) => [g, { nama: SELEKSI[g].nama, biaya: SELEKSI[g].biaya, tenaga: SELEKSI[g].tenaga, cooldownJam: SELEKSI[g].cooldownMs / 3_600_000, atribut: ATRIBUT }]),
  )
