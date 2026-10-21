import type { Metadata } from 'next'
import Link from 'next/link'
import { jenisById, katalog } from '@/data/bangunan'
import { BONUS_HARIAN, BONUS_UPAH, MODAL_AWAL, TARIF_PER_TENAGA, TENAGA, kursusBiaya, rupiah, upahPerAksi } from '@/data/ekonomi'
import { biayaBulan, hunian } from '@/data/hunian'
import { pekerjaanProfesional, pekerjaanSmaSmk, type Pekerjaan } from '@/data/pekerjaan'
import { KULIAH, jurusan, totalUkt } from '@/data/pendidikan'
import { penempatan } from '@/data/tataletak'
import Papan from '@/ui/Papan'

export const metadata: Metadata = { title: 'Panduan | Weton City' }

const penghasilanAwal = 7 * (TENAGA.maks * TARIF_PER_TENAGA[1] + BONUS_HARIAN)
const namaTempat = (id: string) => jenisById.get(id)?.nama ?? id
const idPertama = (jenis: string) => penempatan.find((p) => p.jenis === jenis)?.id
const namaJurusan = (id: string) => jurusan.find((j) => j.id === id)?.nama ?? id

function syarat(k: Pekerjaan) {
  if (k.pendidikan === 'SMA/SMK') return `Keahlian ${k.minKeahlian}`
  return `${k.jurusan ? k.jurusan.map(namaJurusan).join(' atau ') : `${k.pendidikan} jurusan apa pun`}, Keahlian ${k.minKeahlian}`
}

function TabelKerja({ daftar }: { daftar: Pekerjaan[] }) {
  return (
    <div className="tabel-gulir">
      <table>
        <thead>
          <tr>
            <th>Pekerjaan</th>
            <th>Tempat</th>
            <th className="angka">Upah per aksi</th>
            <th>Syarat</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((k) => (
            <tr key={k.id}>
              <td>
                <strong>{k.nama}</strong>
                <small>{k.ringkas}</small>
              </td>
              <td>{namaTempat(k.tempat)}</td>
              <td className="angka">{rupiah(upahPerAksi(k.tier))}</td>
              <td>
                {syarat(k)}
                {k.terkunci ? ' (terbuka setelah Kawasan Industri dibuka)' : k.fase > 0 ? ` (Fase ${k.fase})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const utama = katalog.filter((j) => j.utama && !j.diLaut)
const pilihanAwal = hunian.filter((h) => h.fase === 0)
const batas = Math.max(penghasilanAwal, ...pilihanAwal.map(biayaBulan)) * 1.08

export default function Page() {
  return (
    <>
      <Papan />
      <main className="halaman panduan">
        <h1>Panduan Weton City</h1>
        <p className="pengantar">
          Ringkasan rancangan: alur pemain baru, tempat tinggal, pekerjaan, kuliah, dan fasilitas utama kota. Semua angka diambil dari data yang sama dengan peta,
          jadi selalu sejalan.
        </p>

        <nav className="anak" aria-label="Isi halaman">
          <a href="#alur">Alur pemain baru</a>
          <a href="#tinggal">Tempat tinggal</a>
          <a href="#kerja">Pekerjaan</a>
          <a href="#kuliah">Kuliah</a>
          <a href="#fasilitas">Fasilitas utama</a>
        </nav>

        <section id="alur">
          <h2>Alur pemain baru</h2>
          <p>Semua pemain mulai di usia 18 tahun sebagai lulusan SMA atau SMK, dengan uang saku {rupiah(MODAL_AWAL)}.</p>
          <ol className="alur">
            <li>
              <strong>Tiba di Pelabuhan Weton.</strong> Kapal sandar di dermaga. Mbak Laras, pemandu warga baru, menyambut dan memberi uang saku.
            </li>
            <li>
              <strong>Memilih tempat tinggal.</strong> Rusunawa bersubsidi, tiga level kost, atau numpang di rumah teman (belum tersedia di awal).
            </li>
            <li>
              <strong>Berkeliling kota.</strong> Pemandu mengantar ke bursa kerja, BLK, pasar, bank, universitas, balai kota, koran, alun-alun, rumah sakit, dan lahan industri.
            </li>
            <li>
              <strong>Misi pertama: cari pekerjaan.</strong> Pilih satu pekerjaan Tier 1 di Bursa Kerja. Satu aksi memakai {TENAGA.aksiKerja} Tenaga.
            </li>
            <li>
              <strong>Tagihan pertama dalam 7 hari.</strong> Kos, listrik, makan, dan pajak penghasilan. Selisih yang tak terbayar menjadi kasbon.
            </li>
          </ol>
          <p>
            <Link className="tombol-tautan" href="/?tur=1">Coba tur di peta</Link>
          </p>
        </section>

        <section id="tinggal">
          <h2>Tempat tinggal</h2>
          <p>
            Penghasilan bulan pertama sekitar {rupiah(penghasilanAwal)} bila memakai {TENAGA.maks} Tenaga per hari untuk kerja Tier 1, ditambah bonus harian. Garis kuning
            di bawah menandai angka itu.
          </p>
          <ul className="batang-daftar">
            {pilihanAwal.map((h) => (
              <li key={h.id}>
                <div className="batang-judul">
                  <span>{h.nama}</span>
                  <strong>{rupiah(biayaBulan(h))} per bulan</strong>
                  {biayaBulan(h) > penghasilanAwal && <em>Di atas penghasilan awal, selisihnya ditutup uang saku</em>}
                </div>
                <div className="batang" role="img" aria-label={`${h.nama}: ${rupiah(biayaBulan(h))} per bulan, penghasilan awal ${rupiah(penghasilanAwal)}`}>
                  <span className={biayaBulan(h) > penghasilanAwal ? 'lebih' : ''} style={{ width: `${(biayaBulan(h) / batas) * 100}%` }} />
                  <i style={{ left: `${(penghasilanAwal / batas) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="catatan">Biaya sudah termasuk sewa, listrik, dan makan {rupiah(25_000)} per hari (hemat 20% bila ada dapur bersama).</p>

          <ul className="karcis-daftar lebar">
            {hunian.map((h) => (
              <li key={h.id} className={`karcis${h.fase > 0 ? ' kunci' : ''}`}>
                <div className="karcis-stub">
                  <span className="harga">{h.id === 'numpang' ? 'Gratis' : rupiah(biayaBulan(h))}</span>
                  <small>{h.id === 'numpang' ? 'uang dapur saja' : 'per bulan'}</small>
                </div>
                <div className="karcis-isi">
                  <strong>{h.nama}</strong>
                  <ul className="daftar-titik">
                    {h.fasilitas.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  <p className="catatan">Syarat: {h.syarat.join('; ')}.</p>
                  {h.catatan && <p className="catatan">{h.catatan}</p>}
                  {h.fase === 0 && h.bangunan[0] && idPertama(h.bangunan[0]) && (
                    <p>
                      <Link className="tautan" href={`/?fokus=${idPertama(h.bangunan[0])}`}>Lihat di peta</Link>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="kerja">
          <h2>Pekerjaan lulusan SMA dan SMK</h2>
          <p>
            Tanpa gelar, pemain bisa naik sampai Tier 3. Tier 1 tanpa Keahlian, Tier 2 butuh Keahlian 3, Tier 3 butuh Keahlian 6. Keahlian dinaikkan lewat kursus di BLK:
            level 1 ke 2 {rupiah(kursusBiaya(1))}, level 5 ke 6 {rupiah(kursusBiaya(5))}, level 9 ke 10 {rupiah(kursusBiaya(9))}. Tier 4 dan 5 hanya untuk yang bergelar.
            Level Keahlian di atas {BONUS_UPAH.mulaiLevel} menambah upah {BONUS_UPAH.perLevel * 100}% per level.
          </p>
          {([1, 2, 3] as const).map((t) => (
            <div key={t}>
              <h3>Tier {t}: {rupiah(upahPerAksi(t))} per aksi</h3>
              <TabelKerja daftar={pekerjaanSmaSmk.filter((k) => k.tier === t)} />
            </div>
          ))}
        </section>

        <section id="kuliah">
          <h2>Kuliah di Universitas Weton</h2>
          <p>
            Satu semester sama dengan {KULIAH.hariPerSemester} hari. Kehadiran memakai {KULIAH.sesiPerSemester} sesi kuliah per semester, masing-masing {KULIAH.tenagaPerSesi} Tenaga,
            jadi sisanya tetap bisa dipakai bekerja. Gelar D3 membuka Tier 4 ({rupiah(upahPerAksi(4))} per aksi) dan gelar S1 membuka Tier 5 ({rupiah(upahPerAksi(5))} per aksi).
          </p>
          <div className="tabel-gulir">
            <table>
              <thead>
                <tr>
                  <th>Jurusan</th>
                  <th className="angka">Semester</th>
                  <th className="angka">Per semester</th>
                  <th className="angka">Total</th>
                  <th>Membuka</th>
                </tr>
              </thead>
              <tbody>
                {jurusan.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <strong>{j.nama}</strong>
                      <small>{j.fakultas}. {j.ringkas}</small>
                    </td>
                    <td className="angka">{j.semester}</td>
                    <td className="angka">{rupiah(j.ukt)}</td>
                    <td className="angka">{rupiah(totalUkt(j))}</td>
                    <td>{j.membuka.map((id) => [...pekerjaanProfesional].find((p) => p.id === id)?.nama ?? id).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Pekerjaan setelah lulus</h3>
          <TabelKerja daftar={pekerjaanProfesional} />
        </section>

        <section id="fasilitas">
          <h2>Fasilitas utama kota</h2>
          <ul className="fasilitas">
            {utama.map((j) => (
              <li key={j.id}>
                <div>
                  <strong>{j.nama}</strong>
                  <p>{j.ringkas}</p>
                </div>
                {idPertama(j.id) && (
                  <Link className="tautan" href={`/?fokus=${idPertama(j.id)}`}>Lihat di peta</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
