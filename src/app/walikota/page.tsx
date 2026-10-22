import type { Metadata } from 'next'
import KantorWalikota from '@/ui/KantorWalikota'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Kantor Wali Kota | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <KantorWalikota />
    </>
  )
}
