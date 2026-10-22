'use client'

// Beranda pemain: KTP Kota, info karakter, dan menu yang tidak ada di peta (riwayat uang, gudang, properti,
// kamar tamu, pengingat, Kantor Wali Kota). Semua aksi di bangunan dilakukan dari peta.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { rupiah } from '@/data/ekonomi'
import { penempatanById } from '@/data/tataletak'
import { BARANG, adalahBarang, tanggalPanjang } from '@/server/aturan'
import type { BarisLedger } from '@/server/tipe'
import { lamaWaktu, panggil } from './api'
import { BannerPerjalanan, Numpang } from './FiturKota'
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

function Meter({ nama, nilai, maks, kelas }: { nama: string; nilai: number; maks: number; kelas: string }) {
  return (
    <div className={`meter ${kelas}`}>
      <div className="meter-kepala">
        <span>{nama}</span>
        <strong>
          {nilai} / {maks}
        </strong>
      </div>
      <div className="meter-rel" role="meter" aria-label={nama} aria-valuemin={0} aria-valuemax={maks} aria-valuenow={nilai}>
        <span style={{ width: `${(nilai / maks) * 100}%` }} />
      </div>
    </div>
  )
}

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
  const gudang = Object.entries(k.gudang).filter(([id]) => adalahBarang(id))
  const koleksi = gudang.filter(([id]) => BARANG[id as keyof typeof BARANG].jenis === 'koleksi')
  const lain = gudang.filter(([id]) => BARANG[id as keyof typeof BARANG].jenis !== 'koleksi')
  const tempatKerja = k.pekerjaan ? k.lowongan.find((l) => l.id === k.pekerjaan!.id)?.tempatNama : undefined
  const jenisRumah = namaTempat(k.hunian.tempat)

  return (
    <main className="halaman beranda">
      <div className="beranda-kepala">
        <h1>Beranda</h1>
        <div className="baris-aksi">
          <Link className="tombol-utama" href="/">Ke peta</Link>
          <button type="button" className="tombol-sekunder" onClick={keluar}>Keluar</button>
        </div>
      </div>

      <section className="ktp" aria-label="KTP Kota Weton">
        <header className="ktp-kepala">
          <span>Pemerintah Kota Weton</span>
          <strong>Kartu Tanda Penduduk Kota</strong>
        </header>
        <div className="ktp-badan">
          <div className="ktp-foto" aria-hidden="true">
            {k.warga.nama.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('')}
          </div>
          <dl className="ktp-data">
            <div><dt>NIK</dt><dd className="ktp-nik">{nik(k.warga.id)}</dd></div>
            <div><dt>Nama</dt><dd className="ktp-nama">{k.warga.nama}</dd></div>
            <div><dt>Status</dt><dd>{k.peran === 'walikota' ? 'Wali Kota Weton' : 'Warga Weton'}</dd></div>
            <div><dt>Alamat</dt><dd>{k.hunian.nama}{jenisRumah && k.hunian.tempat !== null ? `, gedung ${k.hunian.tempat.replace(/^.*-(\d+)$/, '$1')}` : ''}</dd></div>
            <div><dt>Pendidikan</dt><dd>{k.ijazah ? `${k.ijazah.nama}` : k.sekolah?.nama ?? '-'}</dd></div>
            <div><dt>Pekerjaan</dt><dd>{k.pekerjaan ? `${k.pekerjaan.nama}${tempatKerja ? `, ${tempatKerja}` : ''}` : 'Belum bekerja'}</dd></div>
            <div><dt>Berlaku sejak</dt><dd>{tanggal(k.warga.bergabung)}</dd></div>
          </dl>
        </div>
      </section>

      {st.pesan && <p className={`pesan ${st.pesan.ok ? 'ok' : 'galat'}`} role="status">{st.pesan.teks}</p>}
      <BannerPerjalanan k={k} kini={st.kini} />

      <div className="beranda-grid">
        <div className="kolom">
          <section className="panel">
            <h2>Karakter</h2>
            <Meter nama="Tenaga" nilai={st.tenaga} maks={k.tenaga.maks} kelas="tenaga" />
            <p className="catatan">{st.penuhDalam > 0 ? `Penuh dalam ${lamaWaktu(st.penuhDalam)}.` : 'Penuh.'} Pulih 10 poin per jam.</p>
            <Meter nama="Kesehatan" nilai={st.kesehatan} maks={k.kesehatan.maks} kelas={k.kesehatan.sakit ? 'sehat sakit' : 'sehat'} />
            <p className="catatan">
              {k.kesehatan.sakit ? 'Sedang sakit: Tenaga pulih dua kali lebih lambat. Berobat di RSUD.' : 'Turun 1 tiap aksi kerja, pulih 12 poin sehari. Di bawah 30 kamu sakit.'}
            </p>
            <dl className="rincian">
              <div><dt>Keahlian</dt><dd>{k.keahlian} dari 10</dd></div>
              <div><dt>Uang</dt><dd>{rupiah(k.kas)}</dd></div>
              <div><dt>Tabungan</dt><dd>{rupiah(k.tabungan)}</dd></div>
              {k.kasbon > 0 && <div><dt>Kasbon{k.kasbonMacet ? ' (macet)' : ''}</dt><dd>{rupiah(k.kasbon)}</dd></div>}
              {k.pekerjaan && <div><dt>Gaji sebulan</dt><dd>{rupiah(k.pekerjaan.gajiBulan)}</dd></div>}
              <div><dt>UMK Weton</dt><dd>{rupiah(k.umk)}</dd></div>
              {k.kuliah && <div><dt>Kuliah</dt><dd>{k.kuliah.jurusan.nama}, semester {k.kuliah.semester}</dd></div>}
            </dl>
          </section>

          {k.tagihan && k.peran !== 'walikota' && (
            <section className="panel">
              <h2>Tagihan bulan ini</h2>
              <p>
                Jatuh tempo {tanggal(k.tagihan.jatuhTempo)}, dalam {lamaWaktu(Math.max(0, Date.parse(k.tagihan.jatuhTempo) - st.kini.getTime()))}.
              </p>
              <dl className="rincian">
                <div><dt>Sewa</dt><dd>{rupiah(k.tagihan.sewa)}</dd></div>
                <div><dt>Listrik</dt><dd>{rupiah(k.tagihan.listrik)}</dd></div>
                <div><dt>Makan</dt><dd>{rupiah(k.tagihan.makan)}</dd></div>
                {k.tagihan.dapur > 0 && <div><dt>Uang dapur</dt><dd>{rupiah(k.tagihan.dapur)}</dd></div>}
                <div><dt>Pajak penghasilan (perkiraan)</dt><dd>{rupiah(k.tagihan.pajak)}</dd></div>
                <div className="jumlah"><dt>Total</dt><dd>{rupiah(k.tagihan.total)}</dd></div>
              </dl>
              <p className="catatan">Bila uang kurang, selisihnya menjadi kasbon dengan bunga 10% per bulan. Bayar kasbon di Bank Weton.</p>
              {k.hunianBerikut && <p className="catatan">Pindah ke {k.hunianBerikut.nama} berlaku mulai siklus berikutnya.</p>}
            </section>
          )}

          {k.koran && (
            <Link href="/koran" className="koran-ringkas">
              <span className="koran-nama">
                Koran Weton
                {dibaca !== null && k.koran.tanggal > dibaca && <span className="baru">Baru</span>}
              </span>
              <strong className="koran-judul">{k.koran.judul}</strong>
              <span className="koran-tgl">{tanggalPanjang(k.koran.tanggal)}</span>
            </Link>
          )}

          <Kondisi k={k} kini={st.kini} />

          <section className="panel">
            <h2>Inventori dan mailbox</h2>
            <p>
              Inventori {k.inventori.dipakai} dari {k.inventori.kapasitas}. {k.suratBaru > 0 ? <strong>{k.suratBaru} surat menunggu di mailbox.</strong> : 'Mailbox kosong.'}
            </p>
            <Link className="tombol-sekunder" href="/inventori">Buka inventori</Link>
          </section>

          <section className="panel">
            <h2>Gudang dan koleksi</h2>
            {gudang.length === 0 ? (
              <p className="catatan">Gudang kosong. Belanja di Pasar Weton.</p>
            ) : (
              <>
                {lain.length > 0 && <p>{lain.map(([id, n]) => `${BARANG[id as keyof typeof BARANG].nama} ${n}`).join(', ')}</p>}
                {koleksi.length > 0 && <p>Koleksi: {koleksi.map(([id, n]) => `${BARANG[id as keyof typeof BARANG].nama} ${n}`).join(', ')}</p>}
              </>
            )}
            <Link className="tautan" href="/pasar">Buka Pasar Weton</Link>
          </section>

          <section className="panel">
            <h2>Properti dan usaha</h2>
            {k.lahan.length === 0 && k.usaha.length === 0 ? (
              <p className="catatan">Belum punya lahan atau usaha. Beli lahan di Balai Kota, buka usaha di Dinas Ekonomi atau TPI.</p>
            ) : (
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
            )}
          </section>
        </div>

        <div className="kolom">
          <Teman bebas={st.bebas} lakukan={st.lakukan} versi={st.versi} />
          <section className="panel">
            <h2>Profil publik</h2>
            <p className="catatan">Warga lain melihat nama, level, reputasi dan peringkat, pekerjaan, keahlian, dan (bila kamu izinkan) properti. Uang, inventori, dan kondisi tubuhmu tidak pernah terlihat.</p>
            <div className="baris-aksi">
              <Link className="tombol-sekunder" href={`/profil/${k.warga.id}`}>Lihat profilku</Link>
              <Link className="tombol-sekunder" href="/pesan">Pesan{k.permintaanTeman > 0 ? ` (${k.permintaanTeman} permintaan teman)` : ''}</Link>
            </div>
          </section>
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
              <ul className="riwayat">
                {riwayat.map((r) => (
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
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
