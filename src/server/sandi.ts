// scrypt dari stdlib, tanpa dependensi. Format sama dengan CEVE-IN: s1$<garam b64>$<kunci b64>.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const turunkan = (sandi: string, garam: Buffer) =>
  new Promise<Buffer>((res, rej) => scrypt(sandi, garam, 64, (e, k) => (e ? rej(e) : res(k))))

export async function hashSandi(sandi: string): Promise<string> {
  const garam = randomBytes(16)
  return `s1$${garam.toString('base64')}$${(await turunkan(sandi, garam)).toString('base64')}`
}

export async function cocokSandi(sandi: string, tersimpan: string | null): Promise<boolean> {
  const [v, garam, kunci] = (tersimpan ?? '').split('$')
  if (v !== 's1' || !garam || !kunci) return false
  const harus = Buffer.from(kunci, 'base64')
  const dapat = await turunkan(sandi, Buffer.from(garam, 'base64'))
  return harus.length === dapat.length && timingSafeEqual(harus, dapat)
}

export const sha256 = (teks: string) => createHash('sha256').update(teks).digest('hex')
export const tokenAcak = () => randomBytes(32).toString('base64url')
