'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, MeshLambertMaterial,
  RepeatWrapping, Shape, SRGBColorSpace, Vector3,
} from 'three'
import { P } from '@/aset/palet'
import { Rakit } from '@/aset/rakit'
import {
  KADE, PETA, garisPantai, jalan, jarakKeJalanLain, jembatan, lahanKosong, penempatan, sudutKotak, sungai, titikPada, zPantai, type Garis,
} from '@/data/tataletak'
import { bahanPadat } from './bahan'
import { cahaya, type Waktu } from './waktu'

const TEPI = 1.5
const KEDALAMAN = 1.6
const AIR = -0.22
const LAUT_UTARA = -14
const LAUT_SELATAN = 17

/** Garis pantai dihaluskan, memanjang sampai tepi diorama. */
const titikPantai: Array<[number, number]> = (() => {
  const g = garisPantai
  const pts = [new Vector3(-TEPI, 0, g[0][1]), ...g.map(([x, z]) => new Vector3(x, 0, z)), new Vector3(PETA.lebar + TEPI, 0, g[g.length - 1][1])]
  return new CatmullRomCurve3(pts, false, 'centripetal').getPoints(260).map((v) => [v.x, v.z] as [number, number])
})()

function geometri(pos: number[], idx: number[]): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  g.setAttribute('nyala', new Float32BufferAttribute(new Float32Array(pos.length / 3), 1))
  g.setIndex(idx)
  return g
}

/** Pita datar di antara dua garis yang mengikuti pantai. */
function jalur(titik: Array<[number, number]>, a: (z: number) => number, b: (z: number) => number, y: number): BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  titik.forEach(([x, z], i) => {
    pos.push(x, y, a(z), x, y, b(z))
    if (i < titik.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3)
  })
  return geometri(pos, idx)
}

type Sampel = { x: number; z: number; nx: number; nz: number; s: number }

/** Titik rapat (tiap `langkah` petak) sepanjang garis, lengkap dengan normal kiri. */
function rapat(g: Garis, dari = 0, ke = g.panjang, langkah = 0.5): Sampel[] {
  const n = Math.max(1, Math.round((ke - dari) / langkah))
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = dari + ((ke - dari) * i) / n
    const t = titikPada(g, s)
    return { x: t.x, z: t.z, nx: t.tz, nz: -t.tx, s }
  })
}

/** Pita sepanjang garis antara jarak samping a dan b. `boleh` memotong pita di tempat tertentu (misalnya persimpangan). */
function pita(sampel: Sampel[], a: number, b: number, y: number, boleh: (p: Sampel) => boolean = () => true): { pos: number[]; idx: number[] } {
  const pos: number[] = []
  const idx: number[] = []
  let prev = -1
  for (const p of sampel) {
    const ok = boleh(p)
    const v = pos.length / 3
    pos.push(p.x + p.nx * a, y, p.z + p.nz * a, p.x + p.nx * b, y, p.z + p.nz * b)
    if (ok && prev >= 0) idx.push(prev, v, prev + 1, v, v + 1, prev + 1)
    prev = ok ? v : -1
  }
  return { pos, idx }
}

/** Cakram datar. Dipasang di ujung jalan terbuka supaya pertemuan dengan jalan lain tidak menyisakan sudut atau celah. */
function cakram(x: number, z: number, r: number, y: number): { pos: number[]; idx: number[] } {
  const pos = [x, y, z]
  const idx: number[] = []
  const n = 20
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pos.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r)
    if (i > 0) idx.push(0, i + 1, i)
  }
  return { pos, idx }
}

/** Gabungkan beberapa pita menjadi satu geometri. */
function gabung(bagian: Array<{ pos: number[]; idx: number[] }>): BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  for (const b of bagian) {
    const o = pos.length / 3
    pos.push(...b.pos)
    for (const i of b.idx) idx.push(i + o)
  }
  return geometri(pos, idx)
}

function bangunJalan() {
  const aspal: Array<{ pos: number[]; idx: number[] }> = []
  const trotoar: Array<{ pos: number[]; idx: number[] }> = []
  const marka: Array<{ pos: number[]; idx: number[] }> = []
  for (const j of jalan) {
    const h = j.lebar / 2
    const s = rapat(j.garis)
    aspal.push(pita(s, -h, h, 0.05))
    // ujung bulat, kecuali yang menyentuh tepi peta
    if (!j.garis.tutup) {
      for (const t of [s[0], s[s.length - 1]]) {
        if (t.x > h && t.x < PETA.lebar - h && t.z < PETA.dalam - h) aspal.push(cakram(t.x, t.z, h, 0.05))
      }
    }
    const bebas = (p: Sampel, m: number) => jarakKeJalanLain(p.x + p.nx * m, p.z + p.nz * m, j.id) > 0.25
    trotoar.push(pita(s, h, h + 0.5, 0.075, (p) => bebas(p, h + 0.25)))
    trotoar.push(pita(s, -h - 0.5, -h, 0.075, (p) => bebas(p, -h - 0.25)))
    // marka putus-putus di tengah, berhenti sebelum persimpangan
    for (let t = 1; t < j.garis.panjang - 1; t += 1.8) {
      const potong = rapat(j.garis, t, Math.min(t + 0.9, j.garis.panjang), 0.3)
      if (potong.every((p) => jarakKeJalanLain(p.x, p.z, j.id) > 1)) marka.push(pita(potong, -0.05, 0.05, 0.062))
    }
  }
  // pagar jembatan
  const pagar = new Rakit()
  const dinding: Array<{ pos: number[]; idx: number[] }> = []
  for (const b of jembatan) {
    const j = jalan.find((x) => x.id === b.jalan)!
    const s = rapat(j.garis, b.dari - 0.6, b.ke + 0.6, 0.4)
    for (const sisi of [-1, 1]) {
      const o = sisi * (j.lebar / 2 + 0.55)
      const pos: number[] = []
      const idx: number[] = []
      s.forEach((p, i) => {
        pos.push(p.x + p.nx * o, 0.1, p.z + p.nz * o, p.x + p.nx * o, 0.5, p.z + p.nz * o)
        if (i > 0) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2, i * 2 - 1, i * 2 + 1)
      })
      dinding.push({ pos, idx })
      for (const p of [s[0], s[s.length - 1]]) pagar.kotak(p.x + p.nx * o, 0, p.z + p.nz * o, 0.32, 0.65, 0.32, P.putih)
    }
  }
  return { aspal: gabung(aspal), trotoar: gabung(trotoar), marka: gabung(marka), dinding: gabung(dinding), tiang: pagar.hasil() }
}

function bangunSungai() {
  const darat = (p: Sampel) => p.z > zPantai(p.x) - 0.4
  const s = rapat(sungai.garis, 0, sungai.garis.panjang, 0.5)
  const w = sungai.lebar / 2
  return { air: gabung([pita(s, -w, w, 0.03, darat)]), tebing: gabung([pita(s, -w - 0.8, w + 0.8, 0.018, darat)]) }
}

function acak(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Lahan kosong: tanah kering, patok di sudut, dan papan kecil di muka. */
function bangunLahan() {
  const pos: number[] = []
  const idx: number[] = []
  const r = new Rakit()
  for (const l of lahanKosong) {
    const c = sudutKotak(l)
    const o = pos.length / 3
    for (const [x, z] of c) pos.push(x, 0.02, z)
    idx.push(o, o + 2, o + 1, o, o + 3, o + 2)
    for (const [x, z] of c) r.silinder(x, 0, z, 0.07, 0.07, 0.45, P.kayu, 6)
    // papan di tengah sisi muka (sisi +z lokal)
    const mx = (c[2][0] + c[3][0]) / 2
    const mz = (c[2][1] + c[3][1]) / 2
    r.silinder(mx, 0, mz, 0.05, 0.05, 0.9, P.kayuTua, 6)
    r.kotak(mx, 0.75, mz, 0.7, 0.42, 0.7, P.putih)
  }
  return { tanah: geometri(pos, idx), patok: r.hasil() }
}

function bangunHiasanTanah(): BufferGeometry {
  const r = new Rakit()
  const rnd = acak(1019)
  const warna = ['#88c764', '#97d072', '#82c15f']
  for (let i = 0; i < 160; i++) {
    const x = 1 + rnd() * (PETA.lebar - 2)
    const z = zPantai(x) + 4 + rnd() * (PETA.dalam - zPantai(x) - 5)
    const rad = 0.9 + rnd() * 2.4
    r.silinder(x, 0, z, rad, rad, 0.012, warna[Math.floor(rnd() * warna.length)], 9)
  }
  // tiang tambat sepanjang kade, kecuali di pangkal dermaga
  const dermaga = penempatan.filter((p) => p.jenis === 'dermaga').map((p) => p.x)
  for (let x = KADE.dari + 0.8; x < KADE.ke - 0.5; x += 2.7) {
    if (dermaga.some((d) => Math.abs(d - x) < 2.2)) continue
    const z = zPantai(x) - 0.05
    r.silinder(x, 0.04, z, 0.11, 0.11, 0.32, P.hitam, 8)
    r.silinder(x, 0.3, z, 0.12, 0.12, 0.06, P.kuning, 8)
  }
  return r.hasil()
}

function teksturRiak(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#d6e9f0'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  const rnd = acak(7)
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 256
    const y = rnd() * 256
    const l = 10 + rnd() * 22
    ctx.globalAlpha = 0.5 + rnd() * 0.5
    for (const ox of [-256, 0]) {
      for (const oy of [-256, 0]) {
        ctx.beginPath()
        ctx.moveTo(x + ox, y + oy)
        ctx.lineTo(x + ox + l, y + oy)
        ctx.stroke()
      }
    }
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set((PETA.lebar + 2 * TEPI) / 5, (LAUT_SELATAN - LAUT_UTARA) / 5)
  t.colorSpace = SRGBColorSpace
  return t
}

function bangun() {
  const bentuk = new Shape()
  bentuk.moveTo(titikPantai[0][0], titikPantai[0][1])
  for (const [x, z] of titikPantai) bentuk.lineTo(x, z)
  const akhir = titikPantai[titikPantai.length - 1][0]
  bentuk.lineTo(akhir, PETA.dalam + TEPI)
  bentuk.lineTo(titikPantai[0][0], PETA.dalam + TEPI)
  bentuk.closePath()
  const daratan = new ExtrudeGeometry(bentuk, { depth: KEDALAMAN, bevelEnabled: false, curveSegments: 1 })
  daratan.rotateX(Math.PI / 2)

  const kade = titikPantai.filter(([x]) => x > KADE.dari && x < KADE.ke)
  return {
    daratan,
    rumput: new MeshLambertMaterial({ color: '#8fcc6a' }),
    tanah: new MeshLambertMaterial({ color: '#8c6b4a' }),
    pasir: jalur(titikPantai, (z) => z, (z) => z + 2.8, 0.015),
    kade: jalur(kade, (z) => z - 0.4, (z) => z + 3.4, 0.045),
    busa: jalur(titikPantai, (z) => z - 0.6, (z) => z - 0.05, AIR + 0.02),
    dangkal: jalur(titikPantai, (z) => z - 3.6, (z) => z - 0.6, AIR + 0.012),
    jalan: bangunJalan(),
    sungai: bangunSungai(),
    lahan: bangunLahan(),
    tambalan: bangunHiasanTanah(),
    riak: teksturRiak(),
  }
}

const sementara = new Color()

export function Tanah({ waktu }: { waktu: Waktu }) {
  const g = useMemo(bangun, [])
  const atas = useRef<MeshLambertMaterial>(null)
  const kali = useRef<MeshLambertMaterial>(null)
  const dangkal = useRef<MeshLambertMaterial>(null)
  const diam = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3)
    const c = cahaya[waktu]
    atas.current?.color.lerp(sementara.set(c.laut), k)
    kali.current?.color.lerp(sementara.set(c.dangkal), k)
    dangkal.current?.color.lerp(sementara.set(c.dangkal), k)
    if (!diam) {
      g.riak.offset.x += dt * 0.012
      g.riak.offset.y += dt * 0.005
    }
  })

  return (
    <group>
      <mesh geometry={g.daratan} material={[g.rumput, g.tanah]} />
      <mesh geometry={g.pasir}>
        <meshLambertMaterial color={P.pasir} />
      </mesh>
      <mesh geometry={g.kade}>
        <meshLambertMaterial color="#cfd4d3" />
      </mesh>
      <mesh geometry={g.sungai.tebing}>
        <meshLambertMaterial color="#b9ad84" side={DoubleSide} />
      </mesh>
      <mesh geometry={g.sungai.air}>
        <meshLambertMaterial ref={kali} color="#86dcd8" side={DoubleSide} />
      </mesh>
      <mesh geometry={g.lahan.tanah}>
        <meshLambertMaterial color="#c7b57a" side={DoubleSide} />
      </mesh>
      <mesh geometry={g.lahan.patok} material={bahanPadat} />
      <mesh geometry={g.jalan.aspal}>
        <meshLambertMaterial color={P.aspal} side={DoubleSide} />
      </mesh>
      <mesh geometry={g.jalan.trotoar}>
        <meshLambertMaterial color={P.trotoar} side={DoubleSide} />
      </mesh>
      <mesh geometry={g.jalan.marka}>
        <meshLambertMaterial color={P.marka} side={DoubleSide} />
      </mesh>
      <mesh geometry={g.jalan.dinding}>
        <meshLambertMaterial color="#e9e5dc" side={DoubleSide} />
      </mesh>
      <mesh geometry={g.jalan.tiang} material={bahanPadat} />
      <mesh geometry={g.tambalan} material={bahanPadat} />

      <mesh position={[PETA.lebar / 2, -0.91, (LAUT_UTARA + LAUT_SELATAN) / 2]}>
        <boxGeometry args={[PETA.lebar + 2 * TEPI, 1.38, LAUT_SELATAN - LAUT_UTARA]} />
        <meshLambertMaterial attach="material-0" color="#2b7fa6" />
        <meshLambertMaterial attach="material-1" color="#2b7fa6" />
        <meshLambertMaterial ref={atas} attach="material-2" color="#4db7d6" map={g.riak} />
        <meshLambertMaterial attach="material-3" color="#2b7fa6" />
        <meshLambertMaterial attach="material-4" color="#2b7fa6" />
        <meshLambertMaterial attach="material-5" color="#2b7fa6" />
      </mesh>
      <mesh geometry={g.dangkal}>
        <meshLambertMaterial ref={dangkal} color="#86dcd8" transparent opacity={0.85} />
      </mesh>
      <mesh geometry={g.busa}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
