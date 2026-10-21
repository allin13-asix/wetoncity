'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Inventori } from './Kehidupan'
import { useKeadaan } from './keadaan'

/** Halaman inventori dan mailbox. */
export default function HalamanInventori() {
  const router = useRouter()
  const st = useKeadaan()
  const { k } = st
  useEffect(() => {
    if (st.masuk === false) router.replace('/masuk')
  }, [st.masuk, router])
  if (!k) return <main className="halaman"><p className="kosong">{st.pesan ? st.pesan.teks : 'Memuat'}</p></main>
  return (
    <main className="halaman">
      <div className="beranda-kepala">
        <h1>Inventori</h1>
        <Link className="tombol-sekunder" href="/beranda">Beranda</Link>
      </div>
      {st.pesan && <p className={`pesan ${st.pesan.ok ? 'ok' : 'galat'}`} role="status">{st.pesan.teks}</p>}
      <div className="kolom">
        <Inventori k={k} bebas={st.bebas} lakukan={st.lakukan} versi={st.versi} />
      </div>
    </main>
  )
}
