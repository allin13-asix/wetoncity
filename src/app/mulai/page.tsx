import type { Metadata } from 'next'
import Mulai from '@/ui/Mulai'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Tempat tinggal | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <Mulai />
    </>
  )
}
