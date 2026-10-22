// Manifest aplikasi web: Weton City bisa dipasang ke layar utama ponsel dan dibuka layar penuh seperti aplikasi.
// Ikon PNG dibuat dari src/app/icon.svg (sudut membulat) dan public/ikon-penuh.svg (penuh-bidang untuk maskable dan iOS).
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Weton City',
    short_name: 'Weton City',
    description: 'Kota pelabuhan virtual ala Indonesia. Datang sebagai pendatang, tumbuh bersama kota.',
    lang: 'id',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0c3446',
    theme_color: '#0c3446',
    categories: ['games', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // tekan lama ikon di layar utama (Android) langsung ke bagian yang paling sering dibuka
    shortcuts: [
      { name: 'Peta kota', short_name: 'Peta', url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Beranda', short_name: 'Beranda', url: '/beranda', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Pasar Weton', short_name: 'Pasar', url: '/pasar', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Pesan', short_name: 'Pesan', url: '/pesan', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
