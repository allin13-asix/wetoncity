import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { edisiTanggal, segarkanKoran, terbit } from '@/server/koran'
import { bolehPratinjau } from '@/server/koranPratinjau'
import Koran from '@/ui/Koran'
import Papan from '@/ui/Papan'
import { sql } from '@/server/sql'

export const metadata: Metadata = { title: 'Koran Weton | Weton City', description: 'Kabar harian kota pelabuhan Weton untuk para warga.' }
export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ tanggal: string }> }) {
  const { tanggal } = await params
  const sekarang = new Date()
  await segarkanKoran(sql)
  const pratinjau = await bolehPratinjau()
  const edisi = edisiTanggal(tanggal, sekarang, undefined, pratinjau)
  if (!edisi) notFound() // belum terbit atau tidak ada
  return (
    <>
      <Papan />
      <Koran edisi={edisi} lainnya={terbit(sekarang, undefined, pratinjau).filter((e) => e.tanggal !== tanggal)} pratinjau={pratinjau} />
    </>
  )
}
