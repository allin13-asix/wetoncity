'use client'

import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { MOUSE, TOUCH } from 'three'
import { PETA, penempatanById } from '@/data/tataletak'

const ELEVASI = (32 * Math.PI) / 180
const SUDUT_AWAL = (28 * Math.PI) / 180
const JARAK = 220
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * Titik yang dituju kamera. kananPx dan naikPx menggeser bangunan ke kiri dan ke atas di layar
 * supaya tidak tertutup panel info. id berbeda memicu terbang ulang ke titik yang sama.
 */
export type Fokus = { x: number; z: number; zoom: number; id: number; kananPx: number; naikPx: number }

/** Zoom awal: seluruh peta muat di layar. */
export function zoomAwal(lebar: number, tinggi: number): number {
  return clamp(Math.min(lebar / (PETA.lebar * 1.44), tinggi / (PETA.dalam * 1.12)), 2, 20)
}

function geser(sudut: number) {
  return [Math.sin(sudut) * Math.cos(ELEVASI), Math.sin(ELEVASI), Math.cos(sudut) * Math.cos(ELEVASI)] as const
}

/**
 * Kamera ortografik miring: geser dan zoom lewat sentuhan, putar per seperempat putaran,
 * terbang ke bangunan terpilih, dan tidak pernah keluar dari peta.
 */
export function Kamera({ fokus, putar }: { fokus: Fokus | null; putar: number }) {
  const kendali = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size } = useThree()
  const tujuan = useRef<Fokus | null>(null)
  const sudut = useRef(SUDUT_AWAL)
  const z0 = useMemo(() => zoomAwal(size.width, size.height), [size.width, size.height])
  // Di ponsel, mulai lebih dekat (sekitar 46 petak selebar layar) di pelabuhan tempat pemain tiba, lalu biarkan pemain menggeser.
  const ponsel = size.width < 700
  const zMulai = ponsel ? Math.max(z0, size.width / 46) : z0
  const siap = useRef(false)

  useEffect(() => {
    tujuan.current = fokus
  }, [fokus])

  useFrame((_, dt) => {
    const c = kendali.current
    if (!c) return
    const t = c.target
    if (!siap.current) {
      siap.current = true
      const tiba = penempatanById.get('terminal-pelabuhan')
      t.set(ponsel && tiba ? tiba.x + 6 : PETA.lebar / 2, 0, ponsel && tiba ? tiba.z + 15 : PETA.dalam / 2 - 2)
      camera.zoom = zMulai
      camera.updateProjectionMatrix()
    }

    // putar kamera mengitari titik pandang
    const sasaran = SUDUT_AWAL + (putar * Math.PI) / 2
    const selisih = sasaran - sudut.current
    if (Math.abs(selisih) > 1e-3) sudut.current += selisih * (1 - Math.exp(-dt * 7))
    else sudut.current = sasaran

    // terbang ke fokus
    const g = tujuan.current
    if (g) {
      const a = sudut.current
      const kanan = g.kananPx / g.zoom
      const naik = g.naikPx / (g.zoom * Math.sin(ELEVASI))
      const gx = g.x + Math.cos(a) * kanan + Math.sin(a) * naik
      const gz = g.z - Math.sin(a) * kanan + Math.cos(a) * naik
      const k = 1 - Math.exp(-dt * 5)
      t.x += (gx - t.x) * k
      t.z += (gz - t.z) * k
      camera.zoom += (g.zoom - camera.zoom) * k
      camera.updateProjectionMatrix()
      if (Math.abs(gx - t.x) < 0.03 && Math.abs(gz - t.z) < 0.03 && Math.abs(g.zoom - camera.zoom) < 0.05) tujuan.current = null
    }

    const [sx, sy, sz] = geser(sudut.current)
    // geser sentuh bergerak di bidang layar: bawa titik pandang kembali ke tanah tanpa menggeser gambar
    if (Math.abs(t.y) > 1e-4) {
      const lam = t.y / sy
      t.x -= lam * sx
      t.z -= lam * sz
      t.y = 0
    }
    t.x = clamp(t.x, 2, PETA.lebar - 2)
    t.z = clamp(t.z, 4, PETA.dalam - 2)
    camera.position.set(t.x + sx * JARAK, sy * JARAK, t.z + sz * JARAK)
    camera.lookAt(t)
  })

  return (
    <>
      <OrthographicCamera makeDefault near={-600} far={900} zoom={zMulai} position={[PETA.lebar / 2 + 100, 120, PETA.dalam / 2 + 160]} />
      <OrbitControls
        ref={kendali}
        enableRotate={false}
        enableDamping
        dampingFactor={0.12}
        zoomToCursor
        minZoom={z0 * 0.9}
        maxZoom={70}
        touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }}
        mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        onStart={() => {
          tujuan.current = null
        }}
      />
    </>
  )
}
