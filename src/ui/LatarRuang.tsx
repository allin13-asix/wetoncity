// Latar 2D ruang obrolan berwujud dalam proyeksi isometrik (viewBox 1000x700): lantai belah ketupat dengan sudut
// atas (500,70), kanan (960,350), bawah (500,630), kiri (40,350). Posisi ruang (x, y) 0..1 dipetakan oleh `layar`.
import type { ReactNode } from 'react'

export const layar = (x: number, y: number) => [500 + 460 * (x - y), 70 + 280 * (x + y)] as const
/** Kebalikan `layar`: titik layar ke posisi ruang, dijepit di dalam lantai. */
export function ruangDari(sx: number, sy: number) {
  const a = (sx - 500) / 460
  const b = (sy - 70) / 280
  const j = (v: number) => Math.min(0.95, Math.max(0.05, v))
  return [j((a + b) / 2), j((b - a) / 2)] as const
}

const LANTAI = 'M500 70 960 350 500 630 40 350Z'

function pohon(x: number, y: number, s = 1, warna = '#2f7d4f') {
  const [sx, sy] = layar(x, y)
  return (
    <g key={`p${x}${y}`} transform={`translate(${sx} ${sy}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="34" ry="12" fill="#000" opacity="0.18" />
      <rect x="-5" y="-40" width="10" height="44" rx="3" fill="#6b4626" />
      <circle cx="0" cy="-62" r="36" fill={warna} />
      <circle cx="-12" cy="-72" r="16" fill="#fff" opacity="0.12" />
    </g>
  )
}

function lampu(x: number, y: number, malam: boolean) {
  const [sx, sy] = layar(x, y)
  return (
    <g key={`l${x}${y}`} transform={`translate(${sx} ${sy})`}>
      {malam && <ellipse cx="0" cy="0" rx="70" ry="30" fill="#ffe9a8" opacity="0.22" />}
      <rect x="-3" y="-80" width="6" height="80" fill="#3a4a52" />
      <circle cx="0" cy="-84" r="9" fill={malam ? '#fff2b8' : '#e9eef0'} />
      {malam && <circle cx="0" cy="-84" r="26" fill="#ffe9a8" opacity="0.35" />}
    </g>
  )
}

function bangku(x: number, y: number, putar = false) {
  const [sx, sy] = layar(x, y)
  return (
    <g key={`b${x}${y}`} transform={`translate(${sx} ${sy}) ${putar ? 'scale(-1 1)' : ''}`}>
      <path d="M-40 -6 0 -26 40 -6 0 14Z" fill="#8a5a33" />
      <path d="M-40 -6 0 14v8l-40-20Z" fill="#6b4626" />
      <path d="M0 14 40 -6v8L0 22Z" fill="#5b3a1e" />
      <path d="M-40 -6v-20l40-20v20Z" fill="#7a4f2a" />
    </g>
  )
}

function bunga(x: number, y: number, warna: string) {
  const [sx, sy] = layar(x, y)
  return (
    <g key={`f${x}${y}`} transform={`translate(${sx} ${sy})`}>
      <ellipse cx="0" cy="0" rx="26" ry="10" fill="#3f8a4a" />
      {[-14, -4, 8, 16].map((dx, i) => <circle key={dx} cx={dx} cy={-4 - (i % 2) * 4} r="5" fill={warna} />)}
    </g>
  )
}

/** Alun-alun: lantai paving dengan jalan silang, air mancur di tengah, beringin kembar, bangku, dan lampu taman. */
function Alun({ malam }: { malam: boolean }) {
  const [cx, cy] = layar(0.5, 0.5)
  return (
    <>
      <path d={LANTAI} fill="#4f8a5a" />
      <path d={`M${layar(0.42, 0)} L${layar(0.58, 0)} L${layar(0.58, 1)} L${layar(0.42, 1)}Z`} fill="#d9ccb4" />
      <path d={`M${layar(0, 0.42)} L${layar(0, 0.58)} L${layar(1, 0.58)} L${layar(1, 0.42)}Z`} fill="#d9ccb4" />
      <ellipse cx={cx} cy={cy} rx="170" ry="96" fill="#e5dac4" />
      <ellipse cx={cx} cy={cy} rx="92" ry="52" fill="#9db7c4" stroke="#7a8f99" strokeWidth="6" />
      <ellipse cx={cx} cy={cy} rx="70" ry="38" fill="#4c9cc9" />
      <rect x={cx - 8} y={cy - 60} width="16" height="56" rx="6" fill="#9db7c4" />
      <path d={`M${cx} ${cy - 62}c-24 -10 -34 4 -40 22M${cx} ${cy - 62}c24 -10 34 4 40 22`} fill="none" stroke="#bfe6f5" strokeWidth="4" opacity="0.8" />
      {pohon(0.15, 0.2, 1.1, '#2d6f45')}
      {pohon(0.2, 0.15, 1.1, '#2d6f45')}
      {pohon(0.85, 0.82, 1)}
      {pohon(0.12, 0.82, 0.9)}
      {pohon(0.88, 0.15, 0.9)}
      {bangku(0.33, 0.22)}
      {bangku(0.72, 0.68, true)}
      {bangku(0.24, 0.66)}
      {lampu(0.36, 0.36, malam)}
      {lampu(0.64, 0.64, malam)}
      {lampu(0.36, 0.64, malam)}
      {lampu(0.64, 0.36, malam)}
      {bunga(0.12, 0.4, '#f06d8a')}
      {bunga(0.8, 0.3, '#ffd34d')}
    </>
  )
}

/** Taman kota: rumput, jalan setapak melengkung, kolam ikan, petak bunga, gazebo, dan pepohonan. */
function Taman({ malam }: { malam: boolean }) {
  const [kx, ky] = layar(0.68, 0.3)
  const [gx, gy] = layar(0.28, 0.62)
  return (
    <>
      <path d={LANTAI} fill="#5c9c58" />
      <path d={`M${layar(0, 0.5)} Q${layar(0.5, 0.2)} ${layar(1, 0.5)}`} fill="none" stroke="#e1d3b2" strokeWidth="44" strokeLinecap="round" />
      <path d={`M${layar(0.5, 0)} Q${layar(0.4, 0.6)} ${layar(0.6, 1)}`} fill="none" stroke="#e1d3b2" strokeWidth="38" strokeLinecap="round" />
      <ellipse cx={kx} cy={ky} rx="120" ry="58" fill="#3d8fb8" stroke="#a7a39a" strokeWidth="8" />
      <ellipse cx={kx - 30} cy={ky - 8} rx="10" ry="4" fill="#f08a3c" />
      <ellipse cx={kx + 26} cy={ky + 10} rx="9" ry="4" fill="#fff" />
      <circle cx={kx + 50} cy={ky - 16} r="12" fill="#4caf63" />
      <g transform={`translate(${gx} ${gy})`}>
        <ellipse cx="0" cy="10" rx="90" ry="36" fill="#000" opacity="0.15" />
        <path d="M-70 0 0 -34 70 0 0 34Z" fill="#c9a776" />
        {[[-60, 0], [60, 0], [0, -28], [0, 28]].map(([x, y]) => <rect key={`${x}${y}`} x={x - 4} y={y - 70} width="8" height="70" fill="#7a4f2a" />)}
        <path d="M-86 -66 0 -120 86 -66 0 -20Z" fill="#b5462f" />
        <path d="M-86 -66 0 -20 86 -66" fill="none" stroke="#8a321f" strokeWidth="4" />
      </g>
      {pohon(0.1, 0.12, 1.1, '#2f7d4f')}
      {pohon(0.9, 0.86, 1.1, '#3a8c58')}
      {pohon(0.12, 0.9, 0.9, '#2d6f45')}
      {pohon(0.92, 0.6, 0.85)}
      {bunga(0.3, 0.2, '#f06d8a')}
      {bunga(0.42, 0.14, '#ffd34d')}
      {bunga(0.78, 0.7, '#b98cf0')}
      {bunga(0.56, 0.86, '#f06d8a')}
      {bangku(0.55, 0.52)}
      {lampu(0.45, 0.4, malam)}
      {lampu(0.7, 0.75, malam)}
    </>
  )
}

/** Dalam gedung hunian: lantai papan, dua dinding belakang, jendela, sofa, meja, rak, TV, dan tanaman. */
function Hunian({ malam }: { malam: boolean }) {
  const papan: ReactNode[] = []
  for (let i = 1; i < 10; i++) {
    const a = layar(i / 10, 0), b = layar(i / 10, 1)
    papan.push(<line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#8a5a33" strokeWidth="2" opacity="0.35" />)
  }
  const [sx, sy] = layar(0.15, 0.55)
  const [mx, my] = layar(0.5, 0.55)
  const [tx, ty] = layar(0.55, 0.08)
  return (
    <>
      {/* dinding kiri dan kanan */}
      <path d="M40 350 500 70V-60L40 220Z" fill="#e8dcc6" />
      <path d="M500 70 960 350V220L500 -60Z" fill="#d8c8ae" />
      <path d="M40 350 500 70 960 350" fill="none" stroke="#b49a76" strokeWidth="8" />
      <path d="M150 230 300 140v-90L150 140Z" fill={malam ? '#1f3556' : '#9fd3ea'} stroke="#fff" strokeWidth="8" />
      <path d="M225 185v-90M150 185l150-90" stroke="#fff" strokeWidth="5" opacity="0.8" />
      <path d={LANTAI} fill="#c08a52" />
      {papan}
      <path d={`M${layar(0.3, 0.35)} L${layar(0.7, 0.35)} L${layar(0.7, 0.75)} L${layar(0.3, 0.75)}Z`} fill="#b5462f" opacity="0.85" />
      <path d={`M${layar(0.34, 0.39)} L${layar(0.66, 0.39)} L${layar(0.66, 0.71)} L${layar(0.34, 0.71)}Z`} fill="none" stroke="#f0c47a" strokeWidth="4" />
      {/* TV dan rak di dinding kanan */}
      <g transform={`translate(${tx} ${ty})`}>
        <path d="M-60 0 0 -36 60 0 0 36Z" fill="#6b4626" />
        <path d="M-60 0v18l60 36V36ZM60 0v18L0 54V36Z" fill="#5b3a1e" />
        <path d="M-40 -16 30 -58v-70l-70 42Z" fill="#1d2a30" stroke="#3a4a52" strokeWidth="5" />
        {malam && <path d="M-34 -22 24 -57v-58l-58 35Z" fill="#3a7fc1" opacity="0.7" />}
      </g>
      {/* sofa di sisi kiri */}
      <g transform={`translate(${sx} ${sy})`}>
        <path d="M-50 -10 30 -58 80 -28 0 20Z" fill="#3f6fa8" />
        <path d="M-50 -10 0 20v24l-50-30Z" fill="#2f5684" />
        <path d="M0 20 80 -28v24L0 44Z" fill="#26476e" />
        <path d="M-50 -10v-40l80-48v40Z" fill="#4a7fbd" />
      </g>
      {/* meja kopi */}
      <g transform={`translate(${mx} ${my})`}>
        <path d="M-50 0 0 -30 50 0 0 30Z" fill="#8a5a33" />
        <path d="M-50 0v10l50 30V30ZM50 0v10L0 40V30Z" fill="#6b4626" />
        <ellipse cx="-6" cy="-4" rx="10" ry="5" fill="#fff" />
        <ellipse cx="14" cy="4" rx="7" ry="4" fill="#f2c94c" />
      </g>
      {pohon(0.9, 0.12, 0.55, '#3a8c58')}
      {pohon(0.08, 0.9, 0.5, '#3a8c58')}
      {malam && <path d={LANTAI} fill="#ffe9a8" opacity="0.06" />}
    </>
  )
}

export type JenisLatar = 'alun' | 'taman' | 'hunian'

export function LatarRuang({ jenis, malam }: { jenis: JenisLatar; malam: boolean }) {
  return (
    <svg className="latar-ruang" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lr-langit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={malam ? '#141a3a' : '#8ccbe6'} />
          <stop offset="1" stopColor={malam ? '#25306a' : '#d8f0f6'} />
        </linearGradient>
      </defs>
      <rect width="1000" height="700" fill={jenis === 'hunian' ? (malam ? '#2a2420' : '#efe6d6') : 'url(#lr-langit)'} />
      {jenis !== 'hunian' && malam && (
        <>
          <circle cx="880" cy="90" r="30" fill="#f4f1d0" />
          <circle cx="894" cy="80" r="28" fill="#141a3a" />
          {[[120, 60], [260, 120], [700, 50], [820, 200], [60, 220], [400, 30]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#fff" opacity="0.7" />)}
        </>
      )}
      {jenis !== 'hunian' && (
        <>
          <path d="M40 350 500 630v24L40 374Z" fill="#6b4626" />
          <path d="M500 630 960 350v24L500 654Z" fill="#5b3a1e" />
        </>
      )}
      {jenis === 'alun' ? <Alun malam={malam} /> : jenis === 'taman' ? <Taman malam={malam} /> : <Hunian malam={malam} />}
      {malam && jenis !== 'hunian' && <path d={LANTAI} fill="#0b1236" opacity="0.28" />}
    </svg>
  )
}
