'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending, CanvasTexture, Object3D, SRGBColorSpace, type Group, type InstancedMesh, type MeshBasicMaterial, type PointsMaterial,
} from 'three'
import { geometriModel } from '@/aset'
import { hiasan } from '@/data/bangunan'
import { rute, sebaran, type TitikHiasan } from '@/data/tataletak'
import { bahanPadat } from './bahan'
import { cahaya, type Waktu } from './waktu'

const ukuranHiasan = (id: string) => hiasan.find((h) => h.id === id)!

function Sebar({ id, titik, y = 0 }: { id: string; titik: TitikHiasan[]; y?: number }) {
  const h = ukuranHiasan(id)
  const geo = useMemo(() => geometriModel(h.model, h.ukuran), [h])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    titik.forEach((t, i) => {
      o.position.set(t.x, y, t.z)
      o.rotation.set(0, t.r, 0)
      o.scale.setScalar(t.s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [titik, y])
  return <instancedMesh ref={ref} args={[geo, bahanPadat, titik.length]} frustumCulled={false} />
}

/** Bercak cahaya bulat yang memudar ke tepi, dipakai untuk pendar lampu dan genangan cahaya di tanah. */
function teksturPendar(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,244,205,1)')
  g.addColorStop(0.3, 'rgba(255,214,130,0.6)')
  g.addColorStop(1, 'rgba(255,190,90,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Letak kepala lampu pada model lampu-jalan (lengan menunjuk sumbu x lokal). */
const KEPALA = { x: 0.45, y: 2.12 }

/**
 * Cahaya lampu jalan tanpa lampu sungguhan (puluhan PointLight terlalu berat untuk ponsel):
 * bohlam menyala, pendar yang selalu menghadap kamera, dan genangan cahaya di aspal.
 * Mulai menyala saat sore, paling terang saat malam, berpindah halus seperti cahaya lain.
 */
function CahayaLampu({ waktu, titik }: { waktu: Waktu; titik: TitikHiasan[] }) {
  const { camera, gl } = useThree()
  const tekstur = useMemo(teksturPendar, [])
  const kuat = useRef(cahaya[waktu].lampu)
  const grup = useRef<Group>(null)
  const bohlam = useRef<InstancedMesh>(null)
  const kolam = useRef<InstancedMesh>(null)
  const matBohlam = useRef<MeshBasicMaterial>(null)
  const matKolam = useRef<MeshBasicMaterial>(null)
  const matPendar = useRef<PointsMaterial>(null)
  const kepala = useMemo(
    () => titik.map((t) => [t.x + Math.cos(t.r) * KEPALA.x * t.s, KEPALA.y * t.s, t.z - Math.sin(t.r) * KEPALA.x * t.s] as const),
    [titik],
  )
  const posisi = useMemo(() => new Float32Array(kepala.flat()), [kepala])

  useLayoutEffect(() => {
    const o = new Object3D()
    kepala.forEach(([x, y, z], i) => {
      o.position.set(x, y, z)
      o.rotation.set(0, 0, 0)
      o.updateMatrix()
      bohlam.current?.setMatrixAt(i, o.matrix)
      o.position.set(x, 0.095, z)
      o.rotation.set(-Math.PI / 2, 0, 0)
      o.updateMatrix()
      kolam.current?.setMatrixAt(i, o.matrix)
    })
    if (bohlam.current) bohlam.current.instanceMatrix.needsUpdate = true
    if (kolam.current) kolam.current.instanceMatrix.needsUpdate = true
  }, [kepala])

  useFrame((_, dt) => {
    kuat.current += (cahaya[waktu].lampu - kuat.current) * (1 - Math.exp(-dt * 3))
    const k = kuat.current
    if (grup.current) grup.current.visible = k > 0.01
    if (matBohlam.current) matBohlam.current.opacity = Math.min(1, k * 1.5)
    if (matKolam.current) matKolam.current.opacity = 0.55 * k
    if (matPendar.current) {
      matPendar.current.opacity = 0.85 * k
      // kamera ortografik: 1 petak = zoom piksel, jadi ukuran titik dihitung ulang agar pendar ikut membesar saat diperbesar
      matPendar.current.size = 2.4 * camera.zoom * gl.getPixelRatio()
    }
  })

  return (
    <group ref={grup}>
      <instancedMesh ref={bohlam} args={[undefined, undefined, kepala.length]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshBasicMaterial ref={matBohlam} color="#fff2bf" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={kolam} args={[undefined, undefined, kepala.length]} frustumCulled={false}>
        <circleGeometry args={[1.8, 24]} />
        <meshBasicMaterial ref={matKolam} map={tekstur} color="#ffd88a" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posisi, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={matPendar}
          map={tekstur}
          color="#ffe3a3"
          size={24}
          sizeAttenuation={false}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

type Titik = [number, number]

function Kendaraan({ id, jalur, kecepatan, awal, lajur = 0.7 }: { id: string; jalur: Titik[]; kecepatan: number; awal: number; lajur?: number }) {
  const h = ukuranHiasan(id)
  const geo = useMemo(() => geometriModel(h.model, h.ukuran), [h])
  const grup = useRef<Group>(null)
  const st = useRef({ s: awal, arah: 0 })
  const ruas = useMemo(() => {
    let total = 0
    const r = jalur.map((a, i) => {
      const b = jalur[(i + 1) % jalur.length]
      const p = Math.hypot(b[0] - a[0], b[1] - a[1])
      const hasil = { a, b, p, dari: total }
      total += p
      return hasil
    })
    return { r, total }
  }, [jalur])

  useFrame((_, dt) => {
    const g = grup.current
    if (!g) return
    const s = (st.current.s = (st.current.s + kecepatan * dt) % ruas.total)
    const seg = ruas.r.find((x) => s >= x.dari && s < x.dari + x.p) ?? ruas.r[0]
    const t = (s - seg.dari) / seg.p
    const dx = (seg.b[0] - seg.a[0]) / seg.p
    const dz = (seg.b[1] - seg.a[1]) / seg.p
    g.position.set(seg.a[0] + (seg.b[0] - seg.a[0]) * t + dz * lajur, 0.07, seg.a[1] + (seg.b[1] - seg.a[1]) * t - dx * lajur)
    const tujuan = Math.atan2(dx, dz)
    const d = Math.atan2(Math.sin(tujuan - st.current.arah), Math.cos(tujuan - st.current.arah))
    st.current.arah += d * (1 - Math.exp(-dt * 7))
    g.rotation.y = st.current.arah
  })

  return (
    <group ref={grup}>
      <mesh geometry={geo} material={bahanPadat} />
    </group>
  )
}

export function Hiasan({ waktu }: { waktu: Waktu }) {
  return (
    <>
      <Sebar id="pohon-rindang" titik={sebaran.rindang} />
      <Sebar id="pohon-kelapa" titik={sebaran.kelapa} />
      <Sebar id="lampu-jalan" titik={sebaran.lampu} />
      <CahayaLampu waktu={waktu} titik={sebaran.lampu} />
      <Sebar id="semak" titik={sebaran.semak} />
      {rute.kota.length > 1 && (
        <>
          <Kendaraan id="angkot" jalur={rute.kota} kecepatan={2.6} awal={4} />
          <Kendaraan id="angkot" jalur={rute.kota} kecepatan={2.4} awal={70} />
          <Kendaraan id="mobil" jalur={rute.kota} kecepatan={3.1} awal={40} />
        </>
      )}
      {rute.pantai.length > 1 && (
        <>
          <Kendaraan id="angkot" jalur={rute.pantai} kecepatan={2.5} awal={10} />
          <Kendaraan id="mobil" jalur={rute.pantai} kecepatan={3} awal={150} />
        </>
      )}
    </>
  )
}
