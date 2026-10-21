// Kueri tanpa parameter: nilai disisipkan sebagai literal ter-escape dan pernyataan dikirim lewat protokol simple.
//
// Mengapa: pooler transaksi (Supabase) mewajibkan prepare: false. Dengan itu postgres.js menganggap tiap query berparameter
// "describe dulu" (Parse, Describe, Flush, menunggu jawaban, baru Bind dan Execute): dua round-trip per query, dan pipeline pada
// koneksi itu berhenti. Query tanpa parameter memakai satu round-trip dan yang dikirim beruntun jatuh dalam satu penerbangan.
// Jadi semua nilai lewat `literal()` di bawah (satu-satunya tempat nilai menjadi teks SQL), tidak ada parameter terikat.
//
// Pernyataan ditulis seperti biasa, tx`select ... where id = ${id}`. Dua hal yang perlu diingat:
//  - Kueri malas: baru dikirim saat di-await. Beberapa kueri yang di-await bersamaan (Promise.all) dikirim berurutan dalam
//    satu penerbangan, dan server menjalankannya sesuai urutan kirim. Fungsi async yang meng-await kueri di dalamnya
//    JALAN SEGERA saat dipanggil, jadi jangan menaruh pemanggilannya di dalam daftar Promise.all yang urutannya penting.
//  - tx.tulis`...` menunda pernyataan yang hasilnya tidak dibaca; ia dikirim di depan pernyataan berikutnya yang di-await
//    (atau lewat tx.kirim()), tanpa round-trip tambahan. Galatnya baru muncul saat itu.
import type postgres from 'postgres'

type Koneksi = Pick<postgres.Sql, 'unsafe'>
type Baris = readonly (object | undefined)[]

/** Nilai untuk kolom json atau jsonb (lihat tx.json). */
export class NilaiJson {
  nilai: unknown
  constructor(nilai: unknown) {
    this.nilai = nilai
  }
}

/**
 * String menjadi literal SQL, sama seperti PQescapeLiteral: kutip digandakan, dan bila ada garis miring terbalik dipakai
 * bentuk E'' dengan garis miring digandakan, jadi hasilnya tidak bergantung pada standard_conforming_strings.
 * NUL ditolak karena memotong pesan Query di sisi server. Koneksi memakai client_encoding UTF8 (bawaan postgres.js).
 */
function teksSql(s: string): string {
  if (s.includes('\0')) throw new TypeError('Teks berisi karakter NUL tidak bisa menjadi literal SQL.')
  const kutip = s.replaceAll("'", "''")
  return kutip.includes('\\') ? `E'${kutip.replaceAll('\\', '\\\\')}'` : `'${kutip}'`
}

/** Satu nilai JS menjadi literal SQL. Tipe yang tidak dikenal ditolak, bukan ditebak. */
export function literal(x: unknown): string {
  if (x === null || x === undefined) return 'null'
  switch (typeof x) {
    case 'string':
      return teksSql(x)
    // Angka dikutip seperti parameter terikat: literal tanpa tipe yang diselesaikan server menurut kolomnya. Pecahan ke kolom
    // bilangan bulat tetap galat (literal telanjang 1.5 malah dibulatkan diam-diam), dan tanda minus tidak bisa salah baca.
    case 'number':
      if (!Number.isFinite(x)) throw new TypeError(`Angka ${x} tidak bisa menjadi literal SQL.`)
      return `'${x}'`
    case 'bigint':
      return `'${x}'`
    case 'boolean':
      return x ? 'true' : 'false'
  }
  if (x instanceof Date) {
    if (Number.isNaN(x.getTime())) throw new TypeError('Tanggal tidak valid tidak bisa menjadi literal SQL.')
    return `'${x.toISOString()}'::timestamptz`
  }
  if (x instanceof NilaiJson) {
    const j = JSON.stringify(x.nilai)
    return j === undefined ? 'null' : `${teksSql(j)}::jsonb`
  }
  throw new TypeError(`Nilai bertipe ${Object.prototype.toString.call(x)} tidak bisa menjadi literal SQL.`)
}

/** Templat jadi teks SQL. Hanya bagian templat yang menjadi SQL; setiap nilai lewat literal(). */
export function rakit(templat: TemplateStringsArray, nilai: readonly unknown[]): string {
  let teks = templat[0]
  for (let i = 0; i < nilai.length; i++) teks += literal(nilai[i]) + templat[i + 1]
  return teks
}

/** Kueri yang menunggu: dikirim saat di-await atau lewat mulai(), dan hasilnya diingat. */
export class Kueri<T extends Baris> implements PromiseLike<postgres.RowList<T>> {
  teks: string
  #kirim: (teks: string) => Promise<postgres.RowList<T>>
  #janji: Promise<postgres.RowList<T>> | undefined

  constructor(kirim: (teks: string) => Promise<postgres.RowList<T>>, teks: string) {
    this.#kirim = kirim
    this.teks = teks
  }

  then<A = postgres.RowList<T>, B = never>(
    ok?: ((nilai: postgres.RowList<T>) => A | PromiseLike<A>) | null,
    gagal?: ((alasan: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return (this.#janji ??= this.#kirim(this.teks)).then(ok, gagal)
  }
}

export type Tx = {
  <T extends Baris = postgres.Row[]>(templat: TemplateStringsArray, ...nilai: readonly unknown[]): Kueri<T>
  /** Nilai untuk kolom jsonb. */
  json(nilai: unknown): NilaiJson
  /** Pernyataan tanpa hasil yang dibaca: ditunda dan dikirim bersama kueri berikutnya yang di-await, urutan tetap. */
  tulis(templat: TemplateStringsArray, ...nilai: readonly unknown[]): void
  /** Kirim sekarang semua tulis yang tertunda dan tunggu selesai. */
  kirim(): Promise<void>
  /** SQL apa adanya tanpa nilai (begin, commit). Bukan tempat menyisipkan masukan pemain. */
  mentah(teks: string): Kueri<postgres.Row[]>
  /** Nama tabel yang ditulis lewat tx sejauh ini; '*' bila tidak bisa dikenali (misalnya with ... update). */
  tabelDitulis: ReadonlySet<string>
}

export const adalahTx = (x: unknown): x is Tx => typeof (x as Tx | null)?.tulis === 'function'

const TARGET_TULIS = /^\s*(?:insert\s+into|update|delete\s+from)\s+"?([a-z_][a-z0-9_]*)/i

/**
 * Membungkus koneksi (sql.reserve(), transaksi, atau kolam) menjadi tx bergaya literal. Dalam transaksi pakai koneksi
 * yang dipesan lewat sql.reserve(), dan jangan pernah meng-await kolam `sql` selagi koneksi itu dipegang (kolam max 1).
 */
export function bungkus(koneksi: Koneksi): Tx {
  const tertunda: string[] = []
  const ditulis = new Set<string>()

  const catatTulis = (teks: string) => {
    if (/^\s*select\b/i.test(teks)) return
    ditulis.add(TARGET_TULIS.exec(teks)?.[1]?.toLowerCase() ?? '*')
  }
  // Semua pernyataan dikirim serentak lalu ditunggu bersama; Promise.all menolak dengan galat pertama (yang paling awal
  // dijawab server), dan galat sesudahnya ("transaksi sudah dibatalkan") ikut tertangani.
  const kirimSemua = (teks: string[]) => Promise.all(teks.map((t) => koneksi.unsafe(t).execute()))
  // `any` karena hasil tiap kueri bertipe sesuai tx<T> pemanggil, yang tidak diketahui di sini
  const jalankan = async (teks: string): Promise<any> => {
    const semua = [...tertunda.splice(0), teks]
    const hasil = await kirimSemua(semua)
    return hasil[hasil.length - 1]
  }

  const tx = (<T extends Baris>(templat: TemplateStringsArray, ...nilai: readonly unknown[]) => {
    const teks = rakit(templat, nilai)
    catatTulis(teks)
    return new Kueri<T>(jalankan, teks)
  }) as Tx
  tx.json = (nilai) => new NilaiJson(nilai)
  tx.tulis = (templat, ...nilai) => {
    const teks = rakit(templat, nilai)
    catatTulis(teks)
    tertunda.push(teks)
  }
  tx.kirim = async () => {
    if (tertunda.length) await kirimSemua(tertunda.splice(0))
  }
  tx.mentah = (teks) => new Kueri(jalankan, teks)
  tx.tabelDitulis = ditulis
  return tx
}
