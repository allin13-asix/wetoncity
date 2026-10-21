import type { Metadata } from 'next'
import Galeri from '@/ui/Galeri'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Galeri aset | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <Galeri />
    </>
  )
}
