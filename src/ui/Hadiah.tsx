'use client'

// Kirim hadiah barang dari inventori ke warga lain. Batas harian dari server (HADIAH.kaliPerHari); sisa tampil sesudah kirim.
import { useEffect, useState } from 'react'
import { HADIAH } from '@/data/balans'
import type { Keadaan } from '@/server/tipe'
import { kunciBaru, panggil } from './api'
import { Tutup } from './ikon'

type Barang = { id: string; nama: string; jumlah: number; satuan: string }

export function KirimHadiah({ ke, onTutup }: { ke: { id: string; nama: string }; onTutup: () => void }) {
  const [barang, setBarang] = useState<Barang[] | null>(null)
  const [pilih, setPilih] = useState('')
  const [jumlah, setJumlah] = useState(1)
  const [sibuk, setSibuk] = useState(false)
  const [kabar, setKabar] = useState<{ ok: boolean; teks: string } | null>(null)

  useEffect(() => {
    panggil<{ barang: Barang[] }>('/api/inventori').then((r) => {
      const isi = r.ok ? r.data.barang.filter((b) => b.jumlah > 0) : []
      setBarang(isi)
      setPilih(isi[0]?.id ?? '')
    })
  }, [])

  const b = barang?.find((x) => x.id === pilih)

  async function kirim() {
    if (!b) return
    setSibuk(true)
    const r = await panggil<Keadaan>('/api/inventori', { aksi: 'kirim', ke: ke.id, barang: b.id, jumlah, kunci: kunciBaru() })
    setSibuk(false)
    if (!r.ok) return setKabar({ ok: false, teks: r.galat.pesan })
    setKabar({ ok: true, teks: `Terkirim ke ${ke.nama}. Sisa hadiah hari ini: ${r.data.hadiahSisa} kali.` })
    setBarang((l) => (l ?? []).map((x) => (x.id === b.id ? { ...x, jumlah: x.jumlah - jumlah } : x)).filter((x) => x.jumlah > 0))
    setJumlah(1)
  }

  return (
    <div className="lapis" role="dialog" aria-modal="true" aria-label={`Kirim hadiah ke ${ke.nama}`} onClick={onTutup}>
      <section className="panel dialog-hadiah" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-kepala">
          <h2>Hadiah untuk {ke.nama}</h2>
          <button type="button" className="ikon-tombol" aria-label="Tutup" onClick={onTutup}>
            <Tutup />
          </button>
        </header>
        <p className="catatan">Barang diambil dari inventorimu. Paling banyak {HADIAH.kaliPerHari} kali sehari.</p>
        {barang === null ? (
          <p className="catatan">Memuat inventori</p>
        ) : barang.length === 0 ? (
          <p className="catatan">Inventorimu kosong. Belanja dulu di Pasar Weton atau minimarket.</p>
        ) : (
          <>
            <ul className="pilih-hadiah">
              {barang.map((x) => (
                <li key={x.id}>
                  <button type="button" aria-pressed={x.id === pilih} onClick={() => { setPilih(x.id); setJumlah(1) }}>
                    <strong>{x.nama}</strong>
                    <small>punya {x.jumlah} {x.satuan}</small>
                  </button>
                </li>
              ))}
            </ul>
            {b && (
              <div className="baris-aksi">
                <label className="tulis-label">
                  Jumlah
                  <input type="number" min={1} max={b.jumlah} value={jumlah} onChange={(e) => setJumlah(Math.max(1, Math.min(b.jumlah, Math.floor(Number(e.target.value) || 1))))} />
                </label>
                <button type="button" className="tombol-utama" disabled={sibuk} onClick={kirim}>
                  {sibuk ? 'Mengirim' : `Kirim ${jumlah} ${b.nama}`}
                </button>
              </div>
            )}
          </>
        )}
        {kabar && <p className={`pesan ${kabar.ok ? 'ok' : 'galat'}`}>{kabar.teks}</p>}
      </section>
    </div>
  )
}
