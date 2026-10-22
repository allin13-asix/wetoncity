'use client'

// Keadaan pemain yang dipakai bersama oleh peta (HUD dan aksi bangunan) dan Beranda: memuat, menjalankan aksi
// dengan kunci idempotensi, menyelaraskan jam dengan server, dan menghitung Tenaga serta Kesehatan yang berjalan.
import { useCallback, useEffect, useRef, useState } from 'react'
import { pulihkanTenaga } from '@/server/aturan'
import { laparKini } from '@/server/sistem-aturan'
import type { Keadaan } from '@/server/tipe'
import { kunciBaru, panggil } from './api'

export type Lakukan = (nama: string, url: string, badan: Record<string, unknown>, sukses: string | ((baru: Keadaan) => string)) => Promise<boolean>
export type Pesan = { ok: boolean; teks: string } | null

/** masuk: null selama belum diketahui, false bila belum masuk. */
export function useKeadaan() {
  const [k, setK] = useState<Keadaan | null>(null)
  const [masuk, setMasuk] = useState<boolean | null>(null)
  const [pesan, setPesan] = useState<Pesan>(null)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [versi, setVersi] = useState(0) // naik tiap aksi berhasil, untuk memuat ulang data turunan
  const [, setTik] = useState(0)
  const selisih = useRef(0) // waktu server dikurangi waktu perangkat
  const memuat = useRef(false)
  const tertunda = useRef<Record<string, string>>({}) // kunci aksi yang belum pasti berhasil, dipakai ulang saat dicoba lagi

  const terapkan = useCallback((d: Keadaan) => {
    selisih.current = Date.parse(d.sekarang) - Date.now()
    setK(d)
    setMasuk(true)
  }, [])

  const muat = useCallback(async () => {
    if (memuat.current) return
    memuat.current = true
    const h = await panggil('/api/saya')
    memuat.current = false
    if (h.ok) terapkan(h.data)
    else if (h.status === 401) setMasuk(false)
    else setPesan({ ok: false, teks: h.galat.pesan })
  }, [terapkan])

  useEffect(() => {
    muat()
  }, [muat])

  // kembali ke tab atau aplikasi (umum di ponsel): muat ulang supaya pesan, permintaan teman, dan tagihan terbaru terlihat
  useEffect(() => {
    const segarkan = () => {
      if (document.visibilityState === 'visible') muat()
    }
    document.addEventListener('visibilitychange', segarkan)
    return () => document.removeEventListener('visibilitychange', segarkan)
  }, [muat])

  useEffect(() => {
    const t = setInterval(() => setTik((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // muat ulang saat tagihan jatuh tempo atau pesawat mendarat
  useEffect(() => {
    if (!k) return
    const kapan = [k.tagihan?.jatuhTempo, k.perjalanan?.pulang].filter((x): x is string => !!x).map((x) => Date.parse(x) - (Date.now() + selisih.current))
    if (!kapan.length) return
    const t = setTimeout(muat, Math.max(Math.min(...kapan), 0) + 1500)
    return () => clearTimeout(t)
  }, [k, muat])

  const lakukan: Lakukan = useCallback(
    async (nama, url, badan, sukses) => {
      setSibuk(nama)
      setPesan(null)
      const id = nama + JSON.stringify(badan)
      const kunci = (tertunda.current[id] ??= kunciBaru())
      const h = await panggil(url, { ...badan, kunci })
      if (h.ok || h.status !== 0) delete tertunda.current[id]
      setSibuk(null)
      if (!h.ok) {
        if (h.status === 401) setMasuk(false)
        setPesan({ ok: false, teks: h.galat.pesan })
        return false
      }
      terapkan(h.data)
      setVersi((v) => v + 1)
      setPesan({ ok: !(h.data.judi && !h.data.judi.menang), teks: typeof sukses === 'function' ? sukses(h.data) : sukses })
      return true
    },
    [terapkan],
  )

  const kini = new Date(Date.now() + selisih.current)
  const pulih = k ? pulihkanTenaga({ tenaga: k.tenaga.nilai, pada: new Date(k.tenaga.pada) }, k.tenaga.maks, k.tenaga.selangMs, kini) : null
  const tenaga = pulih?.tenaga ?? 0
  const penuhDalam = k && pulih && tenaga < k.tenaga.maks ? pulih.pada.getTime() + (k.tenaga.maks - tenaga) * k.tenaga.selangMs - kini.getTime() : 0
  const kesehatan = k
    ? pulihkanTenaga({ tenaga: k.kesehatan.nilai, pada: new Date(k.kesehatan.pada) }, k.kesehatan.maks, k.kesehatan.selangMs, kini).tenaga
    : 0
  // Wali Kota tidak pernah lapar
  const lapar = k ? (k.peran === 'walikota' ? k.lapar.maks : laparKini(k.lapar.nilai, new Date(k.lapar.pada), kini)) : 0
  const bebas = sibuk === null && !k?.perjalanan

  return { k, masuk, pesan, setPesan, sibuk, bebas, versi, lakukan, muat, kini, tenaga, penuhDalam, kesehatan, lapar }
}

export type KeadaanHook = ReturnType<typeof useKeadaan>
