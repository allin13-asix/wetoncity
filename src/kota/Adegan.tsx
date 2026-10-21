'use client'

import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef, useState } from 'react'
import { Color, Vector3, type DirectionalLight, type HemisphereLight } from 'three'
import { Hiasan } from './Hiasan'
import { Isi } from './Isi'
import { Kamera, type Fokus } from './Kamera'
import { malam } from './bahan'
import { Tanah } from './Tanah'
import { cahaya, type Waktu } from './waktu'

/** Cahaya dan warna langit berpindah halus mengikuti waktu. */
function Cahaya({ waktu }: { waktu: Waktu }) {
  const hemi = useRef<HemisphereLight>(null)
  const matahari = useRef<DirectionalLight>(null)
  const warna = useMemo(() => new Color(), [])
  const arah = useMemo(() => new Vector3(), [])
  const awal = cahaya[waktu]

  useFrame(({ scene }, dt) => {
    const c = cahaya[waktu]
    const k = 1 - Math.exp(-dt * 3)
    if (hemi.current) {
      hemi.current.color.lerp(warna.set(c.hemiAtas), k)
      hemi.current.groundColor.lerp(warna.set(c.hemiBawah), k)
      hemi.current.intensity += (c.hemi - hemi.current.intensity) * k
    }
    if (matahari.current) {
      matahari.current.color.lerp(warna.set(c.matahari), k)
      matahari.current.intensity += (c.intensitas - matahari.current.intensity) * k
      matahari.current.position.lerp(arah.set(...c.posisi), k)
    }
    if (scene.background instanceof Color) scene.background.lerp(warna.set(c.langit), k)
    malam.value += (c.lampu - malam.value) * k
  })

  return (
    <>
      <color attach="background" args={[awal.langit]} />
      <hemisphereLight ref={hemi} args={[awal.hemiAtas, awal.hemiBawah, awal.hemi]} />
      <directionalLight ref={matahari} position={[...awal.posisi]} intensity={awal.intensitas} color={awal.matahari} />
    </>
  )
}

type Props = {
  terpilih: string | null
  onPilih: (id: string | null) => void
  waktu: Waktu
  fokus: Fokus | null
  putar: number
}

const DPR_MAKS = 1.75

/**
 * memo: HUD di atasnya berdetak tiap detik (Tenaga berjalan). Tanpa memo seluruh isi kota ikut direkonsiliasi tiap detik,
 * yang terasa sebagai patah-patah di ponsel. Resolusi turun sendiri bila FPS perangkat tidak sanggup, lalu naik lagi bila lega.
 */
export default memo(function Adegan({ terpilih, onPilih, waktu, fokus, putar }: Props) {
  const [dpr, setDpr] = useState(() => Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, DPR_MAKS))
  return (
    <Canvas orthographic dpr={dpr} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerMissed={() => onPilih(null)}>
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(1, Math.round((d - 0.25) * 100) / 100))}
        onIncline={() => setDpr((d) => Math.min(DPR_MAKS, window.devicePixelRatio || 1, Math.round((d + 0.25) * 100) / 100))}
        onFallback={() => setDpr(1)}
      />
      <Cahaya waktu={waktu} />
      <Kamera fokus={fokus} putar={putar} />
      <Tanah waktu={waktu} />
      <Isi terpilih={terpilih} onPilih={onPilih} />
      <Hiasan waktu={waktu} />
    </Canvas>
  )
})
