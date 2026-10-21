// Kamar dan teman sekamar (SQL saja). Memilih kamar di dalam bangunan hunian, dan membuat permintaan pertemanan otomatis
// dengan semua penghuni lama saat pemain masuk ke kamar yang sudah berpenghuni.
import { Galat } from './galat.ts'
import type { Tx } from './kueri.ts'
import { kunciKamar, pasangan } from './sistem-aturan.ts'
import type { Warga } from './tipe.ts'

/**
 * Pilih nomor kamar di bangunan `tempat`: yang diminta bila masih ada tempat, selain itu kamar kosong pertama, lalu kamar
 * pertama yang masih punya tempat. Penghuni yang sudah dijadwalkan pindah ke sini ikut dihitung. Pemanggil memegang
 * kunci penasihat bangunan.
 */
export async function tentukanKamar(tx: Tx, tempat: string, jumlahKamar: number, perKamar: number, kecuali: string, diminta?: number | null): Promise<number> {
  const baris = await tx<{ kamar: number; n: number }[]>`
    select kamar, count(*)::int as n from (
      select hunian_kamar as kamar from warga where id <> ${kecuali} and peran <> 'walikota' and hunian_tempat = ${tempat} and hunian_kamar is not null
      union all
      select hunian_kamar_berikut from warga where id <> ${kecuali} and peran <> 'walikota' and hunian_tempat_berikut = ${tempat} and hunian_kamar_berikut is not null
    ) t group by kamar`
  const isi = new Map(baris.map((b) => [b.kamar, b.n]))
  if (diminta != null) {
    if (!Number.isInteger(diminta) || diminta < 1 || diminta > jumlahKamar) throw new Galat('kamar_tidak_ada', `Nomor kamar 1 sampai ${jumlahKamar}.`)
    if ((isi.get(diminta) ?? 0) >= perKamar) throw new Galat('kamar_penuh', 'Kamar itu sudah penuh. Pilih kamar lain.', 409)
    return diminta
  }
  for (let k = 1; k <= jumlahKamar; k++) if (!isi.get(k)) return k
  for (let k = 1; k <= jumlahKamar; k++) if ((isi.get(k) ?? 0) < perKamar) return k
  throw new Galat('hunian_penuh', 'Semua kamar di gedung ini sudah terisi.', 409)
}

/** Penghuni lain yang tinggal sekarang di kamar yang sama (tanpa Wali Kota). */
export const penghuniKamar = (tx: Tx, tempat: string, kamar: number, kecuali: string) =>
  tx<{ id: string; nama: string }[]>`
    select id, nama from warga where id <> ${kecuali} and peran <> 'walikota' and hunian_tempat = ${tempat} and hunian_kamar = ${kamar}`

/**
 * Pemain baru saja masuk ke kamar `w.hunian_tempat` nomor `w.hunian_kamar`: buat permintaan pertemanan dengan semua penghuni
 * lama yang belum berteman. Penghuni lama yang menolak wajib pindah setelah masa tenggang (lihat sistem.ts).
 */
export async function masukKamar(tx: Tx, w: Warga, now: Date): Promise<void> {
  if (!w.hunian_tempat || w.hunian_kamar == null || w.peran === 'walikota') return
  const lama = await penghuniKamar(tx, w.hunian_tempat, w.hunian_kamar, w.id)
  const kunci = kunciKamar(w.hunian_tempat, w.hunian_kamar)
  for (const o of lama) {
    const [a, b] = pasangan(w.id, o.id)
    tx.tulis`
      insert into pertemanan (a, b, status, peminta, sekamar, dibuat_pada)
      values (${a}, ${b}, 'minta', ${w.id}, ${kunci}, ${now})
      on conflict (a, b) do nothing`
  }
}
