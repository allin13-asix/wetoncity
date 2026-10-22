'use client'

import { BONUS_HARIAN, TARIF_PER_TENAGA, TENAGA, rupiah } from '@/data/ekonomi'
import { biayaBulan, hunian, type Hunian } from '@/data/hunian'
import { penempatan } from '@/data/tataletak'
import { RUSUN } from '@/server/aturan'

export const idPertama = (jenis: string) => penempatan.find((p) => p.jenis === jenis)?.id

// Perkiraan penghasilan bulan kota pertama (7 hari): 100 Tenaga per hari dipakai bekerja Tier 1, ditambah bonus harian.
export const penghasilanAwal = 7 * (TENAGA.maks * TARIF_PER_TENAGA[1] + BONUS_HARIAN)

export function RingkasanHunian({ h }: { h: Hunian }) {
  return (
    <p className="ringkasan">
      Tagihan pertama {rupiah(biayaBulan(h))}, jatuh tempo 7 hari lagi. Penghasilan bulan pertama sekitar {rupiah(penghasilanAwal)} bila memakai 100 Tenaga per hari.{' '}
      {biayaBulan(h) > penghasilanAwal
        ? 'Tagihan ini lebih besar dari penghasilan awal, jadi uang sakumu akan menutup selisihnya.'
        : 'Penghasilan awal cukup menutup tagihan ini.'}
    </p>
  )
}

type Props = {
  dipilih: string | null
  onPilih: (id: string) => void
  onLihat?: (idPenempatan: string) => void
  /** tempat tinggal yang sedang dihuni, bila pemain sudah punya */
  saatIni?: string | null
  sibuk?: boolean
  /** hanya hunian berkamar (pendatang baru): tanpa rumah sendiri dan numpang */
  hanyaKamar?: boolean
  /** penghuni per id bangunan, untuk menampilkan kamar tersisa */
  terisi?: Record<string, number>
}

/** Kartu karcis pilihan tempat tinggal untuk tur pemain baru di peta. */
export function DaftarKarcis({ dipilih, onPilih, onLihat, saatIni = null, sibuk = false, hanyaKamar = false, terisi }: Props) {
  return (
    <ul className="karcis-daftar">
      {hunian.filter((h) => !hanyaKamar || h.kamar).map((h) => {
        const gedung = penempatan.filter((p) => h.bangunan.includes(p.jenis))
        const kap = h.kamar ? h.kamar * h.penghuni * gedung.length : null
        const isi = terisi && kap !== null ? gedung.reduce((t, p) => t + (terisi[p.id] ?? 0), 0) : null
        // Rusunawa tidak pernah penuh bagi pendatang: server membuka kamar tambahan (lihat pilihHunian)
        const penuh = h.id !== RUSUN.id && kap !== null && isi !== null && isi >= kap
        const kunci = h.fase > 0
        const terpilih = h.id === dipilih
        const dihuni = h.id === saatIni
        const idBangunan = idPertama(h.bangunan[0])
        return (
          <li key={h.id} className={`karcis${terpilih ? ' dipilih' : ''}${kunci ? ' kunci' : ''}`}>
            <div className="karcis-stub">
              <span className="harga">{h.id === 'numpang' ? 'Gratis' : rupiah(biayaBulan(h))}</span>
              <small>{h.id === 'numpang' ? 'uang dapur saja' : 'per bulan'}</small>
            </div>
            <div className="karcis-isi">
              <strong>{h.nama}</strong>
              <ul className="daftar-titik">
                {h.fasilitas.slice(0, 3).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {kap !== null && (
                <p className="catatan">
                  {gedung.length} gedung, {h.kamar} kamar per gedung{h.penghuni > 1 ? ` (berdua)` : ""}{isi !== null ? `, sisa ${Math.max(0, kap - isi)} tempat` : ""}
                </p>
              )}
              {kunci ? (
                <p className="catatan">Belum bisa dipilih. {h.catatan}</p>
              ) : (
                <div className="tombol-baris">
                  {onLihat && idBangunan && (
                    <button type="button" onClick={() => onLihat(idBangunan)}>
                      Lihat di peta
                    </button>
                  )}
                  <button type="button" className="utama" aria-pressed={terpilih} disabled={sibuk || dihuni || penuh} onClick={() => onPilih(h.id)}>
                    {dihuni ? 'Dihuni sekarang' : penuh ? 'Penuh' : terpilih ? 'Terpilih' : 'Pilih'}
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
