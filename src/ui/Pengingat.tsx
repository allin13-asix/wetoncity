'use client'

// Tombol mengaktifkan pengingat web push di perangkat ini. Pengingat dikirim server paling banyak sekali sehari.
import { useEffect, useState } from 'react'
import { panggil } from './api'

type Status = 'memuat' | 'tidak-didukung' | 'belum-siap' | 'diblokir' | 'mati' | 'aktif'

function keUint8(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const biner = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const hasil = new Uint8Array(new ArrayBuffer(biner.length))
  for (let i = 0; i < biner.length; i++) hasil[i] = biner.charCodeAt(i)
  return hasil
}

export default function Pengingat() {
  const [status, setStatus] = useState<Status>('memuat')
  const [publik, setPublik] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setStatus('tidak-didukung')
    ;(async () => {
      const h = await panggil<{ publik: string | null }>('/api/push')
      if (!h.ok || !h.data.publik) return setStatus('belum-siap')
      setPublik(h.data.publik)
      if (Notification.permission === 'denied') return setStatus('diblokir')
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      setStatus((await reg?.pushManager.getSubscription()) ? 'aktif' : 'mati')
    })()
  }, [])

  async function aktifkan() {
    setPesan(null)
    if ((await Notification.requestPermission()) !== 'granted') return setStatus('diblokir')
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keUint8(publik!) })
    const h = await panggil('/api/push', { langganan: sub.toJSON() })
    if (!h.ok) {
      await sub.unsubscribe()
      return setPesan(h.galat.pesan)
    }
    setStatus('aktif')
  }

  async function matikan() {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await panggil('/api/push', { hapus: sub.endpoint })
      await sub.unsubscribe()
    }
    setStatus('mati')
  }

  if (status === 'memuat' || status === 'belum-siap') return null
  return (
    <section className="panel">
      <h2>Pengingat</h2>
      {status === 'tidak-didukung' && <p className="catatan">Peramban ini belum mendukung pengingat. Di iPhone, tambahkan Weton City ke Layar Utama dulu.</p>}
      {status === 'diblokir' && <p className="catatan">Notifikasi diblokir. Izinkan notifikasi untuk situs ini di pengaturan peramban.</p>}
      {status === 'mati' && (
        <>
          <p>Dapat kabar saat Tenaga penuh, hasil usaha menumpuk, tagihan hampir jatuh tempo, atau Koran terbit. Paling banyak sekali sehari, pukul 07.00 sampai 21.00 WIB.</p>
          <button type="button" className="tombol-sekunder" onClick={aktifkan}>Aktifkan pengingat</button>
        </>
      )}
      {status === 'aktif' && (
        <>
          <p>Pengingat aktif di perangkat ini.</p>
          <button type="button" className="tombol-sekunder" onClick={matikan}>Matikan pengingat</button>
        </>
      )}
      {pesan && <p className="pesan galat">{pesan}</p>}
    </section>
  )
}
