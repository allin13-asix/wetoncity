'use client'

import { useMemo, useState } from 'react'
import { jenisById } from '@/data/bangunan'
import { npc } from '@/data/npc'
import { distrik } from '@/data/tataletak'

const tempat = (id: string) => jenisById.get(id)?.nama ?? distrik.find((d) => d.id === id)?.nama ?? id

export default function DaftarWarga() {
  const [q, setQ] = useState('')
  const [hanyaBicara, setHanyaBicara] = useState(false)

  const hasil = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return npc.filter((n) => {
      if (hanyaBicara && !n.interaktif) return false
      if (!kata) return true
      return [n.nama, n.peran, n.watak, n.tempatKerja ? tempat(n.tempatKerja) : '', tempat(n.tempatTinggal)].join(' ').toLowerCase().includes(kata)
    })
  }, [q, hanyaBicara])

  return (
    <>
      <div className="saring">
        <label>
          <span>Cari warga</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama, pekerjaan, atau tempat" />
        </label>
        <button type="button" aria-pressed={hanyaBicara} onClick={() => setHanyaBicara((x) => !x)}>
          Bisa diajak bicara
        </button>
        <p role="status">{hasil.length} dari {npc.length} warga</p>
      </div>

      <ul className="warga-grid">
        {hasil.map((n) => (
          <li key={n.id} className={n.interaktif ? 'bicara' : undefined}>
            {n.interaktif ? (
              <details>
                <summary>
                  <span className="nama">{n.nama}</span>
                  <span className="meta">{n.peran}, {n.umur} tahun</span>
                  <span className="meta">{n.tempatKerja ? `Bekerja di ${tempat(n.tempatKerja)}` : 'Tidak bekerja di tempat tetap'}</span>
                  <span className="chip chip-bicara">Bisa diajak bicara</span>
                </summary>
                <p className="sapaan">“{n.interaktif.sapaan}”</p>
                <p className="catatan">{n.interaktif.tawaran}</p>
                <p className="catatan">Tinggal di {tempat(n.tempatTinggal)}. Watak: {n.watak}. Aktif mulai Fase {n.interaktif.fase}.</p>
              </details>
            ) : (
              <div className="isi">
                <span className="nama">{n.nama}</span>
                <span className="meta">{n.peran}, {n.umur} tahun</span>
                <span className="meta">{n.tempatKerja ? `Bekerja di ${tempat(n.tempatKerja)}` : 'Tidak bekerja di tempat tetap'}</span>
                <span className="meta">Tinggal di {tempat(n.tempatTinggal)}. {n.watak.charAt(0).toUpperCase() + n.watak.slice(1)}.</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasil.length === 0 && <p className="kosong">Tidak ada warga yang cocok. Coba kata lain atau matikan filter.</p>}
    </>
  )
}
