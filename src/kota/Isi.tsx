'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, type Group, type MeshBasicMaterial } from 'three'
import { geometriModel } from '@/aset'
import { jenisById, kategori } from '@/data/bangunan'
import { distrik, lahanKosong, penempatan, pusatDistrik } from '@/data/tataletak'
import type { Penempatan } from '@/data/tipe'
import { bahanPadat, malam, pasangNyala } from './bahan'
import { useDataPeta, type RumahPeta } from '@/ui/namaBangunan'
import { Label, grupTabrakan } from './Label'

const rad = (rot: number) => (rot * Math.PI) / 180
const KUNING = '#ffc933'

export function tinggiPenempatan(p: Penempatan): number {
  const j = jenisById.get(p.jenis)!
  return geometriModel(j.model, j.ukuran, j.varian, p.v).boundingBox?.max.y ?? 3
}

function Bangunan({ p, terpilih, onPilih }: { p: Penempatan; terpilih: boolean; onPilih: (id: string) => void }) {
  const j = jenisById.get(p.jenis)!
  const geo = useMemo(() => geometriModel(j.model, j.ukuran, j.varian, p.v), [j, p.v])
  const bahan = useMemo(() => {
    const m = pasangNyala(bahanPadat.clone())
    if (j.terkunci) {
      m.transparent = true
      m.opacity = 0.32
      m.depthWrite = false
    }
    return m
  }, [j])
  const grup = useRef<Group>(null)
  const [sorot, setSorot] = useState(false)
  const goyang = j.model === 'kapal' || j.model === 'perahu'
  const dasar = j.model === 'kapal' ? -0.1 : j.model === 'perahu' ? -0.12 : 0

  useEffect(() => {
    bahan.emissive.set(terpilih || sorot ? KUNING : '#000000')
    bahan.emissiveIntensity = terpilih ? 0.22 : sorot ? 0.14 : 0
  }, [terpilih, sorot, bahan])

  useFrame(({ clock }) => {
    if (!goyang || !grup.current) return
    const t = clock.elapsedTime + p.v * 1.7 + p.x
    grup.current.position.y = dasar + Math.sin(t * 0.9) * 0.05
    grup.current.rotation.z = Math.sin(t * 0.7) * 0.015
  })

  return (
    <group ref={grup} position={[p.x, dasar, p.z]} rotation-y={rad(p.rot)}>
      <mesh
        geometry={geo}
        material={bahan}
        onClick={(e) => {
          if (e.delta > 6) return
          e.stopPropagation()
          onPilih(p.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setSorot(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setSorot(false)
          document.body.style.cursor = ''
        }}
      />
      {!j.diLaut && (
        <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[j.ukuran[0] + 1.2, j.ukuran[1] + 1.2]} />
          <meshBasicMaterial map={teksturBayang()} transparent depthWrite={false} opacity={0.32} color="#1d2a33" />
        </mesh>
      )}
      {papanNama(j.model) &&<PapanNama nama={j.nama} warna={kategori[j.kategori].warna} w={j.ukuran[0]} d={j.ukuran[1]} />}
      {j.model === 'mercusuar' && <SinarMercusuar tinggi={tinggiPenempatan(p)} />}
    </group>
  )
}

/** Model tanpa papan nama: rumah warga, lahan, dan benda di laut atau terbuka. */
const TANPA_PAPAN = new Set(['rumah', 'rumah-nelayan', 'kavling', 'dermaga', 'kontainer', 'kapal', 'perahu', 'mercusuar', 'alun', 'gang-kenari', 'papan-proyek'])
const papanNama = (model: string) => !TANPA_PAPAN.has(model)

const teksturPapan = new Map<string, CanvasTexture>()

let _bayang: CanvasTexture | undefined
/** Bayangan lembut persegi di kaki bangunan, satu tekstur untuk semua. */
function teksturBayang(): CanvasTexture {
  if (_bayang) return _bayang
  const n = 64
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')!
  const img = g.createImageData(n, n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // pudar ke tepi pada kedua sumbu
      const t = Math.min(x, n - 1 - x, y, n - 1 - y) / (n * 0.18)
      const a = Math.min(1, t) ** 1.6
      img.data.set([255, 255, 255, Math.round(a * 255)], (y * n + x) * 4)
    }
  }
  g.putImageData(img, 0, 0)
  _bayang = new CanvasTexture(c)
  return _bayang
}

/** Tekstur papan nama ala plang instansi: biru pelabuhan, garis warna kategori di atas, nama putih. */
function tekstur(nama: string, warna: string, rasio: number): CanvasTexture {
  const kunci = `${nama}|${warna}|${rasio.toFixed(2)}`
  const ada = teksturPapan.get(kunci)
  if (ada) return ada
  const h = 96
  const w = Math.round(h * rasio)
  const c = document.createElement('canvas')
  c.width = w * 2
  c.height = h * 2
  const g = c.getContext('2d')!
  g.scale(2, 2)
  g.fillStyle = '#0c3446'
  g.fillRect(0, 0, w, h)
  g.fillStyle = warna
  g.fillRect(0, 0, w, 12)
  g.fillStyle = '#ffc933'
  g.fillRect(0, h - 6, w, 6)
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let ukuran = 40
  // next/font memberi nama keluarga acak; ambil dari variabel CSS yang dipasang di <html>
  const keluarga = getComputedStyle(document.documentElement).getPropertyValue('--font-tampil').trim() || 'system-ui'
  const font = (n: number) => `800 ${n}px ${keluarga}, 'Arial Narrow', sans-serif`
  g.font = font(ukuran)
  while (ukuran > 16 && g.measureText(nama).width > w - 20) g.font = font((ukuran -= 2))
  g.fillText(nama, w / 2, h / 2 + 4, w - 16)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  teksturPapan.set(kunci, t)
  return t
}

/** Plang nama berdiri di sudut depan kiri petak. Bahan dasar tanpa pencahayaan, jadi tetap terbaca dan tampak menyala di malam hari. */
function PapanNama({ nama, warna, w, d }: { nama: string; warna: string; w: number; d: number }) {
  const lebar = Math.min(Math.max(1.5, w * 0.55), 3.4)
  const tinggi = 0.58
  const map = useMemo(() => tekstur(nama, warna, lebar / tinggi), [nama, warna, lebar])
  const x = -w / 2 + lebar / 2 + 0.2
  const z = d / 2 - 0.14
  const y = 0.72 + tinggi / 2
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (lebar - 0.2)) / 2, y / 2, -0.03]}>
          <boxGeometry args={[0.07, y, 0.07]} />
          <meshLambertMaterial color="#4a5560" />
        </mesh>
      ))}
      <mesh position={[0, y, -0.03]}>
        <boxGeometry args={[lebar + 0.08, tinggi + 0.08, 0.05]} />
        <meshLambertMaterial color="#26323b" />
      </mesh>
      <mesh position={[0, y, 0.001]}>
        <planeGeometry args={[lebar, tinggi]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Sorot lampu mercusuar yang berputar, hanya terlihat sore dan malam. */
function SinarMercusuar({ tinggi }: { tinggi: number }) {
  const putar = useRef<Group>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  useFrame((_, dt) => {
    if (putar.current) putar.current.rotation.y += dt * 0.9
    if (mat.current) {
      mat.current.opacity = malam.value * 0.28
      if (putar.current) putar.current.visible = malam.value > 0.05
    }
  })
  return (
    <group ref={putar} position={[0, tinggi - 0.7, 0]}>
      <mesh position={[4.5, 0, 0]} rotation-z={Math.PI / 2}>
        <coneGeometry args={[1.4, 9, 16, 1, true]} />
        <meshBasicMaterial ref={mat} color="#fff1b8" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  )
}

/** Bingkai di tanah dan pin melayang di atas bangunan terpilih. */
function Penanda({ p }: { p: Penempatan }) {
  const j = jenisById.get(p.jenis)!
  const [w, d] = j.ukuran
  const tinggi = tinggiPenempatan(p)
  const pin = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (pin.current) pin.current.position.y = tinggi + 1.1 + Math.sin(clock.elapsedTime * 3) * 0.18
  })
  const tebal = 0.16
  return (
    <group position={[p.x, 0, p.z]} rotation-y={rad(p.rot)}>
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} position={[0, 0.12, (s * (d + 0.5)) / 2]}>
          <boxGeometry args={[w + 0.5 + tebal, 0.06, tebal]} />
          <meshBasicMaterial color={KUNING} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} position={[(s * (w + 0.5)) / 2, 0.12, 0]}>
          <boxGeometry args={[tebal, 0.06, d + 0.5 + tebal]} />
          <meshBasicMaterial color={KUNING} />
        </mesh>
      ))}
      <group ref={pin} position={[0, tinggi + 1.1, 0]}>
        <mesh rotation-x={Math.PI}>
          <coneGeometry args={[0.45, 1.0, 10]} />
          <meshBasicMaterial color={KUNING} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.42, 14, 10]} />
          <meshBasicMaterial color={KUNING} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Bangunan warga di lahan milik mereka, diambil dari /api/peta/rumah. Selama konstruksi, tinggi bangunan mengikuti bagian yang
 * terlihat pada tahapnya (0-10%, 25-50%, 80-90%, lalu utuh saat selesai).
 */
function RumahWarga({ onPilih, rumah }: { onPilih: (id: string) => void; rumah: RumahPeta[] }) {
  return (
    <>
      {rumah.map((r) => {
        const l = lahanKosong.find((x) => x.id === r.lahan)
        if (!l || !jenisById.has(r.jenis)) return null
        const p: Penempatan = { id: 'rumah-' + r.lahan, jenis: r.jenis, x: l.x, z: l.z, rot: l.rot, distrik: l.distrik, v: 0 }
        const jadi = r.tahap >= 4
        return (
          <group key={r.lahan}>
            <group scale={[1, Math.max(0.05, r.tampil), 1]}>
              <Bangunan p={p} terpilih={false} onPilih={() => onPilih(r.lahan)} />
            </group>
            <Label
              teks={jadi ? (r.jenis === 'rumah-menengah' ? 'Rumah ' : '') + r.nama : `Dibangun ${r.nama}: ${r.tahapNama} ${Math.round(r.progres * 100)}%`}
              posisi={[l.x, tinggiPenempatan(p) * Math.max(0.05, r.tampil) + 0.4, l.z]}
              px={12}
              zoomMin={19}
            />
          </group>
        )
      })}
    </>
  )
}

/** Lahan kosong yang bisa diklik: sorot saat disentuh, dan pilih untuk melihat detailnya (milik kota, pemain, atau dibeli di Balai Kota). */
function LahanKlik({ terpilih, onPilih }: { terpilih: string | null; onPilih: (id: string) => void }) {
  const [sorot, setSorot] = useState<string | null>(null)
  return (
    <>
      {lahanKosong.map((l) => (
        <group key={l.id} position={[l.x, 0.07, l.z]} rotation-y={rad(l.rot)}>
          <mesh
            rotation-x={-Math.PI / 2}
            onClick={(e) => {
              if (e.delta > 6) return
              e.stopPropagation()
              onPilih(l.id)
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setSorot(l.id)
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              setSorot((s) => (s === l.id ? null : s))
              document.body.style.cursor = ''
            }}
          >
            <planeGeometry args={[l.w, l.d]} />
            <meshBasicMaterial color={KUNING} transparent opacity={terpilih === l.id ? 0.38 : sorot === l.id ? 0.24 : 0.01} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// label distrik bisa berdekatan (pusatnya rata-rata posisi bangunan), jadi yang menumpuk disembunyikan sampai zoom memisahkannya
const tabrakanDistrik = grupTabrakan()

export function Isi({ terpilih, onPilih }: { terpilih: string | null; onPilih: (id: string) => void }) {
  // rumah warga dan nama bangunan buatan pemiliknya
  const peta = useDataPeta()
  const namaDi = (p: Penempatan) => peta.nama[p.id] ?? jenisById.get(p.jenis)!.nama
  const dipilih = terpilih ? penempatan.find((p) => p.id === terpilih) : undefined
  const lahanDipilih = terpilih ? lahanKosong.find((l) => l.id === terpilih) : undefined
  return (
    <>
      <LahanKlik terpilih={terpilih} onPilih={onPilih} />
      {lahanDipilih && <Label teks={lahanDipilih.id} posisi={[lahanDipilih.x, 3, lahanDipilih.z]} px={13} latar="#0c3446" huruf="#ffffff" />}
      <RumahWarga onPilih={onPilih} rumah={peta.rumah} />
      {penempatan.map((p) => (
        <Bangunan key={p.id} p={p} terpilih={p.id === terpilih} onPilih={onPilih} />
      ))}
      {penempatan
        .filter((p) => p.id !== terpilih && jenisById.get(p.jenis)!.utama && !jenisById.get(p.jenis)!.diLaut)
        .map((p) => (
          <Label key={`l-${p.id}`} teks={namaDi(p)} posisi={[p.x, tinggiPenempatan(p) + 0.4, p.z]} px={12} zoomMin={19} />
        ))}
      {distrik.map((d) => {
        const c = pusatDistrik.get(d.id)
        if (!c) return null
        return <Label key={`d-${d.id}`} teks={d.singkat} posisi={[c.x, 3.5, c.z]} px={13} latar={KUNING} huruf="#1b1500" zoomMaks={17} tabrakan={tabrakanDistrik} />
      })}
      {dipilih && <Label teks={namaDi(dipilih)} posisi={[dipilih.x, tinggiPenempatan(dipilih) + 3.3, dipilih.z]} px={13} latar="#0c3446" huruf="#ffffff" />}
      {dipilih && <Penanda p={dipilih} />}
    </>
  )
}
