'use client'

// Panel UMK di Kantor Wali Kota: tren upah warga, rentang yang diizinkan, dan penetapan UMK baru.
import { useEffect, useState } from 'react'
import { rupiah } from '@/data/ekonomi'
import { panggil } from './api'

type Info = {
  umk: number
  sejak: string
  upah7: number
  upahSebelum7: number
  tren: number
  rekomendasi: number
  min: number
  maks: number
  bolehPada: string
  indikator: { wargaAktif: number; menganggur: number; usaha: number; kasRata: number }
  riwayat: Array<{ lama: number; baru: number; alasan: string | null; pada: string }>
}

const persen = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1).replace('.', ',')}%`
const tgl = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function KebijakanUmk({ onBerubah }: { onBerubah: () => void }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [umk, setUmk] = useState(0)
  const [alasan, setAlasan] = useState('')
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    panggil<Info>('/api/kota').then((h) => {
      if (!h.ok) return setPesan({ ok: false, teks: h.galat.pesan })
      setInfo(h.data)
      setUmk(h.data.rekomendasi)
    })
  }, [])

  if (!info) return pesan ? <p className="pesan galat">{pesan.teks}</p> : null
  const boleh = Date.parse(info.bolehPada) <= Date.now()

  async function tetapkan() {
    if (!confirm(`Tetapkan UMK ${rupiah(umk)}? Gaji semua pekerjaan dan biaya hidup ikut berubah.`)) return
    setSibuk(true)
    const h = await panggil<Info>('/api/kota', { umk, alasan })
    setSibuk(false)
    if (!h.ok) return setPesan({ ok: false, teks: h.galat.pesan })
    setInfo(h.data)
    setAlasan('')
    setPesan({ ok: true, teks: `UMK kini ${rupiah(h.data.umk)}.` })
    onBerubah()
  }

  return (
    <div className="kebijakan-umk">
      <h3>Upah minimum kota</h3>
      <p>
        UMK berlaku <strong>{rupiah(info.umk)}</strong> per bulan kota, sejak {tgl(info.sejak)}. Gaji Tier 1 sama dengan UMK; tier lain kelipatannya.
        Biaya hidup ikut naik atau turun 40% dari perubahan UMK.
      </p>
      <dl className="umk-angka">
        <div><dt>Upah warga 7 hari</dt><dd>{rupiah(info.upah7)}</dd></div>
        <div><dt>7 hari sebelumnya</dt><dd>{rupiah(info.upahSebelum7)}</dd></div>
        <div><dt>Tren</dt><dd>{persen(info.tren)}</dd></div>
        <div><dt>Warga aktif</dt><dd>{info.indikator.wargaAktif}, {info.indikator.menganggur} belum bekerja</dd></div>
        <div><dt>Usaha warga</dt><dd>{info.indikator.usaha}</dd></div>
        <div><dt>Rata-rata uang warga</dt><dd>{rupiah(info.indikator.kasRata)}</dd></div>
      </dl>
      <p className="catatan">
        Rekomendasi dari tren: {rupiah(info.rekomendasi)}. Penetapan boleh {rupiah(info.min)} sampai {rupiah(info.maks)}, paling sering sekali per 7 hari.
      </p>
      {boleh ? (
        <div className="baris-aksi">
          <label className="tulis-label">
            UMK baru
            <input type="number" step={10_000} min={info.min} max={info.maks} value={umk} onChange={(e) => setUmk(Math.round(Number(e.target.value) / 10_000) * 10_000)} />
          </label>
          <label className="tulis-label">
            Alasan (dicatat)
            <input value={alasan} maxLength={200} placeholder="Misalnya: harga beras naik" onChange={(e) => setAlasan(e.target.value)} />
          </label>
          <button type="button" className="tombol-sekunder" disabled={sibuk || umk < info.min || umk > info.maks || umk === info.umk} onClick={tetapkan}>
            Tetapkan UMK
          </button>
        </div>
      ) : (
        <p className="catatan">Penetapan berikutnya bisa mulai {tgl(info.bolehPada)}.</p>
      )}
      {pesan && <p className={`pesan ${pesan.ok ? 'ok' : 'galat'}`}>{pesan.teks}</p>}
      {info.riwayat.length > 0 && (
        <ul className="umk-riwayat">
          {info.riwayat.map((r) => (
            <li key={r.pada}>
              {tgl(r.pada)}: {rupiah(r.lama)} ke {rupiah(r.baru)}{r.alasan ? `, ${r.alasan}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
