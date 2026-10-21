'use client'

// Hiburan dan belanja: Rumah Judi Mujur (roulette Eropa), memancing di pantai, dan minimarket.
import { useEffect, useMemo, useState } from 'react'
import { MEMANCING, ROULETTE } from '@/data/balans'
import { rupiah } from '@/data/ekonomi'
import { posisiPenanda, warnaKantong, type JenisTaruhan } from '@/server/sistem-aturan'
import { panggil } from './api'
import type { Props } from './FiturKota'

// ---------------------------------------------------------------- roulette

type Taruhan = { jenis: JenisTaruhan; nilai?: number; jumlah: number }
type Panduan = {
  aturan: string[]
  bayar: Array<{ taruhan: string; jenis: string; rasio: string }>
  putaran: Array<{ id: number; nomor: number; warna: string; taruhan: number; kembali: number; waktu: string }>
}

const LABEL: Record<JenisTaruhan, string> = { lurus: 'Angka', merah: 'Merah', hitam: 'Hitam', ganjil: 'Ganjil', genap: 'Genap', rendah: '1-18', tinggi: '19-36', lusin: 'Lusin', kolom: 'Kolom' }
const namaTaruhan = (t: { jenis: JenisTaruhan; nilai?: number }) => (t.jenis === 'lurus' || t.jenis === 'lusin' || t.jenis === 'kolom' ? `${LABEL[t.jenis]} ${t.nilai}` : LABEL[t.jenis])
const CHIP = [5_000, 10_000, 50_000, 100_000, 500_000]

/** Meja roulette Eropa 37 kantong. Server mengundi angka dan menghitung bayaran; di sini hanya memilih taruhan. */
export function Roulette({ k, tenaga, bebas, lakukan, versi }: Props & { versi: number }) {
  const [chip, setChip] = useState(10_000)
  const [bets, setBets] = useState<Taruhan[]>([])
  const [panduan, setPanduan] = useState<Panduan | null>(null)
  useEffect(() => {
    panggil<Panduan>('/api/judi').then((r) => r.ok && setPanduan(r.data))
  }, [versi])

  const total = bets.reduce((t, b) => t + b.jumlah, 0)
  const pasang = (jenis: JenisTaruhan, nilai?: number) =>
    setBets((lama) => {
      const i = lama.findIndex((b) => b.jenis === jenis && b.nilai === nilai)
      if (i >= 0) return lama.map((b, j) => (j === i ? { ...b, jumlah: Math.min(ROULETTE.taruhanMaks, b.jumlah + chip) } : b))
      if (lama.length >= ROULETTE.taruhanPerPutaran) return lama
      return [...lama, { jenis, nilai, jumlah: Math.min(ROULETTE.taruhanMaks, chip) }]
    })
  const sel = (jenis: JenisTaruhan, label: string, nilai?: number, kelas = '') => {
    const ada = bets.find((b) => b.jenis === jenis && b.nilai === nilai)
    return (
      <button key={`${jenis}${nilai ?? ''}`} type="button" className={`rl-sel ${kelas}${ada ? ' dipilih' : ''}`} onClick={() => pasang(jenis, nilai)} aria-label={`Taruhan ${label}`}>
        {label}
        {ada && <i>{ada.jumlah >= 1000 ? `${ada.jumlah / 1000}rb` : ada.jumlah}</i>}
      </button>
    )
  }
  const hasil = k.roulette
  const warna = (n: number) => warnaKantong(n)

  return (
    <section className="panel">
      <h2>Rumah Judi Mujur</h2>
      <p className="catatan">
        Roulette Eropa 37 kantong (0-36), undian di server. Uang game, bukan uang sungguhan. Taruhan {rupiah(ROULETTE.taruhanMin)} sampai {rupiah(ROULETTE.taruhanMaks)} per pasang, total paling banyak{' '}
        {rupiah(ROULETTE.totalMaks)}. Tiap putaran {ROULETTE.tenaga} Tenaga.
      </p>
      {hasil && (
        <p className={`pesan ${hasil.kembali > hasil.taruhan ? 'ok' : 'galat'}`}>
          Bola jatuh di <strong className={`rl-bola ${warna(hasil.nomor)}`}>{hasil.nomor}</strong> ({warna(hasil.nomor)}). Taruhan {rupiah(hasil.taruhan)}, kembali {rupiah(hasil.kembali)}
          {hasil.kembali === hasil.taruhan ? ' (impas)' : hasil.kembali > hasil.taruhan ? `, untung ${rupiah(hasil.kembali - hasil.taruhan)}` : `, rugi ${rupiah(hasil.taruhan - hasil.kembali)}`}.
        </p>
      )}
      <div className="rl-chip" role="group" aria-label="Nilai chip">
        {CHIP.map((c) => (
          <button key={c} type="button" aria-pressed={chip === c} onClick={() => setChip(c)}>
            {c >= 1000 ? `${c / 1000}rb` : c}
          </button>
        ))}
      </div>
      <div className="rl-meja">
        {sel('lurus', '0', 0, 'hijau rl-nol')}
        <div className="rl-angka">
          {Array.from({ length: 12 }, (_, kolom) =>
            [3, 2, 1].map((baris) => {
              const n = kolom * 3 + baris
              return sel('lurus', String(n), n, warna(n))
            }),
          )}
        </div>
        <div className="rl-luar rl-kolom">{[3, 2, 1].map((n) => sel('kolom', `Kolom ${n}`, n))}</div>
        <div className="rl-luar rl-lusin">{[1, 2, 3].map((n) => sel('lusin', `Lusin ${n}`, n))}</div>
        <div className="rl-luar rl-enam">
          {sel('rendah', '1-18')}
          {sel('genap', 'Genap')}
          {sel('merah', 'Merah', undefined, 'merah')}
          {sel('hitam', 'Hitam', undefined, 'hitam')}
          {sel('ganjil', 'Ganjil')}
          {sel('tinggi', '19-36')}
        </div>
      </div>
      {bets.length > 0 && (
        <ul className="lowongan">
          {bets.map((b) => (
            <li key={`${b.jenis}${b.nilai ?? ''}`}>
              <span>
                <strong>{namaTaruhan(b)}</strong>
                <small>
                  {rupiah(b.jumlah)}, bayar {ROULETTE.bayar[b.jenis]}:1
                </small>
              </span>
              <button type="button" className="tombol-sekunder" onClick={() => setBets((l) => l.filter((x) => x !== b))}>Hapus</button>
            </li>
          ))}
        </ul>
      )}
      <div className="baris-aksi rata-kiri">
        <button
          type="button"
          className="tombol-utama"
          disabled={!bebas || bets.length === 0 || k.kas < total || tenaga < ROULETTE.tenaga || total > ROULETTE.totalMaks}
          onClick={async () => {
            const ok = await lakukan(
              `roulette-${total}-${bets.length}`,
              '/api/judi',
              { taruhan: bets },
              (b) => (b.roulette ? `Bola jatuh di ${b.roulette.nomor} (${b.roulette.warna})` : 'Putaran selesai'),
            )
            if (ok) setBets([])
          }}
        >
          Putar roda
          <small>{total > 0 ? `taruhan ${rupiah(total)}` : 'pasang taruhan dulu'}</small>
        </button>
        <button type="button" className="tombol-sekunder" disabled={bets.length === 0} onClick={() => setBets([])}>
          Kosongkan
        </button>
      </div>
      <details className="bursa">
        <summary><h3 className="sub">Panduan dan tabel payout</h3></summary>
        {panduan ? (
          <>
            <ul className="daftar-titik">
              {panduan.aturan.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <ul className="lowongan">
              {panduan.bayar.map((b) => (
                <li key={b.jenis}>
                  <span>{b.taruhan}</span>
                  <strong>{b.rasio}</strong>
                </li>
              ))}
            </ul>
            {panduan.putaran.length > 0 && (
              <>
                <h3 className="sub">Putaran terakhirmu</h3>
                <ul className="lowongan">
                  {panduan.putaran.slice(0, 10).map((p) => (
                    <li key={p.id}>
                      <span>
                        <strong className={`rl-bola ${p.warna}`}>{p.nomor}</strong> {new Date(p.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>{p.kembali >= p.taruhan ? '+' : '-'}{rupiah(Math.abs(p.kembali - p.taruhan))}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <p className="catatan">Memuat panduan</p>
        )}
      </details>
    </section>
  )
}

// ---------------------------------------------------------------- memancing

/**
 * Lempar kail, tunggu ikan menggigit, lalu tarik saat penanda ada di zona sasaran. Server menentukan ikan, waktu gigit, zona, dan
 * menilai tarikan dari jam server; penanda di sini hanya mengikuti jam server yang sama.
 */
export function Memancing({ k, tenaga, bebas, lakukan }: Props) {
  const p = k.pancing
  const offset = useMemo(() => Date.parse(k.sekarang) - Date.now(), [k.sekarang])
  const [sekarang, setSekarang] = useState(() => Date.now() + offset)
  useEffect(() => {
    if (!p) return
    let r = 0
    const tik = () => {
      setSekarang(Date.now() + offset)
      r = requestAnimationFrame(tik)
    }
    r = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(r)
  }, [p, offset])

  const gigit = p ? Date.parse(p.gigit) : 0
  const hangus = p ? Date.parse(p.hangus) : 0
  const fase = !p ? 'diam' : sekarang < gigit ? 'tunggu' : sekarang <= gigit + MEMANCING.jendelaMs ? 'gigit' : 'lewat'
  const pos = p && fase === 'gigit' ? posisiPenanda({ gigit }, sekarang) : 0
  const t = k.tangkapan

  return (
    <section className="panel aksi-utama">
      <h2>Memancing</h2>
      <p className="catatan">
        Lempar kail ({MEMANCING.tenaga} Tenaga), tunggu ikan menggigit, lalu tarik tepat saat penanda di zona hijau. Ikan umum, jarang, dan langka masuk inventori.
      </p>
      {t && !p && (
        <p className={`pesan ${t.berhasil ? 'ok' : 'galat'}`}>
          {t.berhasil ? `Dapat ${t.jumlah} ikan (${t.kelangkaan}${t.nilai === 'sempurna' ? ', tarikan sempurna' : ''}). Cek inventori.` : t.nilai === 'terlambat' ? 'Terlambat menarik, ikan lepas.' : 'Meleset, ikan lepas.'}
        </p>
      )}
      {p && (
        <div className={`pancing-bar ${fase}`} aria-label="Penanda pancing">
          <span className="zona" style={{ left: `${(p.tengah - p.lebar / 2) * 100}%`, width: `${p.lebar * 100}%` }} />
          {fase === 'gigit' && <span className="penanda" style={{ left: `${pos * 100}%` }} />}
          <em>
            {fase === 'tunggu' ? 'Menunggu ikan menggigit...' : fase === 'gigit' ? 'Ikan menggigit! Tarik sekarang!' : 'Ikan sudah lepas.'}
          </em>
        </div>
      )}
      <div className="baris-aksi">
        {!p || fase === 'lewat' || sekarang > hangus ? (
          <button type="button" className="tombol-utama" disabled={!bebas || tenaga < MEMANCING.tenaga} onClick={() => lakukan('lempar', '/api/pancing', { aksi: 'lempar' }, 'Kail dilempar')}>
            Lempar kail
            <small>{MEMANCING.tenaga} Tenaga</small>
          </button>
        ) : (
          <button type="button" className="tombol-utama" disabled={!bebas} onClick={() => lakukan('tarik', '/api/pancing', { aksi: 'tarik' }, (b) => (b.tangkapan?.berhasil ? 'Ikan tertangkap!' : 'Ikan lepas'))}>
            Tarik!
          </button>
        )}
        {p && (
          <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan('batal-pancing', '/api/pancing', { aksi: 'batal' }, 'Kail ditarik pulang')}>
            Batal
          </button>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- minimarket

type DataToko = Array<{
  id: string
  nama: string
  produk: Array<{ id: string; nama: string; harga: number; stok: number; hargaPromo: number; promo: Array<{ id: string; label: string; jenis: string }> }>
  promo: Array<{ id: string; label: string; aktif: boolean; dari: string; sampai: string }>
}>

/** Satu minimarket: harga, stok, dan promo sendiri. Chip "Termurah" membandingkan dengan dua toko lain. */
export function Minimarket({ toko, k, bebas, lakukan, versi }: Props & { toko: string; versi: number }) {
  const [semua, setSemua] = useState<DataToko | null>(null)
  const [jumlah, setJumlah] = useState(1)
  useEffect(() => {
    panggil<DataToko>('/api/toko').then((r) => r.ok && setSemua(r.data))
  }, [versi])
  const ini = semua?.find((t) => t.id === toko)
  if (!ini || !semua) return <section className="panel"><h2>Belanja</h2><p className="catatan">Memuat</p></section>
  const termurah = (id: string, harga: number) => semua.every((t) => (t.produk.find((p) => p.id === id)?.hargaPromo ?? Infinity) >= harga)
  return (
    <section className="panel aksi-utama">
      <h2>{ini.nama}</h2>
      <p className="catatan">Stok dan harga tiap toko berbeda, jadi bandingkan sebelum membeli. Barang masuk inventori; bila penuh, ke mailbox.</p>
      {ini.promo.filter((x) => x.aktif).length > 0 && (
        <ul className="daftar-titik">
          {ini.promo.filter((x) => x.aktif).map((x) => (
            <li key={x.id}>Promo: {x.label}</li>
          ))}
        </ul>
      )}
      <label className="tulis-label">
        Jumlah
        <select value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))}>
          {[1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <ul className="lowongan">
        {ini.produk.map((p) => (
          <li key={p.id}>
            <span>
              <strong>
                {p.nama} {p.hargaPromo < p.harga ? <><s>{rupiah(p.harga)}</s> {rupiah(p.hargaPromo)}</> : rupiah(p.harga)}
              </strong>
              <small>
                Stok {p.stok}
                {termurah(p.id, p.hargaPromo) ? ', termurah di kota' : ''}
                {p.promo.length ? `, ${p.promo.map((x) => x.label).join('; ')}` : ''}
              </small>
            </span>
            <button
              type="button"
              className="tombol-sekunder"
              disabled={!bebas || p.stok < jumlah || k.kas < p.hargaPromo * jumlah}
              onClick={() => lakukan(`toko-${toko}-${p.id}-${jumlah}`, '/api/toko', { toko, produk: p.id, jumlah }, `Membeli ${jumlah} ${p.nama}`)}
            >
              Beli
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
