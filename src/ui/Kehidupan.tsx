'use client'

// Panel sistem kehidupan: kondisi (lapar, level, reputasi, atribut), inventori dan mailbox, teman dan teman sekamar,
// peringkat reputasi, serta pekerja dan lowongan per bangunan. Semua angka dihitung server; di sini hanya tampilan.
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ATRIBUT, LAPAR, NAMA_ATRIBUT, STATISTIK } from '@/data/balans'
import { rupiah } from '@/data/ekonomi'
import { laparKini, sedangLapar } from '@/server/sistem-aturan'
import { lamaWaktu, panggil } from './api'
import type { Props } from './FiturKota'

function Meter({ nama, nilai, maks, kelas = '', teks }: { nama: string; nilai: number; maks: number; kelas?: string; teks?: string }) {
  return (
    <div className={`meter ${kelas}`}>
      <div className="meter-kepala">
        <span>{nama}</span>
        <strong>{teks ?? `${nilai} / ${maks}`}</strong>
      </div>
      <div className="meter-rel" role="meter" aria-label={nama} aria-valuemin={0} aria-valuemax={maks} aria-valuenow={nilai}>
        <span style={{ width: `${Math.min(100, Math.max(0, (nilai / maks) * 100))}%` }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- kondisi

/** Lapar, level dan EXP, reputasi, atribut, serta peringatan rawat inap, wajib pindah, dan kursus yang berjalan. */
export function Kondisi({ k, kini }: Pick<Props, 'k' | 'kini'>) {
  const lapar = laparKini(k.lapar.nilai, new Date(k.lapar.pada), kini)
  const hungry = k.peran !== 'walikota' && sedangLapar(lapar)
  return (
    <section className="panel">
      <h2>Kondisi</h2>
      {k.dirawat && <p className="pesan galat">Kamu dirawat di rumah sakit karena kelaparan, sampai {new Date(k.dirawat.sampai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.</p>}
      {hungry && !k.dirawat && (
        <p className="pesan galat">
          Kamu LAPAR: Tenaga pulih setengah lajunya dan Kesehatan turun {LAPAR.kesehatanKurang} tiap jam (tidak di bawah {LAPAR.kesehatanMin}). Makan di RM Padang, beli di minimarket, lalu pakai dari inventori.
        </p>
      )}
      <Meter nama="Lapar" nilai={lapar} maks={k.lapar.maks} kelas={hungry ? 'sakit' : 'sehat'} teks={`${lapar} / ${k.lapar.maks}${hungry ? ' (lapar)' : ''}`} />
      <Meter nama={`Level ${k.level.nilai}`} nilai={k.level.exp} maks={k.level.perlu} teks={`EXP ${k.level.exp.toLocaleString('id-ID')} / ${k.level.perlu.toLocaleString('id-ID')}`} />
      <p className="catatan">
        Reputasi <strong>{k.reputasi.total.toLocaleString('id-ID')}</strong>, pekan ini {k.reputasi.minggu.toLocaleString('id-ID')}.{' '}
        <Link className="tautan" href="/peringkat">Lihat peringkat</Link>
      </p>
      <h3 className="sub">Atribut</h3>
      <div className="atribut-grid">
        {ATRIBUT.map((a) => (
          <Meter key={a} nama={NAMA_ATRIBUT[a]} nilai={k.atribut[a]} maks={STATISTIK.maks} teks={String(k.atribut[a])} />
        ))}
      </div>
      {k.wajibPindah && (
        <p className="pesan galat">
          Kamu menolak atau memutus pertemanan dengan teman sekamar, jadi wajib pindah sebelum {new Date(k.wajibPindah.tenggat).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}
      {k.latihan && <p className="catatan">Sedang ikut: {k.latihan.nama}, selesai {lamaWaktu(Date.parse(k.latihan.selesai) - kini.getTime())} lagi.</p>}
      {!k.latihan && k.latihanJeda && <p className="catatan">Istirahat setelah kursus sampai {new Date(k.latihanJeda).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.</p>}
      <p className="catatan">
        Ganti pekerjaan: sisa {k.gantiKerja.sisa} dari {k.gantiKerja.maks} kali pekan ini{k.gantiKerja.jedaSampai ? `, bisa lagi ${new Date(k.gantiKerja.jedaSampai).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------- inventori dan mailbox

type DataInventori = {
  kapasitas: number
  dipakai: number
  barang: Array<{ id: string; jumlah: number; nama: string; jenis: string; satuan: string; ringkas: string; tenaga: number; kesehatan: number; lapar: number; bisaDipakai: boolean }>
  surat: Array<{ id: string; pengirim: string; judul: string; item: string | null; namaItem: string | null; jumlah: number; uang: number; waktu: string }>
}
type DataTeman = {
  teman: Array<{ id: string; nama: string; level: number }>
  masuk: Array<{ id: string; nama: string; level: number; sekamar: boolean }>
  keluar: Array<{ id: string; nama: string; level: number }>
  sekamar: Array<{ id: string; nama: string; status: string }>
  wajibPindah: string | null
  tenggangJam: number
}

/** Inventori berkapasitas terbatas: pakai, buang, kirim ke teman, dan klaim mailbox (barang yang tidak muat). */
export function Inventori({ k, bebas, lakukan, versi }: Pick<Props, 'k' | 'bebas' | 'lakukan'> & { versi: number }) {
  const [d, setD] = useState<DataInventori | null>(null)
  const [t, setT] = useState<DataTeman | null>(null)
  const [tujuan, setTujuan] = useState('')
  useEffect(() => {
    panggil<DataInventori>('/api/inventori').then((r) => r.ok && setD(r.data))
    panggil<DataTeman>('/api/teman').then((r) => r.ok && setT(r.data))
  }, [versi])
  if (!d) return <p className="kosong">Memuat inventori</p>
  const penuh = d.dipakai >= d.kapasitas
  return (
    <>
      <section className="panel">
        <h2>Inventori</h2>
        <Meter nama="Kapasitas" nilai={d.dipakai} maks={d.kapasitas} kelas={penuh ? 'sakit' : ''} />
        {penuh && <p className="catatan">Inventori penuh. Barang baru dari pembelian, hadiah, dan memancing masuk ke mailbox.</p>}
        {d.barang.length === 0 ? (
          <p className="catatan">Belum ada barang. Belanja di minimarket atau pasar, atau memancing di pantai.</p>
        ) : (
          <ul className="lowongan">
            {d.barang.map((b) => (
              <li key={b.id}>
                <span>
                  <strong>
                    {b.nama} x{b.jumlah}
                  </strong>
                  <small>
                    {b.ringkas}
                    {b.bisaDipakai ? ` Tenaga +${b.tenaga}${b.kesehatan ? `, Kesehatan +${b.kesehatan}` : ''}${b.lapar ? `, Lapar +${b.lapar}` : ''}.` : ''}
                  </small>
                </span>
                <span className="baris-aksi">
                  {b.bisaDipakai && (
                    <button type="button" className="tombol-sekunder" disabled={!bebas || k.konsumsiSisa < 1} onClick={() => lakukan(`pakai-${b.id}`, '/api/inventori', { aksi: 'pakai', barang: b.id }, `${b.nama} dipakai`)}>
                      Pakai
                    </button>
                  )}
                  <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`buang-${b.id}`, '/api/inventori', { aksi: 'buang', barang: b.id, jumlah: 1 }, `${b.nama} dibuang`)}>
                    Buang 1
                  </button>
                  {tujuan && (
                    <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`kirim-${b.id}`, '/api/inventori', { aksi: 'kirim', ke: tujuan, barang: b.id, jumlah: 1 }, `${b.nama} dikirim`)}>
                      Kirim 1
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {k.konsumsiSisa < 1 && <p className="catatan">Jatah makan-minum dari inventori hari ini sudah habis.</p>}
        {t && t.teman.length > 0 && (
          <label className="tulis-label">
            Kirim ke teman
            <select value={tujuan} onChange={(e) => setTujuan(e.target.value)}>
              <option value="">(pilih untuk menampilkan tombol Kirim)</option>
              {t.teman.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="panel">
        <h2>Mailbox ({d.surat.length})</h2>
        {d.surat.length === 0 ? (
          <p className="catatan">Tidak ada surat. Hadiah level, kiriman teman, dan barang yang tidak muat di inventori datang ke sini.</p>
        ) : (
          <>
            <ul className="lowongan">
              {d.surat.map((s) => (
                <li key={s.id}>
                  <span>
                    <strong>{s.judul}</strong>
                    <small>
                      Dari {s.pengirim}: {[s.uang > 0 ? rupiah(s.uang) : '', s.item ? `${s.namaItem} x${s.jumlah}` : ''].filter(Boolean).join(' dan ')}
                    </small>
                  </span>
                  <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`klaim-${s.id}`, '/api/inventori', { aksi: 'klaim', surat: s.id }, 'Surat diklaim')}>
                    Klaim
                  </button>
                </li>
              ))}
            </ul>
            <div className="baris-aksi rata-kiri">
              <button type="button" className="tombol-utama" disabled={!bebas} onClick={() => lakukan('klaim-semua', '/api/inventori', { aksi: 'klaim' }, 'Semua surat diklaim')}>
                Klaim semua
              </button>
            </div>
          </>
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------- teman dan teman sekamar

/** Teman, permintaan pertemanan (termasuk otomatis dari teman sekamar), dan teman sekamar. */
export function Teman({ bebas, lakukan, versi }: Pick<Props, 'bebas' | 'lakukan'> & { versi: number }) {
  const [d, setD] = useState<DataTeman | null>(null)
  useEffect(() => {
    panggil<DataTeman>('/api/teman').then((r) => r.ok && setD(r.data))
  }, [versi])
  if (!d) return null
  const aksi = (nama: string, a: 'terima' | 'tolak' | 'putus', warga: string, ok: string) => lakukan(`${nama}-${warga}`, '/api/teman', { aksi: a, warga }, ok)
  return (
    <section className="panel">
      <h2>Teman</h2>
      {d.sekamar.length > 0 && (
        <>
          <h3 className="sub">Teman sekamar</h3>
          <ul className="lowongan">
            {d.sekamar.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.nama}</strong>
                  <small>{s.status === 'teman' ? 'Sudah berteman' : s.status === 'minta' ? 'Menunggu jawaban pertemanan' : 'Belum berteman'}</small>
                </span>
                <Link className="tombol-sekunder" href={`/profil/${s.id}`}>Profil</Link>
              </li>
            ))}
          </ul>
          <p className="catatan">
            Masuk ke kamar yang sudah berpenghuni otomatis mengirim permintaan pertemanan ke semua penghuni lama. Yang menolak atau memutus pertemanan wajib pindah hunian dalam {d.tenggangJam} jam.
          </p>
        </>
      )}
      {d.masuk.length > 0 && (
        <>
          <h3 className="sub">Permintaan masuk</h3>
          <ul className="lowongan">
            {d.masuk.map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.nama}</strong>
                  <small>Level {m.level}{m.sekamar ? ', teman sekamar baru (menolak berarti wajib pindah)' : ''}</small>
                </span>
                <span className="baris-aksi">
                  <button type="button" className="tombol-utama" disabled={!bebas} onClick={() => aksi('terima', 'terima', m.id, `Kamu berteman dengan ${m.nama}`)}>Terima</button>
                  <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => aksi('tolak', 'tolak', m.id, 'Permintaan ditolak')}>Tolak</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {d.keluar.length > 0 && (
        <>
          <h3 className="sub">Permintaan terkirim</h3>
          <ul className="lowongan">
            {d.keluar.map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.nama}</strong>
                  <small>Menunggu jawaban</small>
                </span>
                <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => aksi('batal', 'tolak', m.id, 'Permintaan dibatalkan')}>Batalkan</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="sub">Daftar teman ({d.teman.length})</h3>
      {d.teman.length === 0 ? (
        <p className="catatan">Belum ada teman. Buka profil warga lain dari daftar pekerja di sebuah bangunan lalu tambahkan sebagai teman.</p>
      ) : (
        <ul className="lowongan">
          {d.teman.map((t) => (
            <li key={t.id}>
              <span>
                <strong>{t.nama}</strong>
                <small>Level {t.level}</small>
              </span>
              <span className="baris-aksi">
                <Link className="tombol-sekunder" href={`/profil/${t.id}`}>Profil</Link>
                <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => aksi('putus', 'putus', t.id, `Pertemanan dengan ${t.nama} diputus`)}>Putus</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- peringkat

type DataPeringkat = {
  pekan: string
  global: Array<{ peringkat: number; id: string; nama: string; level: number; poin: number }>
  mingguan: Array<{ peringkat: number; id: string; nama: string; level: number; poin: number }>
  saya: { reputasi: number; minggu: number; peringkat: number; peringkatMinggu: number } | null
  hadiah: Array<{ dari: number; sampai: number; uang: number }>
  snapshot: { minggu: string; baris: Array<{ peringkat: number; nama: string; poin: number; hadiah: number }> } | null
}

/** Peringkat reputasi global dan mingguan, tabel hadiah yang diumumkan, dan hasil pekan lalu. Dipakai di balai kota dan alun-alun. */
export function Peringkat({ judul = 'Peringkat warga' }: { judul?: string }) {
  const [d, setD] = useState<DataPeringkat | null>(null)
  const [tab, setTab] = useState<'global' | 'mingguan'>('global')
  const muat = useCallback(() => {
    panggil<DataPeringkat>('/api/peringkat').then((r) => r.ok && setD(r.data))
  }, [])
  useEffect(muat, [muat])
  if (!d) return <section className="panel"><h2>{judul}</h2><p className="catatan">Memuat</p></section>
  const daftar = tab === 'global' ? d.global : d.mingguan
  return (
    <section className="panel">
      <h2>{judul}</h2>
      <div className="kelompok-tab" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'global'} onClick={() => setTab('global')}>Global</button>
        <button type="button" role="tab" aria-selected={tab === 'mingguan'} onClick={() => setTab('mingguan')}>Pekan ini</button>
      </div>
      {d.saya && (
        <p className="catatan">
          Peringkatmu: #{d.saya.peringkat} ({d.saya.reputasi.toLocaleString('id-ID')} poin), pekan ini #{d.saya.minggu > 0 ? d.saya.peringkatMinggu : '-'} ({d.saya.minggu} poin).
        </p>
      )}
      {daftar.length === 0 ? (
        <p className="catatan">Belum ada poin. Reputasi didapat dari bekerja, bertransaksi, mini game, dan berinteraksi, dengan batas harian per sumber.</p>
      ) : (
        <ol className="peringkat">
          {daftar.map((r) => (
            <li key={r.id}>
              <span className="no">{r.peringkat}</span>
              <Link className="tautan" href={`/profil/${r.id}`}>{r.nama}</Link>
              <small>Level {r.level}</small>
              <strong>{r.poin.toLocaleString('id-ID')}</strong>
            </li>
          ))}
        </ol>
      )}
      <details className="bursa">
        <summary><h3 className="sub">Hadiah mingguan</h3></summary>
        <p className="catatan">Tiap pekan (Senin 00.00 WIB) sistem menyimpan top 10 poin pekan itu, membagikan hadiah berikut, lalu mengatur ulang poin mingguan.</p>
        <ul className="lowongan">
          {d.hadiah.map((h) => (
            <li key={h.dari}>
              <span>Peringkat {h.dari === h.sampai ? h.dari : `${h.dari} sampai ${h.sampai}`}</span>
              <strong>{rupiah(h.uang)}</strong>
            </li>
          ))}
        </ul>
        {d.snapshot && (
          <>
            <h3 className="sub">Pekan {d.snapshot.minggu}</h3>
            <ol className="peringkat">
              {d.snapshot.baris.map((b) => (
                <li key={b.peringkat}>
                  <span className="no">{b.peringkat}</span>
                  <span>{b.nama}</span>
                  <small>{b.poin} poin</small>
                  <strong>{b.hadiah > 0 ? rupiah(b.hadiah) : '-'}</strong>
                </li>
              ))}
            </ol>
          </>
        )}
      </details>
    </section>
  )
}

// ---------------------------------------------------------------- pekerja dan lowongan per bangunan

type DataPekerja = {
  tempat: string
  nama: string
  aktif: boolean
  selesai: string | null
  npc: Array<{ id: string; nama: string; peran: string }>
  pemain: Array<{ id: string; nama: string; level: number; pekerjaan: string }>
  lowongan: Array<{ id: string; nama: string; tier: number; kuota: number | null; terisi: number; sisa: number | null; terbuka: boolean; seleksi: string | null; minKeahlian: number }>
}

/** Daftar pekerja bangunan (NPC dan pemain, pemain dengan tombol kunjungi profil) dan lowongan beserta kuota. */
export function PekerjaBangunan({ tempat, versi }: { tempat: string; versi: number }) {
  const [d, setD] = useState<DataPekerja | null>(null)
  useEffect(() => {
    panggil<DataPekerja>(`/api/pekerja?tempat=${encodeURIComponent(tempat)}`).then((r) => setD(r.ok ? r.data : null))
  }, [tempat, versi])
  if (!d || (d.npc.length === 0 && d.pemain.length === 0 && d.lowongan.length === 0)) return null
  return (
    <section className="panel">
      <h2>Pekerja di sini</h2>
      {!d.aktif && <p className="catatan">Bangunan masih dibangun. Lowongan dibuka setelah selesai.</p>}
      {d.lowongan.length > 0 && (
        <ul className="lowongan">
          {d.lowongan.map((l) => (
            <li key={l.id}>
              <span>
                <strong>{l.nama}</strong>
                <small>
                  {/* kuota null = tanpa batas (Infinity tidak bisa dikirim lewat JSON) */}
                  {l.kuota === null ? `${l.terisi} pemain bekerja di sini, selalu menerima` : `${l.terisi} dari ${l.kuota} kursi pemain terisi`}
                  {l.seleksi ? `, lewat ${l.seleksi}` : ''}
                </small>
              </span>
              <span className={`chip ${l.terbuka ? 'chip-bicara' : 'chip-netral'}`}>{l.terbuka ? (l.sisa === null ? 'Dibuka' : `Dibuka (${l.sisa})`) : 'Penuh'}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="lowongan">
        {d.pemain.map((p) => (
          <li key={p.id}>
            <span>
              <strong>{p.nama}</strong>
              <small>
                {p.pekerjaan}, level {p.level}
              </small>
            </span>
            <Link className="tombol-sekunder" href={`/profil/${p.id}`}>Kunjungi profil</Link>
          </li>
        ))}
        {d.npc.map((n) => (
          <li key={n.id}>
            <span>
              <strong>{n.nama}</strong>
              <small>{n.peran} (NPC)</small>
            </span>
          </li>
        ))}
      </ul>
      {d.pemain.length === 0 && <p className="catatan">Belum ada pemain yang bekerja di sini.</p>}
    </section>
  )
}
