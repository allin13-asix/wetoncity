'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { jenisById } from '@/data/bangunan'
import { MODAL_AWAL, TENAGA, rupiah, upahPerAksi } from '@/data/ekonomi'
import { hunian } from '@/data/hunian'
import { pekerjaanSmaSmk } from '@/data/pekerjaan'
import { SEKOLAH, type Sekolah } from '@/data/pendidikan'
import { tur } from '@/data/tur'
import { panggil } from './api'
import { Tutup } from './ikon'
import { DaftarKarcis, RingkasanHunian, idPertama } from './KartuHunian'
import type { KeadaanHook } from './keadaan'

const pekerjaanAwal = pekerjaanSmaSmk.filter((p) => p.tier === 1 && p.fase === 0)

type Props = {
  langkah: number
  onLangkah: (i: number) => void
  onTutup: () => void
  onLihat: (idPenempatan: string) => void
  /** keadaan pemain yang sudah masuk; null untuk pengunjung (tur hanya contoh) */
  st: KeadaanHook | null
}

/**
 * Tur kota bersama Mbak Laras. Pengunjung hanya melihat contoh. Pemain yang sudah masuk menyimpan pilihannya:
 * latar sekolah, tempat tinggal (kamar di gedung yang masih kosong), dan pekerjaan pertama.
 */
export default function PanelTur({ langkah, onLangkah, onTutup, onLihat, st }: Props) {
  const k = st?.k ?? null
  const l = tur[langkah]
  const terakhir = langkah === tur.length - 1
  const [sekolah, setSekolah] = useState<Sekolah | null>((k?.sekolah?.id as Sekolah) ?? null)
  const [hunianDipilih, setHunianDipilih] = useState<string | null>(k?.hunian?.id ?? null)
  const [kerjaDipilih, setKerjaDipilih] = useState<string | null>(k?.pekerjaan?.id ?? null)
  const [terisi, setTerisi] = useState<Record<string, number> | undefined>()
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    if (l.jenis === 'hunian') panggil<{ terisi: Record<string, number> }>('/api/hunian').then((r) => r.ok && setTerisi(r.data.terisi))
  }, [l.jenis])

  const pilihanH = hunian.find((h) => h.id === hunianDipilih)
  // pemain: lowongan sungguhan (yang cocok dengan sekolah lebih dulu); pengunjung: contoh Tier 1
  const kerja = k
    ? [...k.lowongan.filter((x) => x.boleh)].sort((a, b) => Number(b.cocok) - Number(a.cocok) || b.tier - a.tier).slice(0, 8).map((x) => ({ id: x.id, nama: x.nama, tempat: x.tempat, upah: x.upahPerAksi, cocok: x.cocok }))
    : pekerjaanAwal.map((x) => ({ id: x.id, nama: x.nama, tempat: x.tempat, upah: upahPerAksi(1), cocok: false }))
  const pilihanK = kerja.find((x) => x.id === kerjaDipilih)
  const tertahan = (l.jenis === 'sekolah' && !sekolah) || (l.jenis === 'hunian' && !pilihanH) || (l.jenis === 'misi' && !pilihanK)

  async function lanjut() {
    // simpan pilihan pemain sebelum pindah langkah
    if (st && k) {
      setSibuk(true)
      let ok = true
      if (l.jenis === 'sekolah' && !k.sekolah && sekolah) ok = await st.lakukan('sekolah', '/api/sekolah', { sekolah }, `Lulusan ${SEKOLAH[sekolah].nama}`)
      if (l.jenis === 'hunian' && hunianDipilih && k.hunian?.id !== hunianDipilih) {
        ok = await st.lakukan('hunian', '/api/hunian', { hunian: hunianDipilih }, (b) => `Sekarang tinggal di ${b.hunian?.nama}`)
      }
      if (l.jenis === 'misi' && kerjaDipilih && k.pekerjaan?.id !== kerjaDipilih) {
        ok = await st.lakukan('kerja-pertama', '/api/pekerjaan', { pekerjaan: kerjaDipilih }, 'Pekerjaan pertama didapat. Datangi tempat kerjanya dan ketuk Kerja.')
      }
      setSibuk(false)
      if (!ok) return
      if (l.jenis === 'misi' && pilihanK) {
        const tempat = idPertama(pilihanK.tempat)
        onTutup()
        if (tempat) onLihat(tempat)
        return
      }
    }
    if (terakhir) onTutup()
    else onLangkah(langkah + 1)
  }

  // kamera ke kamar yang didapat setelah memilih tempat tinggal
  useEffect(() => {
    if (l.jenis === 'hunian' && k?.hunian?.tempat) onLihat(k.hunian.tempat)
  }, [l.jenis, k?.hunian?.tempat, onLihat])

  return (
    <section className="lembar lembar-tur" aria-label="Tur kota bersama Mbak Laras">
      <header className="pemandu">
        <span className="avatar" aria-hidden="true">ML</span>
        <div>
          <strong>Mbak Laras</strong>
          <small>Pemandu warga baru</small>
        </div>
        {(!k || (k.hunian && k.sekolah)) && (
          <button type="button" className="ikon-tombol" aria-label="Lewati tur" onClick={onTutup}>
            <Tutup />
          </button>
        )}
      </header>

      <div className="lembar-isi" aria-live="polite">
        <h2>{l.judul}</h2>
        <p className="gelembung">{l.teks}</p>

        {l.jenis === 'sapa' && (
          <p className="saku">
            <span>Uang saku</span>
            <strong>{rupiah(MODAL_AWAL)}</strong>
          </p>
        )}

        {l.jenis === 'sekolah' && (
          <ul className="pilih-kerja">
            {(Object.keys(SEKOLAH) as Sekolah[]).map((s) => (
              <li key={s}>
                <button type="button" aria-pressed={sekolah === s} disabled={!!k?.sekolah && k.sekolah.id !== s} onClick={() => setSekolah(s)}>
                  <span>
                    <strong>{SEKOLAH[s].nama}</strong>
                    <small>{SEKOLAH[s].ringkas}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {l.jenis === 'sekolah' && <p className="catatan">Pekerjaan yang cocok dengan sekolahmu: upah +15% dan syarat Keahlian lebih rendah. Pilihan ini tidak bisa diubah.</p>}

        {l.jenis === 'hunian' && (
          <>
            <DaftarKarcis dipilih={hunianDipilih} onPilih={setHunianDipilih} onLihat={onLihat} saatIni={k?.hunian?.id ?? null} hanyaKamar terisi={terisi} sibuk={sibuk} />
            {pilihanH && <RingkasanHunian h={pilihanH} />}
          </>
        )}

        {l.jenis === 'misi' && (
          <>
            <ul className="pilih-kerja">
              {kerja.map((x) => (
                <li key={x.id}>
                  <button type="button" aria-pressed={x.id === kerjaDipilih} onClick={() => setKerjaDipilih(x.id)}>
                    <span>
                      <strong>{x.nama}</strong>
                      <small>
                        {jenisById.get(x.tempat)?.nama}
                        {x.cocok ? ', cocok dengan sekolahmu' : ''}
                      </small>
                    </span>
                    <span className="upah">{rupiah(x.upah)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {pilihanK && (
              <p className="ringkasan">
                Satu aksi memakai {TENAGA.aksiKerja} Tenaga dan menghasilkan {rupiah(pilihanK.upah)}. Dengan {TENAGA.maks} Tenaga kamu bisa {TENAGA.maks / TENAGA.aksiKerja} aksi sehari.{' '}
                {idPertama(pilihanK.tempat) && (
                  <button type="button" className="tautan" onClick={() => onLihat(idPertama(pilihanK.tempat)!)}>Lihat tempat kerjanya</button>
                )}
              </p>
            )}
            {!k && (
              <p className="catatan">
                Ini contoh. <Link className="tautan" href="/masuk">Daftar</Link> untuk benar-benar tinggal dan bekerja di Weton.
              </p>
            )}
          </>
        )}
        {st?.pesan && !st.pesan.ok && <p className="pesan galat">{st.pesan.teks}</p>}
      </div>

      <footer className="tur-kaki">
        <ol className="titik" aria-label={`Langkah ${langkah + 1} dari ${tur.length}`}>
          {tur.map((t, i) => (
            <li key={t.judul} className={i === langkah ? 'aktif' : i < langkah ? 'lewat' : ''} />
          ))}
        </ol>
        <div className="tombol-baris">
          <button type="button" disabled={langkah === 0 || sibuk} onClick={() => onLangkah(langkah - 1)}>Kembali</button>
          <button type="button" className="utama" disabled={tertahan || sibuk} onClick={lanjut}>
            {sibuk ? 'Menyimpan' : terakhir ? (k ? 'Mulai bekerja' : 'Selesai') : 'Lanjut'}
          </button>
        </div>
      </footer>
    </section>
  )
}
