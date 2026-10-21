'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { panggil } from './api'

type Berita = { judul: string; isi: string[]; penulis?: string }
type Edisi = { tanggal: string; berita: Berita[]; besok?: string; sumber: 'berkas' | 'kota' | 'kota-ganti' }
type Draf = { tanggal: string; berita: Array<{ judul: string; isi: string; penulis: string }>; besok: string }

const hariIni = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
const tambahHari = (t: string, n: number) => new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const beritaKosong = (penulis: string) => ({ judul: '', isi: '', penulis })
const SUMBER = { berkas: 'Berkas data', kota: 'Ditulis di sini', 'kota-ganti': 'Ditulis di sini, mengganti berkas' } as const

/** Meja redaksi Koran Weton untuk Wali Kota: menulis, mengubah, dan menjadwalkan edisi tanpa menyentuh kode. */
export default function TulisKoran({ penulisUtama, semuaNpc }: { penulisUtama: string[]; semuaNpc: string[] }) {
  const [edisi, setEdisi] = useState<Edisi[] | null>(null)
  const [draf, setDraf] = useState<Draf | null>(null)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const penulisAwal = penulisUtama[0] ?? ''

  useEffect(() => {
    panggil<{ edisi: Edisi[] }>('/api/koran').then((h) => (h.ok ? setEdisi(h.data.edisi) : setPesan({ ok: false, teks: h.galat.pesan })))
  }, [])

  const hari = hariIni()
  const terakhir = edisi?.at(-1)?.tanggal ?? hari
  const stok = edisi?.filter((e) => e.tanggal > hari).length ?? 0

  function baru() {
    const tanggal = terakhir < hari ? hari : tambahHari(terakhir, 1)
    setDraf({ tanggal, berita: [beritaKosong(penulisAwal)], besok: '' })
    setPesan(null)
  }

  function ubah(e: Edisi) {
    setDraf({ tanggal: e.tanggal, besok: e.besok ?? '', berita: e.berita.map((b) => ({ judul: b.judul, isi: b.isi.join('\n\n'), penulis: b.penulis ?? '' })) })
    setPesan(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function kirim(badan: Record<string, unknown>, berhasil: string) {
    setSibuk(true)
    const h = await panggil<{ edisi: Edisi[] }>('/api/koran', badan)
    setSibuk(false)
    if (!h.ok) return setPesan({ ok: false, teks: h.galat.pesan })
    setEdisi(h.data.edisi)
    setPesan({ ok: true, teks: berhasil })
    return true
  }

  async function simpan() {
    if (!draf) return
    const berita = draf.berita.map((b) => ({
      judul: b.judul, isi: b.isi.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean), ...(b.penulis ? { penulis: b.penulis } : {}),
    }))
    const ok = await kirim({ tanggal: draf.tanggal, berita, ...(draf.besok.trim() ? { besok: draf.besok } : {}) }, `Edisi ${draf.tanggal} disimpan. ${draf.tanggal > hari ? 'Terbit pukul 00.00 WIB pada tanggalnya.' : 'Sudah terbit untuk semua warga.'}`)
    if (ok) setDraf(null)
  }

  const ubahBerita = (i: number, kunci: 'judul' | 'isi' | 'penulis', nilai: string) =>
    setDraf((d) => d && { ...d, berita: d.berita.map((b, k) => (k === i ? { ...b, [kunci]: nilai } : b)) })

  return (
    <main className="halaman tulis-koran">
      <h1>Meja redaksi</h1>
      <p className="pengantar">
        Tulis edisi Koran Weton dari sini. Edisi terbit pukul 00.00 WIB pada tanggalnya; yang belum waktunya hanya terlihat oleh Wali Kota.
      </p>
      <p className={stok < 3 ? 'pesan galat' : 'catatan'}>
        {stok === 0 ? 'Tidak ada edisi yang menunggu terbit. Warga tidak akan mendapat koran baru besok.' : `${stok} edisi menunggu terbit, sampai ${terakhir}.`}
      </p>
      {pesan && <p className={`pesan ${pesan.ok ? 'ok' : 'galat'}`}>{pesan.teks}</p>}

      {!draf && <button type="button" className="tombol-utama" onClick={baru}>Tulis edisi baru</button>}

      {draf && (
        <section className="panel tulis-draf" aria-label="Edisi yang sedang ditulis">
          <label className="tulis-label">
            Tanggal terbit
            <input type="date" value={draf.tanggal} onChange={(e) => setDraf({ ...draf, tanggal: e.target.value })} />
          </label>
          {draf.berita.map((b, i) => (
            <fieldset key={i} className="tulis-berita">
              <legend>{i === 0 ? 'Berita utama' : `Berita ${i + 1}`}</legend>
              <label className="tulis-label">
                Judul
                <input value={b.judul} maxLength={100} onChange={(e) => ubahBerita(i, 'judul', e.target.value)} />
              </label>
              <label className="tulis-label">
                Penulis
                <select value={b.penulis} onChange={(e) => ubahBerita(i, 'penulis', e.target.value)}>
                  <option value="">Tanpa nama</option>
                  {penulisUtama.length > 0 && (
                    <optgroup label="Kantor Koran Weton">
                      {penulisUtama.map((n) => <option key={n} value={n}>{n}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Warga lain">
                    {semuaNpc.filter((n) => !penulisUtama.includes(n)).map((n) => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                </select>
              </label>
              <label className="tulis-label">
                Isi (pisahkan paragraf dengan baris kosong)
                <textarea rows={8} value={b.isi} onChange={(e) => ubahBerita(i, 'isi', e.target.value)} />
              </label>
              {draf.berita.length > 1 && (
                <button type="button" className="tombol-sekunder" onClick={() => setDraf({ ...draf, berita: draf.berita.filter((_, k) => k !== i) })}>
                  Hapus berita ini
                </button>
              )}
            </fieldset>
          ))}
          {draf.berita.length < 6 && (
            <button type="button" className="tombol-sekunder" onClick={() => setDraf({ ...draf, berita: [...draf.berita, beritaKosong(penulisAwal)] })}>
              Tambah berita
            </button>
          )}
          <label className="tulis-label">
            Di edisi berikutnya (boleh kosong)
            <input value={draf.besok} maxLength={300} onChange={(e) => setDraf({ ...draf, besok: e.target.value })} />
          </label>
          <div className="tulis-tombol">
            <button type="button" className="tombol-utama" disabled={sibuk} onClick={simpan}>Simpan edisi</button>
            <button type="button" className="tombol-sekunder" disabled={sibuk} onClick={() => setDraf(null)}>Batal</button>
          </div>
        </section>
      )}

      <h2>Semua edisi</h2>
      {!edisi ? (
        <p className="kosong">Memuat</p>
      ) : (
        <ul className="tulis-daftar">
          {[...edisi].reverse().map((e) => (
            <li key={e.tanggal} className="panel">
              <div>
                <strong>{e.tanggal}</strong> <span className="catatan">{e.tanggal > hari ? 'menunggu terbit' : 'sudah terbit'} · {SUMBER[e.sumber]}</span>
                <p>{e.berita[0]?.judul}</p>
              </div>
              <div className="tulis-tombol">
                <button type="button" className="tombol-sekunder" onClick={() => ubah(e)}>Ubah</button>
                <Link className="tautan" href={`/koran/${e.tanggal}`}>Lihat</Link>
                {e.sumber !== 'berkas' && (
                  <button
                    type="button"
                    className="tombol-sekunder"
                    disabled={sibuk}
                    onClick={() => confirm(`Hapus edisi ${e.tanggal} yang ditulis di sini?`) && kirim({ hapus: e.tanggal }, `Edisi ${e.tanggal} dihapus.`)}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
