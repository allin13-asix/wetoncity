// Panel fitur kota yang dipakai di peta (AksiBangunan) dan Beranda: bandara, kuliah, bank, usaha, numpang, RSUD. Properti ada di PropertiPanel.tsx.
'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { rupiah } from '@/data/ekonomi'
import { jurusan } from '@/data/pendidikan'
import { JENIS_USAHA, NUMPANG, RSUD, SESI_KULIAH, TUJUAN, USAHA_ATURAN, ikanPerSiklus, type JenisUsaha, type Tujuan } from '@/server/aturan'
import type { Keadaan } from '@/server/tipe'
import { lamaWaktu, panggil } from './api'

import type { Lakukan } from './keadaan'

/** lihat: terbangkan kamera peta ke id penempatan atau lahan (hanya di peta). */
export type Props = { k: Keadaan; tenaga: number; bebas: boolean; kini: Date; lakukan: Lakukan; lihat?: (id: string) => void }

/** Banner saat pemain sedang di luar kota. */
export function BannerPerjalanan({ k, kini }: { k: Keadaan; kini: Date }) {
  if (!k.perjalanan) return null
  const sisa = Date.parse(k.perjalanan.pulang) - kini.getTime()
  return (
    <p className="pesan ok">
      Kamu sedang di {k.perjalanan.nama}. {sisa > 0 ? `Pulang dalam ${lamaWaktu(sisa)}; hasil perjalanan diterima saat pulang.` : 'Pesawat sudah mendarat, muat ulang halaman.'}
    </p>
  )
}

export function Perjalanan({ k, bebas, lakukan }: Props) {
  return (
    <section className="panel">
      <h2>Bandara Weton</h2>
      {k.perjalanan ? (
        <p>Sedang di {k.perjalanan.nama}.</p>
      ) : (
        <ul className="lowongan">
          {(Object.keys(TUJUAN) as Tujuan[]).map((t) => (
            <li key={t}>
              <span>
                <strong>
                  {TUJUAN[t].nama}, {TUJUAN[t].jam} jam
                </strong>
                <small>{TUJUAN[t].ringkas}</small>
              </span>
              <button
                type="button"
                className="tombol-sekunder"
                disabled={!bebas || k.kas < TUJUAN[t].tiket}
                onClick={() => lakukan(`terbang-${t}`, '/api/terbang', { tujuan: t }, `Berangkat ke ${TUJUAN[t].nama}. Pulang ${TUJUAN[t].jam} jam lagi.`)}
              >
                {rupiah(TUJUAN[t].tiket)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Kuliah({ k, tenaga, bebas, lakukan }: Props) {
  const [pilih, setPilih] = useState(jurusan[0].id)
  const kj = k.kuliah
  return (
    <section className="panel kantor">
      <h2>Universitas Weton</h2>
      {k.ijazah && <p>Ijazah: {k.ijazah.nama}. Pekerjaan Tier {k.ijazah.jenjang === 'D3' ? 4 : 5} yang cocok sudah muncul di Bursa Kerja.</p>}
      {kj ? (
        <>
          <p>
            {kj.jurusan.nama}: semester {kj.semester} dari {kj.totalSemester}, sesi {kj.sesi} dari {kj.sesiPerSemester}.
          </p>
          <div className="baris-aksi">
            {!kj.uktLunas ? (
              <button type="button" className="tombol-sekunder" disabled={!bebas || k.kas < kj.ukt} onClick={() => lakukan('ukt', '/api/kuliah', { aksi: 'ukt' }, `UKT semester ${kj.semester} lunas`)}>
                Bayar UKT {rupiah(kj.ukt)}
              </button>
            ) : (
              <button
                type="button"
                className="tombol-sekunder"
                disabled={!bebas || !kj.bisaHariIni || tenaga < SESI_KULIAH.tenaga}
                onClick={() => lakukan('sesi', '/api/kuliah', { aksi: 'sesi' }, (b) => (b.ijazah && !b.kuliah ? `Selamat, kamu lulus ${b.ijazah.nama}!` : 'Sesi kuliah selesai'))}
              >
                {kj.bisaHariIni ? `Ikut kuliah (${SESI_KULIAH.tenaga} Tenaga)` : 'Sesi hari ini selesai'}
              </button>
            )}
            <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan('berhenti', '/api/kuliah', { aksi: 'berhenti' }, 'Berhenti kuliah')}>
              Berhenti
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="catatan">Satu sesi per hari, lima sesi per semester. UKT dibayar di awal tiap semester.</p>
          <label>
            Jurusan
            <select value={pilih} onChange={(e) => setPilih(e.target.value)}>
              {jurusan.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} ({j.semester} semester, {rupiah(j.ukt)})
                </option>
              ))}
            </select>
          </label>
          <div className="baris-aksi rata-kiri">
            <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`daftar-${pilih}`, '/api/kuliah', { aksi: 'daftar', jurusan: pilih }, 'Terdaftar sebagai mahasiswa')}>
              Daftar kuliah
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export function Bank({ k, bebas, lakukan }: Props) {
  const [jumlah, setJumlah] = useState(100_000)
  return (
    <section className="panel kantor">
      <h2>Tabungan Bank Weton</h2>
      <p>
        Saldo tabungan <strong>{rupiah(k.tabungan)}</strong>. Bunga 0,25% setiap siklus tagihan; tabungan tidak ikut tertagih.
      </p>
      <label>
        Jumlah
        <select value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))}>
          {[100_000, 500_000, 1_000_000, 5_000_000, 10_000_000].map((n) => (
            <option key={n} value={n}>
              {rupiah(n)}
            </option>
          ))}
        </select>
      </label>
      <div className="baris-aksi rata-kiri">
        <button type="button" className="tombol-sekunder" disabled={!bebas || k.kas < jumlah} onClick={() => lakukan(`setor-${jumlah}`, '/api/tabungan', { aksi: 'setor', jumlah }, `Disetor ${rupiah(jumlah)}`)}>
          Setor
        </button>
        <button type="button" className="tombol-sekunder" disabled={!bebas || k.tabungan < jumlah} onClick={() => lakukan(`tarik-${jumlah}`, '/api/tabungan', { aksi: 'tarik', jumlah }, `Ditarik ${rupiah(jumlah)}`)}>
          Tarik
        </button>
      </div>
    </section>
  )
}

export function Usaha({ k, tenaga, bebas, lakukan }: Props) {
  return (
    <section className="panel">
      <h2>Usaha</h2>
      {k.usaha.length > 0 && (
        <ul className="lowongan">
          {k.usaha.map((u) => (
            <li key={u.id}>
              <span>
                <strong>
                  {u.nama} level {u.level}
                </strong>
                <small>
                  {u.siklusSiap} dari {USAHA_ATURAN.simpanMaks} siklus siap, {rupiah(u.hasilSiap)}
                </small>
              </span>
              <span className="baris-aksi">
                <button
                  type="button"
                  className="tombol-sekunder"
                  disabled={!bebas || u.siklusSiap < 1 || tenaga < USAHA_ATURAN.tenagaAmbil}
                  onClick={() => lakukan(`ambil-${u.id}`, '/api/usaha', { aksi: 'ambil', usaha: u.id }, `Hasil ${u.nama} diambil: +${rupiah(u.hasilSiap)}`)}
                >
                  Ambil
                </button>
                {u.jenis === 'perahu' && (
                  <button
                    type="button"
                    className="tombol-sekunder"
                    title="Ikan masuk gudang untuk dijual di Pasar atau dipakai warung; solar dibayar tunai"
                    disabled={!bebas || u.siklusSiap < 1 || tenaga < USAHA_ATURAN.tenagaAmbil || k.kas < u.siklusSiap * JENIS_USAHA.perahu.bahan}
                    onClick={() => lakukan(`gudang-${u.id}`, '/api/usaha', { aksi: 'ambil', usaha: u.id, ke: 'gudang' }, `${u.siklusSiap * ikanPerSiklus(u.level)} kg ikan masuk gudang`)}
                  >
                    Simpan {u.siklusSiap * ikanPerSiklus(u.level)} kg ikan
                  </button>
                )}
                {u.upgradeBiaya !== null && (
                  <button
                    type="button"
                    className="tombol-sekunder"
                    disabled={!bebas || k.kas < u.upgradeBiaya}
                    onClick={() => lakukan(`upgrade-${u.id}`, '/api/usaha', { aksi: 'upgrade', usaha: u.id }, `${u.nama} naik ke level ${u.level + 1}`)}
                  >
                    Naik {rupiah(u.upgradeBiaya)}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {((k.gudang.ikan ?? 0) > 0 || (k.gudang.beras ?? 0) > 0 || k.usaha.some((u) => u.jenis === 'warung')) && (
        <p className="catatan">
          Gudang: {k.gudang.ikan ?? 0} kg ikan, {k.gudang.beras ?? 0} kg beras. Warung memakai 1 kg ikan dan 1 kg beras per siklus dari gudang bila ada, jadi tidak perlu membeli bahan.{' '}
          <Link className="tautan" href="/pasar">Ke Pasar</Link>
        </p>
      )}
      {k.usaha.length < USAHA_ATURAN.slot && (
        <>
          <p className="catatan">Usaha berproduksi sendiri tiap 4 jam dan menyimpan paling banyak 6 siklus. Mengambil hasil memakai {USAHA_ATURAN.tenagaAmbil} Tenaga.</p>
          <div className="baris-aksi">
            {(Object.keys(JENIS_USAHA) as JenisUsaha[]).map((j) => (
              <button
                key={j}
                type="button"
                className="tombol-sekunder"
                disabled={!bebas || k.kas < JENIS_USAHA[j].modal}
                onClick={() => lakukan(`buka-${j}`, '/api/usaha', { aksi: 'buka', jenis: j }, `${JENIS_USAHA[j].nama} dibuka`)}
              >
                Buka {JENIS_USAHA[j].nama}
                <small>modal {rupiah(JENIS_USAHA[j].modal)}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function Rsud({ k, tenaga, bebas, lakukan }: Props) {
  return (
    <section className="panel">
      <h2>RSUD Weton</h2>
      <p>Berobat: {rupiah(RSUD.harga)}, Tenaga dan Kesehatan langsung penuh. Sekali sehari.</p>
      {k.kesehatan.sakit && <p className="pesan galat">Kamu sedang sakit: Tenaga pulih dua kali lebih lambat.</p>}
      <div className="baris-aksi">
        <button
          type="button"
          className="tombol-sekunder"
          disabled={!bebas || !k.berobatSiap || (tenaga >= k.tenaga.maks && k.kesehatan.nilai >= k.kesehatan.maks) || k.kas < RSUD.harga}
          onClick={() => lakukan('berobat', '/api/berobat', {}, 'Tenaga dan Kesehatan pulih penuh')}
        >
          {k.berobatSiap ? `Berobat ${rupiah(RSUD.harga)}` : 'Sudah berobat hari ini'}
        </button>
      </div>
    </section>
  )
}

type Kamar = { id: string; nama: string; uang_dapur: number; kamar: number; terisi: number }

/** Numpang: kamar tamu di rumah sendiri, atau numpang di rumah warga lain. */
export function Numpang({ k, bebas, lakukan }: Props) {
  const kt = k.kamarTamu
  const [dapur, setDapur] = useState(kt.uangDapur)
  const [rumah, setRumah] = useState<Kamar[] | null>(null)
  const cari = useCallback(() => {
    panggil<{ rumah: Kamar[] }>('/api/numpang').then((h) => h.ok && setRumah(h.data.rumah))
  }, [])
  const tanggal = (iso: string) => new Date(iso).toLocaleString('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="panel">
      <h2>Numpang</h2>
      {k.numpang ? (
        <>
          <p>
            {k.numpang.status === 'minta'
              ? `Menunggu izin ${k.numpang.pemilik}.`
              : k.numpang.berakhir
                ? `Numpang di rumah ${k.numpang.pemilik} sampai ${tanggal(k.numpang.berakhir)}.`
                : `Numpang di rumah ${k.numpang.pemilik}. Uang dapur ${rupiah(k.numpang.uangDapur)} per bulan, tanpa sewa dan listrik. Pindah ke sana mulai siklus tagihan berikutnya.`}
          </p>
          {!k.numpang.berakhir && (
            <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan('numpang-berhenti', '/api/numpang', { aksi: 'berhenti' }, k.numpang?.status === 'minta' ? 'Permintaan dibatalkan' : 'Kamu akan pindah besok')}>
              {k.numpang.status === 'minta' ? 'Batalkan permintaan' : 'Berhenti numpang (1 hari)'}
            </button>
          )}
        </>
      ) : !k.punyaRumah ? (
        <>
          <p className="catatan">Tinggal di kamar tamu rumah warga lain: tanpa sewa dan listrik, hanya makan dan uang dapur untuk pemilik (paling banyak {rupiah(NUMPANG.dapurMaks)} per bulan).</p>
          {rumah === null ? (
            <button type="button" className="tombol-sekunder" onClick={cari}>Cari kamar tamu</button>
          ) : rumah.length === 0 ? (
            <p className="catatan">Belum ada rumah warga yang membuka kamar tamu.</p>
          ) : (
            <ul className="lowongan">
              {rumah.map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>Rumah {r.nama}</strong>
                    <small>Uang dapur {rupiah(r.uang_dapur)} per bulan, {r.kamar - r.terisi} kamar kosong</small>
                  </span>
                  <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`minta-${r.id}`, '/api/numpang', { aksi: 'minta', pemilik: r.id }, `Permintaan dikirim ke ${r.nama}`)}>
                    Minta izin
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {k.punyaRumah && (
        <>
          <p>Kamar tamu di rumahmu: {kt.kamar} kamar, {kt.penumpang.filter((p) => p.status === 'aktif').length} terisi.</p>
          <div className="baris-aksi">
            <label className="tulis-label">
              Uang dapur per bulan
              <input type="number" min={0} max={NUMPANG.dapurMaks} step={5000} value={dapur} onChange={(e) => setDapur(Number(e.target.value))} />
            </label>
            <button
              type="button"
              className="tombol-sekunder"
              disabled={!bebas}
              onClick={() => lakukan('numpang-atur', '/api/numpang', { aksi: 'atur', terima: !kt.terima, uangDapur: dapur }, kt.terima ? 'Kamar tamu ditutup' : 'Kamar tamu dibuka')}
            >
              {kt.terima ? 'Tutup kamar tamu' : 'Buka kamar tamu'}
            </button>
            {kt.terima && dapur !== kt.uangDapur && (
              <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan('numpang-dapur', '/api/numpang', { aksi: 'atur', terima: true, uangDapur: dapur }, 'Uang dapur diperbarui untuk penumpang baru')}>
                Simpan uang dapur
              </button>
            )}
          </div>
          {kt.penumpang.length > 0 && (
            <ul className="lowongan">
              {kt.penumpang.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.nama}</strong>
                    <small>
                      {p.status === 'minta' ? 'Minta izin numpang' : p.berakhir ? `Pindah ${tanggal(p.berakhir)}` : `Numpang, uang dapur ${rupiah(p.uangDapur)} per bulan`}
                    </small>
                  </span>
                  <span className="baris-aksi">
                    {p.status === 'minta' && (
                      <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`setujui-${p.id}`, '/api/numpang', { aksi: 'setujui', permintaan: p.id }, `${p.nama} boleh numpang`)}>
                        Izinkan
                      </button>
                    )}
                    {!p.berakhir && (
                      <button type="button" className="tombol-sekunder" disabled={!bebas} onClick={() => lakukan(`tolak-${p.id}`, '/api/numpang', { aksi: 'tolak', permintaan: p.id }, p.status === 'minta' ? 'Permintaan ditolak' : `${p.nama} pindah besok`)}>
                        {p.status === 'minta' ? 'Tolak' : 'Akhiri (1 hari)'}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
