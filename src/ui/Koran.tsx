import Link from 'next/link'
import type { Berita, Edisi } from '@/data/koran'
import { tanggalPanjang } from '@/server/aturan'
import TandaiBaca from './TandaiBaca'

function Tulisan({ b, utama = false }: { b: Berita; utama?: boolean }) {
  return (
    <article className={utama ? 'berita berita-utama' : 'berita'}>
      <h2>{b.judul}</h2>
      {b.penulis && <p className="oleh">Oleh {b.penulis}</p>}
      <div className="teks">
        {b.isi.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  )
}

/** Satu edisi Koran Weton beserta daftar edisi lainnya. Hanya menerima edisi yang sudah terbit. */
export default function Koran({ edisi, lainnya, pratinjau = false }: { edisi: Edisi | null; lainnya: Edisi[]; pratinjau?: boolean }) {
  const [utama, ...sisa] = edisi?.berita ?? []
  const terbaru = !!edisi && lainnya.every((e) => e.tanggal < edisi.tanggal)
  return (
    <main className="halaman koran">
      <header className="koran-kepala">
        <h1>Koran Weton</h1>
        <div className="koran-baris">
          <p className="koran-tanggal">{edisi ? tanggalPanjang(edisi.tanggal) : 'Belum ada edisi'}</p>
          <p>Kabar harian untuk warga Weton, terbit tiap pagi</p>
        </div>
      </header>

      {pratinjau && <p className="catatan">Mode Wali Kota: edisi yang belum terbit ikut terlihat. Warga lain baru melihatnya pada tanggal terbit.</p>}

      {edisi && utama ? (
        <>
          <Tulisan b={utama} utama />
          {sisa.length > 0 && (
            <div className="lainnya">
              {sisa.map((b) => (
                <Tulisan key={b.judul} b={b} />
              ))}
            </div>
          )}
          {edisi.besok && (
            <aside className="besok">
              <strong>{terbaru ? 'Besok di Koran Weton' : 'Di edisi berikutnya'}</strong>
              <p>{edisi.besok}</p>
            </aside>
          )}
          {!pratinjau && <TandaiBaca tanggal={edisi.tanggal} />}
        </>
      ) : (
        <p className="kosong">Belum ada edisi yang terbit. Coba lagi besok pagi.</p>
      )}

      {lainnya.length > 0 && (
        <nav className="arsip" aria-labelledby="arsip-judul">
          <h2 id="arsip-judul">Edisi lainnya</h2>
          <ul>
            {lainnya.map((e) => (
              <li key={e.tanggal}>
                <Link href={`/koran/${e.tanggal}`}>
                  <span className="arsip-tgl">{tanggalPanjang(e.tanggal)}</span>
                  <span className="arsip-judul">{e.berita[0].judul}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </main>
  )
}
