'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace, Vector3, type OrthographicCamera, type Sprite } from 'three'

function fontIsi(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-isi').trim()
  return v ? `${v}, system-ui, sans-serif` : 'system-ui, sans-serif'
}

function gambar(teks: string, px: number, latar: string, huruf: string) {
  const dpr = 2
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  const font = `700 ${px}px ${fontIsi()}`
  ctx.font = font
  const padX = Math.round(px * 0.8)
  const h = Math.round(px * 1.9)
  const w = Math.ceil(ctx.measureText(teks).width) + padX * 2
  c.width = w * dpr
  c.height = h * dpr
  ctx.scale(dpr, dpr)
  ctx.fillStyle = latar
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = huruf
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.fillText(teks, padX, h / 2 + 0.5)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return { tex, w, h }
}

/**
 * Label satu grup tidak boleh saling menumpuk di layar: tiap bingkai, label yang dirender lebih dulu menang dan label
 * sesudahnya yang menabraknya disembunyikan. Buat satu objek per grup dengan grupTabrakan().
 */
export type GrupTabrakan = { bingkai: number; kotak: Array<[number, number, number, number]> }
export const grupTabrakan = (): GrupTabrakan => ({ bingkai: -1, kotak: [] })
const titik = new Vector3()

type Props = {
  teks: string
  posisi: [number, number, number]
  px?: number
  latar?: string
  huruf?: string
  /** tampil hanya bila zoom kamera berada di rentang ini */
  zoomMin?: number
  zoomMaks?: number
  tabrakan?: GrupTabrakan
}

/** Label pil berukuran tetap di layar (kamera ortografik), tanpa elemen DOM. */
export function Label({ teks, posisi, px = 13, latar = 'rgba(255,255,255,0.95)', huruf = '#0c2530', zoomMin = 0, zoomMaks = Infinity, tabrakan }: Props) {
  const ref = useRef<Sprite>(null)
  const g = useMemo(() => gambar(teks, px, latar, huruf), [teks, px, latar, huruf])
  useEffect(() => () => g.tex.dispose(), [g])
  useFrame(({ camera, clock, size }) => {
    const s = ref.current
    if (!s) return
    const zoom = (camera as OrthographicCamera).zoom || 1
    s.visible = zoom >= zoomMin && zoom <= zoomMaks
    s.scale.set(g.w / zoom, g.h / zoom, 1)
    if (!tabrakan || !s.visible) return
    if (tabrakan.bingkai !== clock.elapsedTime) {
      tabrakan.bingkai = clock.elapsedTime
      tabrakan.kotak.length = 0
    }
    // kamera ortografik: ukuran label di layar tetap g.w x g.h piksel, berpangkal di tengah bawah
    titik.set(...posisi).project(camera)
    const x = ((titik.x + 1) / 2) * size.width
    const y = ((1 - titik.y) / 2) * size.height
    const k: [number, number, number, number] = [x - g.w / 2, y - g.h, x + g.w / 2, y]
    s.visible = !tabrakan.kotak.some((b) => k[0] < b[2] && b[0] < k[2] && k[1] < b[3] && b[1] < k[3])
    if (s.visible) tabrakan.kotak.push(k)
  })
  return (
    <sprite ref={ref} position={posisi} center={[0.5, 0]} renderOrder={20}>
      <spriteMaterial map={g.tex} transparent depthTest={false} depthWrite={false} />
    </sprite>
  )
}
