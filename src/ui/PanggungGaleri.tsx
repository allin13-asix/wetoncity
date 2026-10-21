'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { geometriModel } from '@/aset'
import { bahanPadat } from '@/kota/bahan'
import { Label } from '@/kota/Label'

export type ItemGaleri = {
  id: string
  nama: string
  grup: string
  model: string
  varian: Record<string, number | string>
  ukuran: readonly [number, number]
  v: number
}

function Cahaya() {
  return (
    <>
      <hemisphereLight args={['#eaf6ff', '#9ab98a', 1.05]} />
      <directionalLight position={[8, 14, 6]} intensity={1.7} color="#fff3dc" />
      <directionalLight position={[-6, 5, -8]} intensity={0.35} color="#9fc4ff" />
    </>
  )
}

function Satu({ item, putar }: { item: ItemGaleri; putar: boolean }) {
  const g = useMemo(() => geometriModel(item.model, item.ukuran, item.varian, item.v), [item])
  const grup = useRef<Group>(null)
  const tinggi = g.boundingBox?.max.y ?? 3
  const r = Math.max(item.ukuran[0], item.ukuran[1], tinggi)

  useFrame((_, dt) => {
    if (putar && grup.current) grup.current.rotation.y += dt * 0.45
  })

  return (
    <>
      <PerspectiveCamera makeDefault fov={32} near={0.1} far={600} position={[r * 1.5, tinggi * 0.5 + r * 1.0, r * 1.9]} />
      <OrbitControls target={[0, tinggi / 2, 0]} enablePan={false} minDistance={r * 1.1} maxDistance={r * 6} maxPolarAngle={Math.PI / 2.05} />
      <group ref={grup}>
        <mesh geometry={g} material={bahanPadat} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[r * 0.95 + 1, 56]} />
        <meshLambertMaterial color="#cfd9d6" />
      </mesh>
    </>
  )
}

const KOLOM = 8
const JARAK = 15

function Lembar({ items }: { items: ItemGaleri[] }) {
  const baris = Math.ceil(items.length / KOLOM)
  const tengah: [number, number, number] = [((KOLOM - 1) * JARAK) / 2, 0, ((baris - 1) * JARAK) / 2]
  return (
    <>
      <OrthographicCamera makeDefault zoom={6} near={-400} far={600} position={[tengah[0] + 60, 55, tengah[2] + 70]} />
      <OrbitControls target={tengah} enableRotate={false} screenSpacePanning minZoom={2} maxZoom={20} />
      {items.map((it, i) => {
        const x = (i % KOLOM) * JARAK
        const z = Math.floor(i / KOLOM) * JARAK
        return (
          <group key={it.id} position={[x, 0, z]}>
            <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
              <planeGeometry args={[JARAK - 1.5, JARAK - 1.5]} />
              <meshLambertMaterial color="#cdd6d3" />
            </mesh>
            <mesh geometry={geometriModel(it.model, it.ukuran, it.varian, it.v)} material={bahanPadat} />
            <Label teks={it.nama} posisi={[0, 0.1, (JARAK - 1.5) / 2 - 0.4]} px={12} />
          </group>
        )
      })}
    </>
  )
}

export default function PanggungGaleri({ item, items, lembar, putar }: { item: ItemGaleri; items: ItemGaleri[]; lembar: boolean; putar: boolean }) {
  return (
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <Cahaya />
      {lembar ? <Lembar items={items} /> : <Satu item={item} putar={putar} />}
    </Canvas>
  )
}
