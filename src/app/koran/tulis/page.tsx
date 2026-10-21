import type { Metadata } from 'next'
import Link from 'next/link'
import { npc } from '@/data/npc'
import { bolehPratinjau } from '@/server/koranPratinjau'
import Papan from '@/ui/Papan'
import TulisKoran from '@/ui/TulisKoran'

export const metadata: Metadata = { title: 'Tulis Koran | Weton City' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  if (!(await bolehPratinjau())) {
    return (
      <>
        <Papan />
        <main className="halaman">
          <h1>Tulis Koran</h1>
          <p className="pengantar">Khusus Wali Kota. Masuk dengan akun Wali Kota lalu buka halaman ini lagi.</p>
          <p><Link className="tautan" href="/masuk">Masuk</Link></p>
        </main>
      </>
    )
  }
  const penulis = npc.filter((n) => n.tempatKerja === 'koran-weton').map((n) => n.nama)
  return (
    <>
      <Papan />
      <TulisKoran penulisUtama={penulis} semuaNpc={npc.map((n) => n.nama).sort()} />
    </>
  )
}
