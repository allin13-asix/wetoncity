import postgres from 'postgres'

export type Sql = postgres.Sql
export type Tx = postgres.TransactionSql

// bigint dibaca sebagai Number: jumlah Rupiah jauh di bawah 2^53.
const bigintNumber = { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) }

/**
 * Satu klien Postgres. prepare: false agar cocok dengan pooler transaksi (Supabase).
 * `schema` dipakai uji untuk memisahkan data tiap jalan.
 */
export function buatSql(url: string, opsi: { max?: number; schema?: string } = {}): Sql {
  const lokal = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url)
  return postgres(url, {
    prepare: false,
    max: opsi.max ?? 5,
    idle_timeout: 20,
    ssl: lokal ? false : 'require',
    onnotice: () => {},
    types: { bigint: bigintNumber },
    ...(opsi.schema ? { connection: { search_path: opsi.schema } } : {}),
  })
}
