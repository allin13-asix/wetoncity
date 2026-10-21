import type { Metadata } from 'next'
import { npc, npcInteraktif } from '@/data/npc'
import DaftarWarga from '@/ui/DaftarWarga'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Warga | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <main className="halaman">
        <h1>Warga Weton</h1>
        <p className="pengantar">
          {npc.length} warga NPC mengisi kota. {npcInteraktif.length} di antaranya bisa diajak bicara dan membuka fitur game: pemandu, pengelola kost, petugas bursa kerja, dan lainnya.
          Sisanya meramaikan kota dan menjadi bahan Koran Kota.
        </p>
        <DaftarWarga />
      </main>
    </>
  )
}
