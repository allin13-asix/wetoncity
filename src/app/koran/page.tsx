import type { Metadata } from 'next'
import { segarkanKoran, terbit } from '@/server/koran'
import { bolehPratinjau } from '@/server/koranPratinjau'
import Koran from '@/ui/Koran'
import Papan from '@/ui/Papan'
import { sql } from '@/server/sql'

export const metadata: Metadata = { title: 'Koran Weton | Weton City', description: 'Kabar harian kota pelabuhan Weton untuk para warga.' }
// Edisi terbit menurut jam server, jadi halaman tidak boleh dibekukan saat build.
export const dynamic = 'force-dynamic'

export default async function Page() {
  await segarkanKoran(sql)
  const pratinjau = await bolehPratinjau()
  const [terbaru, ...lainnya] = terbit(new Date(), undefined, pratinjau)
  return (
    <>
      <Papan />
      <Koran edisi={terbaru ?? null} lainnya={lainnya} pratinjau={pratinjau} />
    </>
  )
}
