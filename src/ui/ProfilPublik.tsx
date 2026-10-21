'use client'

// Profil publik pemain dan kotak pesan. Hanya data publik yang ditampilkan: nama, level, reputasi dan peringkat, pekerjaan,
// keahlian dan atribut, serta properti (opsional). Uang, inventori, dan stats survival tidak pernah dikirim server.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { NAMA_ATRIBUT } from '@/data/balans'
import { rupiah } from '@/data/ekonomi'
import { kunciBaru, panggil } from './api'
import { useKeadaan } from './keadaan'

type Profil = {
  id: string
  nama: string
  peran: string
  level: number
  reputasi: number
  peringkat: number | null
  bergabung: string
  pekerjaan: { id: string; nama: string; tier: number; tempat: string } | null
  keahlian: { level: number; atribut: Record<keyof typeof NAMA_ATRIBUT, number> }
  properti: Array<{ id: string; objek: string; bangunan: string | null; rumah: boolean; jual: { mode: string; harga: number } | null }>
  propertiPublik: boolean
  diri: boolean
  hubungan: 'diri' | 'teman' | 'diminta' | 'meminta' | 'belum'
  aksi: { tambahTeman: boolean; kirimPesan: boolean; ajukanPenawaran: boolean }
}

const tanggal = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export default function ProfilPublik({ id }: { id: string }) {
  const router = useRouter()
  const st = useKeadaan()
  const [p, setP] = useState<Profil | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [pesan, setPesan] = useState('')
  const [terkirim, setTerkirim] = useState<string | null>(null)

  const muat = useCallback(async () => {
    const r = await panggil<Profil>(`/api/profil?id=${encodeURIComponent(id)}`)
    if (r.ok) setP(r.data)
    else if (r.status === 401) router.replace('/masuk')
    else setGalat(r.galat.pesan)
  }, [id, router])

  useEffect(() => {
    muat()
  }, [muat, st.versi])

  if (galat) return <main className="halaman"><p className="pesan galat">{galat}</p></main>
  if (!p) return <main className="halaman"><p className="kosong">Memuat profil</p></main>

  async function kirim() {
    const r = await panggil('/api/pesan', { ke: p!.id, isi: pesan, kunci: kunciBaru() })
    if (r.ok) {
      setPesan('')
      setTerkirim('Pesan terkirim.')
    } else setTerkirim(r.galat.pesan)
  }

  return (
    <main className="halaman profil">
      <div className="beranda-kepala">
        <h1>{p.nama}</h1>
        <Link className="tombol-sekunder" href="/">Ke peta</Link>
      </div>
      <p className="catatan">
        {p.peran === 'walikota' ? 'Wali Kota Weton' : 'Warga Weton'}, bergabung {tanggal(p.bergabung)}.
      </p>

      <div className="beranda-grid">
        <div className="kolom">
          <section className="panel">
            <h2>Ringkasan</h2>
            <dl className="rincian">
              <div><dt>Level</dt><dd>{p.level}</dd></div>
              <div><dt>Reputasi</dt><dd>{p.reputasi.toLocaleString('id-ID')}</dd></div>
              <div><dt>Peringkat</dt><dd>{p.peringkat ? `#${p.peringkat}` : '-'}</dd></div>
              <div><dt>Pekerjaan</dt><dd>{p.pekerjaan ? `${p.pekerjaan.nama}, ${p.pekerjaan.tempat}` : 'Belum bekerja'}</dd></div>
              <div><dt>Keahlian</dt><dd>{p.keahlian.level} dari 10</dd></div>
              {(Object.keys(NAMA_ATRIBUT) as Array<keyof typeof NAMA_ATRIBUT>).map((a) => (
                <div key={a}><dt>{NAMA_ATRIBUT[a]}</dt><dd>{p.keahlian.atribut[a]}</dd></div>
              ))}
            </dl>
          </section>

          <section className="panel">
            <h2>Properti</h2>
            {p.properti.length === 0 ? (
              <p className="catatan">{p.propertiPublik || p.diri ? 'Belum punya properti.' : 'Daftar properti disembunyikan pemiliknya. Yang sedang dijual tetap terlihat.'}</p>
            ) : (
              <ul className="lowongan">
                {p.properti.map((x) => (
                  <li key={x.id}>
                    <span>
                      <strong>{x.id}</strong>
                      <small>
                        {x.objek === 'bangunan' ? 'Rumah' : x.bangunan ? `Lahan dengan ${x.bangunan}` : 'Lahan kosong'}
                        {x.jual ? `, dijual ${x.jual.mode === 'tetap' ? 'harga tetap' : 'nego'} ${rupiah(x.jual.harga)}` : ''}
                      </small>
                    </span>
                    <Link className="tombol-sekunder" href={`/?fokus=${x.id}`}>Lihat</Link>
                  </li>
                ))}
              </ul>
            )}
            {p.diri && (
              <label className="tulis-label">
                <input type="checkbox" checked={p.propertiPublik} onChange={(e) => st.lakukan('profil-properti', '/api/profil', { properti: e.target.checked }, e.target.checked ? 'Properti tampil di profil' : 'Properti disembunyikan')} /> Tampilkan semua properti di profil publik
              </label>
            )}
          </section>
        </div>

        <div className="kolom">
          {!p.diri && (
            <section className="panel aksi-utama">
              <h2>Aksi</h2>
              <div className="baris-aksi">
                {p.aksi.tambahTeman && (
                  <button type="button" className="tombol-utama" disabled={!st.bebas} onClick={() => st.lakukan('teman', '/api/teman', { aksi: 'tambah', warga: p.id }, `Permintaan pertemanan dikirim ke ${p.nama}`).then(muat)}>
                    Tambah teman
                  </button>
                )}
                {p.hubungan === 'teman' && <span className="chip chip-bicara">Teman</span>}
                {p.hubungan === 'diminta' && <span className="chip chip-netral">Permintaan terkirim</span>}
                {p.hubungan === 'meminta' && (
                  <button type="button" className="tombol-utama" disabled={!st.bebas} onClick={() => st.lakukan('terima', '/api/teman', { aksi: 'terima', warga: p.id }, `Kamu berteman dengan ${p.nama}`).then(muat)}>
                    Terima permintaan teman
                  </button>
                )}
              </div>
              {p.aksi.ajukanPenawaran ? (
                <p className="catatan">
                  Pemilik membuka negosiasi untuk sebagian properti di atas. Pilih lahannya di peta lalu ajukan penawaran.{' '}
                  {p.properti.filter((x) => x.jual?.mode === 'negosiasi').map((x) => (
                    <Link key={x.id} className="tautan" href={`/?fokus=${x.id}`}>Tawar {x.id}</Link>
                  ))}
                </p>
              ) : (
                <p className="catatan">Tidak ada properti yang terbuka untuk ditawar.</p>
              )}
              <h3 className="sub">Kirim pesan</h3>
              <label className="tulis-label">
                Pesan untuk {p.nama}
                <textarea value={pesan} maxLength={300} rows={3} onChange={(e) => setPesan(e.target.value)} />
              </label>
              <div className="baris-aksi rata-kiri">
                <button type="button" className="tombol-sekunder" disabled={!pesan.trim()} onClick={kirim}>Kirim pesan</button>
              </div>
              {terkirim && <p className="catatan">{terkirim}</p>}
            </section>
          )}
          {p.diri && (
            <section className="panel">
              <h2>Profilmu</h2>
              <p className="catatan">Begini warga lain melihatmu. Uang, inventori, dan kondisi tubuhmu (Tenaga, Kesehatan, lapar) tidak ditampilkan.</p>
              <Link className="tombol-sekunder" href="/beranda">Kembali ke Beranda</Link>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

type Pesanan = Array<{ id: number; dari: { id: string; nama: string }; ke: { id: string; nama: string }; isi: string; masuk: boolean; baru: boolean; waktu: string }>

/** Kotak pesan: pesan masuk dan keluar terbaru. */
export function KotakPesan() {
  const [d, setD] = useState<Pesanan | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  useEffect(() => {
    panggil<Pesanan>('/api/pesan').then((r) => (r.ok ? setD(r.data) : setGalat(r.galat.pesan)))
  }, [])
  return (
    <main className="halaman">
      <div className="beranda-kepala">
        <h1>Pesan</h1>
        <Link className="tombol-sekunder" href="/beranda">Beranda</Link>
      </div>
      {galat && <p className="pesan galat">{galat}</p>}
      {d && d.length === 0 && <p className="catatan">Belum ada pesan. Buka profil warga lain untuk mengirim pesan.</p>}
      <ul className="lowongan">
        {(d ?? []).map((m) => (
          <li key={m.id}>
            <span>
              <strong>
                {m.masuk ? 'Dari ' : 'Ke '}
                <Link className="tautan" href={`/profil/${m.masuk ? m.dari.id : m.ke.id}`}>{m.masuk ? m.dari.nama : m.ke.nama}</Link>
                {m.baru && <span className="baru"> Baru</span>}
              </strong>
              <small>{new Date(m.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
              <span>{m.isi}</span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
