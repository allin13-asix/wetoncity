'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { lahanKosong, penempatan, penempatanById } from '@/data/tataletak'
import { tur } from '@/data/tur'
import type { Fokus } from '@/kota/Kamera'
import { daftarWaktu, waktuSekarang, type Waktu } from '@/kota/waktu'
import AksiBangunan from './AksiBangunan'
import DaftarTempat from './DaftarTempat'
import { BannerPerjalanan } from './FiturKota'
import { useKeadaan } from './keadaan'
import StatusWarga from './StatusWarga'
import { Daftar, Malam, Menu, Pagi, PutarKanan, PutarKiri, Rute, Siang, Sore, Tutup } from './ikon'
import PanelBangunan from './PanelBangunan'
import PanelTur from './PanelTur'
import { PanelLahan } from './PropertiPanel'
import { navLain, navUtama } from './navigasi'
import { Merek } from './Papan'
import { TombolPasang } from './Pwa'

const Adegan = dynamic(() => import('@/kota/Adegan'), {
  ssr: false,
  loading: () => <div className="peta-muat">Memuat kota</div>,
})

const ikonWaktu: Record<Waktu, { ikon: () => React.JSX.Element; nama: string }> = {
  pagi: { ikon: Pagi, nama: 'Pagi' },
  siang: { ikon: Siang, nama: 'Siang' },
  sore: { ikon: Sore, nama: 'Sore' },
  malam: { ikon: Malam, nama: 'Malam' },
}

type Mode = 'jelajah' | 'tur' | 'daftar'

export default function PetaKota() {
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [waktu, setWaktu] = useState<Waktu>('siang')
  const [fokus, setFokus] = useState<Fokus | null>(null)
  const [putar, setPutar] = useState(0)
  const [mode, setMode] = useState<Mode>('jelajah')
  const [menu, setMenu] = useState(false)
  const [lahanPilihan, setLahanPilihan] = useState<string | null>(null)
  const [langkah, setLangkah] = useState(0)
  const nomor = useRef(0)
  const st = useKeadaan()
  const k = st.k

  const modeRef = useRef<Mode>('jelajah')
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const terbang = useCallback((id: string, zoom = 24) => {
    const p = penempatanById.get(id) ?? lahanKosong.find((l) => l.id === id) ?? penempatan.find((x) => x.jenis === id.replace(/-\d+$/, ''))
    if (!p) return
    const ponsel = window.innerWidth < 900
    // Panel menutupi bagian bawah (ponsel) atau kanan (desktop): geser bangunan ke area yang masih terlihat.
    const naik = modeRef.current === 'tur' ? 0.32 : 0.22
    setFokus({ x: p.x, z: p.z, zoom, id: ++nomor.current, kananPx: ponsel ? 0 : 190, naikPx: ponsel ? window.innerHeight * naik : 0 })
  }, [])

  const pilih = useCallback(
    (id: string | null) => {
      setTerpilih(id)
      setMenu(false)
      if (id) {
        terbang(id)
        setMode((m) => (m === 'daftar' ? 'jelajah' : m))
      }
    },
    [terbang],
  )

  const keLangkah = useCallback(
    (i: number) => {
      setLangkah(i)
      const l = tur[i]
      const sasaran = penempatanById.has(l.bangunan) ? l.bangunan : (penempatan.find((x) => x.jenis === l.bangunan.replace(/-\d+$/, ''))?.id ?? l.bangunan)
      setTerpilih(sasaran)
      terbang(sasaran)
    },
    [terbang],
  )

  const mulaiTur = useCallback(() => {
    modeRef.current = 'tur'
    setMode('tur')
    setMenu(false)
    keLangkah(0)
  }, [keLangkah])

  const akhiriTur = useCallback(() => {
    setMode('jelajah')
    setTerpilih(null)
  }, [])

  const lihatTur = useCallback(
    (id: string) => {
      setTerpilih(id)
      terbang(id)
    },
    [terbang],
  )

  // waktu kota mengikuti jam WIB; hanya Wali Kota yang boleh mengganti (untuk memeriksa tampilan malam)
  const [waktuTetap, setWaktuTetap] = useState(false)
  useEffect(() => {
    if (waktuTetap) return
    setWaktu(waktuSekarang())
    const t = setInterval(() => setWaktu(waktuSekarang()), 60_000)
    return () => clearInterval(t)
  }, [waktuTetap])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const id = q.get('fokus')
    if (id && penempatanById.has(id)) {
      setTerpilih(id)
      terbang(id)
    } else if (id && lahanKosong.some((l) => l.id === id)) {
      terbang(id, 30)
    } else if (q.get('tur')) {
      setMode('tur')
      setTerpilih(tur[0].bangunan)
      terbang(tur[0].bangunan)
    }
  }, [terbang])

  const turOtomatis = useRef(false)
  useEffect(() => {
    if (!k || turOtomatis.current) return
    turOtomatis.current = true
    if (!k.hunian || !k.sekolah) mulaiTur()
  }, [k, mulaiTur])

  // pesan aksi hilang sendiri
  useEffect(() => {
    if (!st.pesan) return
    const t = setTimeout(() => st.setPesan(null), 4500)
    return () => clearTimeout(t)
  }, [st.pesan, st])

  // lahan kota hanya dibeli di Balai Kota: panel lahan mengarahkan ke sana dan membawa lahan yang dipilih
  const keBalaiKota = useCallback(
    (lahan: string) => {
      setLahanPilihan(lahan)
      const id = penempatan.find((p) => p.jenis === 'balai-kota')?.id
      if (id) pilih(id)
    },
    [pilih],
  )

  const keTempatKerja = useCallback(() => {
    const id = k?.pekerjaan ? penempatan.find((p) => p.jenis === k.pekerjaan!.tempat)?.id : undefined
    if (id) pilih(id)
  }, [k, pilih])

  useEffect(() => {
    const tombol = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenu(false)
      if (mode === 'daftar') setMode('jelajah')
      else if (mode === 'jelajah') setTerpilih(null)
    }
    window.addEventListener('keydown', tombol)
    return () => window.removeEventListener('keydown', tombol)
  }, [mode])

  return (
    <div className={`peta${k ? ' ada-pemain' : ''}`}>
      <Adegan terpilih={terpilih} onPilih={pilih} waktu={waktu} fokus={fokus} putar={putar} />

      <div className="hud">
        <div className="hud-atas">
          <Merek kecil />
          {k ? (
            <StatusWarga st={st} />
          ) : st.masuk === false ? (
            <Link className="tombol-bilah utama hud-masuk" href="/masuk">Masuk</Link>
          ) : null}
          <div className="hud-kanan">
            <button type="button" className="ikon-tombol bulat" aria-label="Putar peta ke kiri" onClick={() => setPutar((p) => p - 1)}>
              <PutarKiri />
            </button>
            <button type="button" className="ikon-tombol bulat" aria-label="Putar peta ke kanan" onClick={() => setPutar((p) => p + 1)}>
              <PutarKanan />
            </button>
          <div className="menu-wadah">
            <button type="button" className="ikon-tombol bulat" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              {menu ? <Tutup /> : <Menu />}
            </button>
            {menu && (
              <nav className="menu-daftar" aria-label="Menu utama">
                {/* navigasi utama sudah ada di navigasi bawah ponsel, jadi hanya tampil di layar lebar */}
                {navUtama(!!st.masuk)
                  .filter((t) => t.href !== '/')
                  .map((t) => (
                    <Link key={t.href} href={t.href} className="hanya-lebar">{t.label}</Link>
                  ))}
                {navLain(!!st.masuk).map((t) => (
                  <Link key={t.href} href={t.href}>{t.label}</Link>
                ))}
                <TombolPasang ringkas />
              </nav>
            )}
          </div>
          </div>
        </div>

        {st.pesan && (
          <button type="button" className={`peta-pesan${st.pesan.ok ? '' : ' galat'}`} onClick={() => st.setPesan(null)} role="status">
            {st.pesan.teks}
          </button>
        )}

        <div className={`hud-bawah${(mode === 'jelajah' && terpilih) || mode !== 'jelajah' ? ' ada-lembar' : ''}`}>
          {k?.perjalanan && <BannerPerjalanan k={k} kini={st.kini} />}
          {mode === 'jelajah' && terpilih && lahanKosong.some((l) => l.id === terpilih) &&
            (k ? (
              <PanelLahan
                id={terpilih}
                k={k}
                tenaga={st.tenaga}
                bebas={st.bebas}
                kini={st.kini}
                lakukan={st.lakukan}
                versi={st.versi}
                keBalaiKota={keBalaiKota}
                onTutup={() => setTerpilih(null)}
              />
            ) : (
              <section className="lembar" aria-label={`Lahan ${terpilih}`}>
                <div className="lembar-isi">
                  <h2>{terpilih}</h2>
                  <p className="catatan">
                    <Link className="tautan" href="/masuk">Masuk atau daftar</Link> untuk melihat harga dan membeli lahan di Balai Kota.
                  </p>
                </div>
              </section>
            ))}
          {mode === 'jelajah' && terpilih && !lahanKosong.some((l) => l.id === terpilih) && (
            <PanelBangunan
              id={terpilih}
              onTutup={() => setTerpilih(null)}
              aksi={
                k ? (
                  <AksiBangunan
                    k={k}
                    tenaga={st.tenaga}
                    bebas={st.bebas}
                    kini={st.kini}
                    lakukan={st.lakukan}
                    lihat={(id) => terbang(id, id.startsWith('lahan-') ? 30 : 24)}
                    jenis={penempatanById.get(terpilih)?.jenis ?? ''}
                    idTempat={terpilih}
                    versi={st.versi}
                    lahanPilihan={lahanPilihan}
                  />
                ) : st.masuk === false ? (
                  <p className="catatan">
                    <Link className="tautan" href="/masuk">Masuk atau daftar</Link> untuk bekerja, tinggal, dan berbelanja di sini.
                  </p>
                ) : null
              }
            />
          )}
          {mode === 'daftar' && <DaftarTempat onPilih={pilih} onTutup={() => setMode('jelajah')} />}
          {mode === 'tur' && (
            <PanelTur
              langkah={langkah}
              onLangkah={keLangkah}
              onTutup={akhiriTur}
              st={st.masuk ? st : null}
              onLihat={lihatTur}
            />
          )}

          <div className={`bilah${mode === 'tur' ? ' bilah-tur' : ''}`} role="toolbar" aria-label="Kontrol peta">
            {k?.peran === 'walikota' && (
              <div className="kelompok" role="group" aria-label="Waktu kota (Wali Kota)">
                {daftarWaktu.map((w) => {
                  const { ikon: Ikon, nama } = ikonWaktu[w]
                  return (
                    <button key={w} type="button" className="ikon-tombol" aria-label={nama} aria-pressed={waktuTetap && waktu === w} onClick={() => { setWaktuTetap(true); setWaktu(w) }}>
                      <Ikon />
                    </button>
                  )
                })}
                {waktuTetap && <button type="button" className="ikon-tombol teks-wib" aria-label="Kembali ke jam WIB" onClick={() => setWaktuTetap(false)}>WIB</button>}
              </div>
            )}
            <button type="button" className="tombol-bilah" aria-pressed={mode === 'daftar'} onClick={() => setMode((m) => (m === 'daftar' ? 'jelajah' : 'daftar'))}>
              <Daftar /> Tempat
            </button>
            {k?.pekerjaan && (
              <button type="button" className="tombol-bilah utama" onClick={keTempatKerja}>
                Ke tempat kerja
              </button>
            )}
            <button type="button" className={`tombol-bilah${k?.pekerjaan ? '' : ' utama'}`} disabled={mode === 'tur'} onClick={mulaiTur}>
              <Rute /> Tur kota
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
