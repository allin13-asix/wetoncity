'use client'

// HUD karakter di peta, bergaya plang pelabuhan: Tenaga sebagai sel baterai kuning bolder, Kesehatan dan Lapar sebagai
// batang, uang ditulis lengkap, dan Keahlian sebagai lencana level di avatar. Ketuk untuk membuka KTP dan info karakter di Beranda.
import Link from 'next/link'
import { rupiah } from '@/data/ekonomi'
import { sedangLapar } from '@/server/sistem-aturan'
import { lamaWaktu } from './api'
import type { KeadaanHook } from './keadaan'

const Petir = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M9.5 1 3 9h4.2L6.5 15 13 7H8.8z" fill="currentColor" />
  </svg>
)
const Palang = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z" fill="currentColor" />
  </svg>
)
const Mangkuk = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8h13a6.5 6 0 0 1-13 0Z" fill="currentColor" />
    <path d="M5 2.5c-.8.8.8 1.7 0 2.5M8 1.5c-.8.8.8 1.7 0 2.5M11 2.5c-.8.8.8 1.7 0 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

export default function StatusWarga({ st }: { st: KeadaanHook }) {
  const k = st.k!
  const inisial = k.warga.nama.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('')
  const sel = Math.max(1, Math.round(k.tenaga.maks / 10))
  const isi = st.tenaga / 10
  const sisaTagihan = k.tagihan ? Date.parse(k.tagihan.jatuhTempo) - st.kini.getTime() : null
  const tagihanDekat = sisaTagihan !== null && sisaTagihan < 24 * 3_600_000 && k.peran !== 'walikota'
  const lemah = st.tenaga < 20
  const lapar = sedangLapar(st.lapar)

  return (
    <div className="hud-pemain-wadah">
      <Link href="/beranda" className="hud-pemain" aria-label={`${k.warga.nama}, uang ${rupiah(k.kas)}. Buka KTP dan info karakter`}>
        <span className="hp-avatar" aria-hidden="true">
          {inisial}
          <b className="hp-level" title={`Keahlian ${k.keahlian}`}>{k.keahlian}</b>
        </span>
        <span className="hp-isi">
          <span className="hp-atas">
            <strong className="hp-nama">{k.warga.nama}</strong>
            <span className="hp-uang">
              <i>Rp</i>
              {Math.round(k.kas).toLocaleString('id-ID')}
            </span>
          </span>
          <span className={`hp-meter hp-tenaga${lemah ? ' lemah' : ''}`} role="meter" aria-label="Tenaga" aria-valuemin={0} aria-valuemax={k.tenaga.maks} aria-valuenow={st.tenaga}>
            <Petir />
            <span className="hp-sel" style={{ gridTemplateColumns: `repeat(${sel}, 1fr)` }}>
              {Array.from({ length: sel }, (_, i) => (
                <span key={i}>
                  <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, isi - i))})` }} />
                </span>
              ))}
            </span>
            <span className="hp-angka">{st.tenaga}</span>
          </span>
          <span className={`hp-meter hp-sehat${k.kesehatan.sakit ? ' sakit' : ''}`} role="meter" aria-label="Kesehatan" aria-valuemin={0} aria-valuemax={k.kesehatan.maks} aria-valuenow={st.kesehatan}>
            <Palang />
            <span className="hp-rel">
              <i style={{ transform: `scaleX(${st.kesehatan / k.kesehatan.maks})` }} />
            </span>
            <span className="hp-angka">{st.kesehatan}</span>
          </span>
          <span className={`hp-meter hp-lapar${lapar ? ' lapar' : ''}`} role="meter" aria-label="Lapar" aria-valuemin={0} aria-valuemax={k.lapar.maks} aria-valuenow={st.lapar}>
            <Mangkuk />
            <span className="hp-rel">
              <i style={{ transform: `scaleX(${st.lapar / k.lapar.maks})` }} />
            </span>
            <span className="hp-angka">{st.lapar}</span>
          </span>
        </span>
      </Link>
      {(tagihanDekat || k.kasbon > 0 || k.kesehatan.sakit || lapar) && (
        <div className="hp-chip-baris">
          {tagihanDekat && <span className="hp-chip">Tagihan {lamaWaktu(Math.max(0, sisaTagihan!))} lagi</span>}
          {k.kasbon > 0 && <span className="hp-chip merah">Kasbon {rupiah(k.kasbon)}</span>}
          {k.kesehatan.sakit && <span className="hp-chip merah">Sakit</span>}
          {lapar && <span className="hp-chip merah">Lapar, segera makan</span>}
        </div>
      )}
    </div>
  )
}
