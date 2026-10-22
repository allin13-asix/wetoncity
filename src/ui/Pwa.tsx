'use client'

// Aplikasi web terpasang: mendaftarkan service worker di semua halaman, dan tombol "Pasang" ke layar utama ponsel.
// Android dan Chrome memakai dialog pasang bawaan peramban (beforeinstallprompt); Safari di iPhone tidak punya dialog,
// jadi ditampilkan petunjuk Bagikan lalu Tambah ke Layar Utama.
import { useEffect, useState, useSyncExternalStore } from 'react'

type PromptPasang = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// Peristiwa beforeinstallprompt bisa datang sebelum komponen tombol dipasang, jadi disimpan di tingkat modul.
let tertunda: PromptPasang | null = null
const pendengar = new Set<() => void>()
const kabari = () => pendengar.forEach((f) => f())
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    tertunda = e as PromptPasang
    kabari()
  })
  window.addEventListener('appinstalled', () => {
    tertunda = null
    kabari()
  })
}
const langgan = (f: () => void) => {
  pendengar.add(f)
  return () => pendengar.delete(f)
}

/** Dipasang sekali di layout: service worker dibutuhkan untuk halaman offline dan pengingat. */
export function DaftarPekerja() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
  }, [])
  return null
}

type Jenis = 'terpasang' | 'prompt' | 'ios' | null

function jenisPasang(): Jenis {
  const mandiri = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  if (mandiri) return 'terpasang'
  if (tertunda) return 'prompt'
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios ? 'ios' : null
}

/**
 * Tombol pasang aplikasi. Tidak tampil bila sudah dibuka dari layar utama, atau bila peramban tidak bisa memasang.
 * `ringkas`: hanya tombol (untuk menu peta); tanpa itu panel lengkap (Beranda).
 */
export function TombolPasang({ ringkas = false }: { ringkas?: boolean }) {
  const jenis = useSyncExternalStore(langgan, jenisPasang, () => null)
  const [petunjuk, setPetunjuk] = useState(false)
  if (!jenis || jenis === 'terpasang') return null

  async function pasang() {
    if (jenis === 'ios' || !tertunda) return setPetunjuk((x) => !x)
    const e = tertunda
    await e.prompt()
    if ((await e.userChoice).outcome === 'accepted') tertunda = null
    kabari()
  }

  const tombol = (
    <button type="button" className={ringkas ? 'tombol-pasang' : 'tombol-utama'} onClick={pasang} aria-expanded={jenis === 'ios' ? petunjuk : undefined}>
      Pasang di layar utama
    </button>
  )
  const langkahIos = petunjuk && (
    // di menu peta yang digulir, petunjuk bisa muncul di luar pandangan
    <ol className="petunjuk-pasang" ref={(el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}>
      <li>Buka halaman ini di Safari.</li>
      <li>
        Ketuk tombol <strong>Bagikan</strong> (kotak dengan panah ke atas) di bawah layar.
      </li>
      <li>
        Pilih <strong>Tambah ke Layar Utama</strong>, lalu <strong>Tambah</strong>.
      </li>
    </ol>
  )
  if (ringkas) {
    return (
      <>
        {tombol}
        {langkahIos}
      </>
    )
  }
  return (
    <section className="panel">
      <h2>Pasang Weton City</h2>
      <p>Simpan Weton City di layar utama ponselmu: sekali ketuk langsung ke kota, layar penuh tanpa bilah alamat, dan pengingat bisa sampai ke ponselmu.</p>
      {tombol}
      {langkahIos}
    </section>
  )
}
