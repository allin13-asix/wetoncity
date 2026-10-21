// Klien Postgres untuk aplikasi Next. Satu per proses (aman untuk hot-reload dev).
import { buatSql, type Sql } from './db.ts'

const url = process.env.DATABASE_URL
// Gagal cepat dengan pesan jelas, kecuali saat build (route dimuat tanpa terhubung).
if (!url && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('DATABASE_URL belum diisi. Salin .env.example ke .env.local lalu isi.')
}

const g = globalThis as unknown as { __wetonSql?: Sql }
export const sql: Sql = (g.__wetonSql ??= buatSql(url ?? '', { max: process.env.VERCEL ? 1 : 5 }))
