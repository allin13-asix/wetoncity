'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { hiasan, katalog, kategori } from '@/data/bangunan'
import { geometriModel, jumlahSegitiga } from '@/aset'
import type { ItemGaleri } from './PanggungGaleri'

const Panggung = dynamic(() => import('./PanggungGaleri'), {
  ssr: false,
  loading: () => <div className="panggung-muat">Memuat model</div>,
})

const urutan = Object.keys(kategori) as Array<keyof typeof kategori>

function semuaItem(): ItemGaleri[] {
  const bangunan = urutan.flatMap((k) =>
    katalog
      .filter((j) => j.kategori === k)
      .map((j) => ({ id: j.id, nama: j.nama, grup: kategori[k].nama, model: j.model, varian: j.varian ?? {}, ukuran: j.ukuran, v: 0 })),
  )
  const lain = hiasan.map((h) => ({ id: h.id, nama: h.nama, grup: 'Hiasan dan kendaraan', model: h.model, varian: {}, ukuran: h.ukuran, v: 0 }))
  return [...bangunan, ...lain]
}

async function unduhGlb(item: ItemGaleri) {
  const [{ GLTFExporter }, { Mesh, MeshStandardMaterial }] = await Promise.all([import('three/addons/exporters/GLTFExporter.js'), import('three')])
  const mesh = new Mesh(geometriModel(item.model, item.ukuran, item.varian, item.v), new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }))
  mesh.name = item.id
  const hasil = await new GLTFExporter().parseAsync(mesh, { binary: true })
  const blob = new Blob([hasil as ArrayBuffer], { type: 'model/gltf-binary' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${item.id}.glb`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export default function Galeri() {
  const items = useMemo(semuaItem, [])
  const [id, setId] = useState(items[0].id)
  const [lembar, setLembar] = useState(false)
  const [putar, setPutar] = useState(true)
  const item = items.find((i) => i.id === id) ?? items[0]
  const info = useMemo(() => {
    const g = geometriModel(item.model, item.ukuran, item.varian, item.v)
    return { segitiga: jumlahSegitiga(g), tinggi: g.boundingBox?.max.y ?? 0 }
  }, [item])
  const grup = [...new Set(items.map((i) => i.grup))]

  return (
    <div className="galeri">
      <div className="panggung">
        <Panggung item={item} items={items} lembar={lembar} putar={putar} />
        <div className="panggung-alat">
          <button type="button" aria-pressed={lembar} onClick={() => setLembar((x) => !x)}>
            {lembar ? 'Satu model' : 'Lembar semua'}
          </button>
          {!lembar && (
            <button type="button" aria-pressed={putar} onClick={() => setPutar((x) => !x)}>
              {putar ? 'Hentikan putar' : 'Putar otomatis'}
            </button>
          )}
        </div>
      </div>
      <aside className="daftar" aria-label="Daftar aset">
        <div className="detail">
          <h1>{item.nama}</h1>
          <p className="angka">
            {item.ukuran[0]} x {item.ukuran[1]} petak, tinggi {info.tinggi.toFixed(1)}, {info.segitiga.toLocaleString('id-ID')} segitiga
          </p>
          <button type="button" className="utama" onClick={() => unduhGlb(item)}>
            Unduh .glb
          </button>
        </div>
        {grup.map((g) => (
          <section key={g}>
            <h2>{g}</h2>
            <ul>
              {items
                .filter((i) => i.grup === g)
                .map((i) => (
                  <li key={i.id}>
                    <button type="button" aria-current={i.id === id} onClick={() => { setId(i.id); setLembar(false) }}>
                      {i.nama}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </aside>
    </div>
  )
}
