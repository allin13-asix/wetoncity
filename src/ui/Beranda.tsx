'use client'

// Beranda pemain, disusun dari yang paling sering dilihat: profil ringkas, hal yang perlu perhatian, kondisi tubuh,
// angka keuangan dan karier, pintasan, lalu rincian yang dilipat (tagihan, level dan atribut, KTP, riwayat uang).
// Semua aksi di bangunan dilakukan dari peta.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { rupiah } from '@/data/ekonomi'
import { penempatanById } from '@/data/tataletak'
import { tanggalPanjang } from '@/server/aturan'
import { sedangLapar } from '@/server/sistem-aturan'
import type { BarisLedger } from '@/server/tipe'
import { lamaWaktu, panggil } from './api'
import { BannerPerjalanan, Numpang } from './FiturKota'
import { Bank, Bintang, Dompet, Keluar, Koper, Koran, Kotak, Mangkuk, Nota, Obrolan, Orang, Palang, Petir, Piala, Seru, Toga, Toko, Utang } from './ikon'
import { Kondisi, Teman } from './Kehidupan'
import KebijakanUmk from './KebijakanUmk'
import { useKeadaan } from './keadaan'
import { lupakanSesi } from './sesi'
import { koranDibaca } from './penandaKoran'
import Pengingat from './Pengingat'
import { TombolPasang } from './Pwa'

const labelLedger: Record<string, string> = {
  uang_saku: 'Uang saku dari kampung', upah: 'Upah kerja', bonus_harian: 'Bonus harian', tagihan_hidup: 'Tagihan sewa, listrik, makan',
  pajak: 'Pajak penghasilan', kursus: 'Kursus di BLK', bayar_kasbon: 'Bayar kasbon', kasbon_baru: 'Kasbon baru', bunga_kasbon: 'Bunga kasbon',
  dana_walikota: 'Dana Kantor Wali Kota', judi_menang: 'Menang di Rumah Judi Mujur', judi_kalah: 'Kalah di Rumah Judi Mujur', makan: 'Makan di RM Padang',
  setor_tabungan: 'Setor tabungan', tarik_tabungan: 'Tarik tabungan', bunga_tabungan: 'Bunga tabungan', tiket_pesawat: 'Tiket pesawat',
  hasil_perjalanan: 'Hasil perjalanan luar kota', ukt: 'UKT Universitas Weton', berobat: 'Berobat di RSUD', modal_usaha: 'Modal usaha',
  upgrade_usaha: 'Naik level usaha', hasil_usaha: 'Hasil usaha', bahan_usaha: 'Bahan usaha', beli_lahan: 'Beli lahan', bangun_rumah: 'Bangun rumah',
  beli_npc: 'Belanja di pasar', jual_npc: 'Jual ke pedagang', beli_lapak: 'Beli di lapak warga', jual_lapak: 'Hasil lapak', biaya_lapak: 'Biaya lapak',
  uang_dapur: 'Uang dapur numpang', rawat_inap: 'Rawat inap karena kelaparan', biaya_seleksi: 'Biaya seleksi pekerjaan', beli_toko: 'Belanja di minimarket',
  beli_properti_npc: 'Beli rumah dari NPC', beli_properti: 'Beli properti dari warga', jual_properti: 'Jual properti ke warga', hadiah_surat: 'Hadiah dari mailbox', hadiah_mingguan: 'Hadiah peringkat mingguan',
}

const tanggal = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
/** Nomor KTP Kota: diturunkan dari id akun, tetap untuk akun yang sama. */
const nik = (id: string) => `3577 ${id.replace(/[^0-9a-f]/g, '').slice(0, 12).replace(/[a-f]/g, (c) => String(c.charCodeAt(0) % 10)).replace(/(\d{4})(?=\d)/g, '$1 ')}`
const namaTempat = (id: string | null | undefined) => (id ? penempatanById.get(id)?.jenis : undefined)

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

/** Satu bar kondisi tubuh: ikon, nama, angka, dan keterangan singkat. */
function Bar({ ikon, nama, nilai, maks, kelas, ket }: { ikon: ReactNode; nama: string; nilai: number; maks: number; kelas: string; ket?: string }) {
  return (
    <div className={`bar ${kelas}`}>
      <span className="bar-ikon">{ikon}</span>
      <span className="bar-nama">
        {nama}
        {ket && <small>{ket}</small>}
      </span>
      <span className="bar-rel" role="meter" aria-label={nama} aria-valuemin={0} aria-valuemax={maks} aria-valuenow={nilai}>
        <i style={{ width: `${Math.min(100, (nilai / maks) * 100)}%` }} />
      </span>
      <strong>{nilai}</strong>
    </div>
  )
}

/** Satu angka penting dengan ikon. */
function Ubin({ ikon, label, nilai, ket, merah = false }: { ikon: ReactNode; label: string; nilai: string; ket?: string; merah?: boolean }) {
  return (
    <div className={`ubin${merah ? ' merah' : ''}`}>
      <span className="ubin-ikon">{ikon}</span>
      <span className="ubin-label">{label}</span>
      <strong>{nilai}</strong>
      {ket && <small>{ket}</small>}
    </div>
  )
}

function Pintasan({ href, ikon, label, lencana = 0 }: { href: string; ikon: ReactNode; label: string; lencana?: number | string }) {
  return (
    <Link href={href}>
      {ikon}
      <span>{label}</span>
      {lencana ? <b className="lencana">{lencana}</b> : null}
    </Link>
  )
}

const barisRiwayat = (r: BarisLedger) => (
  <li key={r.id}>
    <span>
      <strong>{labelLedger[r.jenis] ?? r.jenis}</strong>
      <small>
        {waktu(r.waktu)}
        {r.akun === 'kasbon' ? ', kasbon' : r.akun === 'tabungan' ? ', tabungan' : ''}
      </small>
    </span>
    <span className={r.jumlah > 0 ? (r.akun === 'kasbon' ? 'minus' : 'plus') : r.akun === 'kasbon' ? 'plus' : 'minus'}>
      {r.jumlah > 0 ? '+' : '-'}
      {rupiah(Math.abs(r.jumlah))}
    </span>
  </li>
)

export default function Beranda() {
  const router = useRouter()
  const st = useKeadaan()
  const { k } = st
  const [riwayat, setRiwayat] = useState<BarisLedger[]>([])
  const [dibaca, setDibaca] = useState<string | null>(null)

  const muatRiwayat = useCallback(async () => {
    const r = await panggil<BarisLedger[]>('/api/riwayat?batas=20')
    if (r.ok) setRiwayat(r.data)
  }, [])

  useEffect(() => {
    if (st.masuk === false) router.replace('/masuk')
    else if (k && (!k.hunian || !k.sekolah)) router.replace('/') // pendatang baru: tur dari pelabuhan
  }, [st.masuk, k, router])

  useEffect(() => {
    if (st.masuk) muatRiwayat()
  }, [st.masuk, st.versi, muatRiwayat])

  useEffect(() => {
    setDibaca(koranDibaca())
  }, [])

  async function keluar() {
    await panggil('/api/keluar', {})
    lupakanSesi()
    router.push('/masuk')
  }

  if (!k || !k.hunian) return <main className="halaman beranda"><p className="kosong">{st.pesan ? st.pesan.teks : 'Memuat'}</p></main>

  const p = { k, tenaga: st.tenaga, bebas: st.bebas, kini: st.kini, lakukan: st.lakukan }
  const tempatKerja = k.pekerjaan ? k.lowongan.find((l) => l.id === k.pekerjaan!.id)?.tempatNama : undefined
  const jenisRumah = namaTempat(k.hunian.tempat)
  const alamat = `${k.hunian.nama}${jenisRumah && k.hunian.tempat !== null ? `, gedung ${k.hunian.tempat.replace(/^.*-(\d+)$/, '$1')}` : ''}`
  const inisial = k.warga.nama.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('')
  const sisaTagihan = k.tagihan ? Math.max(0, Date.parse(k.tagihan.jatuhTempo) - st.kini.getTime()) : 0
  const lapar = k.peran !== 'walikota' && sedangLapar(st.lapar)
  const koranBaru = !!k.koran && dibaca !== null && k.koran.tanggal > dibaca

  // yang perlu ditindaklanjuti pemain, paling penting dulu; tampil hanya bila ada
  const perhatian: Array<{ teks: string; href?: string; merah?: boolean }> = []
  if (k.dirawat) perhatian.push({ teks: `Dirawat di RSUD karena kelaparan sampai ${jam(k.dirawat.sampai)}.`, merah: true })
  else if (lapar) perhatian.push({ teks: 'Kamu lapar: Tenaga pulih lebih lambat. Makan di RM Padang atau pakai makanan dari Inventori.', href: '/inventori', merah: true })
  if (k.kesehatan.sakit) perhatian.push({ teks: 'Kamu sakit: Tenaga pulih dua kali lebih lambat. Berobat di RSUD.', merah: true })
  if (k.wajibPindah) perhatian.push({ teks: `Wajib pindah tempat tinggal sebelum ${waktu(k.wajibPindah.tenggat)}.`, merah: true })
  if (k.kasbonMacet) perhatian.push({ teks: `Kasbon macet ${rupiah(k.kasbon)}: Tenaga pulih lebih lambat. Lunasi di Bank Weton.`, merah: true })
  if (k.tagihan && k.peran !== 'walikota' && sisaTagihan < 24 * 3_600_000 && k.kas < k.tagihan.total) {
    perhatian.push({ teks: `Tagihan ${rupiah(k.tagihan.total)} jatuh tempo ${lamaWaktu(sisaTagihan)} lagi, uangmu kurang. Selisihnya menjadi kasbon.` })
  }
  if (k.suratBaru > 0) perhatian.push({ teks: `${k.suratBaru} surat menunggu di mailbox.`, href: '/inventori' })
  if (k.pesanBaru > 0) perhatian.push({ teks: `${k.pesanBaru} pesan pribadi belum dibaca.`, href: '/pesan?tab=pribadi' })
  if (k.permintaanTeman > 0) perhatian.push({ teks: `${k.permintaanTeman} permintaan pertemanan menunggu jawabanmu.`, href: '/pesan?tab=teman' })

  return (
    <main className="halaman beranda">
      <header className="profil-ringkas">
        <span className="profil-avatar" aria-hidden="true">
          {inisial}
          <b>{k.level.nilai}</b>
        </span>
        <div>
          <h1>{k.warga.nama}</h1>
          <p>
            {k.peran === 'walikota' ? 'Wali Kota Weton' : `Level ${k.level.nilai}`} · {alamat}
            <br />
            {k.pekerjaan ? `${k.pekerjaan.nama}${tempatKerja ? `, ${tempatKerja}` : ''}` : 'Belum bekerja'}
          </p>
        </div>
        <button type="button" className="ikon-tombol" aria-label="Keluar" title="Keluar" onClick={keluar}>
          <Keluar />
        </button>
      </header>

      {st.pesan && <p className={`pesan ${st.pesan.ok ? 'ok' : 'galat'}`} role="status">{st.pesan.teks}</p>}
      <BannerPerjalanan k={k} kini={st.kini} />

      {perhatian.length > 0 && (
        <section className="perhatian" aria-label="Perlu perhatian">
          {perhatian.map((x) => {
            const isi = (
              <>
                <Seru />
                <span>{x.teks}</span>
              </>
            )
            return x.href ? (
              <Link key={x.teks} href={x.href} className={x.merah ? 'merah' : undefined}>{isi}</Link>
            ) : (
              <p key={x.teks} className={x.merah ? 'merah' : undefined}>{isi}</p>
            )
          })}
        </section>
      )}

      <section className="panel status-bar" aria-label="Kondisi tubuh">
        <Bar ikon={<Petir />} nama="Tenaga" nilai={st.tenaga} maks={k.tenaga.maks} kelas="b-tenaga" ket={st.penuhDalam > 0 ? `penuh ${lamaWaktu(st.penuhDalam)} lagi` : 'penuh'} />
        <Bar ikon={<Palang />} nama="Kesehatan" nilai={st.kesehatan} maks={k.kesehatan.maks} kelas={k.kesehatan.sakit ? 'b-bahaya' : 'b-sehat'} ket={k.kesehatan.sakit ? 'sakit' : undefined} />
        <Bar ikon={<Mangkuk />} nama="Lapar" nilai={st.lapar} maks={k.lapar.maks} kelas={lapar ? 'b-bahaya' : 'b-kenyang'} ket={lapar ? 'lapar' : undefined} />
      </section>

      <section className="ubin-grid" aria-label="Keuangan dan karier">
        <Ubin ikon={<Dompet />} label="Uang" nilai={rupiah(k.kas)} />
        <Ubin ikon={<Bank />} label="Tabungan" nilai={rupiah(k.tabungan)} />
        {k.kasbon > 0 && <Ubin ikon={<Utang />} label={k.kasbonMacet ? 'Kasbon (macet)' : 'Kasbon'} nilai={rupiah(k.kasbon)} merah />}
        {k.tagihan && k.peran !== 'walikota' && <Ubin ikon={<Nota />} label="Tagihan" nilai={rupiah(k.tagihan.total)} ket={`${lamaWaktu(sisaTagihan)} lagi`} />}
        <Ubin ikon={<Koper />} label="Gaji sebulan" nilai={k.pekerjaan ? rupiah(k.pekerjaan.gajiBulan) : '-'} ket={k.pekerjaan ? undefined : 'cari di Bursa Kerja'} />
        <Ubin ikon={<Bintang />} label="Keahlian" nilai={`${k.keahlian} / 10`} ket={k.latihan ? `kursus selesai ${lamaWaktu(Date.parse(k.latihan.selesai) - st.kini.getTime())} lagi` : undefined} />
        {k.kuliah && <Ubin ikon={<Toga />} label="Kuliah" nilai={`Semester ${k.kuliah.semester}`} ket={k.kuliah.jurusan.nama} />}
      </section>

      <nav className="pintasan" aria-label="Pintasan">
        <Pintasan href="/inventori" ikon={<Kotak />} label="Inventori" lencana={k.suratBaru} />
        <Pintasan href="/pasar" ikon={<Toko />} label="Pasar" />
        <Pintasan href="/pesan" ikon={<Obrolan />} label="Obrolan" lencana={k.pesanBaru} />
        <Pintasan href={`/profil/${k.warga.id}`} ikon={<Orang />} label="Profilku" />
        <Pintasan href="/peringkat" ikon={<Piala />} label="Peringkat" />
        <Pintasan href="/koran" ikon={<Koran />} label="Koran" lencana={koranBaru ? 'Baru' : 0} />
      </nav>

      <div className="beranda-grid">
        <div className="kolom">
          {k.koran && (
            <Link href="/koran" className="koran-ringkas">
              <span className="koran-nama">
                Koran Weton
                {koranBaru && <span className="baru">Baru</span>}
              </span>
              <strong className="koran-judul">{k.koran.judul}</strong>
              <span className="koran-tgl">{tanggalPanjang(k.koran.tanggal)}</span>
            </Link>
          )}

          {k.tagihan && k.peran !== 'walikota' && (
            <details className="panel lipat">
              <summary>Rincian tagihan</summary>
              <p>Jatuh tempo {tanggal(k.tagihan.jatuhTempo)}.</p>
              <dl className="rincian">
                <div><dt>Sewa</dt><dd>{rupiah(k.tagihan.sewa)}</dd></div>
                <div><dt>Listrik</dt><dd>{rupiah(k.tagihan.listrik)}</dd></div>
                <div><dt>Makan</dt><dd>{rupiah(k.tagihan.makan)}</dd></div>
                {k.tagihan.dapur > 0 && <div><dt>Uang dapur</dt><dd>{rupiah(k.tagihan.dapur)}</dd></div>}
                <div><dt>Pajak penghasilan (perkiraan)</dt><dd>{rupiah(k.tagihan.pajak)}</dd></div>
                <div className="jumlah"><dt>Total</dt><dd>{rupiah(k.tagihan.total)}</dd></div>
              </dl>
              <p className="catatan">Bila uang kurang, selisihnya menjadi kasbon dengan bunga 10% per bulan. Bayar kasbon di Bank Weton. UMK Weton {rupiah(k.umk)}.</p>
              {k.hunianBerikut && <p className="catatan">Pindah ke {k.hunianBerikut.nama} berlaku mulai siklus berikutnya.</p>}
            </details>
          )}

          <Kondisi k={k} />

          <details className="panel lipat">
            <summary>Kartu Tanda Penduduk Kota</summary>
            <section className="ktp" aria-label="KTP Kota Weton">
              <header className="ktp-kepala">
                <span>Pemerintah Kota Weton</span>
                <strong>Kartu Tanda Penduduk Kota</strong>
              </header>
              <div className="ktp-badan">
                <div className="ktp-foto" aria-hidden="true">{inisial}</div>
                <dl className="ktp-data">
                  <div><dt>NIK</dt><dd className="ktp-nik">{nik(k.warga.id)}</dd></div>
                  <div><dt>Nama</dt><dd className="ktp-nama">{k.warga.nama}</dd></div>
                  <div><dt>Status</dt><dd>{k.peran === 'walikota' ? 'Wali Kota Weton' : 'Warga Weton'}</dd></div>
                  <div><dt>Alamat</dt><dd>{alamat}</dd></div>
                  <div><dt>Pendidikan</dt><dd>{k.ijazah ? `${k.ijazah.nama}` : k.sekolah?.nama ?? '-'}</dd></div>
                  <div><dt>Pekerjaan</dt><dd>{k.pekerjaan ? `${k.pekerjaan.nama}${tempatKerja ? `, ${tempatKerja}` : ''}` : 'Belum bekerja'}</dd></div>
                  <div><dt>Berlaku sejak</dt><dd>{tanggal(k.warga.bergabung)}</dd></div>
                </dl>
              </div>
            </section>
          </details>

          {(k.lahan.length > 0 || k.usaha.length > 0) && (
            <section className="panel">
              <h2>Properti dan usaha</h2>
              <ul className="lowongan">
                {k.lahan.map((l) => (
                  <li key={l.id}>
                    <span>
                      <strong>{l.id}, {l.luas} petak</strong>
                      <small>
                        {l.distrik}
                        {l.bangun ? `, ${l.bangun.nama.toLowerCase()} ${l.bangun.tahap >= 4 ? 'selesai' : `${Math.round(l.bangun.progres * 100)}% (${l.bangun.tahapNama})`}` : l.rumah ? ', rumah berdiri' : ', belum dibangun'}
                        {l.jual ? `, dijual ${rupiah(l.jual.harga)}` : ''}
                      </small>
                    </span>
                    <Link className="tautan" href={`/?fokus=${l.id}`}>Lihat</Link>
                  </li>
                ))}
                {k.usaha.map((u) => (
                  <li key={u.id}>
                    <span>
                      <strong>{u.nama} level {u.level}</strong>
                      <small>{u.siklusSiap} siklus siap, {rupiah(u.hasilSiap)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="kolom">
          <Teman bebas={st.bebas} lakukan={st.lakukan} versi={st.versi} />
          {k.punyaRumah && <Numpang {...p} />}
          <TombolPasang />
          <Pengingat />

          {k.peran === 'walikota' && (
            <section className="panel kantor">
              <h2>Kantor Wali Kota</h2>
              <p>
                <Link className="tautan" href="/editor">Editor tata letak kota</Link> (hanya di server pengembangan) ·{' '}
                <Link className="tautan" href="/koran/tulis">Meja redaksi Koran</Link>
              </p>
              <p>Rumah dinas: tanpa tagihan dan tanpa kamar. Tenaga maksimum {k.tenaga.maks.toLocaleString('id-ID')}, pulih 1 poin per menit.</p>
              <div className="baris-aksi">
                <button type="button" className="tombol-sekunder" disabled={!st.bebas} onClick={() => st.lakukan('dana1', '/api/walikota', { aksi: 'uang', jumlah: 100_000_000 }, 'Dana masuk: +Rp 100.000.000')}>
                  Tambah Rp 100 juta
                </button>
                <button type="button" className="tombol-sekunder" disabled={!st.bebas} onClick={() => st.lakukan('dana2', '/api/walikota', { aksi: 'uang', jumlah: 1_000_000_000 }, 'Dana masuk: +Rp 1.000.000.000')}>
                  Tambah Rp 1 miliar
                </button>
                <button type="button" className="tombol-sekunder" disabled={!st.bebas} onClick={() => st.lakukan('tenaga', '/api/walikota', { aksi: 'tenaga' }, 'Tenaga terisi penuh')}>
                  Isi Tenaga penuh
                </button>
              </div>
              <label className="tulis-label">
                Keahlian
                <select value={k.keahlian} disabled={!st.bebas} onChange={(e) => st.lakukan('keahlian', '/api/walikota', { aksi: 'keahlian', nilai: Number(e.target.value) }, `Keahlian diatur ke ${e.target.value}`)}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <KebijakanUmk onBerubah={st.muat} />
            </section>
          )}

          <section className="panel">
            <h2>Riwayat uang</h2>
            {riwayat.length === 0 ? (
              <p className="catatan">Belum ada catatan.</p>
            ) : (
              <>
                <ul className="riwayat">{riwayat.slice(0, 5).map(barisRiwayat)}</ul>
                {riwayat.length > 5 && (
                  <details className="lipat-dalam">
                    <summary>Lihat {riwayat.length - 5} catatan lainnya</summary>
                    <ul className="riwayat">{riwayat.slice(5).map(barisRiwayat)}</ul>
                  </details>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
