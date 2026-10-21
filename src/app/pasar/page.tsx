import type { Metadata } from 'next'
import Papan from '@/ui/Papan'
import Pasar from '@/ui/Pasar'

export const metadata: Metadata = { title: 'Pasar Weton | Weton City', description: 'Jual beli ikan dan beras dengan pedagang dan sesama warga.' }

export default function Page() {
  return (
    <>
      <Papan />
      <Pasar />
    </>
  )
}
