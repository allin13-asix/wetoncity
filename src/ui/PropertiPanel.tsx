'use client'

// Properti: panel lahan di peta (mengarahkan ke Balai Kota), dialog dengan NPC pemilik rumah, properti milikmu (konstruksi,
// jual dengan harga tetap atau negosiasi), dan tawaran masuk dan keluar.
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { rupiah } from '@/data/ekonomi'
import { LAHAN } from '@/server/aturan'
import type { Keadaan } from '@/server/tipe'
import { lamaWaktu, panggil } from './api'
import type { Props } from './FiturKota'

type Bangun = NonNullable<Keadaan['lahan'][number]['bangun']>
type Jual = { mode: 'tetap' | 'negosiasi'; harga: number }
type DataProperti = {
  lahan: Array<{ id: string; distrik: string; luas: number; harga: number; status: 'kota' | 'milikmu' | 'pemain'; pemilik: { id: string; nama: string } | null; jual: Jual | null; bangun: Bangun | null }>
  npc: Array<{ id: string; jenis: string; nama: string; distrik: string; harga: number; npc: { id: string; nama: string; peran: string }; status: 'dijual' | 'milikmu' | 'terjual'; pemilik: { id: string; nama: string } | null; jual: Jual | null }>
  tawaran: Array<{
    id: string; lahan: string; harga: number; babak: number; giliran: string; kedaluwarsa: string; saya: 'penjual' | 'pembeli'
    penjual: { id: string; nama: string }; pembeli: { id: string; nama: string }; giliranku: boolean; bisaTawarBalik: boolean
  }>
  aturan: { kedaluwarsaJam: number; babakMaks: number; tawarMinRasio: number; tawarMaksRasio: number; jualMaks: number; milikMaks: number }
  dialogNpc: { sapa: string; tawar: string; setuju: string }
  bangunan: Array<{ jenis: string; nama: string; biaya: number; durasiMs: number; hunian: boolean }>
}

function useProperti(versi: number) {
  const [d, setD] = useState<DataProperti | null>(null)
  const muat = useCallback(async () => {
    const r = await panggil<DataProperti>('/api/properti')
    if (r.ok) setD(r.data)
  }, [])
  useEffect(() => {
    muat()
  }, [muat, versi])
  return d
}

/** Progres konstruksi dalam empat tahap visual. */
export function BarKonstruksi({ b }: { b: Bangun }) {
  const selesai = b.tahap >= 4
  return (
    <div className="konstruksi">
      <div className="meter-kepala">
        <span>{selesai ? `${b.nama} selesai` : `${b.nama}: ${b.tahapNama}`}</span>
        <strong>{Math.round(b.progres * 100)}%</strong>
      </div>
      <div className="meter-rel" role="meter" aria-label="Progres konstruksi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b.progres * 100)}>
        <span style={{ width: `${b.progres * 100}%` }} />
      </div>
      <ol className="tahap" aria-label="Tahap konstruksi">
        {['Pondasi', 'Rangka', 'Atap', 'Selesai'].map((n, i) => (
          <li key={n} className={b.tahap > i + 1 || (b.tahap === 4 && i === 3) ? 'lewat' : b.tahap === i + 1 ? 'kini' : ''}>
            {n}
          </li>
        ))}
      </ol>
      {!selesai && <p className="catatan">Terlihat {Math.round(b.tampil * 100)}% dari bangunan. Selesai pukul {new Date(b.selesai).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}; sesudahnya bangunan aktif dan lowongannya dibuka.</p>}
    </div>
  )
}

function JualProperti({ id, jual, bebas, lakukan, batasHarga }: Pick<Props, 'bebas' | 'lakukan'> & { id: string; jual: Jual | null; batasHarga?: number }) {
  const [mode, setMode] = useState<'tetap' | 'negosiasi'>(jual?.mode ?? 'tetap')
  const [harga, setHarga] = useState(jual?.harga ?? batasHarga ?? 50_000_000)
  return (
    <div className="jual-properti">
      {jual && (
        <p className="pesan ok">
          Dijual {jual.mode === 'tetap' ? 'dengan harga tetap' : 'dengan negosiasi, patokan'} {rupiah(jual.harga)}.
        </p>
      )}
      <div className="baris-aksi">
        <label className="tulis-label">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as 'tetap' | 'negosiasi')}>
            <option value="tetap">Harga tetap</option>
            <option value="negosiasi">Negosiasi (tawar-menawar)</option>
          </select>
        </label>
        <label className="tulis-label">
          Harga
          <input type="number" min={1} step={500_000} value={harga} onChange={(e) => setHarga(Number(e.target.value))} />
        </label>
      </div>
      <div className="baris-aksi">
        <button type="button" className="tombol-sekunder" disabled={!bebas || harga < 1} onClick={() => lakukan(`jual-${id}`, '/api/properti', { aksi: 'jual', lahan: id, mode, harga }, `${id} dipasang untuk dijual`)}>
          {jual ? 'Perbarui penjualan' : 'Pasang jual'}
        </button>
        {jual && (
          <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`tarik-${id}`, '/api/properti', { aksi: 'jual', lahan: id, mode: 'tidak' }, 'Penjualan dibatalkan')}>
            Batalkan penjualan
          </button>
        )}
      </div>
    </div>
  )
}

function DaftarTawaran({ d, bebas, lakukan, lahan }: Pick<Props, 'bebas' | 'lakukan'> & { d: DataProperti; lahan?: string }) {
  const [balas, setBalas] = useState<Record<string, number>>({})
  const daftar = d.tawaran.filter((t) => !lahan || t.lahan === lahan)
  if (!daftar.length) return null
  return (
    <>
      <h3 className="sub">Tawaran</h3>
      <ul className="lowongan">
        {daftar.map((t) => (
          <li key={t.id}>
            <span>
              <strong>
                {t.lahan}: {rupiah(t.harga)}
              </strong>
              <small>
                {t.saya === 'penjual' ? `Dari ${t.pembeli.nama}` : `Ke ${t.penjual.nama}`}, babak {t.babak} dari {d.aturan.babakMaks}, habis {lamaWaktu(Date.parse(t.kedaluwarsa) - Date.now())} lagi.{' '}
                {t.giliranku ? 'Giliranmu menjawab.' : 'Menunggu jawaban.'}
              </small>
            </span>
            <span className="baris-aksi">
              {t.giliranku && (
                <>
                  <button type="button" className="tombol-utama" disabled={!bebas} onClick={() => lakukan(`terima-${t.id}`, '/api/properti', { aksi: 'terima', tawaran: t.id }, `Kesepakatan ${rupiah(t.harga)}`)}>
                    Terima
                  </button>
                  {t.bisaTawarBalik && (
                    <>
                      <input className="pasar-jumlah" style={{ width: 120 }} type="number" step={500_000} value={balas[t.id] ?? t.harga} onChange={(e) => setBalas({ ...balas, [t.id]: Number(e.target.value) })} aria-label="Harga tawar-balik" />
                      <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`balik-${t.id}`, '/api/properti', { aksi: 'tawar_balik', tawaran: t.id, harga: balas[t.id] ?? t.harga }, 'Tawar-balik terkirim')}>
                        Tawar balik
                      </button>
                    </>
                  )}
                </>
              )}
              <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`tolak-${t.id}`, '/api/properti', { aksi: 'tolak', tawaran: t.id }, t.giliranku ? 'Tawaran ditolak' : 'Tawaran dibatalkan')}>
                {t.giliranku ? 'Tolak' : 'Batalkan'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Panel lahan yang dipilih di peta: milik kota (beli di Balai Kota), milik pemain lain (beli atau tawar), atau milikmu (bangun dan jual). */
export function PanelLahan({ id, versi, k, bebas, lakukan, keBalaiKota, onTutup }: Props & { id: string; versi: number; keBalaiKota: (lahan: string) => void; onTutup: () => void }) {
  const d = useProperti(versi)
  const l = d?.lahan.find((x) => x.id === id)
  const [tawar, setTawar] = useState(0)
  const saya = k.lahan.find((x) => x.id === id)
  return (
    <section className="lembar" aria-label={`Lahan ${id}`}>
      <header className="lembar-kepala">
        <div>
          <div className="chips">
            <span className="chip chip-netral">Lahan kosong</span>
            {l && <span className="chip chip-netral">{l.status === 'kota' ? 'Milik Kota Weton' : l.status === 'milikmu' ? 'Milikmu' : `Milik ${l.pemilik?.nama}`}</span>}
          </div>
          <h2>{id}</h2>
          <p className="ringkas">{l ? `${l.distrik}, ${l.luas} petak.` : 'Memuat'}</p>
        </div>
        <button type="button" className="ikon-tombol" aria-label="Tutup info" onClick={onTutup}>
          ×
        </button>
      </header>
      <div className="lembar-isi">
        {!l ? null : l.status === 'kota' ? (
          <section className="panel aksi-utama">
            <h2>Dijual oleh Kota Weton</h2>
            <p>
              Harga <strong>{rupiah(l.harga)}</strong>. Semua lahan kosong awalnya milik kota dan hanya bisa dibeli di Balai Kota. Paling banyak {LAHAN.maksMilik} properti per warga.
            </p>
            <button type="button" className="tombol-utama" onClick={() => keBalaiKota(id)}>
              Beli di Balai Kota
            </button>
          </section>
        ) : l.status === 'pemain' ? (
          <section className="panel aksi-utama">
            <h2>Milik {l.pemilik?.nama}</h2>
            {l.pemilik && <Link className="tautan" href={`/profil/${l.pemilik.id}`}>Kunjungi profil pemilik</Link>}
            {l.bangun && <BarKonstruksi b={l.bangun} />}
            {!l.jual ? (
              <p className="catatan">Lahan ini tidak dijual. Kamu bisa mengirim pesan atau mengajak pemiliknya berteman dari profilnya.</p>
            ) : l.jual.mode === 'tetap' ? (
              <>
                <p>Dijual dengan harga tetap {rupiah(l.jual.harga)}.</p>
                <button type="button" className="tombol-utama" disabled={!bebas || k.kas < l.jual.harga} onClick={() => lakukan(`beli-tetap-${id}`, '/api/properti', { aksi: 'beli_tetap', lahan: id }, `${id} sekarang milikmu`)}>
                  Beli {rupiah(l.jual.harga)}
                </button>
              </>
            ) : (
              <>
                <p>
                  Terbuka untuk negosiasi, patokan {rupiah(l.jual.harga)}. Tawaran antara {rupiah(Math.ceil(l.jual.harga * d!.aturan.tawarMinRasio))} dan {rupiah(Math.floor(l.jual.harga * d!.aturan.tawarMaksRasio))}; penjual bisa menerima, menolak, atau
                  tawar balik. Tawaran habis dalam {d!.aturan.kedaluwarsaJam} jam.
                </p>
                <div className="baris-aksi">
                  <input className="pasar-jumlah" style={{ width: 140 }} type="number" step={500_000} value={tawar || l.jual.harga} onChange={(e) => setTawar(Number(e.target.value))} aria-label="Harga tawaran" />
                  <button type="button" className="tombol-utama" disabled={!bebas} onClick={() => lakukan(`tawar-${id}`, '/api/properti', { aksi: 'tawar', lahan: id, harga: tawar || l.jual!.harga }, 'Tawaran terkirim')}>
                    Ajukan tawaran
                  </button>
                </div>
              </>
            )}
            <DaftarTawaran d={d!} bebas={bebas} lakukan={lakukan} lahan={id} />
          </section>
        ) : (
          <section className="panel aksi-utama">
            <h2>Lahanmu</h2>
            {saya?.bangun ? (
              <BarKonstruksi b={saya.bangun} />
            ) : (
              <>
                <p className="catatan">Dirikan bangunan di lahan ini. Konstruksi butuh waktu; setelah selesai bangunan aktif dan lowongannya dibuka.</p>
                <ul className="lowongan">
                  {d!.bangunan.map((b) => (
                    <li key={b.jenis}>
                      <span>
                        <strong>{b.nama}</strong>
                        <small>
                          {rupiah(b.biaya)}, {lamaWaktu(b.durasiMs)}{b.hunian ? ', bisa dihuni' : ', membuka lowongan kerja'}
                        </small>
                      </span>
                      <button type="button" className="tombol-sekunder" disabled={!bebas || k.kas < b.biaya} onClick={() => lakukan(`bangun-${id}-${b.jenis}`, '/api/lahan', { aksi: 'bangun', lahan: id, bangunan: b.jenis }, `Konstruksi ${b.nama.toLowerCase()} dimulai`)}>
                        Bangun
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {(!saya?.bangun || saya.bangun.tahap >= 4) && <JualProperti id={id} jual={l.jual} bebas={bebas} lakukan={lakukan} batasHarga={l.harga} />}
            <DaftarTawaran d={d!} bebas={bebas} lakukan={lakukan} lahan={id} />
          </section>
        )}
      </div>
    </section>
  )
}

/** Dialog dengan NPC pemilik rumah: harga tetap, tanpa tawar-menawar. Bila sudah dibeli pemain, tampil sebagai properti pemain. */
export function DialogRumahNpc({ idTempat, versi, k, bebas, lakukan }: Props & { idTempat: string; versi: number }) {
  const d = useProperti(versi)
  const n = d?.npc.find((x) => x.id === idTempat)
  if (!d || !n) return null
  return (
    <section className="panel aksi-utama">
      <h2>{n.status === 'dijual' ? `Bicara dengan ${n.npc.nama}` : 'Rumah ini'}</h2>
      {n.status === 'dijual' ? (
        <>
          <p className="sapaan">“{d.dialogNpc.sapa}”</p>
          <p className="catatan">
            {n.npc.nama}, {n.npc.peran}. {d.dialogNpc.tawar}
          </p>
          <p>
            Harga tetap <strong>{rupiah(n.harga)}</strong> untuk {n.nama} di {n.distrik}.
          </p>
          <button type="button" className="tombol-utama" disabled={!bebas || k.kas < n.harga || k.lahan.length >= d.aturan.milikMaks} onClick={() => lakukan(`beli-npc-${n.id}`, '/api/properti', { aksi: 'beli_npc', properti: n.id }, d.dialogNpc.setuju)}>
            Beli {rupiah(n.harga)}
          </button>
          {k.lahan.length >= d.aturan.milikMaks && <p className="catatan">Kamu sudah memiliki {d.aturan.milikMaks} properti, batas maksimum.</p>}
        </>
      ) : n.status === 'milikmu' ? (
        <>
          <p className="pesan ok">Rumah ini milikmu, dibeli dari {n.npc.nama}.</p>
          <JualProperti id={n.id} jual={n.jual} bebas={bebas} lakukan={lakukan} batasHarga={n.harga} />
          <DaftarTawaran d={d} bebas={bebas} lakukan={lakukan} lahan={n.id} />
        </>
      ) : (
        <>
          <p>Sudah dibeli {n.pemilik?.nama}.</p>
          {n.pemilik && <Link className="tautan" href={`/profil/${n.pemilik.id}`}>Kunjungi profil pemilik</Link>}
          {n.jual && n.jual.mode === 'tetap' && (
            <button type="button" className="tombol-utama" disabled={!bebas || k.kas < n.jual.harga} onClick={() => lakukan(`beli-tetap-${n.id}`, '/api/properti', { aksi: 'beli_tetap', lahan: n.id }, 'Rumah sekarang milikmu')}>
              Beli {rupiah(n.jual.harga)}
            </button>
          )}
          {n.jual && n.jual.mode === 'negosiasi' && (
            <button type="button" className="tombol-utama" disabled={!bebas} onClick={() => lakukan(`tawar-${n.id}`, '/api/properti', { aksi: 'tawar', lahan: n.id, harga: n.jual!.harga }, 'Tawaran terkirim')}>
              Tawar {rupiah(n.jual.harga)}
            </button>
          )}
          <DaftarTawaran d={d} bebas={bebas} lakukan={lakukan} lahan={n.id} />
        </>
      )}
    </section>
  )
}

/**
 * Properti di Balai Kota: lahan kota yang dijual (beli di sini saja), serta propertimu dan semua tawaran. `lahanPilihan` adalah
 * lahan yang dipilih di peta sebelum diarahkan ke sini.
 */
export function PropertiSaya({ k, bebas, lakukan, lihat, versi, lahanPilihan }: Props & { versi: number; lahanPilihan?: string | null }) {
  const d = useProperti(versi)
  const tersedia = (d?.lahan ?? []).filter((l) => l.status === 'kota').sort((a, b) => (a.id === lahanPilihan ? -1 : b.id === lahanPilihan ? 1 : a.harga - b.harga))
  return (
    <section className="panel aksi-utama">
      <h2>Properti</h2>
      <p className="catatan">
        Pembelian lahan kota dilakukan di sini, Balai Kota. Pilih lahan di peta untuk melihat detailnya. Milikmu {k.lahan.length} dari {LAHAN.maksMilik}.
      </p>
      {k.lahan.length > 0 && (
        <ul className="lowongan">
          {k.lahan.map((l) => (
            <li key={l.id}>
              <span>
                <strong>
                  {l.id}, {l.luas} petak{l.objek === 'bangunan' ? ' (rumah)' : ''}
                </strong>
                <small>
                  {l.distrik}. {l.bangun ? `${l.bangun.nama}: ${l.bangun.tahap >= 4 ? 'selesai' : `${Math.round(l.bangun.progres * 100)}%`}. ` : ''}
                  {l.jual ? `Dijual ${l.jual.mode === 'tetap' ? 'tetap' : 'negosiasi'} ${rupiah(l.jual.harga)}. ` : ''}
                  {lihat && (
                    <button type="button" className="tombol-teks" onClick={() => lihat(l.id)}>Lihat di peta</button>
                  )}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
      {d && <DaftarTawaran d={d} bebas={bebas} lakukan={lakukan} />}
      {k.punyaRumah && k.hunian?.id !== 'rumah-sendiri' && k.hunianBerikut?.id !== 'rumah-sendiri' && (
        <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan('pindah-rumah', '/api/hunian', { hunian: 'rumah-sendiri' }, 'Pindah ke rumah sendiri mulai siklus tagihan berikutnya')}>
          Pindah ke rumah sendiri
        </button>
      )}
      {k.lahan.length < LAHAN.maksMilik && (
        <details className="bursa" open={!!lahanPilihan}>
          <summary>
            <h3 className="sub">Lahan dijual kota ({tersedia.length})</h3>
          </summary>
          <ul className="lowongan">
            {tersedia.slice(0, 15).map((l) => (
              <li key={l.id} className={l.id === lahanPilihan ? 'sorot' : undefined}>
                <span>
                  <strong>
                    {l.id}, {l.luas} petak
                  </strong>
                  <small>
                    {l.distrik}.{' '}
                    {lihat && (
                      <button type="button" className="tombol-teks" onClick={() => lihat(l.id)}>Lihat di peta</button>
                    )}
                  </small>
                </span>
                <button type="button" className={l.id === lahanPilihan ? 'tombol-utama' : 'tombol-sekunder'} disabled={!bebas || k.kas < l.harga} onClick={() => lakukan(`beli-${l.id}`, '/api/lahan', { aksi: 'beli', lahan: l.id }, `${l.id} sekarang milikmu`)}>
                  {rupiah(l.harga)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
