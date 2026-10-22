import type { Metadata, Viewport } from 'next'
import { Anybody, Public_Sans } from 'next/font/google'
import './globals.css'
import './akun.css'
import './kehidupan.css'
import './koran.css'
import NavBawah from '@/ui/NavBawah'
import { DaftarPekerja } from '@/ui/Pwa'

const tampil = Anybody({ subsets: ['latin'], variable: '--font-tampil', axes: ['wdth'], display: 'swap' })
const isi = Public_Sans({ subsets: ['latin'], variable: '--font-isi', display: 'swap' })

export const metadata: Metadata = {
  title: 'Weton City',
  description: 'Kota pelabuhan virtual ala Indonesia. Datang sebagai pendatang, tumbuh bersama kota.',
  applicationName: 'Weton City',
  // dibuka dari layar utama iPhone: layar penuh, bilah status menyatu dengan warna kota (area aman sudah diberi jarak di CSS)
  appleWebApp: { capable: true, title: 'Weton City', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0c3446',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${tampil.variable} ${isi.variable}`}>
      <body>
        {children}
        <NavBawah />
        <DaftarPekerja />
      </body>
    </html>
  )
}
