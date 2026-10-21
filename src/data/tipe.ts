// Tipe data bersama. Hanya tipe: aman diimpor oleh skrip Node maupun Next.

export type Kategori =
  | 'layanan'
  | 'ekonomi'
  | 'pelabuhan'
  | 'pendidikan'
  | 'hunian'
  | 'kesehatan'
  | 'publik'
  | 'industri'

/** 0 prototipe, 1 warga undangan, 2 kota tumbuh, 3 kedalaman (lihat docs/KONSEP.md) */
export type Fase = 0 | 1 | 2 | 3

export type Jenis = {
  id: string
  nama: string
  kategori: Kategori
  /** kunci pembuat model di src/aset */
  model: string
  varian?: Record<string, number | string>
  /** lebar (sumbu x) dan dalam (sumbu z) dalam petak, sebelum diputar */
  ukuran: readonly [number, number]
  /** fasilitas utama kota */
  utama?: boolean
  fase: Fase
  /** tampil sebagai bayangan sampai dibuka oleh Level Kota */
  terkunci?: boolean
  /** boleh berdiri di atas air (dermaga, kapal, perahu) */
  diLaut?: boolean
  ringkas: string
  fungsi: string[]
}

export type Rotasi = 0 | 90 | 180 | 270

export type Penempatan = {
  id: string
  jenis: string
  x: number
  z: number
  /** derajat: 0 menghadap selatan (+z), 90 timur, 180 utara, 270 barat; boleh sudut berapa pun */
  rot: number
  /** urutan kemunculan jenis yang sama, dipakai untuk variasi warna */
  v: number
  distrik: string
}

export type Hiasan = {
  id: string
  nama: string
  model: string
  ukuran: readonly [number, number]
}

export type Rect = { x0: number; x1: number; z0: number; z1: number }
