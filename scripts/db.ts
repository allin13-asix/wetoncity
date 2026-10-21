// Perintah basis data. Pemakaian: pnpm db:migrasi
import { existsSync } from 'node:fs'
import { buatSql } from '../src/server/db.ts'
import { jalankanMigrasi } from '../src/server/migrasi.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL belum diisi. Salin .env.example ke .env.local, lalu jalankan db/siapkan.sql sekali sebagai superuser.')
  process.exit(1)
}

const perintah = process.argv[2] ?? 'migrasi'
const sql = buatSql(url, { max: 1 })
try {
  if (perintah === 'migrasi') {
    const baru = await jalankanMigrasi(sql, 'db/migrasi')
    console.log(baru.length ? `Migrasi dijalankan: ${baru.join(', ')}` : 'Skema sudah terbaru.')
  } else {
    console.error(`Perintah tidak dikenal: ${perintah}. Yang ada: migrasi`)
    process.exitCode = 1
  }
} finally {
  await sql.end()
}
