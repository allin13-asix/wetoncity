// Operasi game di atas Postgres. Aturannya ada di aturan.ts dan angkanya di src/data.
// Setiap operasi: satu transaksi, baris warga dikunci, jawaban disimpan per kunci idempotensi, lalu
// Tenaga dipulihkan dan tagihan yang jatuh tempo diselesaikan sebelum aksi dijalankan (tanpa cron).
import { randomInt } from 'node:crypto'
import type postgres from 'postgres'
import { jenisById } from '../data/bangunan.ts'
import { distrik, lahanKosong, penempatan, penempatanById } from '../data/tataletak.ts'
import { SEKOLAH, adalahSekolah } from '../data/pendidikan.ts'
import { BONUS_HARIAN, KURSUS, TENAGA, UMK_AWAL, pajakBulanan } from '../data/ekonomi.ts'
import {
  AKSI_CULABAYA, AKSI_MAKS, TERBANG, BANK, HARI_MS, HASIL_SOLOE, JENIS_USAHA, JUDI, LAHAN, MAKAN, HUNIAN_PINDAHAN, KASBON_BUNGA, RSUD, RUSUN,
  SESI_KULIAH, SIKLUS_DITAGIH_MAKS, SIKLUS_MS, TUJUAN, USAHA_ATURAN, biayaUpgradeUsaha, hargaLahan, jurusanById, labaSiklus,
  lowonganUntuk, pekerjaanById, type JenisUsaha, type Tujuan,
  biayaKursus, bisaDipilih, bolehAmbil, hunianById, jumlahSiklusJatuhTempo, kasbonMacet, lowongan,
  WALIKOTA, pulihkanTenaga, rincianTagihan, selangTenaga, tanggalWIB, tenagaMaks, upahAksi,
  BARANG, KEBIJAKAN_UMK, KONSUMSI, NUMPANG, PASAR, TEMUAN, adalahBarang, biayaLapak, gajiPekerjaan, hargaNpc, ikanPerSiklus, pitaLapak, pasaran,
  rentangUmk, trenEkonomi, type Barang, KESEHATAN, kapasitasHunian, minKeahlianUntuk, sakit, uktUntuk,
} from './aturan.ts'
import { BANGUN, GANTI_KERJA, INVENTORI, LAPAR, LATIHAN, LEVEL, MEMANCING, NAMA_ATRIBUT, SELEKSI, STATISTIK, type Atribut } from '../data/balans.ts'
import type { Pekerjaan } from '../data/pekerjaan.ts'
import type { Sql, Tx as TxMentah } from './db.ts'
import { Galat } from './galat.ts'
import { tambahItem } from './inventori.ts'
import { catatAktivitas, pastikanPekan } from './kemajuan.ts'
import { koranBasi, terapkanKoran, terbaru, type BarisKoran } from './koran.ts'
import { adalahTx, bungkus, type Tx } from './kueri.ts'
import { masukKamar, tentukanKamar } from './sosial.ts'
import {
  cekGantiKerja, durasiKursusKeahlian, expUntukLevel, golonganPekerjaan, hitungLapar, isiLapar, kuotaLowongan, kunciKamar, laparKini, nilaiAtribut,
  progresBangun, sedangLapar, statKurang, syaratKursusKeahlian, tahapBangun, tambahAtribut, waktuMulaiLapar,
} from './sistem-aturan.ts'
import type { BarisLahan, BarisLedger, BarisNumpang, BarisUsaha, Keadaan, Warga } from './tipe.ts'

/** Angka acak 0 sampai 1 dari sumber kriptografis; uji boleh menggantinya. */
export const acakAman = () => randomInt(0, 1_000_000) / 1_000_000

type Catatan = { akun: 'kas' | 'kasbon' | 'tabungan'; jenis: string; jumlah: number; kunci?: string | null; rincian?: Record<string, unknown> }

/**
 * Satu-satunya jalan mengubah saldo. Memperbarui warga.kas, warga.kasbon, atau warga.tabungan dan menambah satu baris
 * ledger dengan saldo sesudahnya. Pemanggil harus sudah mengunci baris warga. Saldo diperiksa di memori sebelum menulis.
 * Dalam transaksi game (tx dari dalamTransaksi) kedua tulisannya ditunda dan ikut penerbangan berikutnya; dengan tx
 * mentah (pendaftaran, skrip) keduanya dikirim bersamaan dan ditunggu di sini.
 */
export async function catat(tx: Tx | TxMentah, w: Warga, c: Catatan, now: Date): Promise<void> {
  const lama = w[c.akun]
  const baru = lama + c.jumlah
  if (!Number.isSafeInteger(baru) || baru < 0) {
    throw new Galat('saldo_kurang', c.akun === 'kas' ? 'Uang tidak cukup.' : c.akun === 'tabungan' ? 'Tabungan tidak cukup.' : 'Kasbon tidak bisa kurang dari nol.', 409)
  }
  const t = adalahTx(tx) ? tx : bungkus(tx)
  if (c.akun === 'kas') {
    t.tulis`update warga set kas = ${baru} where id = ${w.id}`
    w.kas = baru
  } else if (c.akun === 'tabungan') {
    t.tulis`update warga set tabungan = ${baru} where id = ${w.id}`
    w.tabungan = baru
  } else {
    const sejak = baru === 0 ? null : lama === 0 ? now : w.kasbon_sejak
    t.tulis`update warga set kasbon = ${baru}, kasbon_sejak = ${sejak} where id = ${w.id}`
    w.kasbon = baru
    w.kasbon_sejak = sejak
  }
  t.tulis`
    insert into ledger (warga_id, akun, jenis, jumlah, saldo_setelah, kunci, rincian, dibuat_pada)
    values (${w.id}, ${c.akun}, ${c.jenis}, ${c.jumlah}, ${baru}, ${c.kunci ?? null}, ${t.json(c.rincian ?? {})}, ${now})`
  if (t !== tx) await t.kirim()
}

function simpan(tx: Tx, w: Warga, now: Date): void {
  tx.tulis`
    update warga set tenaga = ${w.tenaga}, tenaga_pada = ${w.tenaga_pada}, keahlian = ${w.keahlian}, keahlian6_sejak = ${w.keahlian6_sejak},
      pekerjaan_id = ${w.pekerjaan_id}, hunian_id = ${w.hunian_id}, hunian_berikut = ${w.hunian_berikut},
      tagihan_berikut = ${w.tagihan_berikut}, upah_siklus = ${w.upah_siklus}, bonus_tanggal = ${w.bonus_tanggal},
      makan_tanggal = ${w.makan_tanggal}, makan_kali = ${w.makan_kali}, ijazah = ${w.ijazah}, kuliah_jurusan = ${w.kuliah_jurusan},
      kuliah_semester = ${w.kuliah_semester}, kuliah_sesi = ${w.kuliah_sesi}, kuliah_ukt_lunas = ${w.kuliah_ukt_lunas},
      kuliah_sesi_tanggal = ${w.kuliah_sesi_tanggal}, perjalanan_tujuan = ${w.perjalanan_tujuan}, perjalanan_pulang = ${w.perjalanan_pulang},
      berobat_tanggal = ${w.berobat_tanggal}, sekolah = ${w.sekolah}, hunian_tempat = ${w.hunian_tempat}, hunian_tempat_berikut = ${w.hunian_tempat_berikut},
      kesehatan = ${w.kesehatan}, kesehatan_pada = ${w.kesehatan_pada}, konsumsi_tanggal = ${w.konsumsi_tanggal}, konsumsi_kali = ${w.konsumsi_kali}, terakhir_aktif = ${now},
      lapar = ${w.lapar}, lapar_pada = ${w.lapar_pada}, lapar_hukum_pada = ${w.lapar_hukum_pada}, rawat_sampai = ${w.rawat_sampai},
      kekuatan = ${w.kekuatan}, kecerdasan = ${w.kecerdasan}, karisma = ${w.karisma}, disiplin = ${w.disiplin},
      level = ${w.level}, exp = ${w.exp}, reputasi = ${w.reputasi}, reputasi_minggu = ${w.reputasi_minggu}, harian = ${tx.json(w.harian ?? {})},
      hunian_kamar = ${w.hunian_kamar}, hunian_kamar_berikut = ${w.hunian_kamar_berikut},
      wajib_pindah_tenggat = ${w.wajib_pindah_tenggat}, wajib_pindah_dari = ${w.wajib_pindah_dari},
      ganti_kerja = ${tx.json(w.ganti_kerja ?? [])}, tempat_kerja = ${w.tempat_kerja}, seleksi = ${tx.json(w.seleksi ?? {})},
      latihan_id = ${w.latihan_id}, latihan_target = ${w.latihan_target}, latihan_selesai = ${w.latihan_selesai}, latihan_jeda = ${w.latihan_jeda},
      profil_properti = ${w.profil_properti}, pancing = ${w.pancing ? tx.json(w.pancing) : null}
    where id = ${w.id}`
}

/** Bayar sebanyak kas yang ada; selisihnya menjadi kasbon. */
export async function bayarAtauKasbon(tx: Tx, w: Warga, jenis: 'tagihan_hidup' | 'pajak' | 'uang_dapur' | 'rawat_inap', jumlah: number, rincian: Record<string, unknown>, now: Date) {
  const bayar = Math.min(w.kas, jumlah)
  if (bayar > 0) await catat(tx, w, { akun: 'kas', jenis, jumlah: -bayar, rincian }, now)
  const sisa = jumlah - bayar
  if (sisa > 0) await catat(tx, w, { akun: 'kasbon', jenis: 'kasbon_baru', jumlah: sisa, rincian: { sebab: jenis } }, now)
}

async function tagihSiklus(tx: Tx, w: Warga, now: Date, pertama: boolean, numpangAktif: BarisNumpang | undefined) {
  if (w.tabungan > 0) {
    const bunga = Math.floor(w.tabungan * BANK.bungaPerSiklus)
    if (bunga > 0) await catat(tx, w, { akun: 'tabungan', jenis: 'bunga_tabungan', jumlah: bunga, rincian: { persen: BANK.bungaPerSiklus * 100 } }, now)
  }
  const h = hunianById(w.hunian_id)
  if (h && w.peran !== 'walikota') { // Wali Kota tinggal di rumah dinas: tanpa tagihan
    if (w.kasbon > 0) {
      const bunga = Math.round(w.kasbon * KASBON_BUNGA)
      if (bunga > 0) await catat(tx, w, { akun: 'kasbon', jenis: 'bunga_kasbon', jumlah: bunga, rincian: { persen: KASBON_BUNGA * 100 } }, now)
    }
    const r = rincianTagihan(h, w.umk)
    await bayarAtauKasbon(tx, w, 'tagihan_hidup', r.total, { hunian: h.id, sewa: r.sewa, listrik: r.listrik, makan: r.makan }, now)
    if (h.id === NUMPANG.id) {
      const n = numpangAktif
      if (n && n.uang_dapur > 0) {
        await bayarAtauKasbon(tx, w, 'uang_dapur', n.uang_dapur, { numpang: n.id }, now)
        tx.tulis`update numpang set uang_tertahan = uang_tertahan + ${n.uang_dapur} where id = ${n.id}`
      }
    }
    if (pertama) {
      const pajak = pajakBulanan(w.upah_siklus)
      if (pajak > 0) await bayarAtauKasbon(tx, w, 'pajak', pajak, { upah: w.upah_siklus }, now)
      w.upah_siklus = 0
    }
  }
  // pindah hunian berlaku mulai siklus berikutnya
  if (w.hunian_berikut) {
    w.hunian_id = w.hunian_berikut
    w.hunian_berikut = null
    w.hunian_tempat = w.hunian_tempat_berikut
    w.hunian_tempat_berikut = null
    w.hunian_kamar = w.hunian_kamar_berikut
    w.hunian_kamar_berikut = null
    await masukKamar(tx, w, now) // kamar yang sudah berpenghuni: minta berteman dengan semua penghuni lama
  }
  // penghuni Rusunawa yang sudah mapan wajib pindah
  if (w.hunian_id === RUSUN.id && w.keahlian6_sejak && now.getTime() - w.keahlian6_sejak.getTime() > RUSUN.pindahHari * HARI_MS) {
    w.hunian_id = HUNIAN_PINDAHAN
    w.hunian_tempat = null
    w.hunian_kamar = null
  }
}

/** Pulang dari luar kota bila waktunya sudah lewat, lalu terima hasil perjalanan. */
async function pulang(tx: Tx, w: Warga, now: Date): Promise<void> {
  if (!w.perjalanan_tujuan || !w.perjalanan_pulang || w.perjalanan_pulang > now) return
  const t = w.perjalanan_tujuan as Tujuan
  if (t === 'jakarte') {
    if (w.keahlian < KURSUS.skillMaks) {
      w.keahlian += 1
      if (w.keahlian === 6) w.keahlian6_sejak = w.perjalanan_pulang
    }
  } else if (t === 'culabaya') {
    const p = pekerjaanById(w.pekerjaan_id) ?? lowongan[0]
    const upah = upahAksi(p, w.keahlian, AKSI_CULABAYA, w.umk, w.sekolah)
    await catat(tx, w, { akun: 'kas', jenis: 'hasil_perjalanan', jumlah: upah, rincian: { tujuan: t, pekerjaan: p.id } }, now)
    w.upah_siklus += upah
  } else {
    await catat(tx, w, { akun: 'kas', jenis: 'hasil_perjalanan', jumlah: HASIL_SOLOE, rincian: { tujuan: t } }, now)
  }
  // oleh-oleh koleksi, kadang-kadang
  const oleh = { pengirim: 'Bandara Weton', judul: 'Oleh-oleh dari perjalanan', sumber: 'perjalanan' }
  if (t === 'soloe' && acakAman() < TEMUAN.batikSoloe) await tambahItem(tx, w.id, 'batik-tulis', 1, oleh, now)
  if (t === 'jakarte' && acakAman() < TEMUAN.monazJakarte) await tambahItem(tx, w.id, 'miniatur-monaz', 1, oleh, now)
  w.perjalanan_tujuan = null
  w.perjalanan_pulang = null
}

/**
 * Status numpang untuk penumpang: izin pemilik membuat pindah mulai siklus berikutnya; numpang yang sudah berakhir
 * memindahkan penumpang ke Kost Melati. Pemilik tidak pernah mengunci baris penumpang, jadi tidak ada kunci silang.
 * `n` adalah baris numpang penumpang yang sudah dikunci (for update) di awal transaksi; statusnya diperbarui di memori
 * supaya tagihSiklus melihat keadaan yang sama dengan basis data.
 */
function aturNumpang(tx: Tx, w: Warga, now: Date, n: BarisNumpang | undefined): void {
  const selesai = n?.status === 'aktif' && n.berakhir_pada !== null && n.berakhir_pada <= now
  if (selesai) {
    tx.tulis`update numpang set status = 'selesai' where id = ${n.id}`
    n.status = 'selesai'
  }
  if (n?.status === 'aktif') {
    if (w.hunian_id !== NUMPANG.id && w.hunian_berikut !== NUMPANG.id) w.hunian_berikut = NUMPANG.id
    return
  }
  if (w.hunian_berikut === NUMPANG.id) w.hunian_berikut = null
  if (w.hunian_id === NUMPANG.id) w.hunian_id = HUNIAN_PINDAHAN
}

/** Cairkan uang yang ditahan untuk warga ini: hasil lapak (dipotong biaya lapak) dan uang dapur dari penumpang. */
async function cairkan(tx: Tx, w: Warga, now: Date): Promise<void> {
  // skip locked: lapak yang sedang dibeli orang lain dicairkan lain kali, jadi dua pemain yang saling membeli tidak saling menunggu.
  // Ketiga pernyataan tidak saling membaca hasil, jadi satu penerbangan; delete harus sesudah update lapak (urutan kirim dijaga).
  const [lp, , dp] = await Promise.all([
    tx<{ jumlah: string }[]>`
      with x as (select id, uang_tertahan from lapak where penjual_id = ${w.id} and uang_tertahan > 0 for update skip locked)
      update lapak l set uang_tertahan = 0 from x where l.id = x.id returning x.uang_tertahan as jumlah`,
    tx`delete from lapak where penjual_id = ${w.id} and sisa = 0 and uang_tertahan = 0`,
    tx<{ jumlah: string }[]>`
      with x as (select id, uang_tertahan from numpang where pemilik_id = ${w.id} and uang_tertahan > 0 for update skip locked)
      update numpang n set uang_tertahan = 0 from x where n.id = x.id returning x.uang_tertahan as jumlah`,
  ])
  const bruto = lp.reduce((t, b) => t + Number(b.jumlah), 0)
  if (bruto > 0) {
    await catat(tx, w, { akun: 'kas', jenis: 'jual_lapak', jumlah: bruto }, now)
    const biaya = biayaLapak(bruto)
    if (biaya > 0) await catat(tx, w, { akun: 'kas', jenis: 'biaya_lapak', jumlah: -biaya, rincian: { bruto } }, now)
  }
  const dapur = dp.reduce((t, b) => t + Number(b.jumlah), 0)
  if (dapur > 0) await catat(tx, w, { akun: 'kas', jenis: 'uang_dapur', jumlah: dapur, rincian: { sebab: 'uang dapur penumpang' } }, now)
}

/** Hasil kueri awal transaksi yang dibutuhkan selesaikan(), supaya ia tidak perlu bertanya lagi ke basis data. */
type Prabaca = {
  /** baris numpang penumpang ini yang berstatus minta atau aktif, sudah dikunci */
  numpang: BarisNumpang | undefined
  /** ada uang tertahan atau lapak habis yang perlu dibereskan cairkan() */
  cair: boolean
}

/** Dirawat otomatis: kesehatan sudah di batas minimum dan masih lapar. Biaya jadi kasbon bila kas kurang. */
async function rawatInap(tx: Tx, w: Warga, now: Date): Promise<void> {
  await bayarAtauKasbon(tx, w, 'rawat_inap', LAPAR.rawat.biaya, { sebab: 'lapar berkepanjangan' }, now)
  w.lapar = LAPAR.rawat.laparPulih
  w.kesehatan = Math.max(w.kesehatan, LAPAR.rawat.kesehatanPulih)
  w.kesehatan_pada = now
  w.rawat_sampai = new Date(now.getTime() + LAPAR.rawat.durasiMs)
  // lapar tidak turun selama dirawat
  w.lapar_pada = w.rawat_sampai
  w.lapar_hukum_pada = null
}

/** Latihan yang waktunya sudah habis: keahlian naik atau atribut bertambah, lalu jeda sebelum latihan berikutnya. */
function selesaikanLatihan(tx: Tx, w: Warga, now: Date): void {
  if (!w.latihan_id || !w.latihan_selesai || w.latihan_selesai > now) return
  const selesai = w.latihan_selesai
  if (w.latihan_id === 'keahlian') {
    if (w.latihan_target && w.latihan_target > w.keahlian) {
      w.keahlian = Math.min(KURSUS.skillMaks, w.latihan_target)
      if (w.keahlian >= 6 && !w.keahlian6_sejak) w.keahlian6_sejak = selesai
    }
  } else {
    const k = LATIHAN.atribut[w.latihan_id]
    if (k) w[k.atribut] = tambahAtribut(w[k.atribut], k.naik)
  }
  w.latihan_jeda = new Date(selesai.getTime() + LATIHAN.cooldownMs)
  w.latihan_id = null
  w.latihan_target = null
  w.latihan_selesai = null
  catatAktivitas(tx, w, 'belajar', 1, now)
}

/** Pulihkan Tenaga, urus lapar dan latihan, lalu tagih siklus yang jatuh tempo. Mengubah `w` dan basis data. */
async function selesaikan(tx: Tx, w: Warga, now: Date, pra: Prabaca): Promise<void> {
  await pulang(tx, w, now)
  aturNumpang(tx, w, now, pra.numpang)
  if (pra.cair) await cairkan(tx, w, now)
  selesaikanLatihan(tx, w, now)

  // wajib pindah: pihak yang menolak atau memutus pertemanan sekamar pindah sesudah masa tenggang
  if (w.wajib_pindah_tenggat && w.wajib_pindah_tenggat <= now) {
    if (w.hunian_tempat && w.hunian_kamar != null && kunciKamar(w.hunian_tempat, w.hunian_kamar) === w.wajib_pindah_dari) {
      w.hunian_id = HUNIAN_PINDAHAN
      w.hunian_tempat = null
      w.hunian_kamar = null
      w.hunian_berikut = null
      w.hunian_tempat_berikut = null
      w.hunian_kamar_berikut = null
    }
    w.wajib_pindah_tenggat = null
    w.wajib_pindah_dari = null
  }
  if (w.pekerjaan_id && !w.tempat_kerja) w.tempat_kerja = penempatan.find((x) => x.jenis === pekerjaanById(w.pekerjaan_id)?.tempat)?.id ?? null

  const ks = pulihkanTenaga({ tenaga: w.kesehatan, pada: w.kesehatan_pada }, KESEHATAN.maks, KESEHATAN.pulihMs, now)
  w.kesehatan = ks.tenaga
  w.kesehatan_pada = ks.pada

  // lapar: Tenaga pulih normal sampai mulai lapar, lalu setengah lajunya
  const mulaiLapar = waktuMulaiLapar(w)
  if (w.rawat_sampai && w.rawat_sampai <= now) w.rawat_sampai = null
  const perluRawat = hitungLapar(w, now)
  if (perluRawat && !w.rawat_sampai) await rawatInap(tx, w, now)

  const macet = kasbonMacet(w.kasbon, w.kasbon_sejak, now)
  const maks = tenagaMaks(w.hunian_id, w.peran)
  const lemah = sakit(w.kesehatan)
  let p = { tenaga: w.tenaga, pada: w.tenaga_pada }
  if (mulaiLapar && mulaiLapar > p.pada && mulaiLapar < now) {
    p = pulihkanTenaga(p, maks, selangTenaga(macet, w.peran, lemah, false), mulaiLapar)
    p = pulihkanTenaga(p, maks, selangTenaga(macet, w.peran, lemah, true), now)
  } else {
    p = pulihkanTenaga(p, maks, selangTenaga(macet, w.peran, lemah, !!mulaiLapar && mulaiLapar <= p.pada && sedangLapar(laparKini(w.lapar, w.lapar_pada, now))), now)
  }
  w.tenaga = p.tenaga
  w.tenaga_pada = p.pada

  const n = jumlahSiklusJatuhTempo(w.tagihan_berikut, now)
  if (n > 0) {
    const ditagih = Math.min(n, SIKLUS_DITAGIH_MAKS)
    for (let i = 0; i < ditagih; i++) await tagihSiklus(tx, w, now, i === 0, pra.numpang)
    // siklus lain yang terlewat dihapus (tradisi mudik)
    w.tagihan_berikut = new Date(w.tagihan_berikut.getTime() + n * SIKLUS_MS)
  }
  w.tenaga = Math.min(w.tenaga, tenagaMaks(w.hunian_id, w.peran))
}

type Lapak = { id: string; barang: Barang; sisa: number; harga: number; terjual: number; uang_tertahan: number }
type Permintaan = { id: string; nama: string; status: 'minta' | 'aktif'; uang_dapur: number; berakhir_pada: Date | null }
type Milik = {
  usaha: BarisUsaha[]
  lahan: BarisLahan[]
  gudang?: Partial<Record<Barang, number>>
  lapak?: Lapak[]
  numpang?: (BarisNumpang & { pemilik_nama: string }) | null
  penumpang?: Permintaan[]
  surat?: number
  permintaanTeman?: number
}

/** Delapan kueri milik warga. Dikembalikan malas (belum dikirim) supaya pemanggil menaruhnya dalam satu penerbangan. */
function kueriMilik(tx: Tx, id: string) {
  return {
    usaha: tx<BarisUsaha[]>`select * from usaha where warga_id = ${id} order by dibuat_pada`,
    lahan: tx<BarisLahan[]>`select * from lahan_milik where warga_id = ${id} order by dibeli_pada`,
    gudang: tx<{ barang: Barang; jumlah: number }[]>`select barang, jumlah from gudang where warga_id = ${id}`,
    lapak: tx<Lapak[]>`select id, barang, sisa, harga, terjual, uang_tertahan::int as uang_tertahan from lapak where penjual_id = ${id} order by dibuat_pada`,
    numpang: tx<Array<BarisNumpang & { pemilik_nama: string }>>`
      select n.*, w.nama as pemilik_nama from numpang n join warga w on w.id = n.pemilik_id where n.penumpang_id = ${id} and n.status in ('minta', 'aktif')`,
    penumpang: tx<Permintaan[]>`
      select n.id, w.nama, n.status, n.uang_dapur, n.berakhir_pada from numpang n join warga w on w.id = n.penumpang_id
      where n.pemilik_id = ${id} and n.status in ('minta', 'aktif') order by n.dibuat_pada`,
    surat: tx<{ n: number }[]>`select count(*)::int as n from surat where warga_id = ${id}`,
    teman: tx<{ n: number }[]>`select count(*)::int as n from pertemanan where status = 'minta' and peminta <> ${id} and (a = ${id} or b = ${id})`,
  }
}

async function susunMilik(k: ReturnType<typeof kueriMilik>): Promise<Milik> {
  const [usaha, lahan, gudang, lapak, [numpang], penumpang, [surat], [teman]] = await Promise.all([k.usaha, k.lahan, k.gudang, k.lapak, k.numpang, k.penumpang, k.surat, k.teman])
  return {
    usaha: [...usaha], lahan: [...lahan], gudang: Object.fromEntries(gudang.map((g) => [g.barang, g.jumlah])), lapak: [...lapak],
    numpang: numpang ?? null, penumpang: [...penumpang], surat: surat?.n ?? 0, permintaanTeman: teman?.n ?? 0,
  }
}

/** Tabel yang ditulis transaksi tanpa mengubah isi kueriMilik; tulisan ke tabel lain membuat milik dibaca ulang. */
const TABEL_BUKAN_MILIK = new Set(['warga', 'ledger', 'aksi_log'])

export function keadaan(w: Warga, now: Date, milik: Milik = { usaha: [], lahan: [] }): Keadaan {
  const h = hunianById(w.hunian_id)
  const hb = hunianById(w.hunian_berikut)
  const job = pekerjaanById(w.pekerjaan_id)
  const ij = jurusanById(w.ijazah)
  const kj = jurusanById(w.kuliah_jurusan)
  const hari = tanggalWIB(now)
  const macet = kasbonMacet(w.kasbon, w.kasbon_sejak, now)
  const r = h ? rincianTagihan(h, w.umk) : null
  const pajak = pajakBulanan(w.upah_siklus)
  const dapur = h?.id === NUMPANG.id && milik.numpang?.status === 'aktif' ? milik.numpang.uang_dapur : 0
  const koranTerbaru = terbaru(now)
  return {
    sekarang: now.toISOString(),
    warga: { id: w.id, nama: w.nama, email: w.email, bergabung: w.dibuat_pada.toISOString() },
    peran: w.peran,
    kas: w.kas,
    kasbon: w.kasbon,
    kasbonMacet: macet,
    tenaga: { nilai: w.tenaga, pada: w.tenaga_pada.toISOString(), maks: tenagaMaks(w.hunian_id, w.peran), selangMs: selangTenaga(macet, w.peran, sakit(w.kesehatan), w.peran !== 'walikota' && sedangLapar(laparKini(w.lapar, w.lapar_pada, now))) },
    keahlian: w.keahlian,
    hunian: h ? { id: h.id, nama: h.nama, tempat: w.hunian_tempat, kamar: w.hunian_kamar } : null,
    hunianBerikut: hb ? { id: hb.id, nama: hb.nama, tempat: w.hunian_tempat_berikut, kamar: w.hunian_kamar_berikut } : null,
    sekolah: adalahSekolah(w.sekolah) ? { id: w.sekolah, nama: SEKOLAH[w.sekolah].nama } : null,
    kesehatan: { nilai: w.kesehatan, pada: w.kesehatan_pada.toISOString(), maks: KESEHATAN.maks, selangMs: KESEHATAN.pulihMs, sakit: sakit(w.kesehatan) },
    pekerjaan: job ? { id: job.id, nama: job.nama, tier: job.tier, upahPerAksi: upahAksi(job, w.keahlian, 1, w.umk, w.sekolah), gajiBulan: gajiPekerjaan(job, w.umk), tempat: job.tempat } : null,
    tagihan: r ? { jatuhTempo: w.tagihan_berikut.toISOString(), sewa: r.sewa, listrik: r.listrik, makan: r.makan, pajak, dapur, total: r.total + pajak + dapur } : null,
    upahSiklus: w.upah_siklus,
    tabungan: w.tabungan,
    ijazah: ij ? { id: ij.id, nama: ij.nama, jenjang: ij.jenjang } : null,
    kuliah: kj
      ? {
          jurusan: { id: kj.id, nama: kj.nama, jenjang: kj.jenjang }, semester: w.kuliah_semester, totalSemester: kj.semester,
          sesi: w.kuliah_sesi, sesiPerSemester: SESI_KULIAH.perSemester, uktLunas: w.kuliah_ukt_lunas, ukt: uktUntuk(kj, w.sekolah),
          bisaHariIni: w.kuliah_sesi_tanggal !== hari,
        }
      : null,
    perjalanan: w.perjalanan_tujuan && w.perjalanan_pulang
      ? { tujuan: w.perjalanan_tujuan, nama: TUJUAN[w.perjalanan_tujuan as Tujuan]?.nama ?? w.perjalanan_tujuan, pulang: w.perjalanan_pulang.toISOString() }
      : null,
    berobatSiap: w.berobat_tanggal !== hari,
    usaha: milik.usaha.map((u) => {
      const siklus = siklusSiap(u, now)
      return {
        id: u.id, jenis: u.jenis, nama: JENIS_USAHA[u.jenis].nama, level: u.level, siklusSiap: siklus, hasilSiap: siklus * labaSiklus(u.jenis, u.level),
        upgradeBiaya: u.level >= USAHA_ATURAN.levelMaks ? null : biayaUpgradeUsaha(u.jenis, u.level),
      }
    }),
    lahan: milik.lahan.map((m) => {
      const pl = m.jenis_objek === 'bangunan' ? penempatanById.get(m.lahan_id) : undefined
      const l = m.jenis_objek === 'lahan' ? lahanKosong.find((x) => x.id === m.lahan_id) : undefined
      const uk = pl ? jenisById.get(pl.jenis)?.ukuran : undefined
      let bangun: Keadaan['lahan'][number]['bangun'] = null
      if (m.bangun_jenis && m.bangun_mulai && m.bangun_selesai) {
        const progres = progresBangun(m.bangun_mulai, m.bangun_selesai, now)
        const t = tahapBangun(progres)
        bangun = {
          jenis: m.bangun_jenis, nama: BANGUN[m.bangun_jenis]?.nama ?? m.bangun_jenis, mulai: m.bangun_mulai.toISOString(), selesai: m.bangun_selesai.toISOString(),
          progres: Math.round(progres * 1000) / 1000, tahap: t.tahap, tahapNama: t.nama, tampil: t.tampil,
        }
      }
      return {
        id: m.lahan_id, distrik: distrik.find((d) => d.id === (pl?.distrik ?? l?.distrik))?.nama ?? '-',
        luas: uk ? Math.round(uk[0] * uk[1]) : l ? Math.round(l.w * l.d) : 0, rumah: rumahJadi(m, now), objek: m.jenis_objek, bangun,
        jual: m.jual_mode !== 'tidak' && m.jual_harga ? { mode: m.jual_mode, harga: m.jual_harga } : null,
      }
    }),
    punyaRumah: milik.lahan.some((m) => rumahJadi(m, now)),
    gudang: Object.fromEntries(Object.entries(milik.gudang ?? {}).filter(([, n]) => (n ?? 0) > 0)) as Record<string, number>,
    konsumsiSisa: KONSUMSI.kaliPerHari - (w.konsumsi_tanggal === hari ? w.konsumsi_kali : 0),
    umk: w.umk,
    lapak: (milik.lapak ?? []).map((l) => ({ id: l.id, barang: l.barang, sisa: l.sisa, harga: l.harga, terjual: l.terjual, menunggu: l.uang_tertahan })),
    numpang: milik.numpang
      ? { pemilik: milik.numpang.pemilik_nama, status: milik.numpang.status as 'minta' | 'aktif', uangDapur: milik.numpang.uang_dapur, berakhir: milik.numpang.berakhir_pada?.toISOString() ?? null }
      : null,
    kamarTamu: {
      terima: w.numpang_terima, uangDapur: w.uang_dapur, kamar: milik.lahan.filter((m) => rumahJadi(m, now)).length * NUMPANG.kamarPerRumah,
      penumpang: (milik.penumpang ?? []).map((p) => ({ id: p.id, nama: p.nama, status: p.status, uangDapur: p.uang_dapur, berakhir: p.berakhir_pada?.toISOString() ?? null })),
    },
    makanSisa: MAKAN.kaliPerHari - (w.makan_tanggal === tanggalWIB(now) ? w.makan_kali : 0),
    bonus: { siap: w.bonus_tanggal !== tanggalWIB(now), jumlah: BONUS_HARIAN },
    koran: koranTerbaru ? { tanggal: koranTerbaru.tanggal, judul: koranTerbaru.berita[0].judul } : null,
    kursus: w.keahlian >= KURSUS.skillMaks
      ? null
      : {
          dari: w.keahlian, ke: w.keahlian + 1, biaya: biayaKursus(w.keahlian, h), tenaga: LATIHAN.keahlian.tenaga, durasiMs: durasiKursusKeahlian(w.keahlian + 1),
          syarat: Object.entries(syaratKursusKeahlian(w.keahlian + 1)).map(([atribut, perlu]) => ({ atribut, perlu: perlu!, punya: w[atribut as Atribut] })),
        },
    lowongan: lowonganUntuk(w.ijazah).map((p) => ({
      id: p.id, nama: p.nama, tier: p.tier, tempat: p.tempat, tempatNama: jenisById.get(p.tempat)?.nama ?? p.tempat,
      upahPerAksi: upahAksi(p, w.keahlian, 1, w.umk, w.sekolah), gajiBulan: gajiPekerjaan(p, w.umk), minKeahlian: minKeahlianUntuk(p, w.sekolah), boleh: bolehAmbil(p, w.keahlian, w.sekolah),
      cocok: adalahSekolah(w.sekolah) && (SEKOLAH[w.sekolah].tempat as readonly string[]).includes(p.tempat),
      seleksi: golonganPekerjaan(p),
    })),
    lapar: { nilai: w.lapar, pada: w.lapar_pada.toISOString(), maks: LAPAR.maks, selangMs: LAPAR.turunSelangMs, ambang: LAPAR.ambang },
    dirawat: w.rawat_sampai && w.rawat_sampai > now ? { sampai: w.rawat_sampai.toISOString() } : null,
    atribut: nilaiAtribut(w),
    level: { nilai: w.level, exp: w.exp, perlu: expUntukLevel(w.level), maks: LEVEL.maks },
    reputasi: { total: w.reputasi, minggu: w.reputasi_minggu },
    inventori: { dipakai: Object.values(milik.gudang ?? {}).reduce((t, n) => t + (n ?? 0), 0), kapasitas: INVENTORI.kapasitas },
    suratBaru: milik.surat ?? 0,
    permintaanTeman: milik.permintaanTeman ?? 0,
    wajibPindah: w.wajib_pindah_tenggat && w.wajib_pindah_dari ? { tenggat: w.wajib_pindah_tenggat.toISOString(), dari: w.wajib_pindah_dari } : null,
    gantiKerja: (() => {
      const g = cekGantiKerja(w.ganti_kerja ?? [], now)
      return { sisa: g.sisa, maks: GANTI_KERJA.maksPerPeriode, jedaSampai: g.jedaSampai?.toISOString() ?? null }
    })(),
    seleksi: {
      lulus: w.seleksi?.lulus ?? [],
      gagal: Object.fromEntries(Object.entries(w.seleksi?.gagal ?? {}).filter(([, t]) => Date.parse(t) > now.getTime())),
    },
    latihan: w.latihan_id && w.latihan_selesai
      ? { id: w.latihan_id, nama: w.latihan_id === 'keahlian' ? `Kursus keahlian ke ${w.latihan_target}` : (LATIHAN.atribut[w.latihan_id]?.nama ?? w.latihan_id), target: w.latihan_target, selesai: w.latihan_selesai.toISOString() }
      : null,
    latihanJeda: w.latihan_jeda && w.latihan_jeda > now ? w.latihan_jeda.toISOString() : null,
    pancing: w.pancing
      ? { lempar: new Date(w.pancing.lempar).toISOString(), gigit: new Date(w.pancing.gigit).toISOString(), hangus: new Date(w.pancing.hangus).toISOString(), tengah: w.pancing.tengah, lebar: w.pancing.lebar, periodeMs: MEMANCING.periodeMs }
      : null,
  }
}

/** Rumah yang sudah jadi: bendera `rumah` atau konstruksi rumah yang waktunya sudah lewat. */
const rumahJadi = (m: BarisLahan, now: Date) => m.rumah || (m.bangun_jenis === 'rumah' && m.bangun_selesai !== null && m.bangun_selesai <= now)

type Opsi = { kunci?: string | null; aksi: string; now: Date; tambahan?: () => Partial<Keadaan> }

/** UMK yang berlaku saat ini (tabel kota). */
export async function umkBerlaku(sql: Sql | TxMentah): Promise<number> {
  const [k] = await sql<{ umk: string }[]>`select umk from kota where id = 1`
  return k ? Number(k.umk) : UMK_AWAL
}

/** Lama jawaban aksi disimpan untuk idempotensi. Kunci yang dikirim ulang setelah ini dianggap aksi baru. */
export const AKSI_LOG_SIMPAN_MS = 2 * HARI_MS

/**
 * Satu aksi = satu transaksi di koneksi yang dipesan (sql.reserve), dan hanya tiga penerbangan ke basis data:
 *  1. awal: begin, kunci baris warga, lalu semua yang perlu dibaca (UMK, jawaban kunci ini, numpang, uang tertahan, milik, koran bila basi).
 *     Server menjalankannya sesuai urutan kirim, jadi pembacaan sesudah kunci baris melihat keadaan setelah transaksi lain selesai.
 *  2. (hanya bila aksi menulis tabel milik) baca ulang milik, bersama semua tulisan yang tertunda.
 *  3. akhir: tulisan yang tertunda, jawaban aksi_log, dan commit.
 * Selama koneksi dipegang, jangan meng-await kolam `sql` (kolam Vercel max 1).
 */
export async function dalamTransaksi(sql: Sql, id: string, o: Opsi, fn: (tx: Tx, w: Warga) => Promise<void>): Promise<Keadaan> {
  // pekan peringkat berganti: tutup dulu (snapshot, hadiah, reset). Sekali per pekan per proses; gagal tidak boleh menahan aksi.
  await pastikanPekan(sql, o.now).catch((e) => console.error(e))
  const koneksi = await sql.reserve()
  let mati = false
  try {
    return await jalankanAksi(koneksi, id, o, fn)
  } catch (e) {
    mati = koneksiMati(e)
    // pembatalan harus sampai ke server sebelum koneksi kembali ke kolam
    if (!mati) await koneksi.unsafe('rollback').execute().catch(() => {})
    throw e
  } finally {
    // koneksi yang sudah mati sudah dikeluarkan postgres.js dari koneksi yang dipesan; release() malah memasukkannya ke daftar siap pakai
    if (!mati) koneksi.release()
  }
}

/**
 * Galat yang berarti koneksi sudah putus. Mengirim rollback ke koneksi yang dipesan lalu putus melempar galat tak tertangkap
 * dan tak pernah selesai, jadi untuk galat ini tidak ada yang dikirim lagi.
 */
export function koneksiMati(e: unknown): boolean {
  const { code, severity } = e as { code?: unknown; severity?: unknown }
  if (severity === 'FATAL' || severity === 'PANIC') return true
  if (typeof code !== 'string') return false
  return code.startsWith('CONNECT') || KODE_SOKET.has(code)
}
const KODE_SOKET = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNABORTED', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'ERR_SOCKET_CLOSED'])

async function jalankanAksi(koneksi: postgres.ReservedSql, id: string, o: Opsi, fn: (tx: Tx, w: Warga) => Promise<void>): Promise<Keadaan> {
  const tx = bungkus(koneksi)
  const qWarga = tx<Warga[]>`select * from warga where id = ${id} for update`
  const qKota = tx<{ umk: number }[]>`select umk from kota where id = 1`
  const qLog = o.kunci ? tx<{ hasil: Keadaan }[]>`select hasil from aksi_log where warga_id = ${id} and kunci = ${o.kunci}` : null
  const qNumpang = tx<BarisNumpang[]>`select * from numpang where penumpang_id = ${id} and status in ('minta', 'aktif') for update`
  const qCair = tx<{ cair: boolean }[]>`
    select exists (select 1 from lapak where penjual_id = ${id} and (uang_tertahan > 0 or sisa = 0))
        or exists (select 1 from numpang where pemilik_id = ${id} and uang_tertahan > 0) as cair`
  const qKoran = koranBasi() ? tx<BarisKoran[]>`select tanggal, berita, besok from koran_edisi` : null
  const qMilik = kueriMilik(tx, id)
  await Promise.all([tx.mentah('begin'), qWarga, qKota, qLog, qNumpang, qCair, qKoran, ...Object.values(qMilik)])

  if (qKoran) terapkanKoran(await qKoran)
  const [w] = await qWarga
  if (!w) throw new Galat('warga_tidak_ada', 'Akun tidak ditemukan.', 404)
  const [kota] = await qKota
  w.umk = kota ? Number(kota.umk) : UMK_AWAL
  if (qLog) {
    const [lama] = await qLog
    if (lama) {
      await tx.mentah('commit')
      return lama.hasil
    }
  }
  const [numpang] = await qNumpang
  const [{ cair }] = await qCair
  await selesaikan(tx, w, o.now, { numpang, cair })
  if (w.perjalanan_tujuan && o.aksi !== 'muat' && o.aksi !== 'walikota') {
    const nama = TUJUAN[w.perjalanan_tujuan as Tujuan]?.nama ?? w.perjalanan_tujuan
    throw new Galat('sedang_pergi', `Kamu sedang di ${nama}. Tunggu sampai pulang.`, 409)
  }
  if (w.rawat_sampai && w.rawat_sampai > o.now && o.aksi !== 'muat' && o.aksi !== 'walikota') {
    throw new Galat('sedang_dirawat', 'Kamu sedang dirawat di rumah sakit karena kelaparan. Tunggu sampai pulih lalu makan yang cukup.', 409)
  }
  // rumah yang konstruksinya selesai ditandai jadi (hunian dan kamar tamu membaca kolom rumah)
  for (const m of await qMilik.lahan) {
    if (!m.rumah && m.bangun_jenis === 'rumah' && m.bangun_selesai && m.bangun_selesai <= o.now) tx.tulis`update lahan_milik set rumah = true where lahan_id = ${m.lahan_id} and not rumah`
  }
  await fn(tx, w)
  simpan(tx, w, o.now)

  let milik = qMilik
  if ([...tx.tabelDitulis].some((t) => !TABEL_BUKAN_MILIK.has(t))) {
    milik = kueriMilik(tx, id)
    await Promise.all(Object.values(milik))
  }
  const hasil = { ...keadaan(w, o.now, await susunMilik(milik)), ...o.tambahan?.() }
  await Promise.all([
    ...(o.kunci
      ? [
          tx`
            insert into aksi_log (warga_id, kunci, aksi, hasil, dibuat_pada)
            values (${id}, ${o.kunci}, ${o.aksi}, ${tx.json(hasil)}, ${o.now})`,
          // jawaban lama hanya perlu untuk permintaan ulang dalam hitungan menit; buang yang lebih tua dari 2 hari
          // supaya tabel tidak terus membesar. Hanya baris warga ini (indeks utama), di bawah kunci barisnya.
          tx`delete from aksi_log where warga_id = ${id} and dibuat_pada < ${new Date(o.now.getTime() - AKSI_LOG_SIMPAN_MS)}`,
        ]
      : []),
    tx.mentah('commit'),
  ])
  return hasil
}

export const wajibMulai = (w: Warga) => {
  if (!w.hunian_id) throw new Galat('belum_mulai', 'Pilih tempat tinggal dulu.', 409)
}

/** Keadaan terkini. Menyelesaikan tagihan yang jatuh tempo bila ada. */
export const muat = (sql: Sql, id: string, now = new Date()) => dalamTransaksi(sql, id, { aksi: 'muat', now }, async () => {})

/** Jumlah warga (selain Wali Kota) yang menempati atau akan pindah ke bangunan hunian ini. */
async function terisi(tx: Tx, tempat: string, kecuali: string): Promise<number> {
  const [{ n }] = await tx<{ n: number }[]>`
    select count(*)::int as n from warga where id <> ${kecuali} and peran <> 'walikota' and (hunian_tempat = ${tempat} or hunian_tempat_berikut = ${tempat})`
  return n
}

export const pilihHunian = (sql: Sql, id: string, kunci: string, hunianId: string, now = new Date(), tempatDiminta?: string | null, kamarDiminta?: number | null) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'hunian', now }, async (tx, w) => {
    const h = hunianById(hunianId)
    if (!h || !bisaDipilih(h)) throw new Galat('hunian_tidak_ada', 'Pilihan tempat tinggal itu belum tersedia.')
    // kamar di bangunan tertentu: yang diminta, atau gedung pertama yang masih ada kamar kosong
    let tempat: string | null = null
    let kamar: number | null = null
    const kapasitas = kapasitasHunian(h)
    if (kapasitas !== null && w.peran !== 'walikota') {
      const calon = tempatDiminta ? [tempatDiminta] : penempatan.filter((p) => h.bangunan.includes(p.jenis)).map((p) => p.id)
      if (tempatDiminta && !h.bangunan.includes(penempatanById.get(tempatDiminta)?.jenis ?? '')) throw new Galat('tempat_tidak_cocok', 'Bangunan itu bukan ' + h.nama + '.')
      if (!calon.length) throw new Galat('hunian_tidak_ada', h.nama + ' belum ada di peta.')
      for (const c of calon) {
        if (c === w.hunian_tempat && h.id === w.hunian_id) { tempat = c; break }
        // dua pemain tidak bisa merebut kamar terakhir bersamaan
        await tx`select pg_advisory_xact_lock(hashtext(${'hunian:' + c}))`
        if ((await terisi(tx, c, w.id)) < kapasitas) { tempat = c; break }
      }
      if (!tempat) throw new Galat('hunian_penuh', tempatDiminta ? 'Semua kamar di gedung ini sudah terisi. Coba gedung lain.' : 'Semua kamar ' + h.nama + ' sudah terisi.', 409)
      // nomor kamar: tetap di kamar sekarang bila masih di gedung yang sama, selain itu yang diminta atau kamar kosong pertama
      if (h.kamar) {
        if (tempat === w.hunian_tempat && h.id === w.hunian_id && kamarDiminta == null && w.hunian_kamar != null) kamar = w.hunian_kamar
        else {
          await tx`select pg_advisory_xact_lock(hashtext(${'hunian:' + tempat}))`
          kamar = await tentukanKamar(tx, tempat, h.kamar, h.penghuni, w.id, kamarDiminta)
        }
      }
    }
    if (h.jenis === 'rumah') {
      const [r] = await tx<{ n: number }[]>`select count(*) as n from lahan_milik where warga_id = ${w.id} and rumah`
      if (r.n < 1) throw new Galat('belum_punya_rumah', 'Bangun rumah di lahan milikmu dulu (Beranda, bagian Properti).', 409)
    }
    if (h.id === RUSUN.id && w.hunian_id !== RUSUN.id && w.keahlian >= RUSUN.batasKeahlian) throw new Galat('rusun_syarat', 'Rusunawa hanya untuk warga yang masih Tier 2 ke bawah.', 409)
    if (w.hunian_id === null) {
      w.hunian_id = h.id
      w.hunian_tempat = tempat
      w.hunian_kamar = kamar
      await masukKamar(tx, w, now) // kamar yang sudah berpenghuni: minta berteman dengan semua penghuni lama
    } else if (h.id === w.hunian_id && tempat === w.hunian_tempat && kamar === w.hunian_kamar) {
      w.hunian_berikut = null
      w.hunian_tempat_berikut = null
      w.hunian_kamar_berikut = null
    } else {
      w.hunian_berikut = h.id
      w.hunian_tempat_berikut = tempat
      w.hunian_kamar_berikut = kamar
    }
    // memilih tempat tinggal lain mengakhiri numpang yang sedang berjalan
    await tx`update numpang set status = 'selesai', berakhir_pada = ${now} where penumpang_id = ${w.id} and status in ('minta', 'aktif')`
  })

/** Id bangunan yang bisa jadi tempat kerja untuk satu jenis: yang ada di peta dan bangunan pemain yang sudah selesai dibangun. */
async function tempatKerjaUntuk(tx: Tx, jenis: string, now: Date): Promise<string[]> {
  const dibangun = await tx<{ lahan_id: string }[]>`
    select lahan_id from lahan_milik where jenis_objek = 'lahan' and bangun_jenis = ${jenis} and bangun_selesai <= ${now} order by lahan_id`
  return [...penempatan.filter((x) => x.jenis === jenis).map((x) => x.id), ...dibangun.map((d) => d.lahan_id)]
}

/**
 * Pasang pekerjaan di salah satu bangunan: periksa batas ganti pekerjaan (cooldown dan jumlah per periode) dan kuota lowongan
 * tiap bangunan (hanya pekerja pemain dihitung). Kunci penasihat per pekerjaan mencegah dua pemain mengambil kursi terakhir bersamaan.
 */
export async function pasangKerja(tx: Tx, w: Warga, p: Pekerjaan, tempatDiminta: string | null, now: Date): Promise<void> {
  const ganti = !!w.pekerjaan_id && w.pekerjaan_id !== p.id
  if (ganti) {
    const g = cekGantiKerja(w.ganti_kerja ?? [], now)
    if (!g.boleh) throw new Galat('ganti_kerja_dibatasi', `${g.alasan} Coba lagi nanti.`, 409)
  }
  await tx`select pg_advisory_xact_lock(hashtext(${'kerja:' + p.id}))`
  const calon = await tempatKerjaUntuk(tx, p.tempat, now)
  if (!calon.length) throw new Galat('tempat_tidak_ada', `Belum ada ${jenisById.get(p.tempat)?.nama ?? p.tempat} yang aktif.`, 409)
  if (tempatDiminta && !calon.includes(tempatDiminta)) throw new Galat('tempat_tidak_cocok', 'Bangunan itu bukan tempat kerja untuk pekerjaan ini.')
  const isi = new Map(
    (await tx<{ tempat_kerja: string; n: number }[]>`
      select tempat_kerja, count(*)::int as n from warga where pekerjaan_id = ${p.id} and tempat_kerja is not null and id <> ${w.id} group by tempat_kerja`).map((t) => [t.tempat_kerja, t.n]),
  )
  const kuota = kuotaLowongan(p.tempat, p.tier, p.id)
  const sama = w.pekerjaan_id === p.id && w.tempat_kerja && calon.includes(w.tempat_kerja) ? [w.tempat_kerja] : calon
  const tempat = (tempatDiminta ? [tempatDiminta] : sama).find((c) => (isi.get(c) ?? 0) < kuota)
  if (!tempat) throw new Galat('lowongan_penuh', `Lowongan ${p.nama} penuh: ${kuota} orang per bangunan. Coba lagi nanti atau pilih pekerjaan lain.`, 409)
  if (w.pekerjaan_id === p.id && w.tempat_kerja === tempat) return
  if (ganti) w.ganti_kerja = [...(w.ganti_kerja ?? []).filter((x) => now.getTime() - Date.parse(x) < GANTI_KERJA.periodeMs), now.toISOString()]
  w.pekerjaan_id = p.id
  w.tempat_kerja = tempat
}

export const ambilPekerjaan = (sql: Sql, id: string, kunci: string, pekerjaanId: string, now = new Date(), tempatDiminta?: string | null) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'pekerjaan', now }, async (tx, w) => {
    wajibMulai(w)
    const p = lowonganUntuk(w.ijazah).find((x) => x.id === pekerjaanId)
    if (!p) throw new Galat('pekerjaan_tidak_ada', 'Pekerjaan itu belum dibuka.')
    if (!bolehAmbil(p, w.keahlian, w.sekolah)) throw new Galat('keahlian_kurang', `Pekerjaan itu butuh Keahlian ${minKeahlianUntuk(p, w.sekolah)}.`, 409)
    const gol = golonganPekerjaan(p)
    if (gol && !(w.seleksi?.lulus ?? []).includes(p.id)) throw new Galat('butuh_seleksi', `${p.nama} butuh ${SELEKSI[gol].nama}. Ikuti seleksinya dulu.`, 409)
    await pasangKerja(tx, w, p, tempatDiminta ?? null, now)
  })

export const kerja = (sql: Sql, id: string, kunci: string, aksi: number, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'kerja', now }, async (tx, w) => {
    wajibMulai(w)
    if (!Number.isInteger(aksi) || aksi < 1 || aksi > AKSI_MAKS) throw new Galat('aksi_tidak_valid', `Jumlah aksi 1 sampai ${AKSI_MAKS}.`)
    const p = pekerjaanById(w.pekerjaan_id)
    if (!p) throw new Galat('belum_punya_kerja', 'Pilih pekerjaan di Bursa Kerja dulu.', 409)
    const biaya = aksi * TENAGA.aksiKerja
    if (w.tenaga < biaya) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${biaya}, tersisa ${w.tenaga}.`, 409)
    const upah = upahAksi(p, w.keahlian, aksi, w.umk, w.sekolah)
    w.tenaga -= biaya
    if (w.peran !== 'walikota') {
      if (w.kesehatan >= KESEHATAN.maks) w.kesehatan_pada = now
      w.kesehatan = Math.max(0, w.kesehatan - aksi * KESEHATAN.perAksi)
    }
    await catat(tx, w, { akun: 'kas', jenis: 'upah', jumlah: upah, kunci, rincian: { pekerjaan: p.id, aksi, tier: p.tier, keahlian: w.keahlian } }, now)
    w.upah_siklus += upah
    catatAktivitas(tx, w, 'kerja', aksi, now)
  })

/**
 * Kursus berjalan selama durasi tertentu (start sampai selesai) lalu ada jeda sebelum kursus berikutnya. Jenis `keahlian`
 * menaikkan Keahlian satu level (butuh uang, Tenaga, dan Kecerdasan serta Disiplin minimum); jenis lain menambah atribut.
 * Hasilnya diterapkan saat waktunya habis, walaupun pemain sedang tidak di game (lihat selesaikanLatihan).
 */
export const kursus = (sql: Sql, id: string, kunci: string, now = new Date(), jenis = 'keahlian') =>
  dalamTransaksi(sql, id, { kunci, aksi: 'kursus', now }, async (tx, w) => {
    wajibMulai(w)
    if (w.latihan_id) throw new Galat('latihan_berjalan', 'Kamu masih mengikuti kursus. Tunggu sampai selesai.', 409)
    if (w.latihan_jeda && w.latihan_jeda > now) throw new Galat('latihan_jeda', 'Masih masa istirahat setelah kursus terakhir. Coba lagi nanti.', 409)
    let biaya: number
    let tenaga: number
    let durasi: number
    let target: number | null = null
    if (jenis === 'keahlian') {
      if (w.keahlian >= KURSUS.skillMaks) throw new Galat('keahlian_maks', 'Keahlian sudah mencapai level tertinggi.', 409)
      const ke = w.keahlian + 1
      const kurang = statKurang(nilaiAtribut(w), syaratKursusKeahlian(ke))
      if (kurang.length) throw new Galat('stat_kurang', `Syarat kursus: ${kurang.map((k) => `${NAMA_ATRIBUT[k.atribut]} ${k.perlu} (kamu ${k.punya})`).join(', ')}.`, 409)
      biaya = biayaKursus(w.keahlian, hunianById(w.hunian_id))
      tenaga = LATIHAN.keahlian.tenaga
      durasi = durasiKursusKeahlian(ke)
      target = ke
    } else {
      if (!Object.hasOwn(LATIHAN.atribut, jenis)) throw new Galat('kursus_tidak_ada', 'Kursus itu tidak ada.')
      const k = LATIHAN.atribut[jenis]
      if (w[k.atribut] >= STATISTIK.maks) throw new Galat('atribut_maks', `${NAMA_ATRIBUT[k.atribut]} sudah mencapai batas tertinggi.`, 409)
      biaya = k.biaya
      tenaga = k.tenaga
      durasi = k.durasiMs
    }
    if (w.tenaga < tenaga) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${tenaga}, tersisa ${w.tenaga}.`, 409)
    if (w.kas < biaya) throw new Galat('uang_kurang', 'Uang tidak cukup untuk kursus ini.', 409)
    w.tenaga -= tenaga
    await catat(tx, w, { akun: 'kas', jenis: 'kursus', jumlah: -biaya, kunci, rincian: { kursus: jenis, ke: target } }, now)
    w.latihan_id = jenis
    w.latihan_target = target
    w.latihan_selesai = new Date(now.getTime() + durasi)
  })

export const klaimBonus = (sql: Sql, id: string, kunci: string, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'bonus', now }, async (tx, w) => {
    wajibMulai(w)
    const hari = tanggalWIB(now)
    if (w.bonus_tanggal === hari) throw new Galat('bonus_sudah_diambil', 'Bonus hari ini sudah diambil. Datang lagi besok.', 409)
    await catat(tx, w, { akun: 'kas', jenis: 'bonus_harian', jumlah: BONUS_HARIAN, kunci, rincian: { tanggal: hari } }, now)
    w.bonus_tanggal = hari
  })

export const bayarKasbon = (sql: Sql, id: string, kunci: string, jumlah: number, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'kasbon', now }, async (tx, w) => {
    if (!Number.isInteger(jumlah) || jumlah < 1) throw new Galat('jumlah_tidak_valid', 'Jumlah harus bilangan bulat positif.')
    if (jumlah > w.kasbon) throw new Galat('melebihi_kasbon', 'Jumlah melebihi kasbon yang ada.', 409)
    if (jumlah > w.kas) throw new Galat('uang_kurang', 'Uang tidak cukup untuk membayar sebesar itu.', 409)
    await catat(tx, w, { akun: 'kas', jenis: 'bayar_kasbon', jumlah: -jumlah, kunci }, now)
    await catat(tx, w, { akun: 'kasbon', jenis: 'bayar_kasbon', jumlah: -jumlah, kunci }, now)
  })

/** Rumah Makan Padang: bayar, Tenaga bertambah (tidak melewati maksimum), paling banyak dua kali per tanggal WIB. */
export const makanPadang = (sql: Sql, id: string, kunci: string, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'makan', now }, async (tx, w) => {
    wajibMulai(w)
    const hari = tanggalWIB(now)
    const kali = w.makan_tanggal === hari ? w.makan_kali : 0
    if (kali >= MAKAN.kaliPerHari) throw new Galat('makan_habis', 'Sudah makan dua kali hari ini. Datang lagi besok.', 409)
    const maks = tenagaMaks(w.hunian_id, w.peran)
    if (w.tenaga >= maks && w.lapar >= LAPAR.maks) throw new Galat('tenaga_penuh', 'Tenaga dan perutmu masih penuh. Makan nanti saja.', 409)
    if (w.kas < MAKAN.harga) throw new Galat('uang_kurang', 'Uang tidak cukup untuk makan di sini.', 409)
    await catat(tx, w, { akun: 'kas', jenis: 'makan', jumlah: -MAKAN.harga, kunci, rincian: { tenaga: MAKAN.tenaga, lapar: LAPAR.makanPadang } }, now)
    w.tenaga = Math.min(maks, w.tenaga + MAKAN.tenaga)
    isiLapar(w, LAPAR.makanPadang, now)
    w.makan_tanggal = hari
    w.makan_kali = kali + 1
    catatAktivitas(tx, w, 'transaksi', 1, now)
  })


/**
 * Rumah Judi Mujur: satu taruhan uang game. Menang menambah sebesar taruhan, kalah kehilangan taruhan.
 * Sebagian kekalahan berupa razia polisi (taruhan disita); peluang menang tetap 45%.
 * Hasil ikut tersimpan per kunci, jadi permintaan ulang tidak mengocok ulang.
 */
export const berjudi = (sql: Sql, id: string, kunci: string, taruhan: number, now = new Date(), acak: () => number = acakAman) => {
  let hasil: Keadaan['judi']
  return dalamTransaksi(sql, id, { kunci, aksi: 'judi', now, tambahan: () => ({ judi: hasil }) }, async (tx, w) => {
    wajibMulai(w)
    if (!Number.isInteger(taruhan) || taruhan < JUDI.taruhanMin || taruhan > JUDI.taruhanMaks) {
      throw new Galat('jumlah_tidak_valid', 'Taruhan Rp 10.000 sampai Rp 1.000.000.')
    }
    if (taruhan > w.kas) throw new Galat('uang_kurang', 'Uang tidak cukup untuk taruhan sebesar itu.', 409)
    if (w.tenaga < JUDI.tenaga) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${JUDI.tenaga}.`, 409)
    w.tenaga -= JUDI.tenaga
    const r = acak()
    const menang = r < JUDI.peluang
    const razia = !menang && r >= 1 - JUDI.razia
    await catat(tx, w, { akun: 'kas', jenis: menang ? 'judi_menang' : 'judi_kalah', jumlah: menang ? taruhan : -taruhan, kunci, rincian: { taruhan, razia } }, now)
    hasil = { menang, razia, taruhan }
  })
}

// ---------------------------------------------------------------- fitur kota

/** Jumlah siklus produksi usaha yang siap diambil (paling banyak 6). */
function siklusSiap(u: BarisUsaha, now: Date): number {
  return Math.max(0, Math.min(USAHA_ATURAN.simpanMaks, Math.floor((now.getTime() - u.produksi_pada.getTime()) / USAHA_ATURAN.siklusMs)))
}

/** Bandara Weton: beli tiket, pergi beberapa jam, hasil diterima saat pulang. */
export const terbang = (sql: Sql, id: string, kunci: string, tujuan: string, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'terbang', now }, async (tx, w) => {
    wajibMulai(w)
    const t = TUJUAN[tujuan as Tujuan]
    if (!t) throw new Galat('tujuan_tidak_ada', 'Tujuan penerbangan itu tidak ada.')
    if (tujuan === 'jakarte' && w.keahlian >= TERBANG.jakarteMaksKeahlian) throw new Galat('keahlian_tinggi', 'Pelatihan Jakarte hanya untuk Keahlian di bawah 6. Lanjutkan dengan kursus.', 409)
    // awal tanggal WIB hari ini dalam UTC
    const awalHari = new Date(Date.parse(`${tanggalWIB(now)}T00:00:00Z`) - 7 * 3_600_000)
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from ledger where warga_id = ${w.id} and jenis = 'tiket_pesawat' and dibuat_pada >= ${awalHari}`
    if (n >= TERBANG.perHari) throw new Galat('sudah_terbang', 'Sudah terbang hari ini. Penerbangan berikutnya besok.', 409)
    if (w.kas < t.tiket) throw new Galat('uang_kurang', 'Uang tidak cukup untuk membeli tiket.', 409)
    await catat(tx, w, { akun: 'kas', jenis: 'tiket_pesawat', jumlah: -t.tiket, kunci, rincian: { tujuan } }, now)
    w.perjalanan_tujuan = tujuan
    w.perjalanan_pulang = new Date(now.getTime() + t.jam * 3_600_000)
  })

export type PerintahKuliah = { aksi: 'daftar'; jurusan: string } | { aksi: 'ukt' } | { aksi: 'sesi' } | { aksi: 'berhenti' }

/** Universitas Weton: daftar jurusan, bayar UKT tiap semester, satu sesi kuliah per hari, lulus membuka Tier 4 atau 5. */
export const kuliah = (sql: Sql, id: string, kunci: string, p: PerintahKuliah, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'kuliah', now }, async (tx, w) => {
    wajibMulai(w)
    const kj = jurusanById(w.kuliah_jurusan)
    if (p.aksi === 'daftar') {
      const j = jurusanById(p.jurusan)
      if (!j) throw new Galat('jurusan_tidak_ada', 'Jurusan itu tidak ada.')
      if (kj) throw new Galat('sedang_kuliah', 'Kamu masih kuliah. Selesaikan atau berhenti dulu.', 409)
      if (w.ijazah === j.id) throw new Galat('sudah_lulus', 'Kamu sudah lulus dari jurusan itu.', 409)
      w.kuliah_jurusan = j.id
      w.kuliah_semester = 1
      w.kuliah_sesi = 0
      w.kuliah_ukt_lunas = false
      return
    }
    if (!kj) throw new Galat('belum_kuliah', 'Daftar kuliah dulu.', 409)
    if (p.aksi === 'berhenti') {
      w.kuliah_jurusan = null
      w.kuliah_semester = 0
      w.kuliah_sesi = 0
      w.kuliah_ukt_lunas = false
      return
    }
    if (p.aksi === 'ukt') {
      if (w.kuliah_ukt_lunas) throw new Galat('ukt_lunas', 'UKT semester ini sudah dibayar.', 409)
      const ukt = uktUntuk(kj, w.sekolah)
      if (w.kas < ukt) throw new Galat('uang_kurang', 'Uang tidak cukup untuk membayar UKT.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'ukt', jumlah: -ukt, kunci, rincian: { jurusan: kj.id, semester: w.kuliah_semester } }, now)
      w.kuliah_ukt_lunas = true
      return
    }
    const hari = tanggalWIB(now)
    if (!w.kuliah_ukt_lunas) throw new Galat('ukt_belum', 'Bayar UKT semester ini dulu.', 409)
    if (w.kuliah_sesi_tanggal === hari) throw new Galat('sesi_sudah', 'Sesi kuliah hari ini sudah diikuti. Datang lagi besok.', 409)
    if (w.tenaga < SESI_KULIAH.tenaga) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${SESI_KULIAH.tenaga}.`, 409)
    w.tenaga -= SESI_KULIAH.tenaga
    w.kuliah_sesi_tanggal = hari
    w.kuliah_sesi += 1
    if (w.kuliah_sesi < SESI_KULIAH.perSemester) return
    if (w.kuliah_semester >= kj.semester) {
      w.ijazah = kj.id
      w.kuliah_jurusan = null
      w.kuliah_semester = 0
      w.kuliah_sesi = 0
      w.kuliah_ukt_lunas = false
    } else {
      w.kuliah_semester += 1
      w.kuliah_sesi = 0
      w.kuliah_ukt_lunas = false
    }
  })

/** Tabungan Bank Weton: setor dari uang, tarik ke uang. */
export const tabungan = (sql: Sql, id: string, kunci: string, aksi: 'setor' | 'tarik', jumlah: number, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'tabungan', now }, async (tx, w) => {
    if (!Number.isInteger(jumlah) || jumlah < 1) throw new Galat('jumlah_tidak_valid', 'Jumlah harus bilangan bulat positif.')
    if (aksi === 'setor') {
      if (jumlah > w.kas) throw new Galat('uang_kurang', 'Uang tidak cukup untuk disetor sebesar itu.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'setor_tabungan', jumlah: -jumlah, kunci }, now)
      await catat(tx, w, { akun: 'tabungan', jenis: 'setor_tabungan', jumlah, kunci }, now)
    } else {
      if (jumlah > w.tabungan) throw new Galat('tabungan_kurang', 'Tabungan tidak cukup untuk ditarik sebesar itu.', 409)
      await catat(tx, w, { akun: 'tabungan', jenis: 'tarik_tabungan', jumlah: -jumlah, kunci }, now)
      await catat(tx, w, { akun: 'kas', jenis: 'tarik_tabungan', jumlah, kunci }, now)
    }
  })

/** RSUD Weton: bayar, Tenaga langsung penuh, sekali per tanggal WIB. */
export const berobat = (sql: Sql, id: string, kunci: string, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'berobat', now }, async (tx, w) => {
    wajibMulai(w)
    const hari = tanggalWIB(now)
    if (w.berobat_tanggal === hari) throw new Galat('sudah_berobat', 'Sudah berobat hari ini. Datang lagi besok.', 409)
    const maks = tenagaMaks(w.hunian_id, w.peran)
    if (w.tenaga >= maks && w.kesehatan >= KESEHATAN.maks) throw new Galat('tenaga_penuh', 'Tenaga dan Kesehatan masih penuh.', 409)
    if (w.kas < RSUD.harga) throw new Galat('uang_kurang', 'Uang tidak cukup untuk berobat.', 409)
    await catat(tx, w, { akun: 'kas', jenis: 'berobat', jumlah: -RSUD.harga, kunci }, now)
    w.tenaga = maks
    w.tenaga_pada = now
    w.kesehatan = KESEHATAN.maks
    w.kesehatan_pada = now
    w.berobat_tanggal = hari
  })

export type PerintahUsaha = { aksi: 'buka'; jenis: string } | { aksi: 'ambil'; usaha: string; ke?: 'kas' | 'gudang' } | { aksi: 'upgrade'; usaha: string }

/** Usaha pemain: buka (modal), ambil hasil yang menumpuk, atau naikkan level. */
export const usaha = (sql: Sql, id: string, kunci: string, p: PerintahUsaha, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'usaha', now }, async (tx, w) => {
    wajibMulai(w)
    if (p.aksi === 'buka') {
      const jenis = p.jenis as JenisUsaha
      const u = JENIS_USAHA[jenis]
      if (!u) throw new Galat('usaha_tidak_ada', 'Jenis usaha itu tidak ada.')
      const [r] = await tx<{ n: number }[]>`select count(*) as n from usaha where warga_id = ${w.id}`
      if (r.n >= USAHA_ATURAN.slot) throw new Galat('slot_penuh', `Paling banyak ${USAHA_ATURAN.slot} usaha.`, 409)
      if (w.kas < u.modal) throw new Galat('uang_kurang', 'Uang tidak cukup untuk modal usaha ini.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'modal_usaha', jumlah: -u.modal, kunci, rincian: { jenis } }, now)
      await tx`insert into usaha (warga_id, jenis, produksi_pada, dibuat_pada) values (${w.id}, ${jenis}, ${now}, ${now})`
      return
    }
    const [u] = await tx<BarisUsaha[]>`select * from usaha where id = ${p.usaha} and warga_id = ${w.id} for update`
    if (!u) throw new Galat('usaha_tidak_ada', 'Usaha itu tidak ditemukan.', 404)
    if (p.aksi === 'ambil') {
      const siklus = siklusSiap(u, now)
      if (siklus < 1) throw new Galat('belum_ada_hasil', 'Belum ada hasil. Produksi selesai tiap 4 jam.', 409)
      if (w.tenaga < USAHA_ATURAN.tenagaAmbil) throw new Galat('tenaga_kurang', `Tenaga kurang: butuh ${USAHA_ATURAN.tenagaAmbil}.`, 409)
      w.tenaga -= USAHA_ATURAN.tenagaAmbil
      const bahan = JENIS_USAHA[u.jenis].bahan
      if (u.jenis === 'perahu') {
        let mutiara = 0
        for (let i = 0; i < siklus; i++) if (acakAman() < TEMUAN.mutiaraPerSiklus) mutiara++
        if (mutiara > 0) await tambahItem(tx, w.id, 'kerang-mutiara', mutiara, { pengirim: 'Perahu nelayan', judul: 'Kerang mutiara dari jaring', sumber: 'usaha' }, now)
      }
      if (u.jenis === 'perahu' && p.ke === 'gudang') {
        // ikan masuk gudang; solar tetap dibayar tunai
        await catat(tx, w, { akun: 'kas', jenis: 'bahan_usaha', jumlah: -siklus * bahan, kunci, rincian: { usaha: u.id, siklus } }, now)
        await tambahItem(tx, w.id, 'ikan', siklus * ikanPerSiklus(u.level), { pengirim: 'Perahu nelayan', judul: 'Ikan hasil melaut', sumber: 'usaha' }, now)
      } else {
        // warung: tiap siklus yang bahannya (1 kg ikan, 1 kg beras) ada di gudang tidak perlu membeli bahan
        const pakai = u.jenis === 'warung' ? await pakaiBahanWarung(tx, w.id, siklus) : 0
        const hasil = siklus * labaSiklus(u.jenis, u.level) + pakai * bahan
        await catat(tx, w, { akun: 'kas', jenis: 'hasil_usaha', jumlah: hasil, kunci, rincian: { usaha: u.id, jenis: u.jenis, siklus, bahanGudang: pakai } }, now)
      }
      // simpanan penuh berarti produksi berhenti; jam produksi mulai lagi dari sekarang
      const berikut = siklus >= USAHA_ATURAN.simpanMaks ? now : new Date(u.produksi_pada.getTime() + siklus * USAHA_ATURAN.siklusMs)
      await tx`update usaha set produksi_pada = ${berikut} where id = ${u.id}`
      return
    }
    if (u.level >= USAHA_ATURAN.levelMaks) throw new Galat('level_maks', 'Usaha sudah di level tertinggi.', 409)
    const biaya = biayaUpgradeUsaha(u.jenis, u.level)
    if (w.kas < biaya) throw new Galat('uang_kurang', 'Uang tidak cukup untuk menaikkan level usaha.', 409)
    await catat(tx, w, { akun: 'kas', jenis: 'upgrade_usaha', jumlah: -biaya, kunci, rincian: { usaha: u.id, dari: u.level } }, now)
    await tx`update usaha set level = ${u.level + 1} where id = ${u.id}`
  })

/** Tambah (atau kurangi, bila negatif) barang di gudang warga. Gagal bila kurang atau melewati kapasitas. */
export async function tambahGudang(tx: Tx, id: string, barang: Barang, jumlah: number): Promise<void> {
  const [g] = await tx<{ jumlah: number }[]>`
    insert into gudang (warga_id, barang, jumlah) values (${id}, ${barang}, 0)
    on conflict (warga_id, barang) do update set jumlah = gudang.jumlah returning jumlah`
  const baru = g.jumlah + jumlah
  if (baru < 0) throw new Galat('barang_kurang', `${BARANG[barang].nama} di gudang tidak cukup.`, 409)
  if (baru > PASAR.gudangMaks) throw new Galat('gudang_penuh', `Gudang paling banyak ${PASAR.gudangMaks} kg per barang.`, 409)
  tx.tulis`update gudang set jumlah = ${baru} where warga_id = ${id} and barang = ${barang}`
}

async function pakaiBahanWarung(tx: Tx, id: string, siklus: number): Promise<number> {
  const g = await tx<{ barang: Barang; jumlah: number }[]>`select barang, jumlah from gudang where warga_id = ${id} for update`
  const ada = (b: Barang) => g.find((x) => x.barang === b)?.jumlah ?? 0
  const pakai = Math.min(siklus, ada('ikan'), ada('beras'))
  if (pakai > 0) {
    await tambahGudang(tx, id, 'ikan', -pakai)
    await tambahGudang(tx, id, 'beras', -pakai)
  }
  return pakai
}

/**
 * Lahan kosong: semua lahan awalnya milik kota dan dibeli di Balai Kota (aksi 'beli'). Lahan yang sudah dimiliki bisa didirikan
 * bangunan (aksi 'rumah' atau 'bangun'): konstruksi butuh waktu, lalu bangunan aktif dan lowongannya dibuka. Pembelian dari NPC dan
 * antarpemain ada di properti.ts.
 */
export const lahan = (sql: Sql, id: string, kunci: string, aksi: 'beli' | 'rumah' | 'bangun', lahanId: string, now = new Date(), jenisBangun = 'rumah') =>
  dalamTransaksi(sql, id, { kunci, aksi: 'lahan', now }, async (tx, w) => {
    wajibMulai(w)
    const l = lahanKosong.find((x) => x.id === lahanId)
    if (!l) throw new Galat('lahan_tidak_ada', 'Lahan itu tidak ada di peta.')
    if (aksi === 'beli') {
      const [r] = await tx<{ n: number }[]>`select count(*) as n from lahan_milik where warga_id = ${w.id}`
      if (r.n >= LAHAN.maksMilik) throw new Galat('lahan_penuh', `Paling banyak ${LAHAN.maksMilik} properti per warga.`, 409)
      const harga = hargaLahan(l)
      if (w.kas < harga) throw new Galat('uang_kurang', 'Uang tidak cukup untuk membeli lahan ini.', 409)
      const masuk = await tx`insert into lahan_milik (lahan_id, warga_id, dibeli_pada) values (${l.id}, ${w.id}, ${now}) on conflict do nothing`
      if (masuk.count === 0) throw new Galat('lahan_terjual', 'Lahan itu sudah dimiliki warga lain.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'beli_lahan', jumlah: -harga, kunci, rincian: { lahan: l.id, dari: 'kota' } }, now)
      catatAktivitas(tx, w, 'transaksi', 1, now)
      return
    }
    const jenis = aksi === 'rumah' ? 'rumah' : jenisBangun
    if (!Object.hasOwn(BANGUN, jenis)) throw new Galat('bangunan_tidak_ada', 'Jenis bangunan itu tidak bisa didirikan.')
    const def = BANGUN[jenis]
    const [m] = await tx<BarisLahan[]>`select * from lahan_milik where lahan_id = ${l.id} and warga_id = ${w.id} for update`
    if (!m) throw new Galat('bukan_milik', 'Lahan itu bukan milikmu.', 403)
    if (m.bangun_jenis || m.rumah) throw new Galat('rumah_ada', 'Di lahan ini sudah ada bangunan atau sedang dibangun.', 409)
    if (w.kas < def.biaya) throw new Galat('uang_kurang', `Uang tidak cukup untuk membangun ${def.nama.toLowerCase()}.`, 409)
    await catat(tx, w, { akun: 'kas', jenis: 'bangun_rumah', jumlah: -def.biaya, kunci, rincian: { lahan: l.id, bangunan: jenis } }, now)
    // lahan yang dibangun ditarik dari daftar jual; rumah baru ditandai jadi saat waktunya habis (lihat jalankanAksi)
    await tx`
      update lahan_milik set bangun_jenis = ${jenis}, bangun_mulai = ${now}, bangun_selesai = ${new Date(now.getTime() + def.durasiMs)},
        jual_mode = 'tidak', jual_harga = null
      where lahan_id = ${l.id}`
  })

/** Daftar semua lahan kosong di peta dengan harga dan status kepemilikannya. */
export async function daftarLahan(sql: Sql, id: string) {
  const milik = await sql<{ lahan_id: string; warga_id: string; rumah: boolean }[]>`select lahan_id, warga_id, rumah from lahan_milik`
  const peta = new Map(milik.map((m) => [m.lahan_id, m]))
  return lahanKosong.map((l) => {
    const m = peta.get(l.id)
    return {
      id: l.id, distrik: distrik.find((d) => d.id === l.distrik)?.nama ?? l.distrik, luas: Math.round(l.w * l.d), harga: hargaLahan(l),
      status: !m ? 'tersedia' : m.warga_id === id ? 'milikmu' : 'dimiliki', rumah: m?.rumah ?? false,
    }
  })
}

export type Perintah = { aksi: 'uang'; jumlah: number } | { aksi: 'tenaga' } | { aksi: 'keahlian'; nilai: number }

/** Kantor Wali Kota: tambah dana (lewat ledger), isi Tenaga penuh, atau atur Keahlian. Hanya untuk peran walikota. */
export const kantorWalikota = (sql: Sql, id: string, kunci: string, p: Perintah, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'walikota', now }, async (tx, w) => {
    if (w.peran !== 'walikota') throw new Galat('bukan_walikota', 'Hanya Wali Kota yang boleh memakai Kantor Wali Kota.', 403)
    if (p.aksi === 'uang') {
      if (!Number.isInteger(p.jumlah) || p.jumlah < 1 || p.jumlah > WALIKOTA.danaMaksPerAksi) throw new Galat('jumlah_tidak_valid', 'Jumlah dana harus bilangan bulat positif dan tidak lebih dari Rp 10.000.000.000.')
      await catat(tx, w, { akun: 'kas', jenis: 'dana_walikota', jumlah: p.jumlah, kunci, rincian: { sebab: 'dana Kantor Wali Kota' } }, now)
    } else if (p.aksi === 'tenaga') {
      w.tenaga = tenagaMaks(w.hunian_id, w.peran)
      w.tenaga_pada = now
    } else {
      if (!Number.isInteger(p.nilai) || p.nilai < 1 || p.nilai > KURSUS.skillMaks) throw new Galat('masukan_tidak_valid', `Keahlian harus antara 1 dan ${KURSUS.skillMaks}.`)
      w.keahlian = p.nilai
      w.keahlian6_sejak = p.nilai >= 6 ? (w.keahlian6_sejak ?? now) : null
    }
  })

export async function riwayat(sql: Sql, id: string, batas = 30): Promise<BarisLedger[]> {
  const n = Math.min(Math.max(Math.floor(batas) || 30, 1), 100)
  const baris = await sql<{ id: number; akun: 'kas' | 'kasbon' | 'tabungan'; jenis: string; jumlah: number; saldo_setelah: number; rincian: Record<string, unknown>; dibuat_pada: Date }[]>`
    select id, akun, jenis, jumlah, saldo_setelah, rincian, dibuat_pada from ledger where warga_id = ${id} order by id desc limit ${n}`
  return baris.map((b) => ({ id: b.id, akun: b.akun, jenis: b.jenis, jumlah: b.jumlah, saldoSetelah: b.saldo_setelah, rincian: b.rincian, waktu: b.dibuat_pada.toISOString() }))
}

// ---------------------------------------------------------------- pasar

export type PerintahPasar =
  | { aksi: 'beli_npc' | 'jual_npc'; barang: string; jumlah: number }
  | { aksi: 'buka_lapak'; barang: string; jumlah: number; harga: number }
  | { aksi: 'tutup_lapak'; lapak: string }
  | { aksi: 'beli_lapak'; lapak: string; jumlah: number }
  | { aksi: 'pakai'; barang: string }

const jumlahSah = (n: number) => {
  if (!Number.isInteger(n) || n < 1 || n > PASAR.maksPerAksi) throw new Galat('jumlah_tidak_valid', `Jumlah 1 sampai ${PASAR.maksPerAksi} kg.`)
}

/**
 * Pakai satu barang konsumsi dari inventori: Tenaga, Kesehatan, dan lapar bertambah menurut barangnya. Paling banyak
 * KONSUMSI.kaliPerHari per tanggal WIB. Ditolak bila tidak ada yang perlu dipulihkan.
 */
export async function pakaiBarang(tx: Tx, w: Warga, barang: string, now: Date): Promise<void> {
  if (!adalahBarang(barang) || BARANG[barang].jenis !== 'konsumsi') throw new Galat('bukan_konsumsi', 'Barang itu tidak bisa dipakai.')
  const hari = tanggalWIB(now)
  const kali = w.konsumsi_tanggal === hari ? w.konsumsi_kali : 0
  if (kali >= KONSUMSI.kaliPerHari) throw new Galat('konsumsi_habis', `Sudah ${KONSUMSI.kaliPerHari} kali hari ini. Besok lagi.`, 409)
  const def = BARANG[barang] as { tenaga: number; kesehatan?: number; lapar?: number }
  const maks = tenagaMaks(w.hunian_id, w.peran)
  const perlu = w.tenaga < maks || (!!def.kesehatan && w.kesehatan < KESEHATAN.maks) || (!!def.lapar && w.lapar < LAPAR.maks)
  if (!perlu) throw new Galat('tenaga_penuh', 'Tenaga, kesehatan, dan perutmu masih penuh.', 409)
  await tambahGudang(tx, w.id, barang, -1)
  w.tenaga = Math.min(maks, w.tenaga + def.tenaga)
  if (def.kesehatan) w.kesehatan = Math.min(KESEHATAN.maks, w.kesehatan + def.kesehatan)
  if (def.lapar) isiLapar(w, def.lapar, now)
  w.konsumsi_tanggal = hari
  w.konsumsi_kali = kali + 1
}

/** Pasar Weton: jual beli dengan pedagang NPC, dan lapak antarwarga. */
export const pasar = (sql: Sql, id: string, kunci: string, p: PerintahPasar, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'pasar', now }, async (tx, w) => {
    wajibMulai(w)
    if (p.aksi === 'tutup_lapak') {
      const [l] = await tx<{ barang: Barang; sisa: number }[]>`select barang, sisa from lapak where id = ${p.lapak} and penjual_id = ${w.id} for update`
      if (!l) throw new Galat('lapak_tidak_ada', 'Lapak itu tidak ditemukan.', 404)
      if (l.sisa > 0) await tambahGudang(tx, w.id, l.barang, l.sisa)
      await tx`update lapak set sisa = 0 where id = ${p.lapak}`
      await cairkan(tx, w, now)
      return
    }
    if (p.aksi === 'pakai') {
      await pakaiBarang(tx, w, p.barang, now)
      return
    }
    if (p.aksi === 'beli_lapak') {
      jumlahSah(p.jumlah)
      // ponytail: dua pemain yang saling membeli lapak lawan pada saat yang sama bisa kena deadlock; Postgres membatalkan salah satunya
      const [l] = await tx<{ penjual_id: string; barang: Barang; sisa: number; harga: number }[]>`select penjual_id, barang, sisa, harga from lapak where id = ${p.lapak} for update`
      if (!l || l.sisa < 1) throw new Galat('lapak_tidak_ada', 'Lapak itu sudah habis atau ditutup.', 404)
      if (l.penjual_id === w.id) throw new Galat('lapak_sendiri', 'Itu lapakmu sendiri.', 409)
      if (p.jumlah > l.sisa) throw new Galat('stok_kurang', `Sisa di lapak itu ${l.sisa} kg.`, 409)
      const bayar = p.jumlah * l.harga
      if (w.kas < bayar) throw new Galat('uang_kurang', 'Uang tidak cukup.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'beli_lapak', jumlah: -bayar, kunci, rincian: { lapak: p.lapak, barang: l.barang, jumlah: p.jumlah, harga: l.harga } }, now)
      await tambahGudang(tx, w.id, l.barang, p.jumlah)
      await tx`update lapak set sisa = sisa - ${p.jumlah}, terjual = terjual + ${p.jumlah}, uang_tertahan = uang_tertahan + ${bayar} where id = ${p.lapak}`
      catatAktivitas(tx, w, 'transaksi', 1, now)
      return
    }
    if (!adalahBarang(p.barang)) throw new Galat('barang_tidak_ada', 'Barang itu tidak dijual di Pasar Weton.')
    const b = p.barang
    jumlahSah(p.jumlah)
    if (p.aksi === 'beli_npc') {
      const h = hargaNpc(b, tanggalWIB(now), w.umk)
      const bayar = h.jual * p.jumlah
      if (w.kas < bayar) throw new Galat('uang_kurang', 'Uang tidak cukup.', 409)
      await catat(tx, w, { akun: 'kas', jenis: 'beli_npc', jumlah: -bayar, kunci, rincian: { barang: b, jumlah: p.jumlah, harga: h.jual } }, now)
      await tambahGudang(tx, w.id, b, p.jumlah)
      catatAktivitas(tx, w, 'transaksi', 1, now)
    } else if (p.aksi === 'jual_npc') {
      const h = hargaNpc(b, tanggalWIB(now), w.umk)
      await tambahGudang(tx, w.id, b, -p.jumlah)
      await catat(tx, w, { akun: 'kas', jenis: 'jual_npc', jumlah: h.beli * p.jumlah, kunci, rincian: { barang: b, jumlah: p.jumlah, harga: h.beli } }, now)
      catatAktivitas(tx, w, 'transaksi', 1, now)
    } else if (p.aksi === 'buka_lapak') {
      const [min, maks] = pitaLapak(b, w.umk)
      if (!Number.isInteger(p.harga) || p.harga < min || p.harga > maks) throw new Galat('harga_tidak_valid', `Harga ${BARANG[b].nama.toLowerCase()} Rp ${min.toLocaleString('id-ID')} sampai Rp ${maks.toLocaleString('id-ID')} per kg.`)
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from lapak where penjual_id = ${w.id} and sisa > 0`
      if (n >= PASAR.lapakMaks) throw new Galat('lapak_penuh', `Paling banyak ${PASAR.lapakMaks} lapak terbuka.`, 409)
      await tambahGudang(tx, w.id, b, -p.jumlah)
      await tx`insert into lapak (penjual_id, barang, sisa, harga, dibuat_pada) values (${w.id}, ${b}, ${p.jumlah}, ${p.harga}, ${now})`
      catatAktivitas(tx, w, 'transaksi', 1, now)
    }
  })

/** Papan harga dan lapak terbuka (termurah dulu) untuk halaman Pasar. */
export async function papanPasar(sql: Sql, id: string, now = new Date()) {
  const hari = tanggalWIB(now)
  const umk = await umkBerlaku(sql)
  const lapak = await sql<{ id: string; barang: Barang; sisa: number; harga: number; nama: string; milikku: boolean }[]>`
    select l.id, l.barang, l.sisa, l.harga, w.nama, l.penjual_id = ${id} as milikku
    from lapak l join warga w on w.id = l.penjual_id where l.sisa > 0 order by l.barang, l.harga, l.dibuat_pada limit 60`
  return {
    tanggal: hari,
    pasaran: pasaran(hari),
    barang: (Object.keys(BARANG) as Barang[]).map((b) => ({
      id: b, nama: BARANG[b].nama, jenis: BARANG[b].jenis, satuan: BARANG[b].satuan, ringkas: BARANG[b].ringkas, tenaga: (BARANG[b] as { tenaga?: number }).tenaga ?? null,
      npc: hargaNpc(b, hari, umk), pita: pitaLapak(b, umk),
    })),
    lapak: [...lapak],
    biayaLapak: PASAR.biayaLapak,
  }
}

// ---------------------------------------------------------------- numpang

export type PerintahNumpang =
  | { aksi: 'atur'; terima: boolean; uangDapur: number }
  | { aksi: 'setujui' | 'tolak'; permintaan: string }
  | { aksi: 'minta'; pemilik: string }
  | { aksi: 'berhenti' }

/** Numpang di rumah warga lain. Pemilik mengatur kamar tamu dan menyetujui; penumpang meminta atau berhenti. */
export const numpang = (sql: Sql, id: string, kunci: string, p: PerintahNumpang, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'numpang', now }, async (tx, w) => {
    wajibMulai(w)
    const akhir = new Date(now.getTime() + NUMPANG.pemberitahuanMs)
    if (p.aksi === 'atur') {
      if (!Number.isInteger(p.uangDapur) || p.uangDapur < 0 || p.uangDapur > NUMPANG.dapurMaks) throw new Galat('jumlah_tidak_valid', 'Uang dapur Rp 0 sampai Rp 100.000 per minggu.')
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from lahan_milik where warga_id = ${w.id} and rumah`
      if (p.terima && n < 1) throw new Galat('belum_punya_rumah', 'Bangun rumah di lahan milikmu dulu.', 409)
      await tx`update warga set numpang_terima = ${p.terima}, uang_dapur = ${p.uangDapur} where id = ${w.id}`
      w.numpang_terima = p.terima
      w.uang_dapur = p.uangDapur
      return
    }
    if (p.aksi === 'setujui' || p.aksi === 'tolak') {
      const [n] = await tx<BarisNumpang[]>`select * from numpang where id = ${p.permintaan} and pemilik_id = ${w.id} and status in ('minta', 'aktif') for update`
      if (!n) throw new Galat('permintaan_tidak_ada', 'Permintaan itu tidak ditemukan.', 404)
      if (p.aksi === 'tolak') {
        if (n.status === 'minta') await tx`update numpang set status = 'selesai', berakhir_pada = ${now} where id = ${n.id}`
        else if (!n.berakhir_pada) await tx`update numpang set berakhir_pada = ${akhir} where id = ${n.id}`
        return
      }
      if (n.status !== 'minta') throw new Galat('sudah_aktif', 'Penumpang ini sudah tinggal di rumahmu.', 409)
      const [{ kamar }] = await tx<{ kamar: number }[]>`select count(*)::int as kamar from lahan_milik where warga_id = ${w.id} and rumah`
      const [{ terisi }] = await tx<{ terisi: number }[]>`select count(*)::int as terisi from numpang where pemilik_id = ${w.id} and status = 'aktif'`
      if (terisi >= kamar * NUMPANG.kamarPerRumah) throw new Galat('kamar_penuh', 'Kamar tamu sudah terisi semua.', 409)
      await tx`update numpang set status = 'aktif' where id = ${n.id}`
      return
    }
    const [lama] = await tx<BarisNumpang[]>`select * from numpang where penumpang_id = ${w.id} and status in ('minta', 'aktif') for update`
    if (p.aksi === 'berhenti') {
      if (!lama) throw new Galat('tidak_numpang', 'Kamu tidak sedang numpang.', 409)
      if (lama.status === 'minta') await tx`update numpang set status = 'selesai', berakhir_pada = ${now} where id = ${lama.id}`
      else if (!lama.berakhir_pada) await tx`update numpang set berakhir_pada = ${akhir} where id = ${lama.id}`
      return
    }
    if (p.aksi !== 'minta') return
    if (lama) throw new Galat('sudah_numpang', 'Kamu sudah punya permintaan atau sedang numpang.', 409)
    if (p.pemilik === w.id) throw new Galat('rumah_sendiri', 'Itu rumahmu sendiri.', 409)
    const [pm] = await tx<{ uang_dapur: number; numpang_terima: boolean }[]>`select uang_dapur, numpang_terima from warga where id = ${p.pemilik}`
    if (!pm?.numpang_terima) throw new Galat('tidak_menerima', 'Pemilik rumah itu sedang tidak menerima penumpang.', 409)
    await tx`insert into numpang (pemilik_id, penumpang_id, uang_dapur, status, dibuat_pada) values (${p.pemilik}, ${w.id}, ${pm.uang_dapur}, 'minta', ${now})`
  })

/** Rumah warga yang membuka kamar tamu dan masih punya kamar kosong. */
export async function daftarKamarTamu(sql: Sql, id: string) {
  return [...(await sql<{ id: string; nama: string; uang_dapur: number; kamar: number; terisi: number }[]>`
    select w.id, w.nama, w.uang_dapur,
      (select count(*)::int from lahan_milik m where m.warga_id = w.id and m.rumah) * ${NUMPANG.kamarPerRumah} as kamar,
      (select count(*)::int from numpang n where n.pemilik_id = w.id and n.status = 'aktif') as terisi
    from warga w where w.numpang_terima and w.id <> ${id} order by w.uang_dapur, w.nama limit 50`)].filter((r) => r.terisi < r.kamar)
}

/**
 * Bangunan warga di peta: lahan yang sedang atau sudah dibangun, dengan jenis model, nama pemilik, dan progres konstruksi
 * (0 sampai 1, dihitung dari waktu server) beserta tahap visual dan bagian model yang terlihat.
 */
export async function rumahDiPeta(sql: Sql, now = new Date()) {
  const baris = await sql<{ lahan: string; nama: string; bangun_jenis: string; bangun_mulai: Date; bangun_selesai: Date }[]>`
    select m.lahan_id as lahan, w.nama, m.bangun_jenis, m.bangun_mulai, m.bangun_selesai
    from lahan_milik m join warga w on w.id = m.warga_id
    where m.jenis_objek = 'lahan' and m.bangun_jenis is not null order by m.dibeli_pada`
  return baris.map((b) => {
    const progres = progresBangun(b.bangun_mulai, b.bangun_selesai, now)
    const t = tahapBangun(progres)
    return {
      lahan: b.lahan, nama: b.nama, jenis: b.bangun_jenis === 'rumah' ? 'rumah-menengah' : b.bangun_jenis, bangun: b.bangun_jenis,
      progres: Math.round(progres * 1000) / 1000, tahap: t.tahap, tahapNama: t.nama, tampil: t.tampil,
    }
  })
}

// ---------------------------------------------------------------- UMK

/** Keadaan ekonomi kota untuk Kantor Wali Kota: UMK, tren upah 7 hari, rentang penetapan, indikator, dan riwayat. */
export async function infoKota(sql: Sql, now = new Date()) {
  const t7 = new Date(now.getTime() - 7 * HARI_MS)
  const t14 = new Date(now.getTime() - 14 * HARI_MS)
  // satu penerbangan: keempat kueri dikirim bersamaan
  const q = bungkus(sql)
  const [[k], [u], [ind], riwayat] = await Promise.all([
    q<{ umk: string; umk_sejak: Date }[]>`select umk, umk_sejak from kota where id = 1`,
    q<{ kini: string; lalu: string }[]>`
      select coalesce(sum(jumlah) filter (where dibuat_pada >= ${t7}), 0) as kini,
             coalesce(sum(jumlah) filter (where dibuat_pada >= ${t14} and dibuat_pada < ${t7}), 0) as lalu
      from ledger where jenis = 'upah' and dibuat_pada >= ${t14}`,
    q<{ aktif: number; menganggur: number; usaha: number; kas: string }[]>`
      select count(*) filter (where terakhir_aktif >= ${t7})::int as aktif,
             count(*) filter (where terakhir_aktif >= ${t7} and pekerjaan_id is null)::int as menganggur,
             (select count(*)::int from usaha) as usaha,
             coalesce(avg(kas) filter (where terakhir_aktif >= ${t7} and peran <> 'walikota'), 0) as kas
      from warga`,
    q<{ umk_lama: string; umk_baru: string; alasan: string | null; ditetapkan_pada: Date }[]>`
      select umk_lama, umk_baru, alasan, ditetapkan_pada from kebijakan_umk order by id desc limit 10`,
  ])
  const umk = k ? Number(k.umk) : UMK_AWAL
  const tren = trenEkonomi(Number(u.kini), Number(u.lalu))
  const sejak = k?.umk_sejak ?? now
  const bolehPada = riwayat[0] ? new Date(riwayat[0].ditetapkan_pada.getTime() + KEBIJAKAN_UMK.jedaMs) : now
  return {
    umk, sejak: sejak.toISOString(), upah7: Number(u.kini), upahSebelum7: Number(u.lalu), tren, ...rentangUmk(umk, tren),
    bolehPada: bolehPada.toISOString(), indikator: { wargaAktif: ind.aktif, menganggur: ind.menganggur, usaha: ind.usaha, kasRata: Math.round(Number(ind.kas)) },
    riwayat: riwayat.map((r) => ({ lama: Number(r.umk_lama), baru: Number(r.umk_baru), alasan: r.alasan, pada: r.ditetapkan_pada.toISOString() })),
  }
}

/** Wali Kota menetapkan UMK baru, dalam rentang rekomendasi tren dan paling sering sekali per 7 hari. */
export async function tetapkanUmk(sql: Sql, id: string, umkBaru: number, alasan: string | null, now = new Date()) {
  await sql.begin(async (tx) => {
    const [w] = await tx<{ peran: string }[]>`select peran from warga where id = ${id}`
    if (w?.peran !== 'walikota') throw new Galat('bukan_walikota', 'Hanya Wali Kota yang boleh menetapkan UMK.', 403)
    const [k] = await tx<{ umk: string }[]>`select umk from kota where id = 1 for update`
    const [akhir] = await tx<{ ditetapkan_pada: Date }[]>`select ditetapkan_pada from kebijakan_umk order by id desc limit 1`
    if (akhir && now.getTime() - akhir.ditetapkan_pada.getTime() < KEBIJAKAN_UMK.jedaMs) throw new Galat('terlalu_sering', 'UMK paling sering ditetapkan sekali per 7 hari.', 409)
    const info = await infoKota(tx as unknown as Sql, now)
    if (!Number.isInteger(umkBaru) || umkBaru % 10_000 !== 0 || umkBaru < info.min || umkBaru > info.maks) {
      throw new Galat('umk_di_luar_rentang', `UMK baru harus kelipatan Rp 10.000 antara Rp ${info.min.toLocaleString('id-ID')} dan Rp ${info.maks.toLocaleString('id-ID')}.`)
    }
    await tx`update kota set umk = ${umkBaru}, umk_sejak = ${now} where id = 1`
    await tx`
      insert into kebijakan_umk (umk_lama, umk_baru, tren, rekomendasi, alasan, ditetapkan_oleh, ditetapkan_pada)
      values (${Number(k.umk)}, ${umkBaru}, ${info.tren}, ${info.rekomendasi}, ${alasan?.slice(0, 200) || null}, ${id}, ${now})`
  })
  return infoKota(sql, now)
}

// ---------------------------------------------------------------- latar sekolah dan okupansi

/** Pendatang baru memilih latar sekolah sekali saja, sebelum atau sesudah memilih tempat tinggal. */
export const pilihSekolah = (sql: Sql, id: string, kunci: string, sekolah: string, now = new Date()) =>
  dalamTransaksi(sql, id, { kunci, aksi: 'sekolah', now }, async (_tx, w) => {
    if (!adalahSekolah(sekolah)) throw new Galat('sekolah_tidak_ada', 'Pilihan sekolah tidak dikenal.')
    if (w.sekolah) throw new Galat('sekolah_sudah', 'Latar sekolah sudah dipilih.', 409)
    w.sekolah = sekolah
  })

/** Jumlah penghuni tiap bangunan hunian untuk ditampilkan di peta. */
export async function okupansi(sql: Sql): Promise<Record<string, number>> {
  const baris = await sql<{ tempat: string; n: number }[]>`
    select tempat, count(*)::int as n from (
      select hunian_tempat as tempat from warga where hunian_tempat is not null and peran <> 'walikota'
      union all
      select hunian_tempat_berikut from warga where hunian_tempat_berikut is not null and peran <> 'walikota' and hunian_tempat_berikut is distinct from hunian_tempat
    ) t group by tempat`
  return Object.fromEntries(baris.map((b) => [b.tempat, b.n]))
}
