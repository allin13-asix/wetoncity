'use client'

import { useEffect, useState } from 'react'

export type Sesi = { masuk: boolean; nama?: string } | null

/** Status masuk untuk navigasi. null selama belum diketahui. */
export function useSesi(): Sesi {
  const [sesi, setSesi] = useState<Sesi>(null)
  useEffect(() => {
    let batal = false
    fetch('/api/sesi', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { masuk?: boolean; nama?: string }) => {
        if (!batal) setSesi(d?.masuk ? { masuk: true, nama: d.nama } : { masuk: false })
      })
      .catch(() => {
        if (!batal) setSesi({ masuk: false })
      })
    return () => {
      batal = true
    }
  }, [])
  return sesi
}
