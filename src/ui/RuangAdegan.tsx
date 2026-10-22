'use client'

// Ruang obrolan berwujud: avatar 2D (kepala dan badan) berjalan di alun-alun, taman, atau dalam gedung hunian; pesan muncul
// sebagai gelembung di atas kepala pengirimnya. Paling banyak RUANG.kapasitas orang per ruang. Dengan Supabase Realtime posisi
// dan isyarat pesan sampai seketika dan detak ke server jarang; tanpanya klien berdetak lebih sering (sekalian mengambil
// pesan dan posisi). Detak berhenti saat halaman tidak terlihat.
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { RUANG } from '@/data/balans'
import { panggil } from './api'
import { LatarRuang, layar, ruangDari, type JenisLatar } from './LatarRuang'
import { useKanal } from './realtime'

type Orang = { id: string; nama: string; level: number; walikota: boolean; x: number; y: number; saya: boolean }
type Pesan = { id: number; isi: string; waktu: string; dari: { id: string; nama: string }; saya: boolean }
type Detak = { ruang: { id: string; nama: string; jenis: JenisLatar; kapasitas: number }; hadir: boolean; orang: Orang[]; pesan: Pesan[] }
type Masuk = { ruang: string; nama: string; x: number; y: number }
type Daftar = { kapasitas: number; alun: Array<{ ruang: string; nama: string; isi: number }>; taman: Array<{ ruang: string; nama: string; isi: number }>; hunian: { ruang: string; nama: string; isi: number } | null }

const GELEMBUNG_MS = 7_000
const KECEPATAN = 0.32 // satuan ruang per detik
const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

/** Warna avatar tetap per warga, diturunkan dari id-nya. */
function rupa(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const baju = ['#e0533b', '#2f6fa8', '#2e8b6a', '#8a5ac9', '#e8a33a', '#d4567f', '#3a9aa8', '#5b6b7a'][h % 8]
  const kulit = ['#f2c9a0', '#e2b48a', '#c98f62', '#a8704a', '#8a5a3a'][(h >> 3) % 5]
  const rambut = ['#2b1d14', '#4a3020', '#1d1d1d', '#6b4a2a', '#3a2a4a'][(h >> 6) % 5]
  const gaya = (h >> 9) % 3
  return { baju, kulit, rambut, gaya }
}

function Avatar({ id, arah }: { id: string; arah: number }) {
  const r = rupa(id)
  return (
    <svg className="avatar-badan" viewBox="0 0 40 56" aria-hidden="true" style={{ transform: `scaleX(${arah})` }}>
      <ellipse cx="20" cy="53" rx="12" ry="3.5" fill="#000" opacity="0.25" />
      <g className="avatar-tubuh">
        <path d="M8 52c0-14 4-22 12-22s12 8 12 22Z" fill={r.baju} stroke="#1d2a30" strokeWidth="1.4" />
        <path d="M15 31c2 3 8 3 10 0" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
        <circle cx="20" cy="18" r="11" fill={r.kulit} stroke="#1d2a30" strokeWidth="1.4" />
        {r.gaya === 0 && <path d="M9 17c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5Z" fill={r.rambut} />}
        {r.gaya === 1 && <path d="M9 19c-1-9 4-14 11-14s12 5 11 14c-2-5-4-6-6-6-4 0-6 2-10 2-3 0-5 1-6 4Z" fill={r.rambut} />}
        {r.gaya === 2 && <path d="M8 22c-1-11 4-17 12-17s13 6 12 17c-1-4-2-8-4-9-5 2-12 2-17 0-2 1-2 5-3 9Z" fill={r.rambut} />}
        <circle cx="24" cy="19" r="1.4" fill="#1d2a30" />
        <circle cx="17" cy="19" r="1.4" fill="#1d2a30" />
        <path d="M18 24c1.5 1 3.5 1 5 0" fill="none" stroke="#1d2a30" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

type Pos = { x: number; y: number; dari: { x: number; y: number }; mulai: number; durasi: number; arah: number }
const posKini = (p: Pos, t: number) => {
  const u = p.durasi ? Math.min(1, (t - p.mulai) / p.durasi) : 1
  return { x: p.dari.x + (p.x - p.dari.x) * u, y: p.dari.y + (p.y - p.dari.y) * u }
}
function gerakKe(lama: Pos | undefined, x: number, y: number, t: number): Pos {
  if (!lama) return { x, y, dari: { x, y }, mulai: t, durasi: 0, arah: 1 }
  if (Math.abs(lama.x - x) < 0.002 && Math.abs(lama.y - y) < 0.002) return lama
  const kini = posKini(lama, t)
  const jarak = Math.hypot(x - kini.x, y - kini.y)
  const [sx0] = layar(kini.x, kini.y)
  const [sx1] = layar(x, y)
  return { x, y, dari: kini, mulai: t, durasi: (jarak / KECEPATAN) * 1000, arah: sx1 < sx0 ? -1 : 1 }
}

/** Satu ruang berwujud. `jenis` alun | taman | hunian; `ruangAwal` memilih ruang alun-alun/taman tertentu. */
export function RuangAdegan({ jenis, sayaId, ruangAwal }: { jenis: JenisLatar; sayaId: string; ruangAwal?: string | null }) {
  const [masuk, setMasuk] = useState<Masuk | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [orang, setOrang] = useState<Map<string, Orang>>(new Map())
  const [pos, setPos] = useState<Map<string, Pos>>(new Map())
  const [pesan, setPesan] = useState<Pesan[]>([])
  const [gelembung, setGelembung] = useState<Map<string, { teks: string; sampai: number }>>(new Map())
  const [tulis, setTulis] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [log, setLog] = useState(false)
  const [pilihRuang, setPilihRuang] = useState<Daftar | null>(null)
  const [, setTik] = useState(0)
  const akhir = useRef(0)
  const saya = useRef({ x: 0.5, y: 0.7 })
  const mulaiDetak = useRef(Date.now())
  const panggung = useRef<HTMLDivElement>(null)
  const kotakLog = useRef<HTMLDivElement>(null)
  const [lebar, setLebar] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = panggung.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLebar({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const malam = useMemo(() => {
    const h = (new Date().getUTCHours() + 7) % 24
    return h >= 18 || h < 6
  }, [])

  // masuk ruang (atau pindah ruang); keluar saat halaman ditinggalkan
  const masukKe = useCallback(async (ruang?: string | null) => {
    setGalat(null)
    const r = await panggil<Masuk>('/api/ruang', { aksi: 'masuk', jenis, ruang: ruang ?? undefined })
    if (!r.ok) return setGalat(r.galat.pesan)
    akhir.current = 0
    mulaiDetak.current = Date.now()
    saya.current = { x: r.data.x, y: r.data.y }
    setPesan([])
    setOrang(new Map())
    setPos(new Map([[sayaId, gerakKe(undefined, r.data.x, r.data.y, performance.now())]]))
    setGelembung(new Map())
    setMasuk(r.data)
  }, [jenis, sayaId])
  useEffect(() => {
    masukKe(ruangAwal)
    const pergi = () => navigator.sendBeacon?.('/api/ruang', new Blob([JSON.stringify({ aksi: 'keluar' })], { type: 'application/json' }))
    window.addEventListener('pagehide', pergi)
    return () => {
      window.removeEventListener('pagehide', pergi)
      panggil('/api/ruang', { aksi: 'keluar' })
    }
  }, [masukKe, ruangAwal])

  const terima = useCallback((d: Detak) => {
    const t = performance.now()
    setOrang(new Map(d.orang.map((o) => [o.id, o])))
    setPos((lama) => {
      const baru = new Map<string, Pos>()
      for (const o of d.orang) baru.set(o.id, o.saya ? (lama.get(o.id) ?? gerakKe(undefined, o.x, o.y, t)) : gerakKe(lama.get(o.id), o.x, o.y, t))
      if (!baru.has(sayaId) && lama.has(sayaId)) baru.set(sayaId, lama.get(sayaId)!)
      return baru
    })
    const lebihBaru = d.pesan.filter((p) => p.id > akhir.current)
    if (lebihBaru.length) {
      akhir.current = lebihBaru[lebihBaru.length - 1].id
      setPesan((l) => [...l, ...lebihBaru].slice(-80))
      // gelembung hanya untuk pesan yang dikirim sesudah kita masuk (riwayat lama cukup di log)
      const segar = lebihBaru.filter((p) => Date.parse(p.waktu) > mulaiDetak.current - 15_000)
      if (segar.length) {
        setGelembung((g) => {
          const n = new Map(g)
          for (const p of segar) n.set(p.dari.id, { teks: p.isi, sampai: Date.now() + GELEMBUNG_MS })
          return n
        })
      }
    }
  }, [sayaId])

  const detak = useCallback(async () => {
    if (!masuk) return
    const r = await panggil<Detak>('/api/ruang', { aksi: 'detak', ruang: masuk.ruang, setelah: akhir.current, x: saya.current.x, y: saya.current.y })
    if (!r.ok) return setGalat(r.galat.pesan)
    if (!r.data.hadir) return setGalat('Ruang ini penuh atau kamu terputus. Coba masuk lagi.')
    terima(r.data)
  }, [masuk, terima])

  const { aktif, kirim: isyarat } = useKanal(masuk?.ruang ?? null, sayaId, {
    gerak: ({ id, x, y }) => setPos((l) => (l.has(id) || orang.has(id) ? new Map(l).set(id, gerakKe(l.get(id), x, y, performance.now())) : l)),
    pesan: () => detak(),
    hadir: () => detak(),
  })

  // detak berkala selama terlihat: jarang bila Realtime tersambung
  useEffect(() => {
    if (!masuk) return
    detak()
    const ms = aktif ? RUANG.detakMs : RUANG.pollMs
    const t = setInterval(() => document.visibilityState === 'visible' && detak(), ms)
    const lihat = () => document.visibilityState === 'visible' && detak()
    document.addEventListener('visibilitychange', lihat)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', lihat)
    }
  }, [masuk, aktif, detak])

  // jam animasi: render ulang saat ada yang berjalan atau gelembung yang perlu hilang
  useEffect(() => {
    let r = 0
    const tik = () => {
      const t = performance.now()
      let jalan = false
      pos.forEach((p) => { if (t < p.mulai + p.durasi) jalan = true })
      if (jalan) setTik((n) => n + 1)
      r = requestAnimationFrame(tik)
    }
    r = requestAnimationFrame(tik)
    const g = setInterval(() => setGelembung((m) => {
      const n = new Map([...m].filter(([, v]) => v.sampai > Date.now()))
      return n.size === m.size ? m : n
    }), 1000)
    return () => {
      cancelAnimationFrame(r)
      clearInterval(g)
    }
  }, [pos])

  useEffect(() => {
    const k = kotakLog.current
    if (k) k.scrollTop = k.scrollHeight
  }, [pesan.length, log])

  function ketuk(e: PointerEvent<HTMLDivElement>) {
    if (!masuk || !panggung.current) return
    if ((e.target as HTMLElement).closest('a, button')) return
    const b = panggung.current.getBoundingClientRect()
    // latar memakai viewBox 1000x700 dengan preserveAspectRatio slice (memenuhi panggung, sisi berlebih terpotong)
    const s = Math.max(b.width / 1000, b.height / 700)
    const ox = (b.width - 1000 * s) / 2
    const oy = (b.height - 700 * s) / 2
    const [x, y] = ruangDari((e.clientX - b.left - ox) / s, (e.clientY - b.top - oy) / s)
    saya.current = { x, y }
    setPos((l) => new Map(l).set(sayaId, gerakKe(l.get(sayaId), x, y, performance.now())))
    isyarat('gerak', { id: sayaId, x, y })
  }

  async function kirimPesan(e: FormEvent) {
    e.preventDefault()
    const isi = tulis.trim()
    if (!isi || !masuk || sibuk) return
    setSibuk(true)
    const r = await panggil<{ id: number }>('/api/obrolan', { ruang: masuk.ruang, isi })
    setSibuk(false)
    if (!r.ok) return setGalat(r.galat.pesan)
    setGalat(null)
    setTulis('')
    setGelembung((g) => new Map(g).set(sayaId, { teks: isi, sampai: Date.now() + GELEMBUNG_MS }))
    isyarat('pesan')
    detak()
  }

  async function bukaPilihan() {
    if (pilihRuang) return setPilihRuang(null)
    const r = await panggil<Daftar>('/api/ruang')
    if (r.ok) setPilihRuang(r.data)
  }

  const t = performance.now()
  const ukur = (() => {
    const w = lebar.w || 1000, h = lebar.h || 700
    const sk = Math.max(w / 1000, h / 700)
    return { s: sk, ox: (w - 1000 * sk) / 2, oy: (h - 700 * sk) / 2 }
  })()
  const daftarOrang = [...pos.entries()]
    .map(([id, p]) => ({ id, p, k: posKini(p, t), o: orang.get(id) }))
    .filter((a) => a.o || a.id === sayaId)
    .sort((a, b) => a.k.x + a.k.y - (b.k.x + b.k.y))
  const isi = Math.max(orang.size, masuk ? 1 : 0)
  const pilihan = pilihRuang ? (jenis === 'hunian' ? [] : pilihRuang[jenis]) : []

  return (
    <div className="ruang-adegan">
      <header className="ruang-kepala">
        <div>
          <strong>{masuk?.nama ?? 'Masuk ruang...'}</strong>
          <small>
            {isi}/{RUANG.kapasitas} orang · {aktif ? 'waktu-nyata' : 'diperbarui berkala'}
          </small>
        </div>
        {jenis !== 'hunian' && (
          <button type="button" className="tombol-sekunder" onClick={bukaPilihan} aria-expanded={!!pilihRuang}>
            Ganti ruang
          </button>
        )}
      </header>
      {pilihRuang && (
        <ul className="pilih-ruang">
          {pilihan.map((r) => (
            <li key={r.ruang}>
              <button type="button" disabled={r.ruang === masuk?.ruang || r.isi >= pilihRuang.kapasitas} onClick={() => { setPilihRuang(null); masukKe(r.ruang) }}>
                {r.nama.replace(/^.*, /, '')} <small>{r.isi}/{pilihRuang.kapasitas}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {galat && <p className="pesan galat">{galat} {!masuk && <button type="button" className="tombol-teks" onClick={() => masukKe(ruangAwal)}>Coba lagi</button>}</p>}

      <div className="panggung-ruang" ref={panggung} onPointerDown={ketuk} role="application" aria-label="Ketuk lantai untuk berjalan">
        <LatarRuang jenis={jenis} malam={malam} />
        {daftarOrang.map(({ id, p, k, o }) => {
          const [sx, sy] = layar(k.x, k.y)
          const g = gelembung.get(id)
          const jalan = t < p.mulai + p.durasi
          const nama = o?.nama ?? 'Kamu'
          return (
            <div key={id} className={`tokoh${id === sayaId ? ' saya' : ''}${jalan ? ' jalan' : ''}`} style={{ left: ukur.ox + sx * ukur.s, top: ukur.oy + sy * ukur.s, zIndex: Math.round(sy) }}>
              {g && <span className="gelembung-avatar">{g.teks}</span>}
              <Avatar id={id} arah={p.arah} />
              {id === sayaId ? (
                <span className="papan-nama">{nama}</span>
              ) : (
                <Link className="papan-nama" href={`/profil/${id}`}>{o?.walikota ? '★ ' : ''}{nama}</Link>
              )}
            </div>
          )
        })}
      </div>

      <div className="ruang-bawah">
        <button type="button" className="tombol-tipis" onClick={() => setLog((x) => !x)} aria-expanded={log}>
          {log ? 'Sembunyikan percakapan' : `Percakapan (${pesan.length})`}
        </button>
        {log && (
          <div className="ruang-log" ref={kotakLog} aria-live="polite">
            {pesan.length === 0 ? <p className="catatan">Belum ada obrolan. Sapa yang ada di sini!</p> : pesan.map((p) => (
              <p key={p.id} className={p.saya ? 'saya' : ''}>
                <b>{p.saya ? 'Kamu' : p.dari.nama}</b> {p.isi} <time dateTime={p.waktu}>{jam(p.waktu)}</time>
              </p>
            ))}
          </div>
        )}
        <form className="obrolan-tulis" onSubmit={kirimPesan}>
          <input value={tulis} maxLength={300} placeholder="Ketik pesan, muncul di atas kepalamu" aria-label="Tulis pesan" onChange={(e) => setTulis(e.target.value)} />
          <button type="submit" className="tombol-utama" disabled={sibuk || !tulis.trim() || !masuk}>Kirim</button>
        </form>
      </div>
    </div>
  )
}
