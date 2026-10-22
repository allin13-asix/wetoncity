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

// ---------------------------------------------------------------- Beranda
export const Dompet = () => (
  <Dasar>
    <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Zm0 0 11-3v3M16 13.5h.01" />
  </Dasar>
)
export const Bank = () => (
  <Dasar>
    <path d="M3 9 12 4l9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" />
  </Dasar>
)
export const Nota = () => (
  <Dasar>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3" />
  </Dasar>
)
export const Koper = () => (
  <Dasar>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
  </Dasar>
)
export const Bintang = () => (
  <Dasar>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  </Dasar>
)
export const Toga = () => (
  <Dasar>
    <path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v5c3 2.5 9 2.5 12 0v-5M22 9v6" />
  </Dasar>
)
export const Utang = () => (
  <Dasar>
    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v5M12 16h.01" />
  </Dasar>
)
export const Kotak = () => (
  <Dasar>
    <path d="M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Zm0 0 2-4h10l2 4M10 12h4" />
  </Dasar>
)
export const Toko = () => (
  <Dasar>
    <path d="M4 9h16l-1.5-4h-13L4 9Zm0 0v2a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0V9M6 13v7h12v-7" />
  </Dasar>
)
export const Obrolan = () => (
  <Dasar>
    <path d="M4 5h16v11H9l-5 4V5Zm4 5h8M8 13h5" />
  </Dasar>
)
export const Orang = () => (
  <Dasar>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Dasar>
)
export const Piala = () => (
  <Dasar>
    <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
  </Dasar>
)
export const Koran = () => (
  <Dasar>
    <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Zm13 4h3v8a2 2 0 0 1-2 2h-1M7 9h7M7 12h7M7 15h4" />
  </Dasar>
)
export const Keluar = () => (
  <Dasar>
    <path d="M15 17l5-5-5-5M20 12H9M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
  </Dasar>
)
export const Seru = () => (
  <Dasar ukuran={20}>
    <path d="M10.3 4 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0ZM12 10v4M12 17h.01" />
  </Dasar>
)
export const Petir = () => (
  <Dasar ukuran={18}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Dasar>
)
export const Palang = () => (
  <Dasar ukuran={18}>
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />
  </Dasar>
)
export const Mangkuk = () => (
  <Dasar ukuran={18}>
    <path d="M3 11h18a9 8 0 0 1-18 0ZM8 3c-1 1 1 2 0 4M12 2c-1 1 1 2 0 4M16 3c-1 1 1 2 0 4" />
  </Dasar>
)
