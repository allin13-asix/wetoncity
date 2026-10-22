'use client'

// Navigasi bawah untuk ponsel. Disembunyikan di layar lebar (Papan dan menu peta sudah cukup) dan di halaman
// yang memakai layar penuh atau alur sendiri (masuk, mulai, editor).
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useSesi } from './sesi'

const TANPA = ['/masuk', '/mulai', '/editor']

const Ikon = ({ children }: { children: ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const isi = (masuk: boolean) => [
  { href: '/', label: 'Peta', ikon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" /> },
  { href: masuk ? '/beranda' : '/masuk', label: masuk ? 'Beranda' : 'Masuk', ikon: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" /> },
  { href: '/pasar', label: 'Pasar', ikon: <path d="M4 9h16l-1.5-4h-13L4 9Zm0 0v2a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0V9M6 13v7h12v-7" /> },
  { href: '/koran', label: 'Koran', ikon: <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Zm13 4h3v8a2 2 0 0 1-2 2h-1M7 9h7M7 12h7M7 15h4" /> },
  { href: '/warga', label: 'Warga', ikon: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0M16 11a3 3 0 1 0-1-5.8M21 20a6 6 0 0 0-4-5.6" /> },
]

export default function NavBawah() {
  const path = usePathname()
  const sesi = useSesi(path)
  if (TANPA.some((t) => path === t || path.startsWith(`${t}/`))) return null
  return (
    <nav className="nav-bawah" aria-label="Navigasi utama">
      {isi(!!sesi?.masuk).map((t) => {
        const kini = t.href === '/' ? path === '/' : path === t.href || path.startsWith(`${t.href}/`)
        return (
          <Link key={t.label} href={t.href} aria-current={kini ? 'page' : undefined}>
            <Ikon>{t.ikon}</Ikon>
            <span>{t.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
