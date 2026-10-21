// Pelari migrasi SQL sederhana: berkas db/migrasi/*.sql dijalankan berurutan, masing-masing dalam satu transaksi.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Sql } from './db.ts'

export async function jalankanMigrasi(sql: Sql, folder: string): Promise<string[]> {
  await sql`create table if not exists skema_migrasi (nama text primary key, dijalankan_pada timestamptz not null default now())`
  const sudah = new Set((await sql<{ nama: string }[]>`select nama from skema_migrasi`).map((r) => r.nama))
  const baru = readdirSync(folder).filter((f) => f.endsWith('.sql')).sort().filter((f) => !sudah.has(f))
  for (const f of baru) {
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(folder, f), 'utf8'))
      await tx`insert into skema_migrasi (nama) values (${f})`
    })
  }
  return baru
}
