'use client'

// Adegan memancing 2D (SVG): dermaga, pemancing, joran, senar, pelampung, dan ikan. Semua gerak dihitung dari jam server yang
// sama dengan penilaian tarikan, jadi pelampung tenggelam tepat saat ikan menggigit. Animasi hasil (ikan terangkat atau lepas)
// diputar sebentar setelah server menjawab tarikan.
import { useEffect, useRef, useState } from 'react'
import { IkonBarang } from './IkonBarang'

export type FasePancing = 'diam' | 'tunggu' | 'gigit' | 'lewat'
type Hasil = { berhasil: boolean; barang?: string } | null

const LEMPAR_MS = 700
const HASIL_MS = 1800
const UJUNG_DIAM: [number, number] = [128, 34]
const TANGAN: [number, number] = [70, 104]

/**
 * `jam()` = waktu server sekarang (ms). `lempar`/`gigit` = waktu server sesi (ms) atau null. `hasil` + `hasilKe` (penghitung
 * yang naik tiap tarikan dijawab) memicu animasi hasil.
 */
export function AdeganPancing({ fase, jam, lempar, gigit, tengah, hasil, hasilKe, menarik = false }: {
  fase: FasePancing; jam: () => number; lempar: number | null; gigit: number | null; tengah: number; hasil: Hasil; hasilKe: number
  /** tombol Tarik sudah ditekan, jawaban server belum datang: joran ditarik dan pelampung mendekat */
  menarik?: boolean
}) {
  const [t, setT] = useState(0)
  const hasilMulai = useRef<number | null>(null)
  const hasilLama = useRef(hasilKe)
  if (hasilKe !== hasilLama.current) {
    hasilLama.current = hasilKe
    hasilMulai.current = performance.now()
  }
  useEffect(() => {
    let r = 0
    const tik = () => {
      setT(performance.now())
      r = requestAnimationFrame(tik)
    }
    r = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(r)
  }, [])

  const now = jam()
  const sasaran: [number, number] = [196 + tengah * 70, 124]
  const sejakHasil = hasilMulai.current === null ? Infinity : t - hasilMulai.current
  const animHasil = sejakHasil >= 0 && sejakHasil < HASIL_MS && hasil ? sejakHasil / HASIL_MS : null
  const mulaiTarik = useRef<number | null>(null)
  if (menarik && mulaiTarik.current === null) mulaiTarik.current = performance.now()
  if (!menarik) mulaiTarik.current = null

  // posisi pelampung
  let pelampung: [number, number] | null = null
  let ujung = UJUNG_DIAM
  let tegang = 0
  if (lempar !== null && fase !== 'diam') {
    const sejak = now - lempar
    if (sejak < LEMPAR_MS) {
      const u = sejak / LEMPAR_MS
      pelampung = [UJUNG_DIAM[0] + (sasaran[0] - UJUNG_DIAM[0]) * u, UJUNG_DIAM[1] + (sasaran[1] - UJUNG_DIAM[1]) * u - Math.sin(u * Math.PI) * 60]
      ujung = [UJUNG_DIAM[0] + 8 * Math.sin(u * Math.PI), UJUNG_DIAM[1] - 6 * Math.sin(u * Math.PI)]
    } else if (fase === 'tunggu') {
      pelampung = [sasaran[0], sasaran[1] + Math.sin(t / 420) * 1.6]
      ujung = [UJUNG_DIAM[0], UJUNG_DIAM[1] + Math.sin(t / 900) * 1.2]
    } else if (fase === 'gigit') {
      const s = Math.max(0, now - (gigit ?? now))
      pelampung = [sasaran[0] + Math.sin(t / 60) * 2, sasaran[1] + 6 + Math.sin(t / 90) * 3 + Math.min(4, s / 300)]
      tegang = 1
      ujung = [UJUNG_DIAM[0] + 14 + Math.sin(t / 70) * 2, UJUNG_DIAM[1] + 26 + Math.sin(t / 110) * 4]
    } else {
      pelampung = [sasaran[0], sasaran[1] + Math.sin(t / 420) * 1.2]
    }
  }

  if (menarik && mulaiTarik.current !== null && pelampung && animHasil === null) {
    const u = Math.min(1, (t - mulaiTarik.current) / 1500)
    pelampung = [sasaran[0] - 40 * u + Math.sin(t / 50) * 2, sasaran[1] + 4 + Math.sin(t / 70) * 2]
    ujung = [UJUNG_DIAM[0] - 18 + Math.sin(t / 60) * 3, UJUNG_DIAM[1] + 8 + Math.sin(t / 90) * 3]
    tegang = 1
  }

  // animasi hasil: ikan terangkat ke tangan, atau senar kendur dan ikan kabur
  let ikanTerbang: [number, number, number] | null = null
  if (animHasil !== null && hasil) {
    const u = Math.min(1, animHasil * 1.6)
    if (hasil.berhasil) {
      ikanTerbang = [sasaran[0] + (TANGAN[0] + 30 - sasaran[0]) * u, sasaran[1] + (TANGAN[1] - 40 - sasaran[1]) * u - Math.sin(u * Math.PI) * 70, -40 + u * 40]
      ujung = [UJUNG_DIAM[0] - 20 * Math.sin(u * Math.PI), UJUNG_DIAM[1] - 10 * Math.sin(u * Math.PI)]
      pelampung = ikanTerbang ? [ikanTerbang[0], ikanTerbang[1] + 6] : null
    } else {
      pelampung = [sasaran[0] - 30 * u, sasaran[1] + 2]
    }
  }

  const tali = pelampung
    ? `M${ujung[0]} ${ujung[1]} Q${(ujung[0] + pelampung[0]) / 2} ${Math.max(ujung[1], pelampung[1]) + (tegang ? 0 : 22)} ${pelampung[0]} ${pelampung[1] - 4}`
    : ''
  const gelombang = (y: number, geser: number, amp: number) => {
    let d = `M-20 ${y}`
    for (let x = -20; x <= 340; x += 20) d += ` Q${x + 10} ${y + amp * Math.sin((x + geser) / 20)} ${x + 20} ${y}`
    return d
  }
  const riak = fase === 'tunggu' || fase === 'gigit' ? ((t / (fase === 'gigit' ? 500 : 1600)) % 1) : null
  const kabur = animHasil !== null && hasil && !hasil.berhasil ? animHasil : fase === 'lewat' ? Math.min(1, (now - (gigit ?? now)) / 3000) : null

  return (
    <svg className="adegan-pancing" viewBox="0 0 320 190" role="img" aria-label={fase === 'gigit' ? 'Ikan menggigit' : fase === 'tunggu' ? 'Menunggu ikan' : 'Pantai Weton'}>
      <defs>
        <linearGradient id="ap-langit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc4e4" />
          <stop offset="1" stopColor="#d9f0f5" />
        </linearGradient>
        <linearGradient id="ap-laut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f9cc2" />
          <stop offset="1" stopColor="#14547a" />
        </linearGradient>
      </defs>
      <rect width="320" height="100" fill="url(#ap-langit)" />
      <circle cx="270" cy="30" r="14" fill="#ffe28a" />
      <path d="M230 100c10-14 30-16 44-6 8-6 20-4 26 6Z" fill="#5f9a6c" />
      <path d="M40 30c6-4 12-4 16 0 4-3 10-3 12 1-6 1-22 1-28-1Z" fill="#fff" opacity="0.85" />
      <path d="M170 18c5-3 10-3 13 0 4-2 8-2 10 1-5 1-18 1-23-1Z" fill="#fff" opacity="0.7" />
      <rect y="98" width="320" height="92" fill="url(#ap-laut)" />
      <path d={gelombang(104, t / 40, 1.5)} fill="none" stroke="#9fd6ea" strokeWidth="1.2" opacity="0.6" />
      <path d={gelombang(140, -t / 55, 2)} fill="none" stroke="#7cc0db" strokeWidth="1.2" opacity="0.45" />
      <path d={gelombang(172, t / 70, 2.5)} fill="none" stroke="#5aa9c9" strokeWidth="1.2" opacity="0.4" />

      {/* bayangan ikan di bawah pelampung */}
      {(fase === 'gigit' || kabur !== null) && (
        <ellipse
          cx={sasaran[0] + (kabur ?? 0) * 90 + Math.sin(t / 80) * (kabur === null ? 3 : 0)}
          cy={sasaran[1] + 16 + (kabur ?? 0) * 20}
          rx="14" ry="5" fill="#0b2f45" opacity={0.5 * (1 - (kabur ?? 0))}
        />
      )}
      {riak !== null && pelampung && (
        <ellipse cx={sasaran[0]} cy={sasaran[1] + 2} rx={4 + riak * 22} ry={1.5 + riak * 6} fill="none" stroke="#dff4fb" strokeWidth="1.2" opacity={1 - riak} />
      )}
      {fase === 'gigit' &&
        [0, 1, 2, 3].map((i) => {
          const a = (t / 160 + i * 1.6) % 1
          return <circle key={i} cx={sasaran[0] + (i - 1.5) * 7 * a} cy={sasaran[1] - 2 - Math.sin(a * Math.PI) * 10} r="1.6" fill="#e9f8fc" opacity={1 - a} />
        })}

      {/* dermaga */}
      <rect x="-4" y="110" width="104" height="9" rx="2" fill="#9a6a3a" stroke="#5b3a1c" strokeWidth="1.4" />
      {[10, 40, 72].map((x) => (
        <rect key={x} x={x} y="118" width="7" height="60" fill="#7a4f28" stroke="#5b3a1c" strokeWidth="1.2" />
      ))}
      <path d="M4 114h90" stroke="#b9854f" strokeWidth="1" />

      {/* pemancing: kepala dan badan */}
      <g>
        <path d="M44 110c0-16 6-24 16-24s14 8 14 24Z" fill="#2f6fa8" stroke="#1d2a30" strokeWidth="1.4" />
        <circle cx="60" cy="76" r="10" fill="#e8b48a" stroke="#1d2a30" strokeWidth="1.4" />
        <path d="M48 74c2-9 22-9 24 0Z" fill="#f2c94c" stroke="#1d2a30" strokeWidth="1.2" />
        <path d="M45 74h30" stroke="#d9a92e" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="64" cy="78" r="1.2" fill="#1d2a30" />
        <path d="M66 96 70 104" stroke="#e8b48a" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* joran */}
      <path d={`M${TANGAN[0] - 6} ${TANGAN[1] + 6} Q${(TANGAN[0] + ujung[0]) / 2 + (tegang ? 8 : 0)} ${(TANGAN[1] + ujung[1]) / 2 - (tegang ? 4 : 10)} ${ujung[0]} ${ujung[1]}`} fill="none" stroke="#3b2a1a" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx={TANGAN[0] - 2} cy={TANGAN[1] + 3} r="3" fill="#6b6f73" stroke="#1d2a30" strokeWidth="1" />
      {tali && <path d={tali} fill="none" stroke="#f4f7f8" strokeWidth="0.9" opacity="0.9" />}

      {pelampung && !ikanTerbang && (
        <g transform={`translate(${pelampung[0]} ${pelampung[1]})`}>
          <ellipse rx="4" ry="5.5" cy="-2" fill="#e8402f" stroke="#1d2a30" strokeWidth="1" />
          <rect x="-4" y="-2" width="8" height="3.5" fill="#fff" />
          <path d="M0 -7.5v-4" stroke="#1d2a30" strokeWidth="1" />
        </g>
      )}
      {ikanTerbang && hasil?.barang && (
        <g transform={`translate(${ikanTerbang[0] - 16} ${ikanTerbang[1] - 16}) rotate(${ikanTerbang[2]} 16 16)`}>
          <IkonBarang id={hasil.barang} jenis="bahan" ukuran={32} latar={false} />
        </g>
      )}
      {fase === 'gigit' && (
        <g transform={`translate(60 ${52 + Math.sin(t / 120) * 2})`}>
          <path d="M-9 -12h18v14H4l-4 5-4-5h-5Z" fill="#ffc933" stroke="#1d2a30" strokeWidth="1.3" />
          <text y="-1" textAnchor="middle" fontSize="12" fontWeight="900" fill="#1d2a30">!</text>
        </g>
      )}
      {animHasil !== null && hasil?.berhasil &&
        [0, 1, 2, 3, 4].map((i) => {
          const a = (animHasil * 2 + i * 0.2) % 1
          const [x, y] = [TANGAN[0] + 30 + Math.cos(i * 1.3) * 26 * a, TANGAN[1] - 40 + Math.sin(i * 1.3) * 20 * a]
          return <path key={i} d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2Z`} fill="#ffe28a" opacity={1 - a} />
        })}
    </svg>
  )
}
