'use client'

// Kanal waktu-nyata opsional lewat Supabase Realtime (broadcast + presence), hanya bila NEXT_PUBLIC_SUPABASE_URL dan
// NEXT_PUBLIC_SUPABASE_ANON_KEY diisi. Kanal hanya membawa isyarat (posisi, "ada pesan baru"); isi pesan tetap dibaca dari
// API yang memeriksa hak dan batas laju, jadi isyarat palsu paling banyak memicu satu pembacaan ekstra.
import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel, RealtimeClient } from '@supabase/realtime-js'

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const KUNCI_SB = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const realtimeTersedia = !!(URL_SB && KUNCI_SB)

let klien: Promise<RealtimeClient> | null = null
function ambilKlien() {
  klien ??= import('@supabase/realtime-js').then(
    ({ RealtimeClient }) => new RealtimeClient(`${URL_SB!.replace(/^http/, 'ws').replace(/\/$/, '')}/realtime/v1`, { params: { apikey: KUNCI_SB!, eventsPerSecond: 10 } }),
  )
  return klien
}

export type Isyarat = { gerak?: (p: { id: string; x: number; y: number }) => void; pesan?: () => void; hadir?: () => void }

/** Bergabung ke kanal satu ruang. `kirim` mengirim isyarat ke orang lain di ruang itu; `aktif` true bila tersambung. */
export function useKanal(ruang: string | null, saya: string | null, isyarat: Isyarat) {
  const [aktif, setAktif] = useState(false)
  const kanal = useRef<RealtimeChannel | null>(null)
  const h = useRef(isyarat)
  h.current = isyarat
  useEffect(() => {
    if (!realtimeTersedia || !ruang || !saya) return
    let batal = false
    let ch: RealtimeChannel | null = null
    ambilKlien().then((k) => {
      if (batal) return
      ch = k.channel(`weton:${ruang}`, { config: { broadcast: { self: false }, presence: { key: saya } } })
      ch.on('broadcast', { event: 'gerak' }, ({ payload }) => h.current.gerak?.(payload as { id: string; x: number; y: number }))
        .on('broadcast', { event: 'pesan' }, () => h.current.pesan?.())
        .on('presence', { event: 'sync' }, () => h.current.hadir?.())
        .subscribe((status) => {
          if (batal) return
          setAktif(status === 'SUBSCRIBED')
          if (status === 'SUBSCRIBED') ch?.track({ id: saya })
        })
      kanal.current = ch
    }).catch(() => setAktif(false))
    return () => {
      batal = true
      setAktif(false)
      kanal.current = null
      if (ch) ambilKlien().then((k) => k.removeChannel(ch!))
    }
  }, [ruang, saya])
  const kirim = (event: 'gerak' | 'pesan', payload: Record<string, unknown> = {}) => {
    kanal.current?.send({ type: 'broadcast', event, payload })
  }
  return { aktif, kirim }
}
