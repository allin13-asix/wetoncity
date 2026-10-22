// Bentuk ikon 2D yang bisa dipilih Wali Kota untuk barang buatannya (gambarnya di src/ui/IkonBarang.tsx).
export const BENTUK = ['kotak', 'botol', 'gelas', 'bungkus', 'ikan', 'permata', 'koin', 'buku', 'bunga', 'kue', 'kain', 'tas'] as const
export type Bentuk = (typeof BENTUK)[number]
export const NAMA_BENTUK: Record<Bentuk, string> = {
  kotak: 'Kotak', botol: 'Botol', gelas: 'Gelas', bungkus: 'Bungkusan', ikan: 'Ikan', permata: 'Permata', koin: 'Koin', buku: 'Buku', bunga: 'Bunga', kue: 'Kue', kain: 'Kain', tas: 'Tas',
}
export const adalahBentuk = (x: unknown): x is Bentuk => typeof x === 'string' && (BENTUK as readonly string[]).includes(x)
