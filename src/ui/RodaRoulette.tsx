'use client'

// Roda roulette Eropa 2D (SVG) dengan bola. Angka sudah diundi server; di sini roda dan bola hanya dianimasikan supaya
// berhenti tepat di kantong itu: roda berputar searah jarum jam, bola berlawanan arah lalu turun dari lintasan ke kantong.
import { useEffect, useRef, useState } from 'react'
import { warnaKantong } from '@/server/sistem-aturan'

/** Urutan kantong roda Eropa searah jarum jam, mulai dari 0 di atas. */
const URUTAN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const SUDUT = 360 / URUTAN.length
const WARNA = { merah: '#c8322b', hitam: '#1f2529', hijau: '#2f9a4a' } as const
const DURASI = 5200
const R_LINTAS = 93
const R_KANTONG = 68

const rad = (d: number) => ((d - 90) * Math.PI) / 180
const titik = (r: number, d: number) => [r * Math.cos(rad(d)), r * Math.sin(rad(d))] as const

function juring(r1: number, r2: number, a: number, b: number) {
  const [x1, y1] = titik(r2, a), [x2, y2] = titik(r2, b), [x3, y3] = titik(r1, b), [x4, y4] = titik(r1, a)
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`
}

/** Gambar roda statis (tanpa bola), dihitung sekali. */
const KANTONG = URUTAN.map((n, i) => {
  const a = i * SUDUT - SUDUT / 2
  const [tx, ty] = titik(79, i * SUDUT)
  return (
    <g key={n}>
      <path d={juring(60, 88, a, a + SUDUT)} fill={WARNA[warnaKantong(n)]} stroke="#d9b45a" strokeWidth="0.6" />
      <path d={juring(56, 60, a, a + SUDUT)} fill={WARNA[warnaKantong(n)]} opacity="0.75" />
      <text x={tx} y={ty} transform={`rotate(${i * SUDUT} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="central" fontSize="7.2" fontWeight="800" fill="#fff">
        {n}
      </text>
    </g>
  )
})

const ease = (t: number) => 1 - (1 - t) ** 3

type Pose = { roda: number; bola: number; r: number }

/**
 * `nomor` = hasil putaran terakhir; `putaran` berubah setiap ada putaran baru (memicu animasi). `onSelesai` dipanggil saat bola
 * berhenti. Tanpa putaran baru, bola diam di kantong `nomor`.
 */
export function RodaRoulette({ nomor, putaran, menunggu = false, onSelesai }: { nomor: number | null; putaran: number; menunggu?: boolean; onSelesai?: () => void }) {
  const awal = useRef(putaran)
  const selesai = useRef(onSelesai)
  selesai.current = onSelesai
  const [pose, setPose] = useState<Pose>(() => ({ roda: 0, bola: nomor === null ? 0 : URUTAN.indexOf(nomor) * SUDUT, r: nomor === null ? R_LINTAS : R_KANTONG }))
  const posePada = useRef(pose)
  posePada.current = pose

  // sambil menunggu jawaban server: roda dan bola sudah berputar, lalu animasi hasil menyambung dari pose ini
  useEffect(() => {
    if (!menunggu) return
    let raf = 0
    let lalu = performance.now()
    const tik = (now: number) => {
      const dt = (now - lalu) / 1000
      lalu = now
      setPose((p) => ({ roda: p.roda + 200 * dt, bola: p.bola - 320 * dt, r: Math.min(R_LINTAS, p.r + 40 * dt) }))
      raf = requestAnimationFrame(tik)
    }
    raf = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(raf)
  }, [menunggu])

  useEffect(() => {
    if (putaran === awal.current || nomor === null) return
    awal.current = putaran
    const dari = posePada.current
    // roda: 2 sampai 3 putaran penuh searah jarum jam; bola: 5 sampai 6 putaran berlawanan arah, berakhir di kantong
    const rodaAkhir = dari.roda + 720 + Math.random() * 360
    // bola dihitung relatif terhadap roda: berlawanan arah (sudut relatif menurun), lalu ikut roda setelah masuk kantong
    const relAkhir = URUTAN.indexOf(nomor) * SUDUT
    const relMulai = relAkhir + 360 * 6 + ((((dari.bola - dari.roda - relAkhir) % 360) + 360) % 360)
    const t0 = performance.now()
    let raf = 0
    const tik = (now: number) => {
      const t = Math.min(1, (now - t0) / DURASI)
      const e = ease(t)
      // bola turun dari lintasan setelah 65% waktu, dengan pantulan kecil di bibir kantong
      const turun = Math.max(0, (t - 0.65) / 0.35)
      const pantul = turun > 0 && turun < 1 ? Math.sin(turun * Math.PI * 3) * (1 - turun) * 5 : 0
      const roda = dari.roda + (rodaAkhir - dari.roda) * e
      setPose({
        roda,
        bola: roda + relMulai + (relAkhir - relMulai) * ease(Math.min(1, t / 0.85)),
        r: R_LINTAS - (R_LINTAS - R_KANTONG) * ease(turun) + pantul,
      })
      if (t < 1) raf = requestAnimationFrame(tik)
      else selesai.current?.()
    }
    raf = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(raf)
  }, [putaran, nomor])

  const [bx, by] = titik(pose.r, pose.bola)
  return (
    <svg className="rl-roda" viewBox="-100 -100 200 200" role="img" aria-label={nomor === null ? 'Roda roulette' : `Bola di kantong ${nomor}`}>
      <defs>
        <radialGradient id="rl-kayu" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="1" stopColor="#4a2c12" />
        </radialGradient>
        <radialGradient id="rl-kerucut" cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#7a4c22" />
          <stop offset="1" stopColor="#3b220d" />
        </radialGradient>
        <radialGradient id="rl-bola" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#c9ced2" />
        </radialGradient>
      </defs>
      <circle r="99" fill="url(#rl-kayu)" />
      <circle r="96" fill="none" stroke="#d9b45a" strokeWidth="1.2" />
      <circle r="89.5" fill="#2a1a0c" />
      <g transform={`rotate(${pose.roda})`}>
        {KANTONG}
        <circle r="56" fill="url(#rl-kerucut)" stroke="#d9b45a" strokeWidth="1" />
        {[0, 90, 180, 270].map((d) => {
          const [x, y] = titik(42, d)
          return <line key={d} x1="0" y1="0" x2={x} y2={y} stroke="#e4c46e" strokeWidth="3" strokeLinecap="round" />
        })}
        <circle r="9" fill="#e4c46e" stroke="#9b7a2b" strokeWidth="1.5" />
        <circle r="3" fill="#9b7a2b" />
      </g>
      {(nomor !== null || menunggu) && <circle cx={bx} cy={by} r="4.2" fill="url(#rl-bola)" stroke="#6d7479" strokeWidth="0.5" />}
    </svg>
  )
}
