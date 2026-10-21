// Web push. `pnpm push:kunci` membuat pasangan kunci VAPID baru (isi ke .env.local atau env server, sekali saja).
// `pnpm push:kirim` mengirim pengingat; jadwalkan tiap jam lewat penjadwal sistem (cron atau Task Scheduler).
import { existsSync } from 'node:fs'
import webpush from 'web-push'
import { buatSql } from '../src/server/db.ts'
import { kirimPengingat } from '../src/server/push.ts'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const perintah = process.argv[2]

if (perintah === 'kunci') {
  const k = webpush.generateVAPIDKeys()
  console.log(`VAPID_PUBLIK=${k.publicKey}\nVAPID_RAHASIA=${k.privateKey}\nVAPID_SUBJEK=mailto:alamat-kamu@contoh.com\nPUSH_RAHASIA=${webpush.generateVAPIDKeys().privateKey}`)
  console.log('\nSalin ke .env.local (jangan di-commit), lalu mulai ulang server.')
} else if (perintah === 'kirim') {
  const sql = buatSql(process.env.DATABASE_URL!)
  try {
    console.log(await kirimPengingat(sql))
  } finally {
    await sql.end()
  }
} else {
  console.log('Pakai: node scripts/push.ts kunci | kirim')
  process.exit(1)
}
