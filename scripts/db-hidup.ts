// Menghidupkan klaster Postgres pribadi di .pgdata (port 5544) lalu membiarkannya jalan di latar belakang.
// Jalankan setelah komputer dihidupkan: pnpm db:hidup. Folder bin Postgres bisa diganti lewat PG_BIN.
// Di Windows, Postgres dijalankan lewat Start-Process di konsol tersembunyi sendiri: kalau ikut konsol terminal,
// Ctrl+C untuk menghentikan server dev ikut mematikan Postgres (log: "terminated by exception 0xC000013A").
import { spawnSync } from 'node:child_process'

const bin = process.env.PG_BIN ?? 'C:/Program Files/PostgreSQL/17/bin'
const pgCtl = `${bin}/pg_ctl`

if (spawnSync(pgCtl, ['-D', '.pgdata', 'status']).status === 0) {
  console.log('Postgres sudah hidup.')
} else {
  const argumen = ['-D', '.pgdata', '-o', '"-p 5544"', '-l', '.pgdata/server.log', 'start']
  if (process.platform === 'win32') {
    const daftar = argumen.map((a) => `'${a}'`).join(',')
    spawnSync('powershell', ['-NoProfile', '-Command', `Start-Process -FilePath '${pgCtl}' -ArgumentList ${daftar} -WindowStyle Hidden`], { stdio: 'inherit' })
  } else {
    spawnSync(pgCtl, argumen.map((a) => a.replace(/"/g, '')), { stdio: 'inherit' })
  }
  // tunggu sampai siap menerima koneksi (pemulihan setelah mati mendadak bisa makan beberapa detik)
  for (let i = 0; i < 60; i++) {
    if (spawnSync(`${bin}/pg_isready`, ['-q', '-h', '127.0.0.1', '-p', '5544']).status === 0) {
      console.log('Postgres hidup di port 5544 (log: .pgdata/server.log).')
      process.exit(0)
    }
    spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 1000)'])
  }
  console.error('Postgres belum siap setelah 60 detik. Periksa .pgdata/server.log.')
  process.exit(1)
}
