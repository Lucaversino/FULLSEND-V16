export type PartnerDetail = {
  data: any | null
  error: string | null
}

export async function fetchOlxPdp(url: string): Promise<PartnerDetail> {
  const key = process.env.GECKO_API_KEY
  if (!key) return { data: null, error: 'GECKO_API_KEY não configurada.' }

  try {
    const r = await fetch('https://api.geckoapi.com.br/v1/extract', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: 'olx.com.br', type: 'pdp', url }),
    })
    const json = await r.json().catch(() => null)
    if (!r.ok) return { data: null, error: json?.message || json?.error || `GeckoAPI respondeu ${r.status}` }
    return { data: json?.data ?? null, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Falha ao consultar detalhes.' }
  }
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length === 12 || digits.length === 13) return digits.startsWith('55') ? digits : null
  return null
}

export function findPublicPhone(data: any): string | null {
  const priorityKeys = ['whatsapp','phone','telefone','telephone','mobile','cellphone','contactPhone']
  const seen = new Set<any>()

  function walk(v: any, key = '', depth = 0): string | null {
    if (depth > 6 || v == null || seen.has(v)) return null
    if (typeof v === 'string') {
      const lk = key.toLowerCase()
      if (priorityKeys.some(k => lk.includes(k))) return normalizePhone(v)
      return null
    }
    if (typeof v !== 'object') return null
    seen.add(v)
    if (Array.isArray(v)) {
      for (const item of v) { const found = walk(item, key, depth + 1); if (found) return found }
      return null
    }
    const entries = Object.entries(v)
    for (const [k,val] of entries.filter(([k]) => priorityKeys.some(p => k.toLowerCase().includes(p)))) {
      const found = walk(val, k, depth + 1); if (found) return found
    }
    for (const [k,val] of entries) {
      const found = walk(val, k, depth + 1); if (found) return found
    }
    return null
  }
  return walk(data)
}

export function collectImages(row: any, pdp: any): string[] {
  const values: string[] = []
  const add = (u: any) => { if (typeof u === 'string' && u.startsWith('https://') && !values.includes(u)) values.push(u) }
  const scan = (arr: any) => Array.isArray(arr) && arr.forEach((x:any) => add(typeof x === 'string' ? x : x?.url || x?.webpUrl || x?.imageUrl))
  scan(pdp?.images); scan(pdp?.photos); scan(pdp?.media?.images); scan(row?.images)
  add(row?.image_url)
  return values.slice(0, 20)
}

export function attributesFrom(row: any, pdp: any) {
  const attrs = Array.isArray(pdp?.attributes) ? pdp.attributes : Array.isArray(pdp?.properties) ? pdp.properties : []
  const result = attrs.map((a:any) => ({ label: a?.label || a?.name, value: a?.value })).filter((a:any) => a.label && a.value != null)
  const base = [
    ['Marca', row?.brand], ['Modelo', row?.model], ['Ano', row?.year], ['Quilometragem', row?.mileage != null ? `${Number(row.mileage).toLocaleString('pt-BR')} km` : null],
    ['Combustível', row?.fuel], ['Câmbio', row?.transmission], ['Cor', row?.color], ['Motor', row?.engine_power], ['Tipo', row?.vehicle_type],
  ]
  for (const [label,value] of base) if (value != null && !result.some((x:any) => x.label === label)) result.unshift({label,value})
  return result.slice(0, 24)
}
