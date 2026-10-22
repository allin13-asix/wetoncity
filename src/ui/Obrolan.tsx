'use client'

// Obrolan: ruang Kota (semua warga), ruang Gedung (penghuni satu gedung hunian), pesan Pribadi berutas, dan Teman (cari warga,
// permintaan, daftar teman). Tab dan utas yang terbuka ada di alamat (?tab=, ?dengan=) supaya tombol kembali berfungsi.
// Pesan baru diambil berkala hanya selama halaman terlihat, dan hanya yang lebih baru dari pesan terakhir.
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { panggil } from './api'
import { KirimHadiah } from './Hadiah'
import { aktifSejak, Teman } from './Kehidupan'
import { useKeadaan } from './keadaan'

type Pesan = { id: number; isi: string; waktu: string; saya: boolean; dari?: { id: string; nama: string; level: number }; baru?: boolean }
type Ruang = { id: string; nama: string }
type Percakapan = { dengan: { id: string; nama: string; level: number }; terakhir: { isi: string; saya: boolean; waktu: string }; belum: number }
type Utas = { dengan: { id: string; nama: string; level: number; aktif: string; teman: 'teman' | 'diminta' | 'meminta' | 'belum' }; pesan: Pesan[] }
type Warga = { id: string; nama: string; level: number; aktif: string; status: 'teman' | 'diminta' | 'meminta' | 'belum' }

const SEGAR_MS = 4_000
const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
const inisial = (nama: string) => nama.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('')

/** Jalankan `f` sekarang dan tiap `ms` selama halaman terlihat, juga saat kembali ke halaman. */
function useBerkala(f: () => void, ms: number) {
  useEffect(() => {
    f()
    const t = setInterval(() => document.visibilityState === 'visible' && f(), ms)
    const lihat = () => document.visibilityState === 'visible' && f()
    document.addEventListener('visibilitychange', lihat)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', lihat)
    }
  }, [f, ms])
}

/** Tampilan percakapan: daftar gelembung, ambil berkala pesan yang lebih baru, dan kolom tulis. */
function Percakapan({ ambil, kirim, kosong, tampilNama }: {
  ambil: (setelah: number) => Promise<Pesan[] | null>
  kirim: (isi: string) => Promise<string | null>
  kosong: string
  tampilNama: boolean
}) {
  const [pesan, setPesan] = useState<Pesan[] | null>(null)
  const [tulis, setTulis] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const akhir = useRef(0)
  const kotak = useRef<HTMLDivElement>(null)

  const muat = useCallback(async () => {
    const baru = await ambil(akhir.current)
    if (!baru) return
    setPesan((lama) => {
      const semua = [...(lama ?? []), ...baru.filter((p) => p.id > akhir.current)]
      if (semua.length) akhir.current = semua[semua.length - 1].id
      return semua
    })
  }, [ambil])
  useBerkala(muat, SEGAR_MS)

  // gulir ke pesan terbaru bila pemain memang sedang di bawah (atau baru membuka)
  const jumlah = pesan?.length ?? 0
  useEffect(() => {
    const k = kotak.current
    if (k && k.scrollHeight - k.scrollTop - k.clientHeight < 160) k.scrollTop = k.scrollHeight
  }, [jumlah])

  async function kirimTulisan(e: FormEvent) {
    e.preventDefault()
    const isi = tulis.trim()
    if (!isi || sibuk) return
    setSibuk(true)
    const salah = await kirim(isi)
    setSibuk(false)
    setGalat(salah)
    if (!salah) {
      setTulis('')
      await muat()
      const k = kotak.current
      if (k) k.scrollTop = k.scrollHeight
    }
  }

  return (
    <div className="obrolan">
      <div className="obrolan-pesan" ref={kotak} aria-live="polite">
        {pesan === null ? (
          <p className="catatan">Memuat</p>
        ) : pesan.length === 0 ? (
          <p className="catatan kosong-obrolan">{kosong}</p>
        ) : (
          pesan.map((p) => (
            <div key={p.id} className={`gelembung-chat${p.saya ? ' saya' : ''}`}>
              {tampilNama && !p.saya && p.dari && (
                <Link className="chat-nama" href={`/profil/${p.dari.id}`}>
                  {p.dari.nama} <small>Lv {p.dari.level}</small>
                </Link>
              )}
              <span className="chat-isi">{p.isi}</span>
              <time dateTime={p.waktu}>{jam(p.waktu)}</time>
            </div>
          ))
        )}
      </div>
      {galat && <p className="pesan galat">{galat}</p>}
      <form className="obrolan-tulis" onSubmit={kirimTulisan}>
        <input value={tulis} maxLength={300} placeholder="Tulis pesan" aria-label="Tulis pesan" onChange={(e) => setTulis(e.target.value)} />
        <button type="submit" className="tombol-utama" disabled={sibuk || !tulis.trim()}>Kirim</button>
      </form>
    </div>
  )
}

function RuangObrolan({ ruang }: { ruang: Ruang }) {
  const ambil = useCallback(async (setelah: number) => {
    const r = await panggil<{ pesan: Pesan[] }>(`/api/obrolan?ruang=${encodeURIComponent(ruang.id)}&setelah=${setelah}`)
    return r.ok ? r.data.pesan : null
  }, [ruang.id])
  const kirim = useCallback(async (isi: string) => {
    const r = await panggil<unknown>('/api/obrolan', { ruang: ruang.id, isi })
    return r.ok ? null : r.galat.pesan
  }, [ruang.id])
  return (
    <Percakapan
      key={ruang.id}
      ambil={ambil}
      kirim={kirim}
      tampilNama
      kosong={ruang.id === 'global' ? 'Belum ada obrolan. Sapa warga kota!' : 'Belum ada obrolan di gedung ini. Sapa tetanggamu!'}
    />
  )
}

function UtasPribadi({ dengan, kembali, st }: { dengan: string; kembali: () => void; st: ReturnType<typeof useKeadaan> }) {
  const [lawan, setLawan] = useState<Utas['dengan'] | null>(null)
  const [hadiah, setHadiah] = useState(false)
  const ambil = useCallback(async (setelah: number) => {
    const r = await panggil<Utas>(`/api/pesan?dengan=${dengan}&setelah=${setelah}`)
    if (!r.ok) return null
    setLawan(r.data.dengan)
    return r.data.pesan
  }, [dengan])
  const kirim = useCallback(async (isi: string) => {
    const r = await panggil<unknown>('/api/pesan', { ke: dengan, isi })
    return r.ok ? null : r.galat.pesan
  }, [dengan])
  return (
    <div className="utas">
      <header className="utas-kepala">
        <button type="button" className="tombol-tipis" onClick={kembali} aria-label="Kembali ke daftar percakapan">‹ Kembali</button>
        {lawan && (
          <>
            <Link className="utas-nama" href={`/profil/${lawan.id}`}>
              <strong>{lawan.nama}</strong>
              <small>Level {lawan.level} · {aktifSejak(lawan.aktif)}</small>
            </Link>
            <span className="baris-aksi">
              {lawan.teman === 'belum' && (
                <button type="button" className="tombol-sekunder" disabled={!st.bebas} onClick={() => st.lakukan('teman', '/api/teman', { aksi: 'tambah', warga: lawan.id }, `Permintaan pertemanan dikirim ke ${lawan.nama}`).then(() => setLawan({ ...lawan, teman: 'diminta' }))}>
                  Tambah teman
                </button>
              )}
              {lawan.teman === 'meminta' && (
                <button type="button" className="tombol-sekunder" disabled={!st.bebas} onClick={() => st.lakukan('terima', '/api/teman', { aksi: 'terima', warga: lawan.id }, `Kamu berteman dengan ${lawan.nama}`).then(() => setLawan({ ...lawan, teman: 'teman' }))}>
                  Terima teman
                </button>
              )}
              <button type="button" className="tombol-sekunder" onClick={() => setHadiah(true)}>Hadiah</button>
            </span>
          </>
        )}
      </header>
      <Percakapan key={dengan} ambil={ambil} kirim={kirim} tampilNama={false} kosong="Belum ada pesan. Mulai percakapan!" />
      {hadiah && lawan && <KirimHadiah ke={lawan} onTutup={() => setHadiah(false)} />}
    </div>
  )
}

function DaftarPribadi({ buka }: { buka: (id: string) => void }) {
  const [d, setD] = useState<Percakapan[] | null>(null)
  const muat = useCallback(async () => {
    const r = await panggil<{ percakapan: Percakapan[] }>('/api/pesan')
    if (r.ok) setD(r.data.percakapan)
  }, [])
  useBerkala(muat, 10_000)
  if (!d) return <p className="catatan">Memuat</p>
  if (!d.length) return <p className="catatan">Belum ada pesan pribadi. Buka tab Teman untuk mencari warga, atau ketuk nama seseorang di obrolan Kota lalu kirim pesan dari profilnya.</p>
  return (
    <ul className="daftar-percakapan">
      {d.map((c) => (
        <li key={c.dengan.id}>
          <button type="button" onClick={() => buka(c.dengan.id)}>
            <span className="avatar-kecil" aria-hidden="true">{inisial(c.dengan.nama)}</span>
            <span className="percakapan-isi">
              <strong>{c.dengan.nama}</strong>
              <small>{c.terakhir.saya ? 'Kamu: ' : ''}{c.terakhir.isi}</small>
            </span>
            <span className="percakapan-sisi">
              <time dateTime={c.terakhir.waktu}>{jam(c.terakhir.waktu)}</time>
              {c.belum > 0 && <b className="lencana">{c.belum}</b>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function CariWarga({ st, chat }: { st: ReturnType<typeof useKeadaan>; chat: (id: string) => void }) {
  const [kata, setKata] = useState('')
  const [hasil, setHasil] = useState<Warga[] | null>(null)
  const cari = useCallback(async (k: string) => {
    const r = await panggil<{ warga: Warga[] }>(`/api/warga?cari=${encodeURIComponent(k)}`)
    if (r.ok) setHasil(r.data.warga)
  }, [])
  // cari sambil mengetik, setelah jeda singkat
  useEffect(() => {
    const t = setTimeout(() => cari(kata), 300)
    return () => clearTimeout(t)
  }, [kata, cari, st.versi])
  return (
    <section className="panel">
      <h2>Cari warga</h2>
      <input className="kolom-cari" type="search" value={kata} placeholder="Ketik nama warga" aria-label="Cari warga menurut nama" onChange={(e) => setKata(e.target.value)} />
      {hasil && hasil.length === 0 && <p className="catatan">Tidak ada warga dengan nama itu.</p>}
      {hasil && hasil.length > 0 && (
        <>
          {!kata && <p className="catatan">Warga yang baru saja aktif:</p>}
          <ul className="daftar-teman">
            {hasil.map((w) => (
              <li key={w.id}>
                <Link className="teman-nama" href={`/profil/${w.id}`}>
                  <strong>{w.nama}</strong>
                  <small>Level {w.level} · {aktifSejak(w.aktif)}</small>
                </Link>
                <span className="baris-aksi">
                  <button type="button" className="tombol-sekunder" onClick={() => chat(w.id)}>Chat</button>
                  {w.status === 'belum' && (
                    <button type="button" className="tombol-utama" disabled={!st.bebas} onClick={() => st.lakukan(`teman-${w.id}`, '/api/teman', { aksi: 'tambah', warga: w.id }, `Permintaan pertemanan dikirim ke ${w.nama}`)}>
                      Tambah
                    </button>
                  )}
                  {w.status === 'diminta' && <span className="chip chip-netral">Diminta</span>}
                  {w.status === 'meminta' && <span className="chip chip-bicara">Memintamu</span>}
                  {w.status === 'teman' && <span className="chip chip-bicara">Teman</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

type Tab = 'kota' | 'gedung' | 'pribadi' | 'teman'

export default function Obrolan() {
  const router = useRouter()
  const q = useSearchParams()
  const st = useKeadaan()
  const [ruang, setRuang] = useState<Ruang[]>([])
  const dengan = q.get('dengan')
  const tab: Tab = dengan ? 'pribadi' : ((q.get('tab') as Tab | null) ?? 'kota')

  useEffect(() => {
    if (st.masuk === false) router.replace('/masuk')
  }, [st.masuk, router])
  useEffect(() => {
    if (st.masuk) panggil<{ ruang: Ruang[] }>('/api/obrolan').then((r) => r.ok && setRuang(r.data.ruang))
  }, [st.masuk, st.k?.hunian?.tempat])

  const ke = useCallback((t: Tab, id?: string) => router.replace(id ? `/pesan?dengan=${id}` : t === 'kota' ? '/pesan' : `/pesan?tab=${t}`, { scroll: false }), [router])
  const gedung = ruang.find((r) => r.id.startsWith('hunian:'))

  const tabs: Array<{ id: Tab; label: string; lencana?: number; ada: boolean }> = [
    { id: 'kota', label: 'Kota', ada: true },
    { id: 'gedung', label: 'Gedung', ada: !!gedung },
    { id: 'pribadi', label: 'Pribadi', lencana: st.k?.pesanBaru, ada: true },
    { id: 'teman', label: 'Teman', lencana: st.k?.permintaanTeman, ada: true },
  ]
  let isi: ReactNode = null
  if (!st.k) isi = <p className="catatan">Memuat</p>
  else if (tab === 'kota') isi = <RuangObrolan ruang={{ id: 'global', nama: 'Kota Weton' }} />
  else if (tab === 'gedung') isi = gedung ? <><p className="catatan">Hanya penghuni {gedung.nama} yang bisa membaca ruang ini.</p><RuangObrolan ruang={gedung} /></> : <p className="catatan">Ruang gedung tersedia bagi penghuni Rusunawa, kost, dan hotel.</p>
  else if (tab === 'pribadi') isi = dengan ? <UtasPribadi dengan={dengan} kembali={() => ke('pribadi')} st={st} /> : <DaftarPribadi buka={(id) => ke('pribadi', id)} />
  else isi = (
    <>
      {st.pesan && <p className={`pesan ${st.pesan.ok ? 'ok' : 'galat'}`} role="status">{st.pesan.teks}</p>}
      <CariWarga st={st} chat={(id) => ke('pribadi', id)} />
      <Teman bebas={st.bebas} lakukan={st.lakukan} versi={st.versi} />
    </>
  )

  return (
    <main className="halaman hub-obrolan">
      <h1>Obrolan</h1>
      <div className="kelompok-tab" role="tablist" aria-label="Jenis obrolan">
        {tabs.filter((t) => t.ada).map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => ke(t.id)}>
            {t.label}
            {t.lencana ? <b className="lencana-tab">{t.lencana}</b> : null}
          </button>
        ))}
      </div>
      {isi}
    </main>
  )
}
