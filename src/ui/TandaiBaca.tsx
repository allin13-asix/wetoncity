'use client'

import { useEffect } from 'react'
import { tandaiKoranDibaca } from './penandaKoran'

/** Tidak menampilkan apa-apa; mencatat bahwa edisi ini sudah dibuka. */
export default function TandaiBaca({ tanggal }: { tanggal: string }) {
  useEffect(() => tandaiKoranDibaca(tanggal), [tanggal])
  return null
}
