import type { Metadata } from 'next'
import { Peringkat } from '@/ui/Kehidupan'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Peringkat | Weton City', description: 'Peringkat reputasi warga Weton dan hadiah mingguan.' }

export default function Page() {
  return (
    <>
      <Papan />
      <main className="halaman">
        <h1>Peringkat warga</h1>
        <p className="catatan">Reputasi didapat dari bekerja, bertransaksi, mini game, dan berinteraksi, dengan batas harian per sumber. Peringkat juga tampil di Balai Kota dan Alun-Alun.</p>
        <div className="kolom">
          <Peringkat judul="Papan peringkat" />
        </div>
      </main>
    </>
  )
}
