// Aset 2D barang: ikon SVG kecil per barang (viewBox 48x48). Barang bawaan memakai gambar khusus; barang buatan Wali Kota
// memakai salah satu BENTUK dengan warna pilihannya. Tanpa berkas gambar, jadi ringan dan tajam di semua ukuran.
import type { ReactNode } from 'react'
import type { Bentuk } from '@/data/bentuk'

export { BENTUK, NAMA_BENTUK, type Bentuk } from '@/data/bentuk'

const garis = { stroke: '#1d2a30', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

function ikan(badan: string, perut: string, sirip = badan): ReactNode {
  return (
    <>
      <path d="M34 24 44 15v18Z" fill={sirip} {...garis} />
      <path d="M5 24c5-9 15-12 24-9 4 1 6 5 6 9s-2 8-6 9c-9 3-19 0-24-9Z" fill={badan} {...garis} />
      <path d="M8 26c6 4 14 6 22 4" fill="none" stroke={perut} strokeWidth="3" strokeLinecap="round" />
      <path d="M18 16c3-4 7-5 10-4" fill="none" stroke={sirip} strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="22" r="2.2" fill="#fff" stroke="#1d2a30" strokeWidth="1" />
      <circle cx="12.4" cy="22" r="1" fill="#1d2a30" />
    </>
  )
}

function botol(isi: string, label: string): ReactNode {
  return (
    <>
      <rect x="20" y="5" width="8" height="6" rx="1.5" fill="#e9eef0" {...garis} />
      <path d="M19 11h10l3 6v23a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V17Z" fill={isi} {...garis} />
      <rect x="16.8" y="22" width="14.4" height="10" fill={label} stroke="#1d2a30" strokeWidth="1" />
      <path d="M20 14v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </>
  )
}

function gelas(isi: string, panas = false, es = false): ReactNode {
  return (
    <>
      {panas && <path d="M19 10c-2-3 2-4 0-7M25 10c-2-3 2-4 0-7M31 10c-2-3 2-4 0-7" fill="none" stroke="#9fb2b8" strokeWidth="1.8" strokeLinecap="round" />}
      <path d="M12 13h24l-3 29H15Z" fill="#e8f4f7" fillOpacity="0.7" {...garis} />
      <path d="M13.6 20h20.8l-2.2 20.5H15.8Z" fill={isi} />
      {es && (
        <>
          <rect x="17" y="21" width="6" height="6" rx="1" fill="#fff" opacity="0.8" transform="rotate(-12 20 24)" />
          <rect x="25" y="23" width="6" height="6" rx="1" fill="#fff" opacity="0.8" transform="rotate(10 28 26)" />
        </>
      )}
      <path d="M12 13h24l-3 29H15Z" fill="none" {...garis} />
    </>
  )
}

/** Gambar umum per bentuk, dipakai untuk barang buatan Wali Kota. */
export function gambarBentuk(b: Bentuk, w: string): ReactNode {
  switch (b) {
    case 'kotak':
      return (
        <>
          <path d="M8 17 24 9l16 8v18l-16 8-16-8Z" fill={w} {...garis} />
          <path d="M8 17l16 8 16-8M24 25v18" fill="none" {...garis} />
          <path d="M16 13l16 8v6" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
        </>
      )
    case 'botol':
      return botol(w, '#fff')
    case 'gelas':
      return gelas(w, false, true)
    case 'bungkus':
      return (
        <>
          <path d="M8 22c0-8 7-12 16-12s16 4 16 12v12c0 4-4 6-16 6S8 38 8 34Z" fill={w} {...garis} />
          <path d="M24 10v30M8 24c8 3 24 3 32 0" fill="none" {...garis} />
          <path d="M20 8c2 2 6 2 8 0" fill="none" stroke="#7a5a2a" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    case 'ikan':
      return ikan(w, '#f3f6f7')
    case 'permata':
      return (
        <>
          <path d="M12 18 18 9h12l6 9-12 22Z" fill={w} {...garis} />
          <path d="M12 18h24M18 9l6 9 6-9M24 18v22" fill="none" stroke="#1d2a30" strokeWidth="1" opacity="0.6" />
          <path d="M17 13l3 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
      )
    case 'koin':
      return (
        <>
          <ellipse cx="24" cy="27" rx="15" ry="15" fill="#b8892a" {...garis} />
          <ellipse cx="24" cy="24" rx="15" ry="15" fill={w} {...garis} />
          <circle cx="24" cy="24" r="10" fill="none" stroke="#1d2a30" strokeWidth="1" opacity="0.5" />
          <path d="M24 17v14M20 20h7a3 3 0 0 1 0 6h-6" fill="none" stroke="#1d2a30" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </>
      )
    case 'buku':
      return (
        <>
          <path d="M10 9h24a4 4 0 0 1 4 4v28H14a4 4 0 0 1-4-4Z" fill={w} {...garis} />
          <path d="M14 33h24v8H14a4 4 0 0 1 0-8Z" fill="#f4efe1" {...garis} />
          <path d="M17 16h14M17 21h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
      )
    case 'bunga':
      return (
        <>
          <path d="M24 26v17M24 36c-4-4-9-3-10-1 3 2 7 2 10 1Z" fill="#4c9a52" stroke="#2c5e31" strokeWidth="1.4" />
          {[0, 72, 144, 216, 288].map((d) => (
            <ellipse key={d} cx="24" cy="12" rx="5" ry="8" fill={w} {...garis} transform={`rotate(${d} 24 19)`} />
          ))}
          <circle cx="24" cy="19" r="4.5" fill="#ffd34d" {...garis} />
        </>
      )
    case 'kue':
      return (
        <>
          <path d="M8 26h32v12a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3Z" fill="#e9c58b" {...garis} />
          <path d="M8 26c0-6 7-10 16-10s16 4 16 10c-3 3-5 0-8 3-3-3-5 1-8-1-3 2-5-2-8 1-3-3-5 0-8-3Z" fill={w} {...garis} />
          <circle cx="24" cy="12" r="3.2" fill="#d23b3b" {...garis} />
        </>
      )
    case 'kain':
      return (
        <>
          <path d="M8 12h32v22l-6 6H8Z" fill={w} {...garis} />
          <path d="M34 40v-6h6" fill="#fff" fillOpacity="0.6" {...garis} />
          <path d="M12 18c4 3 8-3 12 0s8-3 12 0M12 26c4 3 8-3 12 0s8-3 12 0" fill="none" stroke="#fff" strokeWidth="1.8" opacity="0.7" />
        </>
      )
    case 'tas':
      return (
        <>
          <path d="M17 16v-3a7 7 0 0 1 14 0v3" fill="none" {...garis} strokeWidth="2.2" />
          <path d="M9 16h30l-3 26H12Z" fill={w} {...garis} />
          <path d="M14 23h20" stroke="#fff" strokeWidth="2" opacity="0.6" />
        </>
      )
  }
}

/** Gambar khusus barang bawaan permainan. */
const KHUSUS: Record<string, () => ReactNode> = {
  ikan: () => ikan('#7fa7b8', '#dfe9ec'),
  'ikan-kembung': () => ikan('#5c8fb0', '#d9e6ec', '#3f6f8e'),
  'ikan-tongkol': () => ikan('#2f4f7a', '#c9d6df', '#24395a'),
  'ikan-kakap': () => ikan('#d2553e', '#f6c8b8', '#a83b28'),
  'ikan-tuna': () => ikan('#1f3756', '#b9c7d2', '#e4b93a'),
  'cumi-cumi': () => (
    <>
      <path d="M24 4c7 4 9 12 8 22H16c-1-10 1-18 8-22Z" fill="#f1b4b4" {...garis} />
      <path d="M17 26c-2 6-5 10-7 14M21 26c-1 7-2 11-3 16M27 26c1 7 2 11 3 16M31 26c2 6 5 10 7 14M24 26v16" fill="none" stroke="#d9827f" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20.5" cy="20" r="2" fill="#1d2a30" /><circle cx="27.5" cy="20" r="2" fill="#1d2a30" />
    </>
  ),
  lobster: () => (
    <>
      <path d="M14 14c-6-4-9 2-6 6 3 3 7 1 8-2M34 14c6-4 9 2 6 6-3 3-7 1-8-2" fill="#d4422f" {...garis} />
      <path d="M18 14c0-4 3-6 6-6s6 2 6 6l-1 18H19Z" fill="#e0533b" {...garis} />
      <path d="M19 20h10M19 25h10M19 30h10" stroke="#9e2a1c" strokeWidth="1.4" />
      <path d="M19 32l-3 9h16l-3-9Z" fill="#c53c2a" {...garis} />
      <path d="M21 8 15 2M27 8l6-6" stroke="#9e2a1c" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  beras: () => (
    <>
      <path d="M12 14c0-3 3-5 12-5s12 2 12 5l3 24c0 3-5 5-15 5S9 41 9 38Z" fill="#efe6cf" {...garis} />
      <path d="M14 13c3 3 17 3 20 0" fill="none" {...garis} />
      <rect x="15" y="22" width="18" height="10" rx="2" fill="#4c9a52" stroke="#1d2a30" strokeWidth="1" />
      <path d="M19 27h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  'es-teh': () => gelas('#c46a1f', false, true),
  'kopi-tubruk': () => (
    <>
      <path d="M17 10c-2-3 2-4 0-7M24 10c-2-3 2-4 0-7" fill="none" stroke="#9fb2b8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 16h26v14a10 10 0 0 1-10 10h-6A10 10 0 0 1 8 30Z" fill="#f4f1ea" {...garis} />
      <path d="M34 20h3a4 4 0 0 1 0 8h-3" fill="none" {...garis} />
      <ellipse cx="21" cy="17.5" rx="11.5" ry="2.6" fill="#3b2314" />
      <path d="M6 42h32" {...garis} />
    </>
  ),
  'pisang-goreng': () => (
    <>
      <ellipse cx="24" cy="36" rx="19" ry="6" fill="#e9eef0" {...garis} />
      <path d="M9 32c2-10 10-16 14-15s-2 9-6 14Z" fill="#d99a2b" {...garis} />
      <path d="M20 33c3-11 10-17 15-16 3 1-2 10-8 15Z" fill="#e7ae3d" {...garis} />
      <path d="M14 26l2 1M27 22l2 1M24 28l2 1" stroke="#a8691b" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  'jamu-kunyit': () => botol('#f0a21d', '#5b8f3a'),
  'nasi-bungkus': () => (
    <>
      <path d="M6 30 24 16l18 14-18 13Z" fill="#4f9a3e" {...garis} />
      <path d="M6 30 24 22l18 8M24 22v21" fill="none" stroke="#2f6526" strokeWidth="1.4" />
      <path d="M14 12h20l-2 7H16Z" fill="#f4f1ea" {...garis} />
      <path d="M22 10v-4" stroke="#7a5a2a" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  'roti-sobek': () => (
    <>
      <path d="M7 30c0-10 6-16 17-16s17 6 17 16v6H7Z" fill="#e2a25a" {...garis} />
      <path d="M16 17c-2 6-2 13 0 19M24 14v22M32 17c2 6 2 13 0 19" fill="none" stroke="#b67433" strokeWidth="1.6" />
      <rect x="7" y="34" width="34" height="5" rx="2" fill="#c98a45" {...garis} />
    </>
  ),
  'mi-instan': () => (
    <>
      <path d="M8 10h32l-2 30H10Z" fill="#f2d03b" {...garis} />
      <path d="M8 10l2 4h28l2-4M10 36h28" fill="none" {...garis} />
      <path d="M16 22c2-3 4 3 6 0s4 3 6 0 4 3 6 0" fill="none" stroke="#c4561d" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="30" r="3" fill="#d6332b" />
    </>
  ),
  'air-mineral': () => botol('#bfe6f5', '#2b7fc1'),
  'susu-uht': () => (
    <>
      <path d="M14 14 24 6l10 8v28H14Z" fill="#fff" {...garis} />
      <path d="M14 14h20" {...garis} />
      <path d="M14 24h20v12H14Z" fill="#7b4a2a" />
      <path d="M14 14h20v28H14Z" fill="none" {...garis} />
      <path d="M28 6v6" stroke="#2b7fc1" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  biskuit: () => (
    <>
      <circle cx="19" cy="26" r="12" fill="#d9a35b" {...garis} />
      <circle cx="29" cy="22" r="12" fill="#e4b26a" {...garis} />
      {[[25, 18], [32, 17], [29, 25], [35, 24]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="#9a6427" />
      ))}
    </>
  ),
  'minuman-energi': () => (
    <>
      <path d="M15 8h18v32a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3Z" fill="#1f2f5c" {...garis} />
      <path d="M15 8h18v4H15Z" fill="#c9d1d6" {...garis} />
      <path d="M26 16 20 27h5l-3 10 8-13h-5l3-8Z" fill="#ffd34d" stroke="#1d2a30" strokeWidth="1" />
    </>
  ),
  'perangko-lawas': () => (
    <>
      <path d="M9 8h30v32H9Z" fill="#f4ead3" stroke="#1d2a30" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
      <rect x="13" y="12" width="22" height="20" fill="#7aa8b8" stroke="#1d2a30" strokeWidth="1" />
      <path d="M13 28l7-7 5 5 4-3 6 7" fill="#4c7a52" />
      <circle cx="29" cy="17" r="3" fill="#ffd34d" />
      <path d="M14 36h10" stroke="#a33b2a" strokeWidth="2" />
    </>
  ),
  'miniatur-monaz': () => (
    <>
      <path d="M21 10h6l2 22h-10Z" fill="#f4f1ea" {...garis} />
      <path d="M24 3c3 2 3 5 0 7-3-2-3-5 0-7Z" fill="#f2b51d" {...garis} />
      <path d="M14 32h20l3 6H11Z" fill="#dcd7cc" {...garis} />
      <rect x="8" y="38" width="32" height="5" rx="1" fill="#b9b3a6" {...garis} />
    </>
  ),
  'batik-tulis': () => (
    <>
      <path d="M7 13h34v22l-7 7H7Z" fill="#7b3d1f" {...garis} />
      {[[14, 20], [26, 20], [20, 29], [32, 29], [14, 37]].map(([x, y]) => (
        <g key={`${x}${y}`} fill="none" stroke="#f0c47a" strokeWidth="1.4">
          <circle cx={x} cy={y} r="3.5" />
          <path d={`M${x - 3.5} ${y}h7M${x} ${y - 3.5}v7`} />
        </g>
      ))}
      <path d="M34 42v-7h7" fill="#a85a2c" {...garis} />
    </>
  ),
  'kerang-mutiara': () => (
    <>
      <path d="M6 28c2-12 10-18 18-18s16 6 18 18Z" fill="#e9b7a8" {...garis} />
      <path d="M24 10v18M15 13l4 15M33 13l-4 15M9 19l7 9M39 19l-7 9" fill="none" stroke="#b97a6a" strokeWidth="1.4" />
      <path d="M6 28c4 8 32 8 36 0" fill="#d9a291" {...garis} />
      <circle cx="24" cy="31" r="4.5" fill="#f7f4ff" stroke="#9a96b0" strokeWidth="1.2" />
      <circle cx="22.6" cy="29.6" r="1.3" fill="#fff" />
    </>
  ),
  'wayang-kulit': () => (
    <>
      <path d="M24 4v40" stroke="#7a5a2a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 8c4-2 8 0 8 4 0 2-2 3-3 4l2 2-3 2v14l4 6H18l3-6V20l-4-3 3-3c-1-3 0-5 2-6Z" fill="#2b2b2b" stroke="#c99a3a" strokeWidth="1.2" />
      <path d="M21 22 10 30M27 22l10 6" stroke="#2b2b2b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="12" r="1" fill="#f2c94c" />
    </>
  ),
  'keris-mini': () => (
    <>
      <path d="M24 30c-3-3 3-5 0-8s3-5 0-8 3-5 0-9c-2 4-4 6-2 9s-3 5 0 8-3 5 0 8Z" fill="#b8c2c8" {...garis} />
      <path d="M17 30h14l-2 3H19Z" fill="#c99a3a" {...garis} />
      <path d="M21 33h6l1 9c0 2-8 2-8 0Z" fill="#6b3d1e" {...garis} />
    </>
  ),
  'akik-bacan': () => (
    <>
      <path d="M14 30c-3 8 23 8 20 0" fill="none" stroke="#c0c6ca" strokeWidth="3" />
      <ellipse cx="24" cy="22" rx="11" ry="13" fill="#2f9a6a" {...garis} />
      <ellipse cx="24" cy="22" rx="6" ry="8" fill="#5ed19a" opacity="0.6" />
      <path d="M19 15c1-2 3-3 5-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  'lukisan-pelabuhan': () => (
    <>
      <rect x="5" y="9" width="38" height="30" rx="2" fill="#a4762f" {...garis} />
      <rect x="10" y="14" width="28" height="20" fill="#f3a35a" />
      <rect x="10" y="26" width="28" height="8" fill="#2b5f86" />
      <circle cx="28" cy="24" r="4" fill="#ffd34d" />
      <path d="M14 26l2-6h2l1 6M14 29h8" stroke="#1d2a30" strokeWidth="1.2" fill="none" />
      <rect x="10" y="14" width="28" height="20" fill="none" stroke="#1d2a30" strokeWidth="1" />
    </>
  ),
}

/** Warna latar lembut per jenis barang. */
const LATAR: Record<string, string> = { bahan: '#dfeff3', konsumsi: '#fbefd9', koleksi: '#efe6fb', lain: '#e8eef0' }

export type IkonKustom = { bentuk: Bentuk; warna: string }

/**
 * Ikon satu barang. `kustom` dipakai untuk barang buatan Wali Kota (atau barang yang tidak punya gambar khusus).
 * `jenis` mewarnai latar bulatnya.
 */
export function IkonBarang({ id, jenis = 'lain', kustom, ukuran = 40, latar = true }: { id: string; jenis?: string; kustom?: IkonKustom | null; ukuran?: number; latar?: boolean }) {
  const isi = KHUSUS[id]?.() ?? gambarBentuk(kustom?.bentuk ?? 'kotak', kustom?.warna ?? '#8aa0aa')
  return (
    <svg className="ikon-barang" width={ukuran} height={ukuran} viewBox="0 0 48 48" aria-hidden="true">
      {latar && <rect width="48" height="48" rx="12" fill={LATAR[jenis] ?? LATAR.lain} />}
      {isi}
    </svg>
  )
}

export const adaGambarKhusus = (id: string) => Object.hasOwn(KHUSUS, id)
