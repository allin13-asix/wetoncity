// Ikon garis 24x24, digambar sendiri agar tidak menambah paket.
import type { ReactNode } from 'react'

function Dasar({ children, ukuran = 22 }: { children: ReactNode; ukuran?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const Pagi = () => (
  <Dasar>
    <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v3M4.6 9.6l1.8 1.4M19.4 9.6 17.6 11" />
  </Dasar>
)
export const Siang = () => (
  <Dasar>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </Dasar>
)
export const Sore = () => (
  <Dasar>
    <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 8V5M12 5l-2 2M12 5l2 2" />
  </Dasar>
)
export const Malam = () => (
  <Dasar>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
  </Dasar>
)
export const PutarKiri = () => (
  <Dasar>
    <path d="M4 5v5h5" />
    <path d="M4.6 14A8 8 0 1 0 6 6.5L4 10" />
  </Dasar>
)
export const PutarKanan = () => (
  <Dasar>
    <path d="M20 5v5h-5" />
    <path d="M19.4 14A8 8 0 1 1 18 6.5L20 10" />
  </Dasar>
)
export const Daftar = () => (
  <Dasar>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Dasar>
)
export const Menu = () => (
  <Dasar>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Dasar>
)
export const Tutup = () => (
  <Dasar>
    <path d="M6 6l12 12M18 6 6 18" />
  </Dasar>
)
export const Gembok = () => (
  <Dasar ukuran={16}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Dasar>
)
export const Rute = () => (
  <Dasar>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h5a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5" />
  </Dasar>
)
