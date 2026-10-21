import type { Metadata } from 'next'
import Papan from '@/ui/Papan'
import ProfilPublik from '@/ui/ProfilPublik'

export const metadata: Metadata = { title: 'Profil warga | Weton City' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <Papan />
      <ProfilPublik id={id} />
    </>
  )
}
