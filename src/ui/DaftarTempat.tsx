'use client'

import { katalog, kategori } from '@/data/bangunan'
import type { Kategori } from '@/data/tipe'
import { Tutup } from './ikon'
import { idPertama } from './KartuHunian'

const urutan = Object.keys(kategori) as Kategori[]

export default function DaftarTempat({ onPilih, onTutup }: { onPilih: (id: string) => void; onTutup: () => void }) {
  return (
    <section className="lembar" aria-label="Daftar tempat">
      <header className="lembar-kepala">
        <div>
          <h2>Daftar tempat</h2>
          <p className="ringkas">Ketuk salah satu untuk terbang ke sana.</p>
        </div>
        <button type="button" className="ikon-tombol" aria-label="Tutup daftar" onClick={onTutup}>
          <Tutup />
        </button>
      </header>
      <div className="lembar-isi">
        {urutan.map((k) => {
          const isi = katalog.filter((j) => j.kategori === k && !j.diLaut && idPertama(j.id))
          if (!isi.length) return null
          return (
            <div key={k}>
              <h3>{kategori[k].nama}</h3>
              <ul className="daftar-tempat">
                {isi.map((j) => (
                  <li key={j.id}>
                    <button type="button" onClick={() => onPilih(idPertama(j.id)!)}>
                      <span className="titik-warna" style={{ background: kategori[k].warna }} aria-hidden="true" />
                      <span>{j.nama}</span>
                      {j.utama && <small>utama</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
