'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { rupiah } from '@/data/ekonomi'
import type { Keadaan } from '@/server/tipe'
import { kunciBaru, panggil } from './api'

type Jenis = 'bahan' | 'konsumsi' | 'koleksi'
type BarisBarang = {
  id: string
  nama: string
  jenis: Jenis
  satuan: string
  ringkas: string
  tenaga: number | null
  npc: { jual: number; beli: number; diskon: boolean }
  pita: [number, number]
}
type Papan = {
  tanggal: string
  pasaran: string
  barang: BarisBarang[]
  lapak: Array<{ id: string; barang: string; sisa: number; harga: number; nama: string; milikku: boolean }>
  biayaLapak: number
}

const JENIS: Record<Jenis, { judul: string; ringkas: string }> = {
  bahan: { judul: 'Bahan', ringkas: 'Ikan dan beras untuk usaha. Warung memakai bahan dari gudang.' },
  konsumsi: { judul: 'Makanan dan minuman', ringkas: 'Menambah Tenaga, paling banyak tiga kali sehari.' },
  koleksi: { judul: 'Koleksi', ringkas: 'Tidak punya efek. Disimpan, dipamerkan, atau dijual lagi. Beberapa hanya didapat dari perjalanan atau perahu.' },
}

/** Pasar Weton: pedagang NPC (jual 130%, beli 70% harga dasar), lapak antarwarga di antara keduanya, dan barang konsumsi. */
export default function Pasar() {
  const [k, setK] = useState<Keadaan | null>(null)
  const [papan, setPapan] = useState<Papan | null>(null)
  const [masuk, setMasuk] = useState(true)
  const [jenis, setJenis] = useState<Jenis>('bahan')
  const [buka, setBuka] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [jumlah, setJumlah] = useState<Record<string, number>>({})
  const [harga, setHarga] = useState<Record<string, number>>({})
  const tertunda = useRef<Record<string, string>>({})

  const muat = useCallback(async () => {
    const [a, b] = await Promise.all([panggil('/api/saya'), panggil<Papan>('/api/pasar')])
    if (!a.ok && a.status === 401) return setMasuk(false)
    if (a.ok) setK(a.data)
    if (b.ok) setPapan(b.data)
    else setPesan({ ok: false, teks: b.galat.pesan })
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function lakukan(badan: Record<string, unknown>, sukses: string) {
    setSibuk(true)
    setPesan(null)
    const id = JSON.stringify(badan)
    const kunci = (tertunda.current[id] ??= kunciBaru())
    const h = await panggil('/api/pasar', { ...badan, kunci })
    if (h.ok || h.status !== 0) delete tertunda.current[id]
    setSibuk(false)
    if (!h.ok) return setPesan({ ok: false, teks: h.galat.pesan })
    setK(h.data)
    setPesan({ ok: true, teks: sukses })
    const b = await panggil<Papan>('/api/pasar')
    if (b.ok) setPapan(b.data)
  }

  if (!masuk) {
    return (
      <main className="halaman">
        <h1>Pasar Weton</h1>
        <p className="pengantar">Masuk dulu untuk berdagang di pasar.</p>
        <p><Link className="tautan" href="/masuk">Masuk</Link></p>
      </main>
    )
  }
  if (!k || !papan) return <main className="halaman"><p className="kosong">Memuat</p></main>

  const n = (kunci: string) => jumlah[kunci] ?? 1
  const setN = (kunci: string) => (e: React.ChangeEvent<HTMLInputElement>) => setJumlah((j) => ({ ...j, [kunci]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))
  const bebas = !sibuk && !k.perjalanan
  const punya = (id: string) => k.gudang[id] ?? 0
  const daftar = papan.barang.filter((b) => b.jenis === jenis)
  const koleksiku = papan.barang.filter((b) => b.jenis === 'koleksi' && punya(b.id) > 0)

  return (
    <main className="halaman pasar">
      <h1>Pasar Weton</h1>
      <p className="pengantar">
        Hari {papan.pasaran}. Pedagang selalu ada, tapi menjual mahal dan membeli murah. Harga di lapak warga ditentukan penjualnya.
      </p>
      <p className="pasar-saku">
        Uang <strong>{rupiah(k.kas)}</strong> · Jatah makan-minum hari ini <strong>{k.konsumsiSisa}</strong> lagi
      </p>
      {koleksiku.length > 0 && (
        <p className="catatan">Lemari koleksi: {koleksiku.map((b) => `${b.nama} ${punya(b.id)}`).join(', ')}.</p>
      )}
      {pesan && <p className={`pesan ${pesan.ok ? 'ok' : 'galat'}`}>{pesan.teks}</p>}

      <div className="kelompok-tab" role="tablist" aria-label="Jenis barang">
        {(Object.keys(JENIS) as Jenis[]).map((j) => (
          <button key={j} type="button" role="tab" aria-selected={jenis === j} onClick={() => setJenis(j)}>
            {JENIS[j].judul}
          </button>
        ))}
      </div>
      <p className="catatan">{JENIS[jenis].ringkas}</p>

      <ul className="pasar-daftar">
        {daftar.map((b) => {
          const lapak = papan.lapak.filter((l) => l.barang === b.id)
          const termurah = lapak.find((l) => !l.milikku)
          const hl = harga[b.id] ?? Math.round((b.pita[0] + b.pita[1]) / 2 / 500) * 500
          const kN = `npc-${b.id}`
          return (
            <li key={b.id} className="panel pasar-barang">
              <div className="pasar-kepala">
                <div>
                  <h2>{b.nama}</h2>
                  <p className="catatan">
                    {b.ringkas}
                    {b.tenaga ? ` Tenaga +${b.tenaga}.` : ''}
                  </p>
                </div>
                <p className="pasar-punya">
                  Punya <strong>{punya(b.id)}</strong> {b.satuan}
                </p>
              </div>
              <div className="pasar-npc">
                <label className="tulis-label">
                  Jumlah
                  <input type="number" min={1} value={n(kN)} onChange={setN(kN)} />
                </label>
                <button
                  type="button"
                  className="tombol-sekunder"
                  disabled={!bebas || k.kas < b.npc.jual * n(kN)}
                  onClick={() => lakukan({ aksi: 'beli_npc', barang: b.id, jumlah: n(kN) }, `Beli ${n(kN)} ${b.satuan} ${b.nama.toLowerCase()}`)}
                >
                  Beli {rupiah(b.npc.jual)}{b.npc.diskon && <small>diskon hari {papan.pasaran}</small>}
                </button>
                <button
                  type="button"
                  className="tombol-sekunder"
                  disabled={!bebas || punya(b.id) < n(kN)}
                  onClick={() => lakukan({ aksi: 'jual_npc', barang: b.id, jumlah: n(kN) }, `Jual ${n(kN)} ${b.satuan} ${b.nama.toLowerCase()}`)}
                >
                  Jual {rupiah(b.npc.beli)}
                </button>
                {b.tenaga && (
                  <button
                    type="button"
                    className="tombol-sekunder"
                    disabled={!bebas || punya(b.id) < 1 || k.konsumsiSisa < 1}
                    onClick={() => lakukan({ aksi: 'pakai', barang: b.id }, `${b.nama}: Tenaga +${b.tenaga}`)}
                  >
                    Pakai
                  </button>
                )}
                <button type="button" className="tombol-teks" aria-expanded={buka === b.id} onClick={() => setBuka(buka === b.id ? null : b.id)}>
                  Lapak warga ({lapak.length}){termurah ? `, mulai ${rupiah(termurah.harga)}` : ''}
                </button>
              </div>

              {buka === b.id && (
                <div className="pasar-lapak">
                  {lapak.length === 0 ? (
                    <p className="catatan">Belum ada lapak.</p>
                  ) : (
                    <ul className="lowongan">
                      {lapak.map((l) => (
                        <li key={l.id}>
                          <span>
                            <strong>{rupiah(l.harga)} per {b.satuan}</strong>
                            <small>{l.milikku ? 'Lapakmu' : l.nama}, sisa {l.sisa}</small>
                          </span>
                          {!l.milikku && (
                            <span className="baris-aksi">
                              <input className="pasar-jumlah" type="number" min={1} max={l.sisa} aria-label={`Jumlah dari lapak ${l.nama}`} value={Math.min(n(l.id), l.sisa)} onChange={setN(l.id)} />
                              <button
                                type="button"
                                className="tombol-sekunder"
                                disabled={!bebas || k.kas < l.harga * Math.min(n(l.id), l.sisa)}
                                onClick={() => lakukan({ aksi: 'beli_lapak', lapak: l.id, jumlah: Math.min(n(l.id), l.sisa) }, `Beli dari lapak ${l.nama}`)}
                              >
                                Beli
                              </button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <h3>Buka lapak</h3>
                  <p className="catatan">
                    Harga {rupiah(b.pita[0])} sampai {rupiah(b.pita[1])} per {b.satuan}. Biaya lapak {Math.round(papan.biayaLapak * 100)}% dipotong dari hasil penjualan.
                  </p>
                  <div className="pasar-npc">
                    <label className="tulis-label">
                      Jumlah
                      <input type="number" min={1} max={punya(b.id)} value={n(`lapak-${b.id}`)} onChange={setN(`lapak-${b.id}`)} />
                    </label>
                    <label className="tulis-label">
                      Harga per {b.satuan}
                      <input type="number" min={b.pita[0]} max={b.pita[1]} step={500} value={hl} onChange={(e) => setHarga((h) => ({ ...h, [b.id]: Math.floor(Number(e.target.value) || 0) }))} />
                    </label>
                    <button
                      type="button"
                      className="tombol-sekunder"
                      disabled={!bebas || punya(b.id) < n(`lapak-${b.id}`) || hl < b.pita[0] || hl > b.pita[1]}
                      onClick={() => lakukan({ aksi: 'buka_lapak', barang: b.id, jumlah: n(`lapak-${b.id}`), harga: hl }, `Lapak ${b.nama.toLowerCase()} dibuka`)}
                    >
                      Buka lapak
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {k.lapak.length > 0 && (
        <section className="panel pasar-milikku">
          <h2>Lapakmu</h2>
          <ul className="lowongan">
            {k.lapak.map((l) => {
              const b = papan.barang.find((x) => x.id === l.barang)
              return (
                <li key={l.id}>
                  <span>
                    <strong>
                      {b?.nama ?? l.barang} {rupiah(l.harga)} per {b?.satuan ?? 'buah'}
                    </strong>
                    <small>
                      Sisa {l.sisa}, terjual {l.terjual}{l.menunggu > 0 ? `, ${rupiah(l.menunggu)} masuk saat kamu membuka game lagi` : ''}
                    </small>
                  </span>
                  {l.sisa > 0 && (
                    <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan({ aksi: 'tutup_lapak', lapak: l.id }, 'Lapak ditutup, sisa barang kembali ke gudang')}>
                      Tutup
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
