'use client'

// Aksi pemain di bangunan yang dipilih di peta: kerja di tempat kerja, Bursa Kerja, BLK (kursus keahlian dan atribut), Balai Kota
// (bonus, properti, peringkat), RM Padang, Rumah Judi (roulette), Pantai (memancing), tiga minimarket, Bandara, Universitas, Bank,
// RSUD, Pasar, Dinas Ekonomi (usaha), kamar kost/rusun/hotel, rumah warga dan rumah NPC, serta daftar pekerja tiap bangunan.
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { NAMA_ATRIBUT, SELEKSI, LATIHAN, TOKO, type Golongan } from '@/data/balans'
import { AKSI_SEBULAN, rupiah } from '@/data/ekonomi'
import { hunian } from '@/data/hunian'
import { pekerjaanDi } from '@/data/pekerjaan'
import { AKSI_MAKS, MAKAN, RUSUN, kapasitasHunian } from '@/server/aturan'
import { syaratSeleksi } from '@/server/sistem-aturan'
import type { Keadaan } from '@/server/tipe'
import { lamaWaktu, panggil } from './api'
import { Bank, Kuliah, Numpang, Perjalanan, Rsud, Usaha, type Props } from './FiturKota'
import { Memancing, Minimarket, Roulette } from './Hiburan'
import { Peringkat, PekerjaBangunan } from './Kehidupan'
import { KepemilikanBangunan, PropertiSaya } from './PropertiPanel'

type Lowongan = Keadaan['lowongan'][number]

function Kerja(p: Props) {
  const { k, tenaga, bebas, lakukan } = p
  const aksiMaks = Math.min(AKSI_MAKS, Math.floor(tenaga / 10))
  const job = k.pekerjaan!
  return (
    <section className="panel aksi-utama">
      <h2>Tempat kerjamu</h2>
      <p className="kerja-sekarang">
        <strong>{job.nama}</strong>
        <span className={`tier tier-${job.tier}`}>Tier {job.tier}</span>
        <small>gaji {rupiah(job.gajiBulan)} sebulan</small>
      </p>
      {k.kesehatan.sakit && <p className="pesan galat">Kamu sedang sakit. Tenaga pulih lebih lambat; berobat di RSUD.</p>}
      <div className="baris-aksi">
        <button type="button" className="tombol-utama" disabled={aksiMaks < 1 || !bebas} onClick={() => lakukan('kerja1', '/api/kerja', { aksi: 1 }, `Kerja 1 kali: +${rupiah(job.upahPerAksi)}`)}>
          Kerja 1 kali
          <small>+{rupiah(job.upahPerAksi)}, 10 Tenaga</small>
        </button>
        {aksiMaks > 1 && (
          <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan('kerjaN', '/api/kerja', { aksi: aksiMaks }, `Kerja ${aksiMaks} kali: +${rupiah(job.upahPerAksi * aksiMaks)}`)}>
            Kerja {aksiMaks} kali
            <small>+{rupiah(job.upahPerAksi * aksiMaks)}</small>
          </button>
        )}
      </div>
      {aksiMaks < 1 && <p className="catatan">Tenaga habis. Istirahat dulu, makan, atau berobat.</p>}
    </section>
  )
}

/** Syarat atribut minimum satu seleksi, dengan tanda yang belum terpenuhi. */
function SyaratSeleksi({ gol, tier, k }: { gol: Golongan; tier: number; k: Keadaan }) {
  const syarat = Object.entries(syaratSeleksi(gol, tier)) as Array<[keyof Keadaan['atribut'], number]>
  return (
    <small>
      {SELEKSI[gol].nama}: {syarat.map(([a, n]) => `${NAMA_ATRIBUT[a]} ${n}${k.atribut[a] >= n ? '' : ` (kamu ${k.atribut[a]})`}`).join(', ')}. Biaya {rupiah(SELEKSI[gol].biaya)}, {SELEKSI[gol].tenaga} Tenaga.
    </small>
  )
}

function DaftarLowongan({ daftar, k, bebas, lakukan }: { daftar: readonly Lowongan[] } & Props) {
  return (
    <ul className="lowongan">
      {daftar.map((l) => {
        const gol = l.seleksi as Golongan | null
        const lulus = k.seleksi.lulus.includes(l.id)
        const gagalSampai = k.seleksi.gagal[l.id]
        const perluTes = !!gol && !lulus
        return (
          <li key={l.id}>
            <span>
              <strong>
                {l.nama} <span className={`tier tier-${l.tier}`}>Tier {l.tier}</span>
              </strong>
              <small>
                {l.tempatNama}, gaji {rupiah(l.gajiBulan)} sebulan{l.cocok ? ', cocok dengan sekolahmu (+15%)' : ''}
              </small>
              {gol && !lulus && <SyaratSeleksi gol={gol} tier={l.tier} k={k} />}
              {gol && lulus && <small>Sudah lulus seleksi.</small>}
              {gagalSampai && <small>Belum lulus. Boleh mencoba lagi dalam {lamaWaktu(Date.parse(gagalSampai) - Date.now())}.</small>}
            </span>
            {k.pekerjaan?.id === l.id ? (
              <span className="catatan">Pekerjaanmu</span>
            ) : !l.boleh ? (
              <span className="catatan">Butuh Keahlian {l.minKeahlian}</span>
            ) : perluTes ? (
              <button type="button" className="tombol-sekunder" disabled={!bebas || !!gagalSampai} onClick={() => lakukan(`seleksi-${l.id}`, '/api/seleksi', { pekerjaan: l.id }, (b) => (b.tes?.lulus ? `Lulus seleksi (skor ${b.tes.skor})` : `Belum lulus (skor ${b.tes?.skor}, perlu ${b.tes?.nilaiLulus})`))}>
                Ikut seleksi
              </button>
            ) : (
              <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`ambil-${l.id}`, '/api/pekerjaan', { pekerjaan: l.id }, `Sekarang bekerja sebagai ${l.nama.toLowerCase()}. Datang ke tempat kerjamu untuk bekerja.`)}>
                Ambil
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Bursa(p: Props) {
  // lowongan yang belum terjangkau dilipat: di ponsel daftar lengkapnya sampai puluhan layar
  const bisa = p.k.lowongan.filter((l) => l.boleh || p.k.pekerjaan?.id === l.id)
  const belum = p.k.lowongan.filter((l) => !l.boleh && p.k.pekerjaan?.id !== l.id)
  return (
    <section className="panel">
      <h2>Lowongan</h2>
      <p className="catatan">
        UMK Weton {rupiah(p.k.umk)} per bulan kota. Gaji sebulan dihitung untuk {AKSI_SEBULAN} aksi; bekerja lebih banyak, upahmu bertambah. Ganti pekerjaan dibatasi: sisa {p.k.gantiKerja.sisa} dari {p.k.gantiKerja.maks} kali pekan ini.
      </p>
      <DaftarLowongan daftar={bisa} {...p} />
      {belum.length > 0 && (
        <details className="tentang">
          <summary>Butuh Keahlian lebih tinggi ({belum.length})</summary>
          <DaftarLowongan daftar={belum} {...p} />
        </details>
      )}
    </section>
  )
}

/** BLK: kursus keahlian (butuh uang, Tenaga, dan atribut minimum) dan kursus atribut. Kursus berjalan selama durasinya, lalu ada jeda. */
function Blk({ k, tenaga, bebas, lakukan, kini }: Props) {
  const jeda = k.latihanJeda ? Date.parse(k.latihanJeda) - kini.getTime() : 0
  const sibuk = !!k.latihan || jeda > 0
  return (
    <section className="panel">
      <h2>Kursus</h2>
      {k.latihan && <p className="pesan ok">Sedang ikut {k.latihan.nama}, selesai {lamaWaktu(Date.parse(k.latihan.selesai) - kini.getTime())} lagi.</p>}
      {!k.latihan && jeda > 0 && <p className="catatan">Istirahat setelah kursus, kursus berikutnya bisa diambil {lamaWaktu(jeda)} lagi.</p>}
      {k.kursus ? (
        <>
          <p>
            Keahlian {k.kursus.dari} naik ke {k.kursus.ke}: {rupiah(k.kursus.biaya)}, {k.kursus.tenaga} Tenaga, {lamaWaktu(k.kursus.durasiMs)}.
          </p>
          {k.kursus.syarat.length > 0 && (
            <p className="catatan">
              Syarat: {k.kursus.syarat.map((s) => `${NAMA_ATRIBUT[s.atribut as keyof typeof NAMA_ATRIBUT]} ${s.perlu}${s.punya >= s.perlu ? '' : ` (kamu ${s.punya})`}`).join(', ')}.
            </p>
          )}
          <button
            type="button"
            className="tombol-utama"
            disabled={!bebas || sibuk || k.kas < k.kursus.biaya || tenaga < k.kursus.tenaga || k.kursus.syarat.some((s) => s.punya < s.perlu)}
            onClick={() => lakukan('kursus', '/api/kursus', { kursus: 'keahlian' }, `Kursus keahlian dimulai, selesai dalam ${lamaWaktu(k.kursus!.durasiMs)}`)}
          >
            Ikut kursus keahlian
          </button>
        </>
      ) : (
        <p>Keahlian sudah mencapai level tertinggi.</p>
      )}
      <h3 className="sub">Kursus atribut</h3>
      <ul className="lowongan">
        {Object.entries(LATIHAN.atribut).map(([id, c]) => (
          <li key={id}>
            <span>
              <strong>{c.nama}</strong>
              <small>
                {NAMA_ATRIBUT[c.atribut]} +{c.naik} (sekarang {k.atribut[c.atribut]}). {rupiah(c.biaya)}, {c.tenaga} Tenaga, {lamaWaktu(c.durasiMs)}.
              </small>
            </span>
            <button type="button" className="tombol-sekunder" disabled={!bebas || sibuk || k.kas < c.biaya || tenaga < c.tenaga} onClick={() => lakukan(`kursus-${id}`, '/api/kursus', { kursus: id }, `${c.nama} dimulai`)}>
              Ikut
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Kamar({ k, bebas, lakukan, jenis, idTempat, versi }: Props & { jenis: string; idTempat: string; versi: number }) {
  const h = hunian.find((x) => x.bangunan.includes(jenis) && x.kamar)
  const [terisi, setTerisi] = useState<number | null>(null)
  const [kamar, setKamar] = useState('')
  useEffect(() => {
    panggil<{ terisi: Record<string, number> }>('/api/hunian').then((r) => r.ok && setTerisi(r.data.terisi[idTempat] ?? 0))
  }, [idTempat, versi])
  if (!h) return null
  const kap = kapasitasHunian(h)!
  const diSini = k.hunian?.tempat === idTempat
  const akanKeSini = k.hunianBerikut?.tempat === idTempat
  const penuh = terisi !== null && terisi >= kap && !diSini && !akanKeSini
  // Rusunawa penuh: server tetap memberi kamar tambahan bila tidak meminta gedung tertentu
  const tambahan = penuh && h.id === RUSUN.id
  const nomor = Number(kamar)
  return (
    <section className="panel aksi-utama">
      <h2>Kamar di gedung ini</h2>
      <p>
        {h.kamar} kamar{h.penghuni > 1 ? `, satu kamar ${h.penghuni} orang` : ''}. Terisi {terisi ?? '...'} dari {kap} orang.
      </p>
      {diSini ? (
        <p className="pesan ok">Kamu tinggal di sini{k.hunian?.kamar ? `, kamar ${k.hunian.kamar}` : ''}.</p>
      ) : akanKeSini ? (
        <p className="catatan">Kamu pindah ke sini mulai siklus tagihan berikutnya{k.hunianBerikut?.kamar ? `, kamar ${k.hunianBerikut.kamar}` : ''}.</p>
      ) : (
        <>
          {h.penghuni > 1 && (
            <>
              <label className="tulis-label">
                Nomor kamar (kosongkan untuk kamar kosong pertama)
                <input type="number" min={1} max={h.kamar} value={kamar} onChange={(e) => setKamar(e.target.value)} />
              </label>
              <p className="catatan">
                Masuk ke kamar yang sudah berpenghuni otomatis mengirim permintaan pertemanan ke teman sekamar. Yang menolak atau memutus pertemanan wajib pindah dalam 24 jam.
              </p>
            </>
          )}
          <button
            type="button"
            className="tombol-utama"
            disabled={!bebas || (penuh && !tambahan) || k.peran === 'walikota'}
            onClick={() =>
              lakukan(
                `sewa-${idTempat}-${kamar}`,
                '/api/hunian',
                tambahan ? { hunian: h.id } : { hunian: h.id, tempat: idTempat, ...(Number.isInteger(nomor) && nomor > 0 ? { kamar: nomor } : {}) },
                k.hunian ? `Pindah ke ${h.nama} mulai siklus tagihan berikutnya` : `Sekarang tinggal di ${h.nama}`,
              )
            }
          >
            {tambahan ? 'Ambil kamar tambahan' : penuh ? 'Kamar penuh' : k.hunian ? 'Pindah ke sini' : 'Tinggal di sini'}
          </button>
        </>
      )}
      {k.hunian && !diSini && !akanKeSini && <p className="catatan">Pindah berlaku mulai siklus tagihan berikutnya; tagihan berjalan tetap memakai tarif sekarang.</p>}
    </section>
  )
}

/** Panel aksi untuk satu bangunan di peta. Mengembalikan null bila bangunan ini tidak punya aksi untuk pemain. */
export default function AksiBangunan(p: Props & { jenis: string; idTempat: string; versi: number; lahanPilihan?: string | null }) {
  const { k, bebas, lakukan, jenis, idTempat, versi } = p
  const bagian: React.ReactNode[] = []
  const diSiniKerja = k.pekerjaan && k.pekerjaan.tempat === jenis
  if (diSiniKerja) bagian.push(<Kerja key="kerja" {...p} />)

  if (hunian.some((h) => h.kamar && h.bangunan.includes(jenis))) bagian.push(<Kamar key="kamar" {...p} />)
  if (k.hunian?.tempat && k.hunian.tempat === idTempat) {
    bagian.push(
      <section key="ruang-tamu" className="panel">
        <h2>Ruang tamu gedung</h2>
        <p className="catatan">Ngobrol dengan tetangga satu gedung.</p>
        <Link className="tombol-sekunder" href="/pesan?tab=gedung">Masuk ruang tamu</Link>
      </section>,
    )
  }

  switch (jenis) {
    case 'bursa-kerja':
      bagian.push(<Bursa key="bursa" {...p} />)
      break
    case 'blk':
      bagian.push(<Blk key="blk" {...p} />)
      break
    case 'balai-kota':
      bagian.push(
        <section key="bonus" className="panel aksi-utama">
          <h2>Bonus harian</h2>
          <p className="catatan">Uang kecil dari Kantor Wali Kota untuk warga yang datang tiap hari.</p>
          <button type="button" className="tombol-utama" disabled={!k.bonus.siap || !bebas} onClick={() => lakukan('bonus', '/api/bonus', {}, `Bonus harian diambil: +${rupiah(k.bonus.jumlah)}`)}>
            {k.bonus.siap ? `Ambil ${rupiah(k.bonus.jumlah)}` : 'Sudah diambil hari ini'}
          </button>
        </section>,
        <PropertiSaya key="properti" {...p} lahanPilihan={p.lahanPilihan} />,
        <Peringkat key="peringkat" judul="Peringkat reputasi" />,
      )
      if (k.peran === 'walikota') {
        bagian.push(
          <section key="wk" className="panel">
            <h2>Kantor Wali Kota</h2>
            <p>
              Kebijakan UMK, dana, dan alat Wali Kota ada di <Link className="tautan" href="/beranda">Beranda</Link>.
            </p>
          </section>,
        )
      }
      break
    case 'alun-alun':
      bagian.push(
        <section key="nongkrong" className="panel aksi-utama">
          <h2>Nongkrong di alun-alun</h2>
          <p className="catatan">Ngobrol langsung dengan warga lain. Satu ruang paling banyak 20 orang; bila penuh, ruang baru dibuka.</p>
          <div className="baris-aksi">
            <Link className="tombol-utama" href="/pesan?tab=alun">Masuk Alun-Alun</Link>
            <Link className="tombol-sekunder" href="/pesan?tab=taman">Ke Taman Kota</Link>
          </div>
        </section>,
        <Peringkat key="peringkat" judul="Peringkat reputasi" />,
      )
      break
    case 'rm-padang':
      bagian.push(
        <section key="makan" className="panel">
          <h2>Makan</h2>
          <p>
            Nasi rendang Uda Fadli: {rupiah(MAKAN.harga)} untuk {MAKAN.tenaga} Tenaga dan mengenyangkan perut. Sisa hari ini: {k.makanSisa} kali.
          </p>
          <button type="button" className="tombol-utama" disabled={!bebas || k.makanSisa < 1 || k.kas < MAKAN.harga} onClick={() => lakukan('makan', '/api/makan', {}, `Kenyang: +${MAKAN.tenaga} Tenaga`)}>
            {k.makanSisa < 1 ? 'Sudah dua kali hari ini' : `Makan ${rupiah(MAKAN.harga)}`}
          </button>
        </section>,
      )
      break
    case 'tempat-judi':
      bagian.push(<Roulette key="roulette" {...p} />)
      break
    case 'warung-pantai':
      bagian.push(<Memancing key="pancing" {...p} />)
      break
    case 'minimarket':
    case 'alpa-maret':
    case 'indo-april':
      if (Object.hasOwn(TOKO.toko, jenis)) bagian.push(<Minimarket key="toko" {...p} toko={jenis} />)
      break
    case 'bandara':
      bagian.push(<Perjalanan key="terbang" {...p} />)
      break
    case 'univ-rektorat':
    case 'univ-fakultas':
    case 'univ-perpustakaan':
      bagian.push(<Kuliah key="kuliah" {...p} />)
      break
    case 'bank-weton':
      bagian.push(<Bank key="bank" {...p} />)
      if (k.kasbon > 0) {
        const bayar = Math.min(k.kas, k.kasbon)
        bagian.push(
          <section key="kasbon" className="panel">
            <h2>Kasbon</h2>
            <p>
              <strong>{rupiah(k.kasbon)}</strong> belum lunas{k.kasbonMacet ? '. Kasbon macet: Tenaga pulih dua kali lebih lambat.' : '.'}
            </p>
            <button type="button" className="tombol-utama" disabled={bayar < 1 || !bebas} onClick={() => lakukan('kasbon', '/api/kasbon', { jumlah: bayar }, `Kasbon dibayar ${rupiah(bayar)}`)}>
              Bayar {rupiah(bayar)}
            </button>
          </section>,
        )
      }
      break
    case 'rs-weton':
      bagian.push(<Rsud key="rsud" {...p} />)
      break
    case 'pasar-weton':
      bagian.push(
        <section key="pasar" className="panel aksi-utama">
          <h2>Pasar Weton</h2>
          <p className="catatan">Bahan, makanan dan minuman, serta barang koleksi. Jual beli dengan pedagang atau sesama warga.</p>
          <Link className="tombol-utama" href="/pasar">Masuk pasar</Link>
        </section>,
      )
      break
    case 'dinas-ekonomi':
    case 'tpi':
      bagian.push(<Usaha key="usaha" {...p} />)
      break
    case 'rumah-menengah':
      bagian.push(<Numpang key="numpang" {...p} />)
      break
    case 'koran-weton':
      bagian.push(
        <section key="koran" className="panel">
          <h2>Koran Weton</h2>
          {k.koran && <p>Edisi terbaru: {k.koran.judul}</p>}
          <div className="baris-aksi">
            <Link className="tombol-sekunder" href="/koran">Baca koran</Link>
            {k.peran === 'walikota' && <Link className="tombol-sekunder" href="/koran/tulis">Meja redaksi</Link>}
          </div>
        </section>,
      )
      break
  }

  // pekerjaan yang bisa diambil langsung di bangunan ini
  const diSini = k.lowongan.filter((l) => l.tempat === jenis)
  if (jenis !== 'bursa-kerja' && diSini.length > 0) {
    bagian.push(
      <section key="lowongan" className="panel">
        <h2>Lowongan di sini</h2>
        <DaftarLowongan daftar={diSini} {...p} />
      </section>,
    )
  }
  // transparansi pekerja: NPC dan pemain, kuota lowongan, dan tombol kunjungi profil
  if (pekerjaanDi(jenis).length > 0) bagian.push(<PekerjaBangunan key="pekerja" tempat={idTempat} versi={versi} />)

  // siapa pemilik bangunan ini: kota, NPC (bisa dibeli), atau pemain
  bagian.push(<KepemilikanBangunan key="milik" {...p} idTempat={idTempat} jenis={jenis} />)
  return <div className="aksi-bangunan">{bagian}</div>
}
