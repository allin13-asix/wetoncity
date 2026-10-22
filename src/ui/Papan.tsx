'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navLain, navUtama, sedangDibuka } from './navigasi'
import { useSesi } from './sesi'

export function Merek({ kecil = false }: { kecil?: boolean }) {
  return (
    <Link href="/" className={kecil ? 'merek merek-kecil' : 'merek'} aria-label="Weton City, ke peta kota">
      <span className="merek-bollard" aria-hidden="true" />
      <span className="merek-teks">WETON CITY</span>
    </Link>
  )
}

/** Papan petunjuk di atas halaman biasa. */
export default function Papan() {
  const path = usePathname()
  const sesi = useSesi()
  const akun = sesi?.masuk ? { href: '/beranda', label: 'Beranda' } : sesi ? { href: '/masuk', label: 'Masuk' } : null
  return (
    <header className="papan">
      <Merek />
      <nav aria-label="Menu utama">
        {/* Beranda atau Masuk sudah menjadi tombol akun di kanan */}
        {[...navUtama(!!sesi?.masuk), ...navLain(!!sesi?.masuk)]
          .filter((t) => t.href !== '/beranda' && t.href !== '/masuk')
          .map((t) => (
            <Link key={t.href} href={t.href} aria-current={sedangDibuka(t.href, path) ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
      </nav>
      {akun && (
        <Link href={akun.href} className="nav-akun" aria-current={akun.href === path ? 'page' : undefined}>
          {akun.label}
        </Link>
      )}
    </header>
  )
}
