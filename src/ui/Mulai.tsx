'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Halaman lama: pendatang baru kini memulai dari tur di pelabuhan, dan pindah tempat tinggal dilakukan dengan mengetuk gedung di peta. */
export default function Mulai() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/')
  }, [router])
  return <main className="halaman"><p className="kosong">Membuka peta</p></main>
}
