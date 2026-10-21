// Angka ekonomi bersama. Sumber tunggal untuk situs, skrip simulasi, dan dokumen docs/EKONOMI.md.

export const MODAL_AWAL = 1_000_000 // uang saku dari kampung halaman
export const BONUS_HARIAN = 20_000
export const MAKAN_HARIAN = 25_000
export const HARI_PER_SIKLUS = 7
/** Satu siklus tagihan (7 hari nyata) dihitung sebagai satu bulan kota: gaji dan biaya hidup ditulis per bulan. */
export const HARI_KOTA_PER_SIKLUS = 30

/** Upah minimum kota (UMK) awal per bulan. UMK berjalan disimpan di basis data dan diubah lewat kebijakan Wali Kota. */
export const UMK_AWAL = 2_500_000
/** Kerja penuh sebulan = satu sesi sehari (Tenaga 100, 10 aksi) selama satu siklus. Gaji bulanan dibagi angka ini menjadi upah per aksi. */
export const AKSI_SEBULAN = 70
/** Gaji pokok sebulan per tier sebagai kelipatan UMK. Tier 1 tepat UMK. */
export const KOEF_TIER = { 1: 1, 2: 1.4, 3: 2, 4: 3, 5: 4 } as const
/** Harga hidup ikut UMK sebagian: UMK naik 10% membuat sewa, listrik, makan, dan barang naik 4%. */
export const indeksHarga = (umk: number) => 0.6 + 0.4 * (umk / UMK_AWAL)
export const gajiTier = (tier: 1 | 2 | 3 | 4 | 5, umk = UMK_AWAL) => Math.round((umk * KOEF_TIER[tier]) / 10_000) * 10_000

export const TENAGA = { maks: 100, pulihPerJam: 10, aksiKerja: 10, kursus: 10 } as const

export type Tier = 1 | 2 | 3 | 4 | 5
/** Upah per poin Tenaga pada UMK awal (untuk tampilan statis). Nilai berjalan dihitung dari UMK lewat upahAksi di aturan.ts. */
export const TARIF_PER_TENAGA: Record<Tier, number> = Object.fromEntries(
  ([1, 2, 3, 4, 5] as const).map((t) => [t, Math.round(gajiTier(t) / AKSI_SEBULAN / TENAGA.aksiKerja)]),
) as Record<Tier, number>
/** Keahlian minimum per tier. Tier 4 butuh gelar D3, Tier 5 butuh gelar S1. */
export const SYARAT_KEAHLIAN: Record<Tier, number> = { 1: 1, 2: 3, 3: 6, 4: 3, 5: 3 }
export const upahPerAksi = (tier: Tier, umk = UMK_AWAL) => Math.round(gajiTier(tier, umk) / AKSI_SEBULAN)

export const KURSUS = { dasar: 100_000, faktor: 1.7, skillMaks: 10 } as const
export const kursusBiaya = (skill: number) => Math.round((KURSUS.dasar * KURSUS.faktor ** (skill - 1)) / 1000) * 1000

/** Keahlian di atas level ini menambah upah: hadiah jangka panjang sekaligus penyedot uang. */
export const BONUS_UPAH = { mulaiLevel: 6, perLevel: 0.04 } as const
export const pengaliUpah = (skill: number) => 1 + BONUS_UPAH.perLevel * Math.max(0, skill - BONUS_UPAH.mulaiLevel)

/** Usaha Fase 1: titik awal, belum teruji dengan pemain nyata. Siklus 4 jam, simpan maksimal 6 siklus. */
export const USAHA = {
  'Perahu nelayan': { modal: 3_000_000, hasil: 2 * 30_000, bahan: 20_000, siklus: 6 },
  'Warung makan': { modal: 4_000_000, hasil: 20 * 4_000, bahan: 30_000 + 15_000, siklus: 6 },
} as const
export type Usaha = (typeof USAHA)[keyof typeof USAHA]
/** Laba per hari bila diambil semua siklus. Hasil naik 25% per level. */
export const labaHarian = (u: Usaha, level = 1) => (u.hasil * 1.25 ** (level - 1) - u.bahan) * u.siklus
/** Biaya naik dari level ke level + 1. */
export const upgradeBiaya = (u: Usaha, level: number) => Math.round((u.modal * 0.6 * 1.8 ** (level - 1)) / 1000) * 1000
export const upgradeBalikModal = (u: Usaha, level: number) => upgradeBiaya(u, level) / (labaHarian(u, level + 1) - labaHarian(u, level))

/** Pajak penghasilan bertingkat atas total upah kerja satu bulan kota: [batas atas, tarif]. Di bawah 4,5 juta bebas pajak. */
export const PAJAK: ReadonlyArray<readonly [number, number]> = [
  [4_500_000, 0],
  [10_000_000, 0.05],
  [Number.POSITIVE_INFINITY, 0.15],
]

export function pajakBulanan(upah: number): number {
  let sisa = upah
  let batasLalu = 0
  let total = 0
  for (const [batas, tarif] of PAJAK) {
    const bagian = Math.min(sisa, batas - batasLalu)
    if (bagian <= 0) break
    total += bagian * tarif
    sisa -= bagian
    batasLalu = batas
  }
  return Math.round(total)
}

export const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`
