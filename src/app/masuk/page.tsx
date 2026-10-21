import type { Metadata } from 'next'
import Masuk from '@/ui/Masuk'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Masuk | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <Masuk />
    </>
  )
}
