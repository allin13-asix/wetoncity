'use client'

// Musik latar Weton City. Dua sumber: lagu prosedural yang disintesis langsung di peramban (Web Audio, tanpa berkas, jadi
// hemat kuota) dan rekaman berlisensi bebas di public/musik (daftar di src/data/musik.ts). Satu pemutar untuk seluruh
// aplikasi: keadaannya di modul ini, jadi musik tetap jalan saat pindah halaman. Peramban hanya mengizinkan suara setelah
// pemain mengetuk sesuatu, jadi bila musik dinyalakan sebelumnya, ia mulai pada ketukan pertama.
import { useSyncExternalStore } from 'react'
import { REKAMAN } from '@/data/musik'

type Lagu = { id: string; judul: string; ket: string; jenis: 'sintesis' | 'rekaman'; src?: string }

const SINTESIS: Lagu[] = [
  { id: 'gamelan-pagi', judul: 'Gamelan Pagi', ket: 'Saron, bonang, dan gong laras slendro', jenis: 'sintesis' },
  { id: 'keroncong-santai', judul: 'Keroncong Santai', ket: 'Cak-cuk, cello petik, dan suling', jenis: 'sintesis' },
  { id: 'senja-pelabuhan', judul: 'Senja di Pelabuhan', ket: 'Lo-fi santai untuk bekerja', jenis: 'sintesis' },
  { id: 'hujan-malam', judul: 'Hujan Malam', ket: 'Rintik hujan dan denting pelog', jenis: 'sintesis' },
]
export const DAFTAR_LAGU: Lagu[] = [...SINTESIS, ...REKAMAN.map((r) => ({ id: r.id, judul: r.judul, ket: r.ket, jenis: 'rekaman' as const, src: r.src }))]

type Keadaan = { nyala: boolean; lagu: number; volume: number; menunggu: boolean }
const KUNCI = 'weton-musik'
let keadaan: Keadaan = { nyala: false, lagu: 0, volume: 0.5, menunggu: false }
const pendengar = new Set<() => void>()
const kabari = () => pendengar.forEach((f) => f())

function simpan() {
  try {
    localStorage.setItem(KUNCI, JSON.stringify({ nyala: keadaan.nyala, lagu: keadaan.lagu, volume: keadaan.volume }))
  } catch {}
}

// ---------------------------------------------------------------- mesin suara

let ctx: AudioContext | null = null
let induk: GainNode | null = null
let jadwal: ReturnType<typeof setInterval> | null = null
let audio: HTMLAudioElement | null = null
let berhenti: Array<() => void> = []

function konteks() {
  if (!ctx) {
    ctx = new AudioContext()
    induk = ctx.createGain()
    induk.gain.value = keadaan.volume * 0.6
    induk.connect(ctx.destination)
  }
  return ctx
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/** Bilah logam gamelan: beberapa parsial tak harmonis dengan peluruhan, sepasang sedikit sumbang supaya "berombak". */
function logam(f: number, t: number, kuat = 0.2, panjang = 1.6) {
  const c = ctx!
  for (const [r, a, d] of [[1, 1, 1], [2.76, 0.35, 0.45], [5.4, 0.12, 0.2]] as const) {
    for (const geser of [-1.2, 1.2]) {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.value = f * r + geser * r
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(kuat * a * 0.5, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t + panjang * d)
      o.connect(g).connect(induk!)
      o.start(t)
      o.stop(t + panjang * d + 0.05)
    }
  }
}

function gong(f: number, t: number, kuat = 0.35) {
  const c = ctx!
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain()
  o.frequency.value = f
  o2.frequency.value = f * 2.02
  lfo.frequency.value = 3.2
  lg.gain.value = kuat * 0.25
  lfo.connect(lg).connect(g.gain)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(kuat, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 6)
  o.connect(g)
  o2.connect(g)
  g.connect(induk!)
  for (const x of [o, o2, lfo]) {
    x.start(t)
    x.stop(t + 6.1)
  }
}

function petik(f: number, t: number, kuat = 0.12, panjang = 0.35, tipe: OscillatorType = 'triangle') {
  const c = ctx!
  const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter()
  o.type = tipe
  o.frequency.value = f
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(3200, t)
  lp.frequency.exponentialRampToValueAtTime(500, t + panjang)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(kuat, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + panjang)
  o.connect(lp).connect(g).connect(induk!)
  o.start(t)
  o.stop(t + panjang + 0.05)
}

function suling(f: number, t: number, panjang: number, kuat = 0.07) {
  const c = ctx!
  const o = c.createOscillator(), g = c.createGain(), v = c.createOscillator(), vg = c.createGain()
  o.type = 'sine'
  o.frequency.value = f
  v.frequency.value = 5.2
  vg.gain.value = f * 0.008
  v.connect(vg).connect(o.frequency)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(kuat, t + 0.12)
  g.gain.setValueAtTime(kuat, t + panjang * 0.7)
  g.gain.linearRampToValueAtTime(0, t + panjang)
  o.connect(g).connect(induk!)
  for (const x of [o, v]) {
    x.start(t)
    x.stop(t + panjang + 0.05)
  }
}

function pad(fs: number[], t: number, panjang: number, kuat = 0.05) {
  const c = ctx!
  const lp = c.createBiquadFilter(), g = c.createGain()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(kuat, t + panjang * 0.3)
  g.gain.linearRampToValueAtTime(0, t + panjang)
  lp.connect(g).connect(induk!)
  for (const f of fs) {
    for (const d of [-4, 4]) {
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.detune.value = d
      o.connect(lp)
      o.start(t)
      o.stop(t + panjang + 0.05)
    }
  }
}

let derau: AudioBuffer | null = null
function bufferDerau() {
  if (!derau) {
    const c = ctx!
    derau = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = derau.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return derau
}
function ketuk(t: number, frek: number, kuat: number, panjang: number) {
  const c = ctx!
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = bufferDerau()
  f.type = 'bandpass'
  f.frequency.value = frek
  g.gain.setValueAtTime(kuat, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + panjang)
  s.connect(f).connect(g).connect(induk!)
  s.start(t, Math.random())
  s.stop(t + panjang + 0.02)
}
function dentum(t: number) {
  const c = ctx!
  const o = c.createOscillator(), g = c.createGain()
  o.frequency.setValueAtTime(120, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.25)
  g.gain.setValueAtTime(0.35, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
  o.connect(g).connect(induk!)
  o.start(t)
  o.stop(t + 0.32)
}
function hujan() {
  const c = ctx!
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = bufferDerau()
  s.loop = true
  f.type = 'lowpass'
  f.frequency.value = 1400
  g.gain.value = 0.06
  s.connect(f).connect(g).connect(induk!)
  s.start()
  berhenti.push(() => s.stop())
}

// ---------------------------------------------------------------- komposisi (dijadwalkan per langkah 1/16)

// laras slendro kira-kira: lima nada hampir sama jarak dalam satu oktaf; nada "1 2 3 5 6"
const SLENDRO = (n: number, oktaf = 0) => 282 * 2 ** (([0, 1, 2, 3, 4][n] + oktaf * 5) / 5)
const BALUNGAN = [2, 1, 2, 3, 1, 2, 3, 4, 3, 2, 1, 0, 2, 1, 0, 0] // indeks nada slendro, satu nada per ketukan
const PELOG = [0, 1, 3, 7, 8].map((s) => 220 * 2 ** (s / 12))

type Pola = { bpm: number; mulai?: () => void; langkah: (i: number, t: number, s: number) => void }

const POLA: Record<string, Pola> = {
  'gamelan-pagi': {
    bpm: 64,
    langkah(i, t, s) {
      const ketukan = Math.floor(i / 4)
      const n = BALUNGAN[ketukan % 16]
      if (i % 4 === 0) logam(SLENDRO(n), t, 0.22, 1.8) // saron
      if (i % 2 === 0) logam(SLENDRO((n + (i % 8 === 2 ? 1 : 0)) % 5, 1), t, 0.07, 0.8) // bonang/peking imbal
      if (i % 16 === 8) logam(SLENDRO(n, -1), t, 0.12, 2.6) // kenong
      if (i % 64 === 0) gong(68, t)
      if (i % 64 === 32) gong(98, t, 0.18) // kempul
      if (i % 4 === 2 && Math.random() < 0.3) ketuk(t, 180, 0.12, 0.12) // kendang
      void s
    },
  },
  'keroncong-santai': {
    bpm: 96,
    langkah(i, t, s) {
      // progresi C - Am - F - G7, dua birama per akor
      const akor = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62, 65]][Math.floor(i / 32) % 4]
      const bas = [36, 33, 41, 43][Math.floor(i / 32) % 4]
      // cak dan cuk: petikan pendek di ketukan lemah
      if (i % 4 === 2) for (const m of akor) petik(hz(m + 12), t, 0.04, 0.18)
      if (i % 4 === 3 && i % 8 === 7) for (const m of akor) petik(hz(m + 12), t, 0.03, 0.12)
      // cello petik: "crong" bergantian akar dan kwint
      if (i % 8 === 0) petik(hz(bas), t, 0.16, 0.5, 'sine')
      if (i % 8 === 5) petik(hz(bas + 7), t, 0.1, 0.35, 'sine')
      // suling: melodi pentatonik panjang, sesekali
      if (i % 16 === 0 && Math.random() < 0.6) {
        const m = [72, 74, 76, 79, 81][Math.floor(Math.random() * 5)]
        suling(hz(m), t, s * (Math.random() < 0.5 ? 6 : 10))
      }
    },
  },
  'senja-pelabuhan': {
    bpm: 74,
    langkah(i, t, s) {
      const akor = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]][Math.floor(i / 16) % 4]
      if (i % 16 === 0) pad(akor.map(hz), t, s * 16, 0.035)
      if (i % 16 === 0 || i % 16 === 10) dentum(t)
      if (i % 16 === 8) ketuk(t, 1800, 0.12, 0.18)
      if (i % 4 === 2) ketuk(t + s * 0.1, 7000, 0.05, 0.05)
      if (i % 8 === 4 && Math.random() < 0.45) petik(hz(akor[Math.floor(Math.random() * 4)] + 24), t, 0.06, 0.9, 'sine')
    },
  },
  'hujan-malam': {
    bpm: 60,
    mulai: () => hujan(),
    langkah(i, t, s) {
      if (i % 32 === 0) pad([hz(45), hz(52), hz(55), hz(59)].map((f, k) => (Math.floor(i / 32) % 2 ? f * (k ? 0.9439 : 1) : f)), t, s * 32, 0.03)
      if (i % 4 === 0 && Math.random() < 0.28) logam(PELOG[Math.floor(Math.random() * 5)] * (Math.random() < 0.5 ? 2 : 1), t, 0.06, 2.2)
    },
  },
}

function mainkanSintesis(id: string) {
  const c = konteks()
  const pola = POLA[id]
  const s = 60 / pola.bpm / 4
  let i = 0
  let t = c.currentTime + 0.1
  pola.mulai?.()
  jadwal = setInterval(() => {
    while (t < c.currentTime + 0.35) {
      pola.langkah(i, t, s)
      i++
      t += s
    }
  }, 100)
}

function mainkanRekaman(lagu: Lagu) {
  audio ??= new Audio()
  audio.src = lagu.src!
  audio.volume = keadaan.volume
  audio.onended = () => setLagu(keadaan.lagu + 1)
  return audio.play()
}

function hentikanSemua() {
  if (jadwal) clearInterval(jadwal)
  jadwal = null
  berhenti.forEach((f) => f())
  berhenti = []
  audio?.pause()
}

async function mulai() {
  hentikanSemua()
  const lagu = DAFTAR_LAGU[keadaan.lagu % DAFTAR_LAGU.length]
  try {
    if (lagu.jenis === 'rekaman') await mainkanRekaman(lagu)
    else {
      const c = konteks()
      if (c.state === 'suspended') await c.resume()
      mainkanSintesis(lagu.id)
    }
    keadaan = { ...keadaan, menunggu: false }
  } catch {
    // diblokir peramban sampai pemain mengetuk: coba lagi pada ketukan pertama
    keadaan = { ...keadaan, menunggu: true }
    const sekali = () => {
      window.removeEventListener('pointerdown', sekali)
      if (keadaan.nyala) mulai()
    }
    window.addEventListener('pointerdown', sekali)
  }
  kabari()
}

// ---------------------------------------------------------------- kendali

export function nyalakan(nyala: boolean) {
  keadaan = { ...keadaan, nyala }
  simpan()
  if (nyala) mulai()
  else {
    hentikanSemua()
    ctx?.suspend()
  }
  kabari()
}

export function setLagu(n: number) {
  keadaan = { ...keadaan, lagu: ((n % DAFTAR_LAGU.length) + DAFTAR_LAGU.length) % DAFTAR_LAGU.length }
  simpan()
  if (keadaan.nyala) mulai()
  kabari()
}

export function setVolume(v: number) {
  keadaan = { ...keadaan, volume: Math.min(1, Math.max(0, v)) }
  if (induk && ctx) induk.gain.setTargetAtTime(keadaan.volume * 0.6, ctx.currentTime, 0.05)
  if (audio) audio.volume = keadaan.volume
  simpan()
  kabari()
}

let dimuat = false
function muatSekali() {
  if (dimuat || typeof window === 'undefined') return
  dimuat = true
  try {
    const s = JSON.parse(localStorage.getItem(KUNCI) ?? 'null') as Partial<Keadaan> | null
    if (s) keadaan = { ...keadaan, lagu: Number(s.lagu) || 0, volume: typeof s.volume === 'number' ? s.volume : 0.5, nyala: !!s.nyala }
  } catch {}
  if (keadaan.nyala) mulai()
}

const SERVER: Keadaan = { nyala: false, lagu: 0, volume: 0.5, menunggu: false }
export function useMusik() {
  return useSyncExternalStore(
    (f) => {
      muatSekali()
      pendengar.add(f)
      return () => pendengar.delete(f)
    },
    () => keadaan,
    () => SERVER,
  )
}
