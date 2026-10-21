// Penanda edisi Koran Weton yang sudah dibaca. Disimpan di peramban, jadi berlaku per perangkat.
const KUNCI = 'weton-koran-dibaca'

/** Tanggal edisi terbaru yang pernah dibuka, atau '' bila belum pernah. */
export function koranDibaca(): string {
  try {
    return localStorage.getItem(KUNCI) ?? ''
  } catch {
    return ''
  }
}

export function tandaiKoranDibaca(tanggal: string): void {
  try {
    if (koranDibaca() < tanggal) localStorage.setItem(KUNCI, tanggal)
  } catch {
    // penyimpanan diblokir: penanda "Baru" sekadar tidak hilang
  }
}
