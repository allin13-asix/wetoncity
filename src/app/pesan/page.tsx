import type { Metadata } from 'next'
import Papan from '@/ui/Papan'
import { KotakPesan } from '@/ui/ProfilPublik'

export const metadata: Metadata = { title: 'Pesan | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      <KotakPesan />
    </>
  )
}
