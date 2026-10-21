// Langganan pengingat web push untuk perangkat ini.
import { Galat } from '@/server/galat'
import { bacaJson, galatKeJawaban, jawab, wargaId } from '@/server/http'
import { hapusLangganan, kunciVapid, periksaLangganan, simpanLangganan } from '@/server/push'
import { sql } from '@/server/sql'

export async function GET() {
  return jawab({ publik: kunciVapid()?.publik ?? null })
}

/** { langganan } mendaftarkan perangkat; { hapus: endpoint } berhenti. */
export async function POST(req: Request) {
  try {
    const b = await bacaJson(req)
    const id = await wargaId()
    if (typeof b.hapus === 'string') await hapusLangganan(sql, id, b.hapus)
    else {
      if (!kunciVapid()) throw new Galat('vapid_kosong', 'Pengingat belum disiapkan di server ini.', 503)
      await simpanLangganan(sql, id, periksaLangganan(b.langganan))
    }
    return jawab({ ok: true })
  } catch (e) {
    return galatKeJawaban(e)
  }
}
