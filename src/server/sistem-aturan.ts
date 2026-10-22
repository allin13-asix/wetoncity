// Aturan murni sistem kehidupan kota: lapar, EXP dan reputasi, kursus, konstruksi, roulette, memancing, minimarket,
// seleksi, kuota, dan batas ganti pekerjaan. Tanpa basis data dan tanpa jam global; angka dari src/data/balans.ts.
import {
  AKTIVITAS, ATRIBUT, BANGUN, GANTI_KERJA, KUOTA, LAPAR, LATIHAN, LEVEL, MEMANCING, PERINGKAT, ROULETTE, SELEKSI, STATISTIK, TAHAP_BANGUN, TOKO,
  type Atribut, type Golongan, type Kelangkaan, type Promo, type Sumber,
} from '../data/balans.ts'
import { indeksHarga } from '../data/ekonomi.ts'
import type { Pekerjaan } from '../data/pekerjaan.ts'
import { KESEHATAN, tanggalWIB } from './aturan.ts'
import { Galat } from './galat.ts'
import type { Harian, SesiPancing, Warga } from './tipe.ts'

const JAM = 3_600_000
const HARI = 86_400_000

// ---------------------------------------------------------------- lapar

type KeadaanLapar = Pick<Warga, 'lapar' | 'lapar_pada' | 'lapar_hukum_pada' | 'kesehatan' | 'kesehatan_pada' | 'peran'>

/** Nilai lapar pada `now` tanpa mengubah apa pun (untuk tampilan). */
export function laparKini(nilai: number, pada: Date, now: Date): number {
  if (now.getTime() <= pada.getTime()) return nilai
  return Math.max(0, nilai - Math.floor((now.getTime() - pada.getTime()) / LAPAR.turunSelangMs))
}

export const sedangLapar = (nilai: number) => nilai < LAPAR.ambang

/** Kapan lapar pertama kali di bawah ambang menurut nilai tersimpan; null bila Wali Kota. Boleh di masa depan. */
export function waktuMulaiLapar(w: Pick<Warga, 'lapar' | 'lapar_pada' | 'peran'>): Date | null {
  if (w.peran === 'walikota') return null
  if (w.lapar < LAPAR.ambang) return w.lapar_pada
  return new Date(w.lapar_pada.getTime() + (w.lapar - LAPAR.ambang + 1) * LAPAR.turunSelangMs)
}

/**
 * Turunkan lapar sampai `now`, kurangi Kesehatan 5 poin tiap jam selama LAPAR (terkunci minimum 20), dan beri tahu bila
 * pemain harus dirawat: Kesehatan sudah di batas minimum dan masih lapar. Mengubah `w`. Wali Kota tidak pernah lapar.
 * Waktu mulai LAPAR dihitung dari kapan nilai lapar pertama kali di bawah ambang, jadi hasilnya sama berapa pun jarak
 * antar pemanggilan (tanpa cron).
 *
 * Mengembalikan saat pemain mulai perlu dirawat (bisa di masa lalu bila ia lama tidak membuka game), atau null.
 */
export function hitungLapar(w: KeadaanLapar, now: Date): Date | null {
  if (w.peran === 'walikota') {
    w.lapar = LAPAR.maks
    w.lapar_pada = now
    w.lapar_hukum_pada = null
    return null
  }
  const sekarang = now.getTime()
  const t0 = w.lapar_pada.getTime()
  let kapan = sekarang
  if (sekarang > t0) {
    const h0 = w.lapar
    const selang = LAPAR.turunSelangMs
    const mulai = waktuMulaiLapar(w)!.getTime()
    const poin = Math.floor((sekarang - t0) / selang)
    if (h0 - poin <= 0) {
      w.lapar = 0
      w.lapar_pada = now
    } else {
      w.lapar = h0 - poin
      w.lapar_pada = new Date(t0 + poin * selang)
    }
    if (mulai > sekarang) {
      w.lapar_hukum_pada = null
    } else {
      const awal = Math.max(mulai, w.lapar_hukum_pada?.getTime() ?? mulai)
      const tik = Math.floor((sekarang - awal) / LAPAR.kesehatanJedaMs)
      if (w.kesehatan <= LAPAR.kesehatanMin) kapan = awal
      if (tik > 0) {
        if (w.kesehatan > LAPAR.kesehatanMin) {
          // tik ke berapa Kesehatan menyentuh batas minimum
          const n = Math.ceil((w.kesehatan - LAPAR.kesehatanMin) / LAPAR.kesehatanKurang)
          if (n <= tik) kapan = awal + n * LAPAR.kesehatanJedaMs
          if (w.kesehatan >= KESEHATAN.maks) w.kesehatan_pada = now
          w.kesehatan = Math.max(LAPAR.kesehatanMin, w.kesehatan - tik * LAPAR.kesehatanKurang)
        }
        w.lapar_hukum_pada = new Date(awal + tik * LAPAR.kesehatanJedaMs)
      } else if (!w.lapar_hukum_pada) {
        w.lapar_hukum_pada = new Date(awal)
      }
    }
  }
  return sedangLapar(w.lapar) && w.kesehatan <= LAPAR.kesehatanMin ? new Date(Math.min(kapan, sekarang)) : null
}

/** Tambah lapar (makan atau minum). Jam turun mulai lagi dari `now`. */
export function isiLapar(w: Pick<Warga, 'lapar' | 'lapar_pada' | 'lapar_hukum_pada'>, poin: number, now: Date): void {
  w.lapar = Math.min(LAPAR.maks, w.lapar + poin)
  w.lapar_pada = now
  if (!sedangLapar(w.lapar)) w.lapar_hukum_pada = null
}

// ---------------------------------------------------------------- EXP, level, reputasi

/** EXP untuk naik dari `level` ke level berikutnya: BASE_EXP x level^1,5. */
export const expUntukLevel = (level: number) => Math.round(LEVEL.baseExp * level ** LEVEL.pangkat)

/** Hadiah Wali Kota saat mencapai `level`: uang, dan barang pada kelipatan 5 dan 10. */
export function hadiahLevel(level: number): { uang: number; barang: Record<string, number>; kelipatan: 1 | 5 | 10 } {
  const h = LEVEL.hadiah
  if (level % 10 === 0) return { uang: level * h.uangPerLevel * h.kelipatan10.pengali, barang: h.kelipatan10.barang, kelipatan: 10 }
  if (level % 5 === 0) return { uang: level * h.uangPerLevel * h.kelipatan5.pengali, barang: h.kelipatan5.barang, kelipatan: 5 }
  return { uang: level * h.uangPerLevel, barang: {}, kelipatan: 1 }
}

export type HasilAktivitas = { exp: number; rep: number; naik: number[] }

/**
 * Catat satu aktivitas pemain: EXP dan reputasi menurut sumbernya, dengan batas harian per sumber dan bonus EXP untuk
 * aksi pertama sumber itu hari ini. Mengubah `w` (exp, level, reputasi, harian). Level yang dicapai dikembalikan agar
 * pemanggil mengirim hadiahnya.
 */
export function terapkanAktivitas(
  w: Pick<Warga, 'harian' | 'exp' | 'level' | 'reputasi' | 'reputasi_minggu'>,
  sumber: Sumber,
  kali: number,
  now: Date,
): HasilAktivitas {
  const hari = tanggalWIB(now)
  if (w.harian?.tgl !== hari) w.harian = { tgl: hari, exp: {}, rep: {}, pertama: [] }
  const h = w.harian as Required<Harian>
  h.exp ??= {}
  h.rep ??= {}
  h.pertama ??= []
  const a = AKTIVITAS[sumber]
  const n = Math.max(1, Math.floor(kali))

  const sudahExp = h.exp[sumber] ?? 0
  const dasarExp = Math.max(0, Math.min(a.exp * n, a.batasExp - sudahExp))
  h.exp[sumber] = sudahExp + dasarExp
  let exp = dasarExp
  if (!h.pertama.includes(sumber)) {
    h.pertama.push(sumber)
    exp += a.bonusPertama
  }

  const sudahRep = h.rep[sumber] ?? 0
  const rep = a.batasRep > 0 ? Math.max(0, Math.min(a.rep * n, a.batasRep - sudahRep)) : 0
  h.rep[sumber] = sudahRep + rep
  w.reputasi += rep
  w.reputasi_minggu += rep

  const naik: number[] = []
  if (w.level >= LEVEL.maks) {
    w.exp = 0
  } else {
    w.exp += exp
    while (w.level < LEVEL.maks && w.exp >= expUntukLevel(w.level)) {
      w.exp -= expUntukLevel(w.level)
      w.level += 1
      naik.push(w.level)
    }
    if (w.level >= LEVEL.maks) w.exp = 0
  }
  return { exp, rep, naik }
}

// ---------------------------------------------------------------- pekan peringkat

/** Awal pekan (Senin) menurut WIB sebagai YYYY-MM-DD. */
export function awalPekanWIB(now: Date): string {
  const wib = new Date(now.getTime() + 7 * JAM)
  const mundur = (wib.getUTCDay() + 6) % 7
  return new Date(wib.getTime() - mundur * HARI).toISOString().slice(0, 10)
}

export function hadiahPeringkat(peringkat: number): number {
  return PERINGKAT.hadiah.find((r) => peringkat >= r.dari && peringkat <= r.sampai)?.uang ?? 0
}

// ---------------------------------------------------------------- statistik dan latihan

export const nilaiAtribut = (w: Pick<Warga, Atribut>) => ({ kekuatan: w.kekuatan, kecerdasan: w.kecerdasan, karisma: w.karisma, disiplin: w.disiplin })

/** Syarat minimum Kecerdasan dan Disiplin untuk kursus keahlian ke level `ke`. */
export const syaratKursusKeahlian = (ke: number): Partial<Record<Atribut, number>> => {
  const n = Math.max(0, LATIHAN.syaratStat.kali * ke - LATIHAN.syaratStat.kurang)
  return Object.fromEntries(LATIHAN.syaratStat.atribut.map((a) => [a, n]))
}

export const durasiKursusKeahlian = (ke: number) => LATIHAN.keahlian.durasiDasarMs + LATIHAN.keahlian.durasiPerLevelMs * Math.max(0, ke - 1)

/** Atribut yang kurang dari syarat, atau daftar kosong bila terpenuhi. */
export function statKurang(punya: Record<Atribut, number>, syarat: Partial<Record<Atribut, number>>): Array<{ atribut: Atribut; perlu: number; punya: number }> {
  return ATRIBUT.flatMap((a) => (syarat[a] !== undefined && punya[a] < syarat[a]! ? [{ atribut: a, perlu: syarat[a]!, punya: punya[a] }] : []))
}

export const tambahAtribut = (nilai: number, naik: number) => Math.min(STATISTIK.maks, nilai + naik)

// ---------------------------------------------------------------- ganti pekerjaan

export function cekGantiKerja(riwayat: readonly string[], now: Date): { boleh: boolean; sisa: number; jedaSampai: Date | null; alasan: string | null } {
  const t = now.getTime()
  const dalam = riwayat.map((x) => Date.parse(x)).filter((x) => Number.isFinite(x) && t - x < GANTI_KERJA.periodeMs).sort((a, b) => a - b)
  const sisa = Math.max(0, GANTI_KERJA.maksPerPeriode - dalam.length)
  const terakhir = dalam.length ? dalam[dalam.length - 1] : null
  const cooldown = terakhir !== null && t - terakhir < GANTI_KERJA.cooldownMs ? terakhir + GANTI_KERJA.cooldownMs : null
  const batas = sisa === 0 ? dalam[0] + GANTI_KERJA.periodeMs : null
  const sampai = Math.max(cooldown ?? 0, batas ?? 0)
  if (sampai > t) {
    return {
      boleh: false, sisa, jedaSampai: new Date(sampai),
      alasan: batas && batas >= (cooldown ?? 0) ? `Sudah ${GANTI_KERJA.maksPerPeriode} kali ganti pekerjaan pekan ini.` : 'Baru saja ganti pekerjaan. Tunggu masa jeda.',
    }
  }
  return { boleh: true, sisa, jedaSampai: null, alasan: null }
}

// ---------------------------------------------------------------- seleksi pekerjaan khusus

export function golonganPekerjaan(p: Pick<Pekerjaan, 'id' | 'tempat'>): Golongan | null {
  for (const g of Object.keys(SELEKSI) as Golongan[]) {
    const s = SELEKSI[g]
    if (s.tempat.includes(p.tempat) || (s.awalan && p.id.startsWith(s.awalan))) return g
  }
  return null
}

export function syaratSeleksi(g: Golongan, tier: number): Partial<Record<Atribut, number>> {
  const s = SELEKSI[g]
  return Object.fromEntries(Object.entries(s.dasar).map(([a, n]) => [a, (n as number) + s.perTier * (tier - 1)]))
}

export const nilaiLulusSeleksi = (g: Golongan, tier: number) => SELEKSI[g].nilaiLulus + SELEKSI[g].tambahanPerTier * (tier - 1)

/** Skor tes: rata-rata berbobot atribut ditambah acak antara -variasi dan +variasi. */
export function skorSeleksi(atribut: Record<Atribut, number>, g: Golongan, acak: () => number): number {
  const s = SELEKSI[g]
  const dasar = ATRIBUT.reduce((t, a) => t + atribut[a] * s.bobot[a], 0)
  return Math.round((dasar + (acak() * 2 - 1) * s.variasi) * 10) / 10
}

// ---------------------------------------------------------------- kuota lowongan

export function kuotaLowongan(jenisBangunan: string, tier: number, pekerjaanId: string): number {
  const khusus = KUOTA.perPekerjaan[pekerjaanId]
  if (khusus !== undefined) return khusus
  return Math.max(1, Math.round((KUOTA.perTier[tier] ?? 1) * (KUOTA.pengaliJenis[jenisBangunan] ?? 1)))
}

// ---------------------------------------------------------------- konstruksi

/** (sekarang - mulai) / (selesai - mulai), dijepit 0 sampai 1. */
export function progresBangun(mulai: Date, selesai: Date, now: Date): number {
  const total = selesai.getTime() - mulai.getTime()
  if (total <= 0) return 1
  return Math.min(1, Math.max(0, (now.getTime() - mulai.getTime()) / total))
}

/** Empat tahap visual dari progres: 0-10%, 25-50%, 80-90% bagian bangunan, lalu selesai. */
export function tahapBangun(progres: number): { tahap: number; nama: string; tampil: number } {
  if (progres >= 1) return { tahap: TAHAP_BANGUN.length, nama: TAHAP_BANGUN[TAHAP_BANGUN.length - 1].nama, tampil: 1 }
  let i = 0
  while (i + 1 < TAHAP_BANGUN.length - 1 && progres >= TAHAP_BANGUN[i + 1].dari) i++
  const t = TAHAP_BANGUN[i]
  const berikut = TAHAP_BANGUN[i + 1]
  const bagian = berikut.dari > t.dari ? (progres - t.dari) / (berikut.dari - t.dari) : 0
  return { tahap: i + 1, nama: t.nama, tampil: Math.round((t.tampil[0] + (t.tampil[1] - t.tampil[0]) * bagian) * 100) / 100 }
}

export const bisaDibangun = (jenis: string) => Object.hasOwn(BANGUN, jenis)

// ---------------------------------------------------------------- roulette

export type JenisTaruhan = 'lurus' | 'merah' | 'hitam' | 'ganjil' | 'genap' | 'rendah' | 'tinggi' | 'lusin' | 'kolom'
export type Taruhan = { jenis: JenisTaruhan; nilai?: number; jumlah: number }

const JENIS_TARUHAN = new Set<string>(Object.keys(ROULETTE.bayar))
export const warnaKantong = (n: number): 'hijau' | 'merah' | 'hitam' => (n === 0 ? 'hijau' : (ROULETTE.merah as readonly number[]).includes(n) ? 'merah' : 'hitam')

/** Angka 0 mengalahkan semua taruhan luar (merah, hitam, ganjil, genap, rendah, tinggi, lusin, kolom). */
export function taruhanMenang(t: Pick<Taruhan, 'jenis' | 'nilai'>, nomor: number): boolean {
  if (t.jenis === 'lurus') return nomor === t.nilai
  if (nomor === 0) return false
  switch (t.jenis) {
    case 'merah': return warnaKantong(nomor) === 'merah'
    case 'hitam': return warnaKantong(nomor) === 'hitam'
    case 'ganjil': return nomor % 2 === 1
    case 'genap': return nomor % 2 === 0
    case 'rendah': return nomor <= 18
    case 'tinggi': return nomor >= 19
    case 'lusin': return Math.ceil(nomor / 12) === t.nilai
    case 'kolom': return nomor % 3 === (t.nilai === 3 ? 0 : t.nilai)
  }
}

/** Yang dikembalikan ke pemain untuk satu taruhan: taruhan ditambah kemenangan, atau 0 bila kalah. */
export const kembaliTaruhan = (t: Taruhan, nomor: number) => (taruhanMenang(t, nomor) ? t.jumlah * (1 + ROULETTE.bayar[t.jenis]) : 0)

/** Memeriksa masukan taruhan dari klien. Melempar Galat bila tidak sah. */
export function cekTaruhan(masukan: unknown): Taruhan[] {
  if (!Array.isArray(masukan) || masukan.length < 1) throw new Galat('taruhan_kosong', 'Pasang minimal satu taruhan.')
  if (masukan.length > ROULETTE.taruhanPerPutaran) throw new Galat('taruhan_banyak', `Paling banyak ${ROULETTE.taruhanPerPutaran} taruhan per putaran.`)
  let total = 0
  const hasil = masukan.map((x): Taruhan => {
    const t = (x ?? {}) as { jenis?: unknown; nilai?: unknown; jumlah?: unknown }
    if (typeof t.jenis !== 'string' || !JENIS_TARUHAN.has(t.jenis)) throw new Galat('taruhan_tidak_valid', 'Jenis taruhan tidak dikenal.')
    const jenis = t.jenis as JenisTaruhan
    const jumlah = Number(t.jumlah)
    if (!Number.isInteger(jumlah) || jumlah < ROULETTE.taruhanMin || jumlah > ROULETTE.taruhanMaks) {
      throw new Galat('jumlah_tidak_valid', `Tiap taruhan Rp ${ROULETTE.taruhanMin.toLocaleString('id-ID')} sampai Rp ${ROULETTE.taruhanMaks.toLocaleString('id-ID')}.`)
    }
    total += jumlah
    if (jenis === 'lurus') {
      const nilai = Number(t.nilai)
      if (!Number.isInteger(nilai) || nilai < 0 || nilai >= ROULETTE.kantong) throw new Galat('taruhan_tidak_valid', 'Angka taruhan 0 sampai 36.')
      return { jenis, nilai, jumlah }
    }
    if (jenis === 'lusin' || jenis === 'kolom') {
      const nilai = Number(t.nilai)
      if (![1, 2, 3].includes(nilai)) throw new Galat('taruhan_tidak_valid', 'Lusin dan kolom bernomor 1 sampai 3.')
      return { jenis, nilai, jumlah }
    }
    return { jenis, jumlah }
  })
  if (total > ROULETTE.totalMaks) throw new Galat('taruhan_melebihi', `Total taruhan paling banyak Rp ${ROULETTE.totalMaks.toLocaleString('id-ID')} per putaran.`)
  return hasil
}

// ---------------------------------------------------------------- memancing

export function pilihIkan(acak: () => number): { barang: string; kelangkaan: Kelangkaan } {
  const jumlah = MEMANCING.loot.reduce((t, l) => t + l.bobot, 0)
  let r = acak() * jumlah
  for (const l of MEMANCING.loot) {
    r -= l.bobot
    if (r < 0) return { barang: l.barang, kelangkaan: l.kelangkaan }
  }
  const l = MEMANCING.loot[MEMANCING.loot.length - 1]
  return { barang: l.barang, kelangkaan: l.kelangkaan }
}

/** Sesi baru: ikan, lama menunggu, dan zona sasaran ditentukan sekarang oleh server. */
export function buatSesiPancing(now: Date, acak: () => number): SesiPancing {
  const { barang, kelangkaan } = pilihIkan(acak)
  const [min, maks] = MEMANCING.tungguMs
  const lempar = now.getTime()
  const gigit = lempar + Math.round(min + acak() * (maks - min))
  const lebar = MEMANCING.zona[kelangkaan]
  const tengah = Math.round((0.2 + acak() * 0.6) * 1000) / 1000
  return { lempar, gigit, hangus: gigit + MEMANCING.jendelaMs + MEMANCING.hangusMs, barang, kelangkaan, tengah, lebar }
}

/** Posisi penanda 0 sampai 1 pada waktu `t`: gelombang segitiga yang mulai dari 0 saat ikan menggigit. */
export function posisiPenanda(s: Pick<SesiPancing, 'gigit'>, t: number): number {
  const fase = (((t - s.gigit) % MEMANCING.periodeMs) + MEMANCING.periodeMs) % MEMANCING.periodeMs / MEMANCING.periodeMs
  return fase < 0.5 ? fase * 2 : 2 - fase * 2
}

export type NilaiTarikan = 'sempurna' | 'bagus' | 'meleset' | 'terlambat' | 'terlalu_cepat'

/** Menilai tarikan kail pada waktu server `t`. */
export function nilaiTarikan(s: SesiPancing, t: number): NilaiTarikan {
  if (t < s.gigit) return 'terlalu_cepat'
  if (t > s.gigit + MEMANCING.jendelaMs) return 'terlambat'
  const selisih = Math.abs(posisiPenanda(s, t) - s.tengah)
  if (selisih > s.lebar / 2) return 'meleset'
  return selisih <= (s.lebar / 2) * MEMANCING.sempurna ? 'sempurna' : 'bagus'
}

// ---------------------------------------------------------------- minimarket

export const tokoAda = (id: string) => Object.hasOwn(TOKO.toko, id)

/** Harga satu satuan di toko pada UMK yang berlaku, dibulatkan ke ratusan. */
export function hargaToko(toko: string, produk: string, umk: number): number | null {
  const dasar = TOKO.toko[toko]?.harga[produk]
  if (dasar === undefined) return null
  return Math.max(100, Math.round((dasar * indeksHarga(umk)) / 100) * 100)
}

/** Hari dalam pekan (0 Minggu) untuk tanggal WIB YYYY-MM-DD. */
const hariPekan = (tanggal: string) => new Date(`${tanggal}T00:00:00Z`).getUTCDay()

export function promoAktif(toko: string, produk: string, tanggal: string): Promo[] {
  const hari = hariPekan(tanggal)
  return TOKO.promo.filter(
    (p) => p.toko === toko && (p.produk === '*' || p.produk === produk) && tanggal >= p.dari && tanggal <= p.sampai && (!p.hari || p.hari.includes(hari)),
  )
}

/** Total yang dibayar untuk `jumlah` satuan dengan promo terbaik (paling murah) di antara yang aktif. */
export function hitungBelanja(harga: number, jumlah: number, promo: readonly Promo[]): { total: number; promo: string | null; hemat: number } {
  const biasa = harga * jumlah
  let terbaik = { total: biasa, promo: null as string | null }
  for (const p of promo) {
    let total = biasa
    if (p.jenis === 'persen') total = Math.round((biasa * (100 - (p.nilai ?? 0))) / 100)
    else if (p.jenis === 'nominal') total = Math.max(0, harga - (p.nilai ?? 0)) * jumlah
    else {
      const grup = (p.beli ?? 1) + (p.gratis ?? 0)
      const gratis = Math.floor(jumlah / grup) * (p.gratis ?? 0)
      total = (jumlah - gratis) * harga
    }
    if (total < terbaik.total) terbaik = { total, promo: p.id }
  }
  return { total: terbaik.total, promo: terbaik.promo, hemat: biasa - terbaik.total }
}

/** Stok sekarang setelah restok malas sejak `pada`, dan batas waktu restok berikutnya yang sudah dipakai. */
export function stokSekarang(toko: string, baris: { stok: number; pada: Date } | null, now: Date): { stok: number; pada: Date } {
  const t = TOKO.toko[toko]
  if (!baris) return { stok: t.stokAwal, pada: now }
  if (baris.stok >= t.stokMaks) return { stok: baris.stok, pada: now }
  const n = Math.max(0, Math.floor((now.getTime() - baris.pada.getTime()) / t.restokMs))
  if (n === 0) return baris
  const stok = Math.min(t.stokMaks, baris.stok + n * t.restokJumlah)
  return { stok, pada: stok >= t.stokMaks ? now : new Date(baris.pada.getTime() + n * t.restokMs) }
}

// ---------------------------------------------------------------- masukan

/** Id uuid dari klien harus berbentuk uuid; selain itu basis data menolak dengan galat 500. */
export function wajibUuid(x: unknown, apa = 'ID'): string {
  if (typeof x !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)) throw new Galat('id_tidak_valid', `${apa} tidak valid.`)
  return x.toLowerCase()
}

// ---------------------------------------------------------------- kamar dan sekamar

export const kunciKamar = (tempat: string, kamar: number) => `${tempat}#${kamar}`

/** Dua id warga sebagai pasangan berurutan (a < b), seperti kunci tabel pertemanan. */
export const pasangan = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x])
