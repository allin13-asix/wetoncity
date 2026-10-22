import type { Metadata } from 'next'
import { Suspense } from 'react'
import Obrolan from '@/ui/Obrolan'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Obrolan | Weton City' }

export default function Page() {
  return (
    <>
      <Papan />
      {/* Obrolan membaca ?tab= dan ?dengan= dari alamat */}
      <Suspense>
        <Obrolan />
      </Suspense>
    </>
  )
}
