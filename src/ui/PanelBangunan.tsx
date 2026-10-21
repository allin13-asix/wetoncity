'use client'

import type { CSSProperties, ReactNode } from 'react'
import { jenisById, kategori } from '@/data/bangunan'
import { rupiah, upahPerAksi } from '@/data/ekonomi'
import { rincianBulan, hunian as dataHunian } from '@/data/hunian'
import { npcDi } from '@/data/npc'
import { pekerjaanDi, semuaPekerjaan, type Pekerjaan } from '@/data/pekerjaan'
import { KULIAH, jurusan as dataJurusan, totalUkt } from '@/data/pendidikan'
import { penempatanById } from '@/data/tataletak'
import { Gembok, Tutup } from './ikon'

const namaJurusan = (id: string) => dataJurusan.find((j) => j.id === id)?.nama ?? id

function syarat(k: Pekerjaan): string {
  const bagian: string[] = []
  if (k.pendidikan === 'SMA/SMK') bagian.push('Ijazah SMA/SMK')
  else bagian.push(k.jurusan ? `Gelar ${k.jurusan.map(namaJurusan).join(' atau ')}` : `Gelar ${k.pendidikan} jurusan apa pun`)
  bagian.push(`Keahlian ${k.minKeahlian}`)
  if (k.terkunci) bagian.push('terbuka setelah Kawasan Industri dibuka')
  else if (k.fase > 0) bagian.push(`Fase ${k.fase}`)
  return bagian.join(', ')
}

/** aksi: panel aksi pemain di bangunan ini (bila masuk); info bangunan lalu dilipat di bawahnya. */
export default function PanelBangunan({ id, onTutup, aksi }: { id: string; onTutup: () => void; aksi?: ReactNode }) {
  const p = penempatanById.get(id)
  const j = p ? jenisById.get(p.jenis) : undefined
  if (!p || !j) return null
  const kat = kategori[j.kategori]
  const kerja = pekerjaanDi(j.id)
  const warga = npcDi(j.id)
  const huni = dataHunian.filter((h) => h.bangunan.includes(j.id))

  return (
    <section className="lembar" aria-label={`Info ${j.nama}`}>
      <header className="lembar-kepala">
        <div>
          <div className="chips">
            <span className="chip" style={{ '--warna': kat.warna } as CSSProperties}>{kat.nama}</span>
            {j.fase > 0 && <span className="chip chip-netral">Fase {j.fase}</span>}
            {j.terkunci && (
              <span className="chip chip-netral">
                <Gembok /> Terkunci
              </span>
            )}
          </div>
          <h2>{j.nama}</h2>
          <p className="ringkas">{j.ringkas}</p>
        </div>
        <button type="button" className="ikon-tombol" aria-label="Tutup info" onClick={onTutup}>
          <Tutup />
        </button>
      </header>

      <div className="lembar-isi">
        {aksi}
        <details className="tentang" open={!aksi}>
        <summary>Tentang bangunan ini</summary>
        <h3>Fungsi di game</h3>
        <ul className="daftar-titik">
          {j.fungsi.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        {huni.map((h) => {
          const r = rincianBulan(h)
          return (
            <div className="kartu-biaya" key={h.id}>
              <h3>Biaya per bulan: {h.nama}</h3>
              <dl>
                <div><dt>Sewa</dt><dd>{rupiah(r.sewa)}</dd></div>
                <div><dt>Listrik</dt><dd>{rupiah(r.listrik)}</dd></div>
                <div><dt>Makan{h.makanDiskon ? ' (hemat 20%)' : ''}</dt><dd>{rupiah(r.makan)}</dd></div>
                <div className="jumlah"><dt>Total</dt><dd>{rupiah(r.total)}</dd></div>
              </dl>
              <ul className="daftar-titik">
                {h.fasilitas.map((f) => <li key={f}>{f}</li>)}
              </ul>
              {h.tenagaMaks > 0 && <p className="catatan">Tenaga maksimum +{h.tenagaMaks}.</p>}
              {h.kursusDiskon > 0 && <p className="catatan">Kursus diskon 10%.</p>}
              <p className="catatan">Syarat: {h.syarat.join('; ')}.</p>
              {h.catatan && <p className="catatan">{h.catatan}</p>}
            </div>
          )
        })}

        {kerja.length > 0 && (
          <>
            <h3>Pekerjaan di sini</h3>
            <ul className="kerja">
              {kerja.map((k) => (
                <li key={k.id}>
                  <div className="kerja-judul">
                    <strong>{k.nama}</strong>
                    <span className={`tier tier-${k.tier}`}>Tier {k.tier}</span>
                  </div>
                  <p>{k.ringkas}</p>
                  <p className="catatan">{rupiah(upahPerAksi(k.tier))} per aksi. {syarat(k)}.</p>
                </li>
              ))}
            </ul>
          </>
        )}

        {j.id === 'univ-rektorat' && (
          <>
            <h3>Jurusan</h3>
            <p className="catatan">
              Satu semester sama dengan {KULIAH.hariPerSemester} hari. Kehadiran memakai {KULIAH.sesiPerSemester} sesi kuliah, masing-masing {KULIAH.tenagaPerSesi} Tenaga.
            </p>
            <ul className="jurusan">
              {dataJurusan.map((m) => (
                <li key={m.id}>
                  <details>
                    <summary>
                      <span>{m.nama}</span>
                      <small>{rupiah(m.ukt)} per semester</small>
                    </summary>
                    <p>
                      {m.semester} semester, total {rupiah(totalUkt(m))}. {m.ringkas}
                    </p>
                    <p className="catatan">
                      Membuka: {m.membuka.map((idp) => semuaPekerjaan.find((x) => x.id === idp)?.nama ?? idp).join(', ')}.
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}

        {warga.length > 0 && (
          <>
            <h3>Warga di sini</h3>
            <ul className="warga">
              {warga.map((n) => (
                <li key={n.id}>
                  {n.interaktif ? (
                    <details>
                      <summary>
                        <span>{n.nama}</span>
                        <small>{n.peran}</small>
                        <span className="chip chip-bicara">Bisa diajak bicara</span>
                      </summary>
                      <p className="sapaan">“{n.interaktif.sapaan}”</p>
                      <p className="catatan">{n.interaktif.tawaran}</p>
                    </details>
                  ) : (
                    <div className="warga-biasa">
                      <span>{n.nama}</span>
                      <small>{n.peran}</small>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        </details>
      </div>
    </section>
  )
}
