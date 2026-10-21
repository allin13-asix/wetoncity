import type { Metadata } from 'next'
import Beranda from '@/ui/Beranda'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Beranda | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <Beranda />
    </>
  )
}
