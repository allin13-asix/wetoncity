'use client'

// Navigasi bawah untuk ponsel. Disembunyikan di layar lebar (Papan dan menu peta sudah cukup) dan di halaman
// yang memakai layar penuh atau alur sendiri (masuk, mulai, editor).
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { navUtama, sedangDibuka } from './navigasi'
import { useSesi } from './sesi'

const TANPA = ['/masuk', '/mulai', '/editor']

const Ikon = ({ children }: { children: ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export default function NavBawah() {
  const path = usePathname()
  const sesi = useSesi(path)
  if (TANPA.some((t) => path === t || path.startsWith(`${t}/`))) return null
  return (
    <nav className="nav-bawah" aria-label="Navigasi utama">
      {navUtama(!!sesi?.masuk).map((t) => (
        <Link key={t.href} href={t.href} aria-current={sedangDibuka(t.href, path) ? 'page' : undefined}>
          <Ikon>{t.ikon}</Ikon>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
