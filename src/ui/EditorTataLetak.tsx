'use client'

import Link from 'next/link'
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type PointerEvent as PE } from 'react'
import { jenisById, katalog, kategori } from '@/data/bangunan'
import {
  PETA, buatGaris, contohKotak, distrik as daftarDistrik, garisPantai, jalanMentah, jarakKeGaris, lahanKosong, penempatan,
  sungai, titikTerdekat, tumpang, zPantai, type Kotak,
} from '@/data/tataletak'
import type { TataLetakKustom } from '@/data/tataletak-kustom'
import { panggil } from './api'

type B = { uid: string; jenis: string; x: number; z: number; rot: number; distrik: string }
type L = { uid: string; id: string; x: number; z: number; rot: number; w: number; d: number; distrik: string }
type J = { uid: string; id: string; nama: string; lebar: number; titik: Array<[number, number]>; tutup: boolean }
type Dok = { jalan: J[]; bangunan: B[]; lahan: L[] }
type Pilih = { macam: 'bangunan' | 'lahan' | 'jalan'; uid: string } | null
type Mode = 'pilih' | 'bangunan' | 'lahan' | 'jalan'
type VB = { x: number; y: number; w: number; h: number }
type Seret =
  | { macam: 'item'; uid: string; ax: number; az: number; ox: number; oz: number; rot: number; nx: number; nz: number; el: Element }
  | { macam: 'titik'; uid: string; idx: number; titik: Array<[number, number]>; tutup: boolean }
  | { macam: 'geser'; cx: number; cy: number; vb: VB }
  | { macam: 'cubit'; jarak: number; vb: VB; tengah: [number, number] }

let urut = 0
const uid = () => `u${++urut}`
const tepat = (n: number) => Math.round(n * 4) / 4
const normal = (r: number) => ((r % 360) + 360) % 360
const deg = (r: number) => normal(Math.round((r * 180) / Math.PI))
const TROTOAR = 0.6
const MUNDUR = 0.8
const RIWAYAT_MAKS = 60
const VB_AWAL: VB = { x: -2, y: -2, w: PETA.lebar + 4, h: PETA.dalam + 4 }

const ukuranB = (jenis: string) => jenisById.get(jenis)!.ukuran
const kotakB = (b: B): Kotak => ({ x: b.x, z: b.z, rot: b.rot, w: ukuranB(b.jenis)[0], d: ukuranB(b.jenis)[1] })
const titikSvg = (c: ReadonlyArray<readonly [number, number]>) => c.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join(' ')
const titikGaris = (titik: Array<[number, number]>, tutup: boolean) => {
  const g = buatGaris(titik, tutup)
  return titikSvg(g.x.map((x, i) => [x, g.z[i]] as [number, number]))
}
// rotation-y three.js (0 = muka ke +z) sama dengan rotate(-sudut) di SVG yang sumbu y-nya adalah z peta
const transformasi = (x: number, z: number, rot: number) => `translate(${x} ${z}) rotate(${-rot})`

const Benda = memo(function Benda(p: { uid: string; x: number; z: number; rot: number; w: number; d: number; warna: string; tembus: boolean; garisLahan: boolean; aktif: boolean; salah: boolean; label: string | null }) {
  const sw = p.salah || p.aktif ? 0.5 : 0.14
  return (
    <g data-uid={p.uid} transform={transformasi(p.x, p.z, p.rot)} className="editor-benda">
      <rect x={-p.w / 2} y={-p.d / 2} width={p.w} height={p.d} fill={p.warna} fillOpacity={p.tembus ? 0.45 : 0.88} stroke={p.salah ? '#e0453a' : p.aktif ? '#ffffff' : '#1b2a33'} strokeWidth={sw} strokeDasharray={p.garisLahan ? '0.6 0.4' : undefined} />
      <line x1={-p.w / 2} y1={p.d / 2} x2={p.w / 2} y2={p.d / 2} stroke="#ffd400" strokeWidth={0.4} />
      {p.label && <text y={0.35} fontSize={0.9} textAnchor="middle" fill="#0c2530" transform={`rotate(${p.rot})`}>{p.label}</text>}
    </g>
  )
})

const Jalan = memo(function Jalan(p: { uid: string; titik: Array<[number, number]>; tutup: boolean; lebar: number; aktif: boolean }) {
  const titik = useMemo(() => (p.titik.length >= 2 ? titikGaris(p.titik, p.tutup) : ''), [p.titik, p.tutup])
  return (
    <g data-jalan={p.uid}>
      <polyline points={titik} fill="none" stroke={p.aktif ? '#2d5bd0' : '#59636b'} strokeWidth={p.lebar} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )
})

/** Latar statis (laut, Kali Sekar, batas peta): digambar sekali. */
const Latar = memo(function Latar() {
  const pantai = titikSvg([[-40, -40], ...garisPantai, [PETA.lebar + 40, garisPantai[garisPantai.length - 1][1]], [PETA.lebar + 40, -40]])
  const kali = titikSvg(sungai.garis.x.map((x, i) => [x, sungai.garis.z[i]] as [number, number]))
  return (
    <>
      <rect x={-40} y={-40} width={PETA.lebar + 80} height={PETA.dalam + 80} fill="#9fd17a" />
      <polygon points={pantai} fill="#4db7d6" />
      <polyline points={kali} fill="none" stroke="#4db7d6" strokeWidth={sungai.lebar} strokeLinejoin="round" />
      <rect x={0} y={0} width={PETA.lebar} height={PETA.dalam} fill="none" stroke="#0c3446" strokeWidth={0.3} strokeDasharray="1 1" />
    </>
  )
})

function dariKustom(k: TataLetakKustom): Dok {
  return {
    jalan: k.jalan.map((j) => ({ uid: uid(), id: j.id, nama: j.nama, lebar: j.lebar, titik: j.titik.map(([x, z]) => [x, z]), tutup: !!j.tutup })),
    bangunan: k.bangunan.map((p) => ({ uid: uid(), jenis: p.jenis, x: p.x, z: p.z, rot: p.rot, distrik: p.distrik })),
    lahan: k.lahan.map((l) => ({ uid: uid(), id: l.id, x: l.x, z: l.z, rot: l.rot, w: l.w, d: l.d, distrik: l.distrik })),
  }
}

function keKustom(dok: Dok): TataLetakKustom {
  return {
    jalan: dok.jalan.filter((j) => j.titik.length >= 2).map(({ id, nama, lebar, titik, tutup }) => ({ id, nama, lebar, titik, tutup })),
    bangunan: dok.bangunan.map(({ jenis, x, z, rot, distrik }) => ({ jenis, x, z, rot, distrik })),
    lahan: dok.lahan.map(({ id, x, z, rot, w, d, distrik }) => ({ id, x, z, rot, w, d, distrik })),
  }
}

const dokAwal = () => dariKustom({ jalan: jalanMentah.map((j) => ({ ...j, titik: j.titik.map(([x, z]) => [x, z] as [number, number]) })), bangunan: penempatan, lahan: lahanKosong })

type SlotInfo = { nama: string; waktu: string; kustom: TataLetakKustom } | null
type Tab = 'aset' | 'slot' | 'bantuan'

/** Daftar bangunan per kategori. Seret ke peta (tetikus/pena), atau ketuk lalu ketuk peta. */
const PanelAset = memo(function PanelAset(p: { jenis: string; pilihJenis: (id: string) => void; mulaiBawa: (id: string, e: PE<HTMLButtonElement>) => void }) {
  const [cari, setCari] = useState('')
  const q = cari.trim().toLowerCase()
  const grup = (Object.keys(kategori) as Array<keyof typeof kategori>)
    .map((k) => ({ k, isi: katalog.filter((j) => j.kategori === k && (!q || j.nama.toLowerCase().includes(q))) }))
    .filter((g) => g.isi.length)
  return (
    <>
      <input className="editor-cari" type="search" placeholder="Cari bangunan" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari bangunan" />
      {grup.map((g) => (
        <section key={g.k} className="editor-grup">
          <h3>{kategori[g.k].nama}</h3>
          <div className="editor-aset">
            {g.isi.map((j) => (
              <button
                key={j.id}
                type="button"
                className="editor-kartu"
                aria-pressed={p.jenis === j.id}
                onClick={() => p.pilihJenis(j.id)}
                onPointerDown={(e) => p.mulaiBawa(j.id, e)}
              >
                <span className="editor-tapak" style={{ background: kategori[j.kategori].warna, aspectRatio: `${j.ukuran[0]} / ${j.ukuran[1]}` }} />
                <span>{j.nama}</span>
                <small>{j.ukuran[0]}×{j.ukuran[1]}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!grup.length && <p className="catatan">Tidak ada bangunan bernama “{cari}”.</p>}
    </>
  )
})

/** Benda yang menabrak jalan, sungai, laut, atau benda lain. */
function hitungMasalah(dok: Dok): Set<string> {
  const bad = new Set<string>()
  const garis = dok.jalan.filter((j) => j.titik.length >= 2).map((j) => ({ j, g: buatGaris(j.titik, j.tutup) }))
  const benda = [
    ...dok.bangunan.filter((b) => !jenisById.get(b.jenis)!.diLaut).map((b) => ({ uid: b.uid, k: kotakB(b) })),
    ...dok.lahan.map((l) => ({ uid: l.uid, k: l as Kotak })),
  ]
  for (const { uid: u, k } of benda) {
    for (const [x, z] of contohKotak(k, 1.2)) {
      const luar = x < 0 || x > PETA.lebar || z > PETA.dalam || z < zPantai(x) + 0.5
      if (luar || jarakKeGaris(sungai.garis, x, z, sungai.lebar) < sungai.lebar / 2 + 0.3 || garis.some(({ j, g }) => jarakKeGaris(g, x, z, j.lebar) < j.lebar / 2 + 0.1)) {
        bad.add(u)
        break
      }
    }
  }
  for (let a = 0; a < benda.length; a++) {
    for (let b = a + 1; b < benda.length; b++) {
      if (tumpang(benda[a].k, benda[b].k, 0.6)) {
        bad.add(benda[a].uid)
        bad.add(benda[b].uid)
      }
    }
  }
  return bad
}

/**
 * Editor tata letak kota khusus Wali Kota. Selama menyeret, menggeser, dan zoom, elemen SVG diubah langsung
 * tanpa render ulang React; data baru disimpan sekali saat jari atau tetikus dilepas.
 */
export default function EditorTataLetak() {
  const [boleh, setBoleh] = useState<boolean | null>(null)
  const [dok, setDokMentah] = useState<Dok>(dokAwal)
  const [pilih, setPilih] = useState<Pilih>(null)
  const [mode, setMode] = useState<Mode>('pilih')
  const [jenisBaru, setJenisBaru] = useState(katalog[0].id)
  const [jalanBaru, setJalanBaru] = useState<string | null>(null)
  const [skala, setSkala] = useState(VB_AWAL.w)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [, setVersi] = useState(0)
  const [tab, setTab] = useState<Tab>('aset')
  const [panelBuka, setPanelBuka] = useState(true)
  const [slot, setSlot] = useState<SlotInfo[]>([])
  const [namaSlot, setNamaSlot] = useState('')
  const hantu = useRef<SVGGElement>(null)
  const bawa = useRef<{ jenis: string; sx: number; sy: number; jalan: boolean } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const vb = useRef<VB>({ ...VB_AWAL })
  const seret = useRef<Seret | null>(null)
  const jari = useRef(new Map<number, [number, number]>())
  const mundur = useRef<Dok[]>([])
  const maju = useRef<Dok[]>([])
  const tundaSkala = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    panggil('/api/saya').then((h) => setBoleh(h.ok && h.data.peran === 'walikota'))
  }, [])

  useEffect(() => {
    if (pilih) setPanelBuka(true)
  }, [pilih])

  useEffect(() => {
    if (boleh) panggil<{ slot: SlotInfo[] }>('/api/tata-letak/slot').then((h) => h.ok && setSlot(h.data.slot))
  }, [boleh])

  // salinan dokumen terkini di ref: riwayat dicatat di luar updater setState (StrictMode memanggil updater dua kali)
  const dokRef = useRef(dok)
  const pasang = useCallback((d: Dok) => {
    dokRef.current = d
    setDokMentah(d)
    setVersi((v) => v + 1)
  }, [])

  /** Ganti dokumen dan catat langkah untuk urung. */
  const setDok = useCallback((f: (d: Dok) => Dok) => {
    const lama = dokRef.current
    const baru = f(lama)
    if (baru === lama) return
    mundur.current.push(lama)
    if (mundur.current.length > RIWAYAT_MAKS) mundur.current.shift()
    maju.current = []
    pasang(baru)
  }, [pasang])

  const urung = useCallback(() => {
    const d = mundur.current.pop()
    if (!d) return
    maju.current.push(dokRef.current)
    pasang(d)
  }, [pasang])

  const ulang = useCallback(() => {
    const d = maju.current.pop()
    if (!d) return
    mundur.current.push(dokRef.current)
    pasang(d)
  }, [pasang])

  // tanda tabrakan dihitung dari salinan tertunda, jadi tidak menahan seret dan ketik
  const dokTunda = useDeferredValue(dok)
  const masalah = useMemo(() => hitungMasalah(dokTunda), [dokTunda])
  const garis = useMemo(() => dok.jalan.filter((j) => j.titik.length >= 2).map((j) => ({ j, g: buatGaris(j.titik, j.tutup) })), [dok.jalan])
  const penanda = useRef<SVGCircleElement>(null)

  /**
   * Tempelkan titik jalan ke ujung jalan lain, atau ke garis tengah jalan lain, bila cukup dekat.
   * Ujung terbuka hasil Chaikin tetap di titik kendali, jadi titik yang menempel benar-benar bertemu di peta 3D.
   * Radius tempel mengikuti zoom supaya terasa sama di layar. `lepas` (tombol Alt) mematikan tempel.
   */
  const tempel = (x: number, z: number, kecuali: string | null, lepas: boolean): [number, number, boolean] => {
    if (lepas) return [tepat(x), tepat(z), false]
    const r = Math.max(0.6, vb.current.w / 45)
    let hasil: [number, number] | null = null
    let d = r * 1.4
    for (const { j } of garis) {
      if (j.uid === kecuali || j.tutup) continue
      for (const p of [j.titik[0], j.titik[j.titik.length - 1]]) {
        const e = Math.hypot(p[0] - x, p[1] - z)
        if (e < d) [d, hasil] = [e, [p[0], p[1]]]
      }
    }
    if (hasil) return [hasil[0], hasil[1], true]
    d = r
    for (const { j, g } of garis) {
      if (j.uid === kecuali) continue
      const t = titikTerdekat(g, x, z)
      if (t.d < d) [d, hasil] = [t.d, [Math.round(t.x * 100) / 100, Math.round(t.z * 100) / 100]]
    }
    return hasil ? [hasil[0], hasil[1], true] : [tepat(x), tepat(z), false]
  }

  const tunjuk = (h: [number, number, boolean] | null) => {
    const c = penanda.current
    if (!c) return
    c.style.display = h?.[2] ? '' : 'none'
    if (h?.[2]) {
      c.setAttribute('cx', String(h[0]))
      c.setAttribute('cy', String(h[1]))
    }
  }

  const terapkanVb = useCallback((v: VB, segera = false) => {
    // titik tengah pandangan tidak boleh keluar dari peta
    const cx = Math.min(PETA.lebar, Math.max(0, v.x + v.w / 2))
    const cz = Math.min(PETA.dalam, Math.max(0, v.y + v.h / 2))
    v = { ...v, x: cx - v.w / 2, y: cz - v.h / 2 }
    vb.current = v
    svg.current?.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`)
    if (tundaSkala.current) clearTimeout(tundaSkala.current)
    if (segera) setSkala(v.w)
    else tundaSkala.current = setTimeout(() => setSkala(v.w), 140)
  }, [])

  const keTitik = useCallback((cx: number, cy: number): [number, number] => {
    const s = svg.current!
    const r = s.getBoundingClientRect()
    const v = vb.current
    // preserveAspectRatio xMidYMid meet: hitung skala dan geseran yang sama dengan peramban
    const k = Math.min(r.width / v.w, r.height / v.h)
    const ox = (r.width - v.w * k) / 2
    const oy = (r.height - v.h * k) / 2
    return [v.x + (cx - r.left - ox) / k, v.y + (cy - r.top - oy) / k]
  }, [])

  const zoomDi = useCallback(
    (cx: number, cy: number, f: number) => {
      const [x, z] = keTitik(cx, cy)
      const v = vb.current
      const w = Math.min(PETA.lebar * 2.2, Math.max(10, v.w * f))
      const k = w / v.w
      terapkanVb({ x: x - (x - v.x) * k, y: z - (z - v.y) * k, w, h: v.h * k })
    },
    [keTitik, terapkanVb],
  )

  // roda tetikus dan cubit trackpad: pendengar non-pasif agar halaman tidak ikut menggulir
  useEffect(() => {
    const s = svg.current
    if (!s) return
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      const satuan = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      zoomDi(e.clientX, e.clientY, Math.exp(e.deltaY * satuan * (e.ctrlKey ? 0.01 : 0.0018)))
    }
    s.addEventListener('wheel', roda, { passive: false })
    return () => s.removeEventListener('wheel', roda)
  }, [zoomDi, boleh])

  const terdekat = useCallback(
    (x: number, z: number) => {
      let hasil: { j: J; x: number; z: number; d: number } | null = null
      for (const { j, g } of garis) {
        const t = titikTerdekat(g, x, z)
        if (!hasil || t.d - j.lebar / 2 < hasil.d - hasil.j.lebar / 2) hasil = { j, ...t }
      }
      return hasil
    },
    [garis],
  )

  /** Putar agar muka menghadap jalan terdekat; tempel = geser sampai muka berada di tepi trotoar. */
  const hadapkan = useCallback(
    (k: { x: number; z: number; d: number }, tempel: boolean) => {
      const t = terdekat(k.x, k.z)
      if (!t || t.d < 1e-6) return null
      const ux = (t.x - k.x) / t.d
      const uz = (t.z - k.z) / t.d
      const rot = deg(Math.atan2(ux, uz))
      if (!tempel) return { rot, x: k.x, z: k.z }
      const jauh = t.j.lebar / 2 + TROTOAR + MUNDUR + k.d / 2
      return { rot, x: tepat(t.x - ux * jauh), z: tepat(t.z - uz * jauh) }
    },
    [terdekat],
  )

  const distrikTerdekat = (x: number, z: number) =>
    dok.bangunan.reduce<{ d: number; distrik: string }>((m, b) => {
      const d = (b.x - x) ** 2 + (b.z - z) ** 2
      return d < m.d ? { d, distrik: b.distrik } : m
    }, { d: Infinity, distrik: daftarDistrik[0].id }).distrik

  const ubah = useCallback(
    (u: string, f: (o: Record<string, unknown>) => Record<string, unknown>) =>
      setDok((d) => ({
        jalan: d.jalan.map((j) => (j.uid === u ? (f(j) as J) : j)),
        bangunan: d.bangunan.map((b) => (b.uid === u ? (f(b) as B) : b)),
        lahan: d.lahan.map((l) => (l.uid === u ? (f(l) as L) : l)),
      })),
    [setDok],
  )

  const hapus = useCallback(() => {
    if (!pilih) return
    setDok((d) => ({ jalan: d.jalan.filter((x) => x.uid !== pilih.uid), bangunan: d.bangunan.filter((x) => x.uid !== pilih.uid), lahan: d.lahan.filter((x) => x.uid !== pilih.uid) }))
    setPilih(null)
  }, [pilih, setDok])

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) ulang()
        else urung()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        ulang()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') hapus()
      if (e.key === 'Escape') {
        setPilih(null)
        setMode('pilih')
        setJalanBaru(null)
      }
      // panah menggeser benda terpilih 0,25 petak (Shift: 1 petak); R memutar 15 derajat
      if (pilih && pilih.macam !== 'jalan') {
        const n = e.shiftKey ? 1 : 0.25
        const g = { ArrowLeft: [-n, 0], ArrowRight: [n, 0], ArrowUp: [0, -n], ArrowDown: [0, n] }[e.key]
        if (g) {
          e.preventDefault()
          ubah(pilih.uid, (o) => ({ ...o, x: (o.x as number) + g[0], z: (o.z as number) + g[1] }))
        }
        if (e.key.toLowerCase() === 'r') ubah(pilih.uid, (o) => ({ ...o, rot: normal((o.rot as number) + (e.shiftKey ? -15 : 15)) }))
      }
    }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
  }, [hapus, pilih, ubah, urung, ulang])

  /** Taruh bangunan baru di (x, z), diputar dan ditempel ke jalan terdekat. */
  function tambahBangunan(jenis: string, x: number, z: number) {
    const h = hadapkan({ x, z, d: ukuranB(jenis)[1] }, true)
    const b: B = { uid: uid(), jenis, x: h?.x ?? tepat(x), z: h?.z ?? tepat(z), rot: h?.rot ?? 0, distrik: distrikTerdekat(x, z) }
    setDok((dk) => ({ ...dk, bangunan: [...dk.bangunan, b] }))
    setPilih({ macam: 'bangunan', uid: b.uid })
    setMode('pilih')
  }

  // seret dari panel aset: pendengar di window membaca fungsi terbaru lewat ref
  const terbaru = useRef({ tambahBangunan, hadapkan, keTitik })
  terbaru.current = { tambahBangunan, hadapkan, keTitik }
  const mulaiBawa = useCallback((jenis: string, e: PE<HTMLButtonElement>) => {
    if (e.pointerType === 'touch' || e.button !== 0) return
    e.preventDefault()
    bawa.current = { jenis, sx: e.clientX, sy: e.clientY, jalan: false }
  }, [])
  const pilihJenis = useCallback((id: string) => {
    setJenisBaru(id)
    setMode('bangunan')
    setJalanBaru(null)
  }, [])

  useEffect(() => {
    const posisi = (e: PointerEvent, jenis: string) => {
      const r = svg.current?.getBoundingClientRect()
      if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null
      const { keTitik: kt, hadapkan: hd } = terbaru.current
      const [x, z] = kt(e.clientX, e.clientY)
      const [w, d] = ukuranB(jenis)
      const h = hd({ x, z, d }, true)
      return { x, z, w, d, hx: h?.x ?? tepat(x), hz: h?.z ?? tepat(z), rot: h?.rot ?? 0 }
    }
    const gerak = (e: PointerEvent) => {
      const b = bawa.current
      if (!b) return
      if (!b.jalan && Math.hypot(e.clientX - b.sx, e.clientY - b.sy) < 6) return
      b.jalan = true
      document.body.classList.add('editor-membawa')
      const g = hantu.current
      const p = posisi(e, b.jenis)
      if (!g) return
      g.style.display = p ? '' : 'none'
      if (!p) return
      g.setAttribute('transform', transformasi(p.hx, p.hz, p.rot))
      const kotak = g.firstElementChild!
      kotak.setAttribute('x', String(-p.w / 2))
      kotak.setAttribute('y', String(-p.d / 2))
      kotak.setAttribute('width', String(p.w))
      kotak.setAttribute('height', String(p.d))
      const muka = g.lastElementChild!
      muka.setAttribute('x1', String(-p.w / 2))
      muka.setAttribute('x2', String(p.w / 2))
      muka.setAttribute('y1', String(p.d / 2))
      muka.setAttribute('y2', String(p.d / 2))
    }
    const lepas = (e: PointerEvent) => {
      const b = bawa.current
      bawa.current = null
      document.body.classList.remove('editor-membawa')
      if (hantu.current) hantu.current.style.display = 'none'
      if (!b?.jalan) return
      const p = posisi(e, b.jenis)
      if (p) terbaru.current.tambahBangunan(b.jenis, p.x, p.z)
    }
    window.addEventListener('pointermove', gerak)
    window.addEventListener('pointerup', lepas)
    window.addEventListener('pointercancel', lepas)
    return () => {
      window.removeEventListener('pointermove', gerak)
      window.removeEventListener('pointerup', lepas)
      window.removeEventListener('pointercancel', lepas)
    }
  }, [])

  async function simpanSlot(i: number) {
    if (slot[i] && !confirm(`Timpa ${slot[i]!.nama}?`)) return
    setSibuk(true)
    const h = await panggil<{ slot: SlotInfo[] }>('/api/tata-letak/slot', { slot: i, nama: namaSlot, kustom: keKustom(dok) })
    setSibuk(false)
    if (!h.ok) return setPesan({ ok: false, teks: h.galat.pesan })
    setSlot(h.data.slot)
    setNamaSlot('')
    setPesan({ ok: true, teks: `Tersimpan di slot ${i + 1}. Peta kota belum berubah sampai kamu menekan Terapkan ke peta.` })
  }

  async function hapusSlot(i: number) {
    if (!confirm(`Kosongkan ${slot[i]?.nama ?? 'slot ini'}?`)) return
    const h = await panggil<{ slot: SlotInfo[] }>('/api/tata-letak/slot', { slot: i, hapus: true })
    if (h.ok) setSlot(h.data.slot)
    else setPesan({ ok: false, teks: h.galat.pesan })
  }

  function muatSlot(i: number) {
    const s = slot[i]
    if (!s) return
    setDok(() => dariKustom(s.kustom))
    setPilih(null)
    setPesan({ ok: true, teks: `${s.nama} dimuat ke editor. Ctrl+Z untuk kembali.` })
  }

  function mulaiNol() {
    if (!confirm('Kosongkan semua jalan, bangunan, dan lahan di editor? Peta kota belum berubah sampai kamu menekan Terapkan ke peta.')) return
    setDok(() => ({ jalan: [], bangunan: [], lahan: [] }))
    setPilih(null)
    setMode('jalan')
    setJalanBaru(null)
  }

  function bawah(e: PE<SVGSVGElement>) {
    const s = svg.current!
    s.setPointerCapture(e.pointerId)
    jari.current.set(e.pointerId, [e.clientX, e.clientY])
    // dua jari: cubit untuk zoom
    if (jari.current.size === 2) {
      const [a, b] = [...jari.current.values()]
      seret.current = { macam: 'cubit', jarak: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: { ...vb.current }, tengah: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }
      return
    }
    const [x, z] = keTitik(e.clientX, e.clientY)
    const t = e.target as Element
    if (mode === 'bangunan') {
      tambahBangunan(jenisBaru, x, z)
      return
    }
    if (mode === 'lahan') {
      const n = Math.max(0, ...dok.lahan.map((l) => Number(l.id.split('-')[1]) || 0)) + 1
      const h = hadapkan({ x, z, d: 4.6 }, true)
      const l: L = { uid: uid(), id: `lahan-${n}`, x: h?.x ?? tepat(x), z: h?.z ?? tepat(z), rot: h?.rot ?? 0, w: 6, d: 4.6, distrik: distrikTerdekat(x, z) }
      setDok((dk) => ({ ...dk, lahan: [...dk.lahan, l] }))
      setPilih({ macam: 'lahan', uid: l.uid })
      setMode('pilih')
      return
    }
    if (mode === 'jalan' && !t.closest('[data-titik]')) {
      const [px, pz] = tempel(x, z, jalanBaru, e.altKey)
      const p: [number, number] = [px, pz]
      if (jalanBaru) ubah(jalanBaru, (j) => ({ ...j, titik: [...(j.titik as J['titik']), p] }))
      else {
        const j: J = { uid: uid(), id: `jalan-${Date.now().toString(36)}`, nama: 'Jalan Baru', lebar: 2.4, titik: [p], tutup: false }
        setDok((dk) => ({ ...dk, jalan: [...dk.jalan, j] }))
        setJalanBaru(j.uid)
        setPilih({ macam: 'jalan', uid: j.uid })
      }
      return
    }
    const elTitik = t.closest('[data-titik]')
    if (elTitik && pilih?.macam === 'jalan') {
      const j = dok.jalan.find((x) => x.uid === pilih.uid)
      if (j) {
        seret.current = { macam: 'titik', uid: j.uid, idx: Number(elTitik.getAttribute('data-titik')), titik: j.titik.map((p) => [...p] as [number, number]), tutup: j.tutup }
        return
      }
    }
    const elBenda = t.closest('[data-uid]')
    if (elBenda) {
      const u = elBenda.getAttribute('data-uid')!
      const b = dok.bangunan.find((x) => x.uid === u)
      const l = b ? undefined : dok.lahan.find((x) => x.uid === u)
      const o = b ?? l
      if (o) {
        setPilih({ macam: b ? 'bangunan' : 'lahan', uid: u })
        seret.current = { macam: 'item', uid: u, ax: x, az: z, ox: o.x, oz: o.z, rot: o.rot, nx: o.x, nz: o.z, el: elBenda }
        return
      }
    }
    const elJalan = t.closest('[data-jalan]')
    if (elJalan) {
      setPilih({ macam: 'jalan', uid: elJalan.getAttribute('data-jalan')! })
      return
    }
    setPilih(null)
    seret.current = { macam: 'geser', cx: e.clientX, cy: e.clientY, vb: { ...vb.current } }
  }

  function gerak(e: PE<SVGSVGElement>) {
    if (jari.current.has(e.pointerId)) jari.current.set(e.pointerId, [e.clientX, e.clientY])
    const s = seret.current
    if (!s) {
      // pratinjau tempel saat menggambar jalan
      if (mode === 'jalan' && e.pointerType === 'mouse') {
        const [x, z] = keTitik(e.clientX, e.clientY)
        tunjuk(tempel(x, z, jalanBaru, e.altKey))
      }
      return
    }
    if (s.macam === 'cubit') {
      if (jari.current.size < 2) return
      const [a, b] = [...jari.current.values()]
      const jarak = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1
      vb.current = { ...s.vb }
      zoomDi(s.tengah[0], s.tengah[1], s.jarak / jarak)
      return
    }
    if (s.macam === 'geser') {
      const r = svg.current!.getBoundingClientRect()
      const k = Math.min(r.width / s.vb.w, r.height / s.vb.h)
      terapkanVb({ ...s.vb, x: s.vb.x - (e.clientX - s.cx) / k, y: s.vb.y - (e.clientY - s.cy) / k })
      return
    }
    const [x, z] = keTitik(e.clientX, e.clientY)
    if (s.macam === 'item') {
      s.nx = tepat(s.ox + x - s.ax)
      s.nz = tepat(s.oz + z - s.az)
      s.el.setAttribute('transform', transformasi(s.nx, s.nz, s.rot))
      return
    }
    const h = tempel(x, z, s.uid, e.altKey)
    tunjuk(h)
    s.titik[s.idx] = [h[0], h[1]]
    const g = svg.current!.querySelector(`[data-jalan="${s.uid}"] polyline`)
    if (g && s.titik.length >= 2) g.setAttribute('points', titikGaris(s.titik, s.tutup))
    const c = svg.current!.querySelector(`[data-titik="${s.idx}"]`)
    c?.setAttribute('cx', String(s.titik[s.idx][0]))
    c?.setAttribute('cy', String(s.titik[s.idx][1]))
  }

  function atas(e: PE<SVGSVGElement>) {
    jari.current.delete(e.pointerId)
    const s = seret.current
    if (s?.macam === 'cubit' && jari.current.size > 0) return
    seret.current = null
    if (!s) return
    tunjuk(null)
    if (s.macam === 'item' && (s.nx !== s.ox || s.nz !== s.oz)) ubah(s.uid, (o) => ({ ...o, x: s.nx, z: s.nz }))
    if (s.macam === 'titik') ubah(s.uid, (o) => ({ ...o, titik: s.titik }))
    if (s.macam === 'geser' || s.macam === 'cubit') setSkala(vb.current.w)
  }

  async function simpan(kustom: unknown) {
    setSibuk(true)
    setPesan(null)
    const h = await panggil<{ ok: boolean; kustom: boolean }>('/api/tata-letak', { kustom })
    setSibuk(false)
    if (!h.ok) setPesan({ ok: false, teks: h.galat.pesan })
    else setPesan({ ok: true, teks: h.data.kustom ? 'Tata letak disimpan. Buka peta untuk melihat hasilnya; pohon dan lampu menyesuaikan jalan baru.' : 'Kembali ke tata letak otomatis. Muat ulang editor untuk melihatnya.' })
  }

  const simpanKustom = () => simpan(keKustom(dok))

  if (boleh === null) return <main className="halaman"><p className="kosong">Memuat</p></main>
  if (!boleh) {
    return (
      <main className="halaman">
        <h1>Editor tata letak</h1>
        <p className="pengantar">Khusus Wali Kota. Masuk dengan akun Wali Kota lalu buka halaman ini lagi.</p>
        <p><Link className="tautan" href="/masuk">Masuk</Link></p>
      </main>
    )
  }

  const pb = pilih?.macam === 'bangunan' ? dok.bangunan.find((b) => b.uid === pilih.uid) : undefined
  const pl = pilih?.macam === 'lahan' ? dok.lahan.find((l) => l.uid === pilih.uid) : undefined
  const pj = pilih?.macam === 'jalan' ? dok.jalan.find((j) => j.uid === pilih.uid) : undefined
  const po = pb ?? pl
  const tampilLabel = skala < 80
  const rTitik = Math.max(0.5, skala / 150)
  const putar = (sudut: number) => po && ubah(po.uid, (o) => ({ ...o, rot: normal((o.rot as number) + sudut) }))
  const hadap = (tempel: boolean) => {
    if (!po) return
    const h = hadapkan({ x: po.x, z: po.z, d: pb ? ukuranB(pb.jenis)[1] : pl!.d }, tempel)
    if (h) ubah(po.uid, (o) => ({ ...o, ...h }))
  }
  const ubahAngka = (kunci: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    if (po && Number.isFinite(n)) ubah(po.uid, (o) => ({ ...o, [kunci]: n }))
  }
  const zoomTombol = (f: number) => {
    const r = svg.current!.getBoundingClientRect()
    zoomDi(r.left + r.width / 2, r.top + r.height / 2, f)
    setSkala(vb.current.w)
  }

  return (
    <main className="editor">
      <div className="editor-alat">
        <strong>Editor tata letak</strong>
        <div className="kelompok-alat" role="group" aria-label="Mode">
          {(['pilih', 'bangunan', 'lahan', 'jalan'] as Mode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setJalanBaru(null); if (m === 'bangunan') { setPilih(null); setTab('aset') } }}>
              {m === 'pilih' ? 'Pilih' : m === 'bangunan' ? '+ Bangunan' : m === 'lahan' ? '+ Lahan' : '+ Jalan'}
            </button>
          ))}
        </div>
        {mode === 'bangunan' && <span className="catatan">Klik peta untuk menaruh {jenisById.get(jenisBaru)!.nama}.</span>}
        {mode === 'jalan' && <span className="catatan">Klik peta untuk menambah titik.</span>}
        {mode === 'jalan' && jalanBaru && <button type="button" onClick={() => { setJalanBaru(null); setMode('pilih') }}>Selesai</button>}
        <div className="kelompok-alat" role="group" aria-label="Riwayat dan tampilan">
          <button type="button" disabled={!mundur.current.length} onClick={urung} title="Ctrl+Z">Urung</button>
          <button type="button" disabled={!maju.current.length} onClick={ulang} title="Ctrl+Y">Ulang</button>
          <button type="button" onClick={() => zoomTombol(1 / 1.4)} aria-label="Perbesar">+</button>
          <button type="button" onClick={() => zoomTombol(1.4)} aria-label="Perkecil">−</button>
          <button type="button" onClick={() => terapkanVb({ ...VB_AWAL }, true)}>Seluruh peta</button>
        </div>
        <span className={masalah.size ? 'editor-masalah' : 'catatan'}>{masalah.size ? `${masalah.size} benda bertabrakan` : 'Tidak ada tabrakan'}</span>
        <button type="button" aria-pressed={panelBuka} onClick={() => setPanelBuka((b) => !b)}>Panel</button>
        <span className="editor-dorong" />
        <button type="button" className="tombol-sekunder" onClick={mulaiNol}>Mulai dari nol</button>
        <button type="button" className="tombol-utama" disabled={sibuk} onClick={simpanKustom}>Terapkan ke peta</button>
        <button type="button" className="tombol-sekunder" disabled={sibuk} onClick={() => simpan(null)}>Kembali ke otomatis</button>
        <Link className="tautan" href="/">Lihat peta</Link>
      </div>

      <div className={`editor-isi${panelBuka ? '' : ' panel-tutup'}`}>
        {pesan && <button type="button" className={`editor-pesan ${pesan.ok ? 'ok' : 'galat'}`} onClick={() => setPesan(null)} title="Tutup">{pesan.teks}</button>}
        <svg
          ref={svg}
          className={`editor-kanvas mode-${mode}`}
          viewBox={`${vb.current.x} ${vb.current.y} ${vb.current.w} ${vb.current.h}`}
          onPointerDown={bawah}
          onPointerMove={gerak}
          onPointerUp={atas}
          onPointerCancel={atas}
          onPointerLeave={() => { if (!seret.current) tunjuk(null) }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Latar />
          {dok.jalan.map((j) => <Jalan key={j.uid} uid={j.uid} titik={j.titik} tutup={j.tutup} lebar={j.lebar} aktif={pj?.uid === j.uid} />)}
          {dok.lahan.map((l) => (
            <Benda key={l.uid} uid={l.uid} x={l.x} z={l.z} rot={l.rot} w={l.w} d={l.d} warna="#c9b77a" tembus={false} garisLahan aktif={pl?.uid === l.uid} salah={masalah.has(l.uid)} label={tampilLabel ? l.id : null} />
          ))}
          {dok.bangunan.map((b) => {
            const j = jenisById.get(b.jenis)!
            return (
              <Benda key={b.uid} uid={b.uid} x={b.x} z={b.z} rot={b.rot} w={j.ukuran[0]} d={j.ukuran[1]} warna={kategori[j.kategori].warna} tembus={!!j.diLaut} garisLahan={false} aktif={pb?.uid === b.uid} salah={masalah.has(b.uid)} label={tampilLabel ? j.nama.slice(0, 22) : null} />
            )
          })}
          {pj && pj.titik.map(([x, z], i) => (
            <circle
              key={i}
              data-titik={i}
              cx={x}
              cy={z}
              r={rTitik}
              className="editor-titik"
              onDoubleClick={() => { if (pj.titik.length > 2) ubah(pj.uid, (o) => ({ ...o, titik: (o.titik as J['titik']).filter((_, k) => k !== i) })) }}
            />
          ))}
          <g ref={hantu} className="editor-hantu" style={{ display: 'none' }}><rect /><line /></g>
          <circle ref={penanda} r={rTitik * 1.6} className="editor-tempel" style={{ display: 'none' }} />
        </svg>

        <aside className="editor-panel" hidden={!panelBuka}>
          <div className="kelompok-alat editor-tab" role="group" aria-label="Panel">
            {(['aset', 'slot', 'bantuan'] as Tab[]).map((t) => (
              <button key={t} type="button" aria-pressed={!pilih && tab === t} onClick={() => { setPilih(null); setTab(t) }}>
                {t === 'aset' ? 'Bangunan' : t === 'slot' ? 'Slot' : 'Bantuan'}
              </button>
            ))}
          </div>
          {!pilih && tab === 'aset' && (
            <>
              <p className="catatan">Seret kartu ke peta; bangunan langsung menghadap jalan terdekat. Di ponsel: ketuk kartu, lalu ketuk peta.</p>
              <PanelAset jenis={mode === 'bangunan' ? jenisBaru : ''} pilihJenis={pilihJenis} mulaiBawa={mulaiBawa} />
            </>
          )}
          {!pilih && tab === 'slot' && (
            <>
              <p className="catatan">Simpan rancangan ke slot tanpa mengubah peta kota. Muat kapan saja untuk dilanjutkan.</p>
              <label className="editor-label">Nama untuk simpanan berikutnya <input value={namaSlot} maxLength={40} placeholder="Misalnya Kota pesisir" onChange={(e) => setNamaSlot(e.target.value)} /></label>
              {slot.map((s, i) => (
                <div key={i} className="editor-slot">
                  <div>
                    <strong>{s?.nama ?? `Slot ${i + 1}`}</strong>
                    <small>{s ? `${new Date(s.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}, ${s.kustom.bangunan.length} bangunan, ${s.kustom.jalan.length} jalan` : 'Kosong'}</small>
                  </div>
                  <div className="editor-tombol">
                    <button type="button" disabled={sibuk} onClick={() => simpanSlot(i)}>Simpan</button>
                    <button type="button" disabled={!s} onClick={() => muatSlot(i)}>Muat</button>
                    <button type="button" disabled={!s} onClick={() => hapusSlot(i)} aria-label={`Kosongkan slot ${i + 1}`}>Hapus</button>
                  </div>
                </div>
              ))}
            </>
          )}
          {!pilih && tab === 'bantuan' && (
            <ul className="daftar-titik">
                <li>Seret bangunan atau lahan untuk memindahkan. Garis kuning adalah muka.</li>
                <li>Klik jalan, lalu seret titik birunya. Klik dua kali titik untuk menghapus.</li>
                <li>Titik jalan menempel otomatis ke ujung atau garis jalan lain (lingkaran oranye). Tahan Alt untuk menaruh bebas.</li>
                <li>Roda tetikus atau cubit untuk zoom; seret area kosong untuk menggeser.</li>
                <li>Panah menggeser 0,25 petak (Shift: 1), R memutar 15 derajat, Delete menghapus.</li>
                <li>Ctrl+Z mengurungkan, Ctrl+Y mengulang.</li>
                <li>Pohon, semak, dan lampu jalan disusun ulang otomatis dari jalan.</li>
              </ul>
          )}
          {po && (
            <>
              <h2>{pb ? jenisById.get(pb.jenis)!.nama : pl!.id}</h2>
              {pl && (
                <div className="editor-baris">
                  <label>Lebar <input type="number" step={0.5} min={2} value={pl.w} onChange={ubahAngka('w')} /></label>
                  <label>Dalam <input type="number" step={0.5} min={2} value={pl.d} onChange={ubahAngka('d')} /></label>
                </div>
              )}
              <div className="editor-baris">
                <label>x <input type="number" step={0.25} value={po.x} onChange={ubahAngka('x')} /></label>
                <label>z <input type="number" step={0.25} value={po.z} onChange={ubahAngka('z')} /></label>
                <label>Arah <input type="number" step={5} value={po.rot} onChange={ubahAngka('rot')} /></label>
              </div>
              <div className="editor-tombol">
                <button type="button" onClick={() => putar(-90)}>−90°</button>
                <button type="button" onClick={() => putar(-15)}>−15°</button>
                <button type="button" onClick={() => putar(15)}>+15°</button>
                <button type="button" onClick={() => putar(90)}>+90°</button>
              </div>
              <div className="editor-tombol">
                <button type="button" onClick={() => hadap(false)}>Hadapkan ke jalan</button>
                <button type="button" onClick={() => hadap(true)}>Hadapkan dan tempel</button>
              </div>
              <label className="editor-label">
                Distrik
                <select value={po.distrik} onChange={(e) => ubah(po.uid, (o) => ({ ...o, distrik: e.target.value }))}>
                  {daftarDistrik.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </label>
              {masalah.has(po.uid) && <p className="pesan galat">Menabrak jalan, sungai, laut, atau benda lain.</p>}
              <button type="button" className="tombol-sekunder" onClick={hapus}>Hapus</button>
            </>
          )}
          {pj && (
            <>
              <h2>{pj.nama}</h2>
              <label className="editor-label">Nama <input value={pj.nama} onChange={(e) => ubah(pj.uid, (o) => ({ ...o, nama: e.target.value }))} /></label>
              <div className="editor-baris">
                <label>Lebar <input type="number" step={0.2} min={1.2} max={6} value={pj.lebar} onChange={(e) => { const n = Number(e.target.value); if (n > 0) ubah(pj.uid, (o) => ({ ...o, lebar: n })) }} /></label>
                <label className="editor-cek"><input type="checkbox" checked={pj.tutup} onChange={(e) => ubah(pj.uid, (o) => ({ ...o, tutup: e.target.checked }))} /> Melingkar</label>
              </div>
              <p className="catatan">{pj.titik.length} titik kendali. Garis dihaluskan otomatis.</p>
              <div className="editor-tombol">
                <button
                  type="button"
                  onClick={() =>
                    ubah(pj.uid, (o) => {
                      const t = o.titik as J['titik']
                      const [a, b] = t.length >= 2 ? [t[t.length - 2], t[t.length - 1]] : [t[0], t[0]]
                      return { ...o, titik: [...t, [tepat(b[0] + (b[0] - a[0] || 4)), tepat(b[1] + (b[1] - a[1]))]] }
                    })
                  }
                >
                  Tambah titik di ujung
                </button>
                <button type="button" disabled={pj.titik.length <= 2} onClick={() => ubah(pj.uid, (o) => ({ ...o, titik: (o.titik as J['titik']).slice(0, -1) }))}>Hapus titik ujung</button>
              </div>
              <button type="button" className="tombol-sekunder" onClick={hapus}>Hapus jalan</button>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
