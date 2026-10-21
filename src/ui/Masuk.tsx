'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { MODAL_AWAL, rupiah } from '@/data/ekonomi'
import { panggil } from './api'

export default function Masuk() {
  const router = useRouter()
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [perluKode, setPerluKode] = useState(false)

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSibuk(true)
    setPesan(null)
    const badan =
      mode === 'masuk'
        ? { email: f.get('email'), sandi: f.get('sandi') }
        : { email: f.get('email'), nama: f.get('nama'), sandi: f.get('sandi'), kode: f.get('kode') || undefined }
    const h = await panggil(mode === 'masuk' ? '/api/masuk' : '/api/daftar', badan)
    if (!h.ok) {
      if (h.galat.kode === 'kode_undangan_salah') setPerluKode(true)
      setPesan(h.galat.pesan)
      setSibuk(false)
      return
    }
    router.push(h.data.hunian && h.data.sekolah ? '/beranda' : '/')
  }

  return (
    <main className="halaman masuk">
      <div className="tab-masuk" role="tablist" aria-label="Masuk atau daftar">
        {(['masuk', 'daftar'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setPesan(null)
            }}
          >
            {m === 'masuk' ? 'Sudah punya akun' : 'Jadi warga baru'}
          </button>
        ))}
      </div>

      <h1>{mode === 'masuk' ? 'Masuk ke Weton City' : 'Jadi warga Weton City'}</h1>
      <p className="pengantar">
        {mode === 'masuk'
          ? 'Lanjutkan hidupmu di kota pelabuhan.'
          : `Kamu tiba di pelabuhan sebagai pendatang berumur 18 tahun, lulusan SMA atau SMK, membawa uang saku ${rupiah(MODAL_AWAL)}.`}
      </p>

      <form className="form-masuk" onSubmit={kirim}>
        {mode === 'daftar' && (
          <label>
            <span>Nama panggilan</span>
            <input name="nama" type="text" required minLength={2} maxLength={30} autoComplete="nickname" />
          </label>
        )}
        <label>
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email" />
        </label>
        <label>
          <span>Kata sandi</span>
          <input name="sandi" type="password" required minLength={mode === 'daftar' ? 8 : 1} autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'} />
          {mode === 'daftar' && <small>Minimal 8 karakter.</small>}
        </label>
        {mode === 'daftar' && perluKode && (
          <label>
            <span>Kode undangan</span>
            <input name="kode" type="text" required autoComplete="off" />
          </label>
        )}
        <div role="alert" aria-live="assertive" className={pesan ? 'pesan galat' : 'pesan'}>
          {pesan}
        </div>
        <button type="submit" className="tombol-utama" disabled={sibuk}>
          {sibuk ? 'Memproses' : mode === 'masuk' ? 'Masuk' : 'Daftar dan tiba di pelabuhan'}
        </button>
      </form>
    </main>
  )
}
