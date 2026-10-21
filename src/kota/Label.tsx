'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace, type OrthographicCamera, type Sprite } from 'three'

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

type Props = {
  teks: string
  posisi: [number, number, number]
  px?: number
  latar?: string
  huruf?: string
  /** tampil hanya bila zoom kamera berada di rentang ini */
  zoomMin?: number
  zoomMaks?: number
}

/** Label pil berukuran tetap di layar (kamera ortografik), tanpa elemen DOM. */
export function Label({ teks, posisi, px = 13, latar = 'rgba(255,255,255,0.95)', huruf = '#0c2530', zoomMin = 0, zoomMaks = Infinity }: Props) {
  const ref = useRef<Sprite>(null)
  const g = useMemo(() => gambar(teks, px, latar, huruf), [teks, px, latar, huruf])
  useEffect(() => () => g.tex.dispose(), [g])
  useFrame(({ camera }) => {
    const s = ref.current
    if (!s) return
    const zoom = (camera as OrthographicCamera).zoom || 1
    s.visible = zoom >= zoomMin && zoom <= zoomMaks
    s.scale.set(g.w / zoom, g.h / zoom, 1)
  })
  return (
    <sprite ref={ref} position={posisi} center={[0.5, 0]} renderOrder={20}>
      <spriteMaterial map={g.tex} transparent depthTest={false} depthWrite={false} />
    </sprite>
  )
}
