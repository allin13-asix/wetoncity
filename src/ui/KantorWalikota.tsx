'use client'

// Ruang kendali Wali Kota: bansos uang dan barang, barang baru dengan ikon 2D, pengumuman kota, dan pintasan alat kota lain.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { rupiah } from '@/data/ekonomi'
import type { Bentuk } from '@/data/bentuk'
import { panggil } from './api'
import { IkonBarang, type IkonKustom } from './IkonBarang'
import { useKeadaan } from './keadaan'

type Data = {
  warga: { semua: number; aktif: number }
  batas: { bansosUangMaks: number; bansosBarangMaks: number; aktifHari: number; barangKustomMaks: number; pengumumanMaks: number }
  bentuk: Array<{ id: Bentuk; nama: string }>
  barang: Array<{ id: string; nama: string; jenis: string; kustom: boolean; ikon: IkonKustom | null }>
  kustom: Array<{ id: string; nama: string; jenis: string; dasar: number; satuan: string; ringkas: string; tenaga: number; kesehatan: number; lapar: number; bentuk: Bentuk; warna: string }>
  riwayat: Array<{ id: number; sasaran: string; item: string | null; jumlah: number; uang: number; penerima: number; pesan: string | null; waktu: string }>
}
type Warga = { id: string; nama: string; level: number }
type St = ReturnType<typeof useKeadaan>

const PALET = ['#e0533b', '#f2b51d', '#2e8b6a', '#2f6fa8', '#8a5ac9', '#d4567f', '#3a9aa8', '#7a4f2a', '#1f2f5c', '#9aa5ab']

function Bansos({ d, st, segarkan }: { d: Data; st: St; segarkan: () => void }) {
  const [sasaran, setSasaran] = useState<'aktif' | 'semua' | 'warga'>('aktif')
  const [cari, setCari] = useState('')
  const [hasil, setHasil] = useState<Warga[]>([])
  const [warga, setWarga] = useState<Warga | null>(null)
  const [uang, setUang] = useState(100_000)
  const [item, setItem] = useState('')
  const [jumlah, setJumlah] = useState(1)
  const [pesan, setPesan] = useState('')
  useEffect(() => {
    if (sasaran !== 'warga' || !cari.trim()) return setHasil([])
    const t = setTimeout(() => panggil<{ warga: Warga[] }>(`/api/warga?cari=${encodeURIComponent(cari)}`).then((r) => r.ok && setHasil(r.data.warga)), 300)
    return () => clearTimeout(t)
  }, [cari, sasaran])
  const orang = sasaran === 'warga' ? (warga ? 1 : 0) : sasaran === 'aktif' ? d.warga.aktif : d.warga.semua
  const b = d.barang.find((x) => x.id === item)
  const bisa = orang > 0 && (uang > 0 || !!item)
  return (
    <section className="panel">
      <h2>Bansos</h2>
      <p className="catatan">Dikirim ke mailbox warga; uang dan barang masuk saat mereka mengklaimnya di Inventori.</p>
      <div className="kelompok-tab" role="tablist" aria-label="Sasaran bansos">
        {([['aktif', `Warga aktif (${d.warga.aktif})`], ['semua', `Semua warga (${d.warga.semua})`], ['warga', 'Satu warga']] as const).map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={sasaran === v} onClick={() => setSasaran(v)}>{l}</button>
        ))}
      </div>
      {sasaran === 'aktif' && <p className="catatan">Aktif = bermain dalam {d.batas.aktifHari} hari terakhir.</p>}
      {sasaran === 'warga' && (
        <div className="cari-warga-bansos">
          {warga ? (
            <p>
              Penerima: <strong>{warga.nama}</strong> <button type="button" className="tombol-teks" onClick={() => setWarga(null)}>ganti</button>
            </p>
          ) : (
            <>
              <input className="kolom-cari" type="search" value={cari} placeholder="Cari nama warga" aria-label="Cari nama warga" onChange={(e) => setCari(e.target.value)} />
              <ul className="pilih-ruang">
                {hasil.map((w) => (
                  <li key={w.id}><button type="button" onClick={() => setWarga(w)}>{w.nama} <small>Lv {w.level}</small></button></li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="form-kotak">
        <label className="tulis-label">
          Uang per warga
          <select value={uang} onChange={(e) => setUang(Number(e.target.value))}>
            {[0, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000].filter((n) => n <= d.batas.bansosUangMaks).map((n) => (
              <option key={n} value={n}>{n ? rupiah(n) : 'Tanpa uang'}</option>
            ))}
          </select>
        </label>
        <label className="tulis-label">
          Barang
          <select value={item} onChange={(e) => setItem(e.target.value)}>
            <option value="">Tanpa barang</option>
            {d.barang.map((x) => <option key={x.id} value={x.id}>{x.nama}{x.kustom ? ' (buatan)' : ''}</option>)}
          </select>
        </label>
        {item && (
          <label className="tulis-label">
            Jumlah per warga
            <input type="number" min={1} max={d.batas.bansosBarangMaks} value={jumlah} onChange={(e) => setJumlah(Math.max(1, Math.min(d.batas.bansosBarangMaks, Math.floor(Number(e.target.value) || 1))))} />
          </label>
        )}
        <label className="tulis-label">
          Judul surat (opsional)
          <input value={pesan} maxLength={80} placeholder="Bansos dari Pemerintah Kota Weton" onChange={(e) => setPesan(e.target.value)} />
        </label>
      </div>
      {b && <p className="baris-ikon"><IkonBarang id={b.id} jenis={b.jenis} kustom={b.ikon} ukuran={36} /> {jumlah} {b.nama} per warga</p>}
      <p className="catatan">
        Perkiraan: {orang} penerima{uang ? `, total ${rupiah(uang * orang)}` : ''}{b ? `, ${jumlah * orang} ${b.nama}` : ''}.
      </p>
      <button
        type="button"
        className="tombol-utama"
        disabled={!st.bebas || !bisa}
        onClick={async () => {
          if (!confirm(`Kirim bansos ke ${orang} warga?`)) return
          const ok = await st.lakukan(`bansos-${sasaran}-${uang}-${item}-${jumlah}-${Date.now()}`, '/api/walikota',
            { aksi: 'bansos', sasaran, warga: warga?.id, uang, item: item || undefined, jumlah, pesan: pesan || undefined },
            (k) => `Bansos terkirim ke ${k.walikota?.penerima ?? 0} warga`)
          if (ok) segarkan()
        }}
      >
        Kirim bansos
      </button>
      {d.riwayat.length > 0 && (
        <details className="bursa">
          <summary><h3 className="sub">Riwayat bansos</h3></summary>
          <ul className="lowongan">
            {d.riwayat.map((r) => (
              <li key={r.id}>
                <span>
                  <strong>{[r.uang ? rupiah(r.uang) : '', r.item ? `${r.jumlah} ${r.item}` : ''].filter(Boolean).join(' + ')}</strong>
                  <small>{r.penerima} penerima · {r.sasaran === 'aktif' ? 'warga aktif' : r.sasaran === 'semua' ? 'semua warga' : 'satu warga'} · {new Date(r.waktu).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function BarangBaru({ d, st, segarkan }: { d: Data; st: St; segarkan: () => void }) {
  const [f, setF] = useState({ nama: '', jenis: 'konsumsi', dasar: 20_000, satuan: 'buah', ringkas: '', tenaga: 5, kesehatan: 0, lapar: 10, bentuk: 'kue' as Bentuk, warna: '#e0533b' })
  const ubah = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: typeof x[k] === 'number' ? Math.max(0, Math.floor(Number(e.target.value) || 0)) : e.target.value }))
  const konsumsi = f.jenis === 'konsumsi'
  return (
    <section className="panel">
      <h2>Barang baru</h2>
      <p className="catatan">
        Barang buatanmu bisa dibagikan lewat bansos, dihadiahkan antarwarga, dan (bila konsumsi) dipakai dari Inventori. Paling banyak {d.batas.barangKustomMaks} barang.
      </p>
      <div className="pratinjau-barang">
        <IkonBarang id="" jenis={f.jenis} kustom={{ bentuk: f.bentuk, warna: f.warna }} ukuran={72} />
        <div>
          <strong>{f.nama || 'Nama barang'}</strong>
          <small>{rupiah(f.dasar)} / {f.satuan}{konsumsi ? ` · Tenaga +${f.tenaga}, Kesehatan +${f.kesehatan}, Kenyang +${f.lapar}` : ''}</small>
        </div>
      </div>
      <div className="form-kotak">
        <label className="tulis-label">Nama<input value={f.nama} maxLength={40} placeholder="Misal: Kue Lapis Weton" onChange={ubah('nama')} /></label>
        <label className="tulis-label">
          Jenis
          <select value={f.jenis} onChange={ubah('jenis')}>
            <option value="konsumsi">Konsumsi (bisa dimakan/diminum)</option>
            <option value="koleksi">Koleksi</option>
            <option value="bahan">Bahan</option>
          </select>
        </label>
        <label className="tulis-label">Harga dasar (Rp)<input type="number" min={100} max={100000000} step={100} value={f.dasar} onChange={ubah('dasar')} /></label>
        <label className="tulis-label">Satuan<input value={f.satuan} maxLength={12} onChange={ubah('satuan')} /></label>
        {konsumsi && (
          <>
            <label className="tulis-label">Tenaga +<input type="number" min={0} max={50} value={f.tenaga} onChange={ubah('tenaga')} /></label>
            <label className="tulis-label">Kesehatan +<input type="number" min={0} max={50} value={f.kesehatan} onChange={ubah('kesehatan')} /></label>
            <label className="tulis-label">Kenyang +<input type="number" min={0} max={60} value={f.lapar} onChange={ubah('lapar')} /></label>
          </>
        )}
        <label className="tulis-label lebar-penuh">Keterangan<input value={f.ringkas} maxLength={120} placeholder="Satu kalimat tentang barang ini" onChange={ubah('ringkas')} /></label>
      </div>
      <h3 className="sub">Bentuk ikon</h3>
      <ul className="pilih-bentuk">
        {d.bentuk.map((b) => (
          <li key={b.id}>
            <button type="button" aria-pressed={f.bentuk === b.id} aria-label={b.nama} title={b.nama} onClick={() => setF((x) => ({ ...x, bentuk: b.id }))}>
              <IkonBarang id="" jenis={f.jenis} kustom={{ bentuk: b.id, warna: f.warna }} ukuran={40} />
            </button>
          </li>
        ))}
      </ul>
      <h3 className="sub">Warna</h3>
      <div className="pilih-warna">
        {PALET.map((w) => (
          <button key={w} type="button" aria-pressed={f.warna === w} aria-label={`Warna ${w}`} style={{ background: w }} onClick={() => setF((x) => ({ ...x, warna: w }))} />
        ))}
        <input type="color" value={f.warna} aria-label="Warna lain" onChange={(e) => setF((x) => ({ ...x, warna: e.target.value }))} />
      </div>
      <button
        type="button"
        className="tombol-utama"
        disabled={!st.bebas || f.nama.trim().length < 3}
        onClick={async () => {
          const ok = await st.lakukan(`barang-${f.nama}`, '/api/walikota', { aksi: 'barang_baru', ...f }, `${f.nama} ditambahkan ke kota`)
          if (ok) {
            setF((x) => ({ ...x, nama: '', ringkas: '' }))
            segarkan()
          }
        }}
      >
        Tambah barang
      </button>
      {d.kustom.length > 0 && (
        <>
          <h3 className="sub">Barang buatanmu</h3>
          <ul className="lowongan">
            {d.kustom.map((k) => (
              <li key={k.id} className="baris-barang">
                <IkonBarang id={k.id} jenis={k.jenis} kustom={{ bentuk: k.bentuk, warna: k.warna }} />
                <span>
                  <strong>{k.nama}</strong>
                  <small>{k.jenis} · {rupiah(k.dasar)}/{k.satuan}{k.jenis === 'konsumsi' ? ` · Tenaga +${k.tenaga}` : ''}</small>
                </span>
                <button
                  type="button"
                  className="tombol-sekunder"
                  disabled={!st.bebas}
                  onClick={async () => {
                    if (!confirm(`Hapus ${k.nama}? Barang ini juga ditarik dari inventori semua warga.`)) return
                    if (await st.lakukan(`hapus-${k.id}`, '/api/walikota', { aksi: 'barang_hapus', barang: k.id }, `${k.nama} dihapus`)) segarkan()
                  }}
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Pengumuman({ d, st }: { d: Data; st: St }) {
  const [isi, setIsi] = useState('')
  return (
    <section className="panel">
      <h2>Pengumuman kota</h2>
      <p className="catatan">Tampil di obrolan Kota untuk semua warga, ditandai [Pengumuman].</p>
      <textarea className="kolom-tulis" rows={3} maxLength={d.batas.pengumumanMaks} value={isi} placeholder="Contoh: Malam ini ada pasar malam di alun-alun!" onChange={(e) => setIsi(e.target.value)} />
      <button
        type="button"
        className="tombol-utama"
        disabled={!st.bebas || !isi.trim()}
        onClick={async () => {
          if (await st.lakukan(`umumkan-${isi.length}-${Date.now()}`, '/api/walikota', { aksi: 'pengumuman', isi }, 'Pengumuman terkirim')) setIsi('')
        }}
      >
        Umumkan
      </button>
    </section>
  )
}

export default function KantorWalikota() {
  const router = useRouter()
  const st = useKeadaan()
  const [d, setD] = useState<Data | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const segarkan = useCallback(() => {
    panggil<Data>('/api/walikota').then((r) => (r.ok ? setD(r.data) : setGalat(r.galat.pesan)))
  }, [])
  useEffect(() => {
    if (st.masuk === false) router.replace('/masuk')
    else if (st.masuk) segarkan()
  }, [st.masuk, router, segarkan])
  return (
    <main className="halaman">
      <div className="beranda-kepala">
        <h1>Kantor Wali Kota</h1>
        <Link className="tombol-sekunder" href="/beranda">Beranda</Link>
      </div>
      {st.pesan && <p className={`pesan ${st.pesan.ok ? 'ok' : 'galat'}`} role="status">{st.pesan.teks}</p>}
      {galat && <p className="pesan galat">{galat}</p>}
      {!d ? (
        !galat && <p className="kosong">Memuat</p>
      ) : (
        <div className="kolom">
          <section className="panel">
            <h2>Alat kota</h2>
            <ul className="pintasan-wk">
              <li><Link className="tombol-sekunder" href="/editor">Editor peta kota</Link><small>Menyusun jalan, bangunan, dan lahan (hanya di server pengembangan).</small></li>
              <li><Link className="tombol-sekunder" href="/koran/tulis">Meja redaksi Koran</Link><small>Tulis edisi koran kota.</small></li>
              <li><Link className="tombol-sekunder" href="/beranda">Kebijakan UMK dan dana</Link><small>UMK, dana kas, Tenaga, dan Keahlian di Beranda.</small></li>
              <li><Link className="tombol-sekunder" href="/">Waktu kota</Link><small>Tombol pagi, siang, senja, malam di bilah peta.</small></li>
            </ul>
          </section>
          <Bansos d={d} st={st} segarkan={segarkan} />
          <BarangBaru d={d} st={st} segarkan={segarkan} />
          <Pengumuman d={d} st={st} />
        </div>
      )}
    </main>
  )
}
