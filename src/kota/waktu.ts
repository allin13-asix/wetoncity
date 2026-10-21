export type Waktu = 'pagi' | 'siang' | 'sore' | 'malam'
export const daftarWaktu: Waktu[] = ['pagi', 'siang', 'sore', 'malam']

export type Cahaya = {
  langit: string
  hemiAtas: string
  hemiBawah: string
  hemi: number
  matahari: string
  intensitas: number
  posisi: readonly [number, number, number]
  laut: string
  dangkal: string
  /** kekuatan cahaya lampu jalan: 0 mati, 1 penuh */
  lampu: number
}

export const cahaya: Record<Waktu, Cahaya> = {
  pagi: { langit: '#bfe4ef', hemiAtas: '#e4f5ff', hemiBawah: '#a9c98f', hemi: 0.95, matahari: '#ffe2b0', intensitas: 1.35, posisi: [40, 18, 26], laut: '#58bcd6', dangkal: '#8fe0d8', lampu: 0 },
  siang: { langit: '#b9e1f3', hemiAtas: '#eaf6ff', hemiBawah: '#9ab98a', hemi: 1.05, matahari: '#fff5df', intensitas: 1.7, posisi: [-14, 46, 26], laut: '#4db7d6', dangkal: '#86dcd8', lampu: 0 },
  sore: { langit: '#f0c4a0', hemiAtas: '#ffd9b8', hemiBawah: '#8fa56a', hemi: 0.95, matahari: '#ff9b5a', intensitas: 1.45, posisi: [-46, 18, 24], laut: '#5ab3d0', dangkal: '#9bd0c9', lampu: 0.4 },
  malam: { langit: '#13233f', hemiAtas: '#5b79b8', hemiBawah: '#1d2a3b', hemi: 0.75, matahari: '#8da7ec', intensitas: 0.55, posisi: [-12, 30, 22], laut: '#1d4f7a', dangkal: '#2a6c8f', lampu: 1 },
}

/** Waktu setempat Weton mengikuti WIB. */
export function waktuSekarang(): Waktu {
  const jam = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date())) % 24
  if (jam >= 5 && jam < 9) return 'pagi'
  if (jam >= 9 && jam < 15) return 'siang'
  if (jam >= 15 && jam < 18) return 'sore'
  return 'malam'
}
