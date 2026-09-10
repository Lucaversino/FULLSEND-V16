import { NextRequest, NextResponse } from 'next/server'
import { fetchOlxPdp, findPublicPhone } from '@/lib/gecko-pdp'

export const dynamic = 'force-dynamic'

async function getRow(id: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!base || !key) return null
  const url = `${base}/rest/v1/gecko_listings?id=eq.${encodeURIComponent(id)}&select=id,external_url,raw_data`
  const r = await fetch(url, {
    cache: 'no-store',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!r.ok) return null
  const rows = await r.json().catch(() => [])
  return rows?.[0] || null
}

function cleanDescription(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function pickDescription(data: any, row: any): string | null {
  const direct = [
    data?.description,
    data?.body,
    data?.adDescription,
    data?.text,
    data?.content,
    data?.details?.description,
    data?.ad?.description,
    data?.listing?.description,
    data?.page?.description,
    row?.raw_data?.description,
    row?.raw_data?.body,
    row?.raw_data?.adDescription,
  ]

  for (const value of direct) {
    if (typeof value === 'string' && value.trim().length >= 20) {
      return cleanDescription(value).slice(0, 6000)
    }
  }

  // Gecko pode mudar a estrutura do PDP. Faz uma busca controlada por chaves
  // com nome de descrição, sem depender de um formato único da resposta.
  const seen = new Set<any>()
  const priority = ['description', 'descricao', 'descrição', 'adDescription', 'body', 'content', 'text']

  function walk(value: any, key = '', depth = 0): string | null {
    if (value == null || depth > 7) return null
    if (typeof value === 'string') {
      const normalizedKey = key.toLowerCase()
      const looksLikeDescription = priority.some((p) => normalizedKey.includes(p.toLowerCase()))
      if (looksLikeDescription && value.trim().length >= 20) return cleanDescription(value).slice(0, 6000)
      return null
    }
    if (typeof value !== 'object' || seen.has(value)) return null
    seen.add(value)
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item, key, depth + 1)
        if (found) return found
      }
      return null
    }

    const entries = Object.entries(value)
    for (const [k, v] of entries.filter(([k]) => priority.some((p) => k.toLowerCase().includes(p.toLowerCase())))) {
      const found = walk(v, k, depth + 1)
      if (found) return found
    }
    for (const [k, v] of entries) {
      const found = walk(v, k, depth + 1)
      if (found) return found
    }
    return null
  }

  return walk(data) || walk(row?.raw_data)
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const row = await getRow(id)
  if (!row) return NextResponse.json({ description: null, phone: null }, { status: 404 })

  const pdp = row.external_url ? await fetchOlxPdp(row.external_url) : { data: null, error: null }
  const description = pickDescription(pdp.data, row)
  const phone = findPublicPhone(pdp.data)

  return NextResponse.json(
    { description, phone, detailAvailable: Boolean(description || phone), upstreamError: pdp.error || null },
    { headers: { 'Cache-Control': 'private, max-age=300' } }
  )
}
