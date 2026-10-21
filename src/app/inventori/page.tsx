import type { Metadata } from 'next'
import HalamanInventori from '@/ui/HalamanInventori'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Inventori | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <HalamanInventori />
    </>
  )
}
