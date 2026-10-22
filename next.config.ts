import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // service worker selalu diperiksa ulang, supaya perbaikan sampai ke aplikasi yang sudah terpasang di ponsel
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

export default config
