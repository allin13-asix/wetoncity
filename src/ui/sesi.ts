'use client'

import { useEffect, useState } from 'react'

export type Sesi = { masuk: boolean; nama?: string } | null

// Satu permintaan /api/sesi dipakai bersama oleh semua komponen (Papan dan navigasi bawah) selama SEGAR_MS.
const SEGAR_MS = 5_000
let janji: Promise<NonNullable<Sesi>> | null = null
let pada = 0

function ambilSesi(): Promise<NonNullable<Sesi>> {
  if (!janji || Date.now() - pada > SEGAR_MS) {
    pada = Date.now()
    janji = fetch('/api/sesi', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { masuk?: boolean; nama?: string }) => (d?.masuk ? { masuk: true, nama: d.nama } : { masuk: false }))
      .catch(() => ({ masuk: false }))
  }
  return janji
}

/** Panggil setelah masuk, daftar, atau keluar supaya navigasi membaca status yang baru. */
export function lupakanSesi(): void {
  janji = null
}

/** Status masuk untuk navigasi. null selama belum diketahui. `segarkan` berubah (misalnya alamat halaman) memeriksa ulang. */
export function useSesi(segarkan?: unknown): Sesi {
  const [sesi, setSesi] = useState<Sesi>(null)
  useEffect(() => {
    let batal = false
    ambilSesi().then((s) => {
      if (!batal) setSesi(s)
    })
    return () => {
      batal = true
    }
  }, [segarkan])
  return sesi
}
