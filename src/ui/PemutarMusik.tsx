'use client'

// Kendali musik latar: versi ringkas (satu tombol di menu peta) dan versi lengkap (daftar lagu, volume, atribusi rekaman).
import { REKAMAN } from '@/data/musik'
import { DAFTAR_LAGU, nyalakan, setLagu, setVolume, useMusik } from './musik'

const Not = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

/** Satu baris di menu: nyala/mati dan lagu berikutnya. */
export function MusikRingkas() {
  const m = useMusik()
  const lagu = DAFTAR_LAGU[m.lagu % DAFTAR_LAGU.length]
  return (
    <div className="musik-ringkas">
      <button type="button" aria-pressed={m.nyala} onClick={() => nyalakan(!m.nyala)}>
        <Not /> {m.nyala ? 'Musik: nyala' : 'Musik: mati'}
      </button>
      {m.nyala && (
        <button type="button" className="musik-lagu" onClick={() => setLagu(m.lagu + 1)} aria-label="Lagu berikutnya">
          {lagu.judul} ›
        </button>
      )}
    </div>
  )
}

/** Panel lengkap untuk Beranda. */
export function PemutarMusik() {
  const m = useMusik()
  return (
    <section className="panel pemutar-musik">
      <div className="pemutar-kepala">
        <h2>Musik</h2>
        <button type="button" className={m.nyala ? 'tombol-sekunder' : 'tombol-utama'} onClick={() => nyalakan(!m.nyala)}>
          {m.nyala ? 'Matikan' : 'Putar'}
        </button>
      </div>
      {m.nyala && m.menunggu && <p className="catatan">Ketuk di mana saja untuk mulai memutar.</p>}
      <ul className="daftar-lagu">
        {DAFTAR_LAGU.map((l, i) => (
          <li key={l.id}>
            <button type="button" aria-pressed={m.lagu % DAFTAR_LAGU.length === i} onClick={() => { setLagu(i); if (!m.nyala) nyalakan(true) }}>
              <strong>{l.judul}</strong>
              <small>{l.ket}{l.jenis === 'rekaman' ? ' · rekaman' : ''}</small>
            </button>
          </li>
        ))}
      </ul>
      <label className="tulis-label">
        Volume
        <input type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </label>
      {REKAMAN.length > 0 && (
        <p className="catatan kecil">
          Rekaman:{' '}
          {REKAMAN.map((r, i) => (
            <span key={r.id}>
              {i > 0 && '; '}
              <a className="tautan" href={r.sumber} target="_blank" rel="noreferrer">{r.judul}</a> oleh {r.atribusi} ({r.lisensi})
            </span>
          ))}
          . Lagu lain disintesis langsung di perangkatmu.
        </p>
      )}
    </section>
  )
}
