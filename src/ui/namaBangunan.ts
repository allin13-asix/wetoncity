'use client'

// Nama bangunan buatan pemiliknya dan rumah warga di peta (/api/peta/rumah), diambil sekali dan dipakai bersama oleh
// label peta dan judul panel bangunan. Disegarkan tiap menit, dan segera setelah pemain mengganti nama (segarkanPeta).
import { useEffect, useState } from 'react'

export type RumahPeta = { lahan: string; nama: string; jenis: string; bangun: string; progres: number; tahap: number; tahapNama: string; tampil: number }
type DataPeta = { rumah: RumahPeta[]; nama: Record<string, string> }

let data: DataPeta = { rumah: [], nama: {} }
let janji: Promise<void> | null = null
const pendengar = new Set<(d: DataPeta) => void>()

function ambil(segar = false): Promise<void> {
  // ?t= melewati cache CDN supaya nama baru langsung terlihat oleh pemilik yang menggantinya
  janji ??= fetch(segar ? `/api/peta/rumah?t=${Date.now()}` : '/api/peta/rumah', { cache: 'no-store' })
    .then((r) => r.json())
    .then((d: Partial<DataPeta>) => {
      data = { rumah: d.rumah ?? [], nama: d.nama ?? {} }
      pendengar.forEach((f) => f(data))
    })
    .catch(() => {})
    .finally(() => {
      janji = null
    })
  return janji
}

/** Muat ulang sekarang, misalnya sesudah mengganti nama bangunan. */
export const segarkanPeta = () => ambil(true)

export function useDataPeta(): DataPeta {
  const [d, setD] = useState(data)
  useEffect(() => {
    pendengar.add(setD)
    ambil()
    const t = setInterval(ambil, 60_000)
    return () => {
      pendengar.delete(setD)
      clearInterval(t)
    }
  }, [])
  return d
}
