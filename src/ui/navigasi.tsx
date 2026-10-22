// Satu sumber daftar navigasi untuk navigasi bawah (ponsel), menu burger di peta, dan papan atas halaman biasa,
// supaya ketiganya selalu konsisten. Hanya halaman yang dipakai untuk bermain; Galeri aset dan daftar NPC tetap bisa
// dibuka lewat alamatnya, tetapi tidak ditawarkan di navigasi.
import type { ReactNode } from 'react'

export type Tautan = { href: string; label: string; ikon: ReactNode }

const PETA: Tautan = { href: '/', label: 'Peta', ikon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" /> }
const BERANDA: Tautan = { href: '/beranda', label: 'Beranda', ikon: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" /> }
const MASUK: Tautan = { href: '/masuk', label: 'Masuk', ikon: <path d="M10 17l5-5-5-5M15 12H3M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" /> }
const PASAR: Tautan = {
  href: '/pasar', label: 'Pasar',
  ikon: <path d="M4 9h16l-1.5-4h-13L4 9Zm0 0v2a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0V9M6 13v7h12v-7" />,
}
const INVENTORI: Tautan = { href: '/inventori', label: 'Inventori', ikon: <path d="M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Zm0 0 2-4h10l2 4M10 12h4" /> }
const PESAN: Tautan = { href: '/pesan', label: 'Pesan', ikon: <path d="M4 5h16v11H9l-5 4V5Zm4 5h8M8 13h5" /> }
const KORAN: Tautan = { href: '/koran', label: 'Koran', ikon: <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Zm13 4h3v8a2 2 0 0 1-2 2h-1M7 9h7M7 12h7M7 15h4" /> }
const PANDUAN: Tautan = { href: '/panduan', label: 'Panduan', ikon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01" /> }
const PERINGKAT: Tautan = { href: '/peringkat', label: 'Peringkat', ikon: <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /> }

/** Navigasi utama: yang paling sering dipakai saat bermain. Di ponsel menjadi navigasi bawah. */
export const navUtama = (masuk: boolean): Tautan[] => (masuk ? [PETA, BERANDA, PASAR, INVENTORI, PESAN] : [PETA, MASUK, KORAN, PANDUAN])

/** Sisanya, untuk menu burger dan papan atas. */
export const navLain = (masuk: boolean): Tautan[] => {
  const utama = new Set(navUtama(masuk).map((t) => t.href))
  return [PERINGKAT, KORAN, PANDUAN].filter((t) => !utama.has(t.href))
}

/** Tautan ini sedang dibuka? Peta hanya untuk alamat '/', lainnya juga untuk subhalamannya (misalnya /koran/2026-10-22). */
export const sedangDibuka = (href: string, path: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`))
