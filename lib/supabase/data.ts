export type GeckoListingRow = {
  id: string
  title: string
  price: number | null
  city: string | null
  state: string | null
  image_url: string | null
  images: unknown
  external_url: string
  brand: string | null
  model: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  transmission: string | null
  features?: string | null
  category?: string | null
  category_id?: number | null
  status: string
  listed_at: string | null
  imported_at: string | null
  is_featured?: boolean
  is_vip?: boolean
  raw_data?: unknown
  ai_rebaixado?: boolean | null
  ai_roda_grande?: boolean | null
  ai_stance?: boolean | null
  ai_style_score?: number | null
  ai_confidence?: number | null
  ai_reason?: string | null
  ai_tags?: unknown
  ai_analyzed_at?: string | null
  ai_manual_rebaixado?: boolean | null
}

const SELECT_FIELDS = [
  'id','title','price','city','state','image_url','images','external_url',
  'brand','model','year','mileage','fuel','transmission','features','category','category_id',
  'status','listed_at','imported_at','is_featured','is_vip','raw_data','ai_rebaixado','ai_roda_grande','ai_stance','ai_style_score','ai_confidence','ai_reason','ai_tags','ai_analyzed_at','ai_manual_rebaixado'
].join(',')

type GeckoFilters = {
  limit?: number
  offset?: number
  query?: string
  city?: string
  state?: string
  brand?: string
  model?: string
  yearMin?: number
  yearMax?: number
  kmMin?: number
  kmMax?: number
  priceMin?: number
  priceMax?: number
  fuel?: string
  transmission?: string
  sort?: string
  aiLowered?: boolean
}

function cleanText(value?: string) {
  return value?.replace(/[,%()]/g, ' ').trim() || ''
}


/**
 * Para REBAIXADOS carregamos uma base ampla de anúncios ativos.
 * Isso evita o erro antigo em que o filtro pesquisava só palavras no título
 * e podia retornar zero mesmo quando a descrição/raw_data tinha os sinais.
 */
export async function fetchLoweredStyleCandidates(
  base?: Omit<GeckoFilters, 'query' | 'limit' | 'offset'>
): Promise<{ data: GeckoListingRow[]; error: string | null }> {
  // 1) Prioridade absoluta: classificados pela IA ou forçados manualmente pelo ADM.
  const aiPositive = await fetchGeckoListings({
    ...(base || {}),
    limit: 200,
    aiLowered: true,
  })

  // 2) Fallback: base ampla para anúncios ainda não analisados.
  const offsets = [0, 200, 400, 600, 800]
  const batches = await Promise.all(
    offsets.map((offset) =>
      fetchGeckoListings({
        ...(base || {}),
        limit: 200,
        offset,
      })
    )
  )

  const map = new Map<string, GeckoListingRow>()
  for (const row of aiPositive.data) map.set(row.id, row)
  for (const batch of batches) {
    for (const row of batch.data) map.set(row.id, row)
  }

  const rows = [...map.values()]
  const errors = [aiPositive.error, ...batches.map((x) => x.error)].filter(Boolean) as string[]
  return { data: rows, error: rows.length ? null : (errors[0] || null) }
}

/**
 * Read imported marketplace listings through Supabase PostgREST using the
 * public anon key. gecko_listings has a public SELECT policy for active rows.
 */
export async function fetchGeckoListings(options?: GeckoFilters): Promise<{ data: GeckoListingRow[]; error: string | null }> {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const fallbackUrl = 'https://tadpnssnuyfcqodnntaq.supabase.co'
  const url = rawUrl && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(rawUrl)
    ? rawUrl.replace(/\/$/, '')
    : fallbackUrl

  if (!anon) {
    return { data: [], error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada na Vercel.' }
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 100, 1000))
  const initialOffset = Number.isFinite(options?.offset) && Number(options?.offset) > 0
    ? Math.max(0, Math.trunc(Number(options?.offset)))
    : 0
  const params = new URLSearchParams()
  params.set('select', SELECT_FIELDS)
  params.set('status', 'eq.active')

  const q = cleanText(options?.query)
  if (q) params.set('or', `(title.ilike.*${q}*,brand.ilike.*${q}*,model.ilike.*${q}*,features.ilike.*${q}*)`)

  const city = cleanText(options?.city)
  const state = cleanText(options?.state).toUpperCase()
  const brand = cleanText(options?.brand)
  const model = cleanText(options?.model)
  const fuel = cleanText(options?.fuel)
  const transmission = cleanText(options?.transmission)

  if (city) params.set('city', `ilike.*${city}*`)
  if (state) params.set('state', `eq.${state}`)
  if (brand) params.set('brand', `ilike.*${brand}*`)
  if (model) params.set('model', `ilike.*${model}*`)
  if (fuel) params.set('fuel', `ilike.*${fuel}*`)
  if (transmission) params.set('transmission', `ilike.*${transmission}*`)

  if (options?.aiLowered) {
    params.set('or', '(ai_manual_rebaixado.eq.true,and(ai_manual_rebaixado.is.null,ai_rebaixado.eq.true))')
  }

  if (Number.isFinite(options?.yearMin)) params.set('year', `gte.${options!.yearMin}`)
  if (Number.isFinite(options?.yearMax)) params.append('year', `lte.${options!.yearMax}`)
  if (Number.isFinite(options?.kmMin)) params.set('mileage', `gte.${options!.kmMin}`)
  if (Number.isFinite(options?.kmMax)) params.append('mileage', `lte.${options!.kmMax}`)
  if (Number.isFinite(options?.priceMin)) params.set('price', `gte.${options!.priceMin}`)
  if (Number.isFinite(options?.priceMax)) params.append('price', `lte.${options!.priceMax}`)

  const sortMap: Record<string,string> = {
    'price-asc': 'price.asc.nullslast',
    'price-desc': 'price.desc.nullslast',
    'year-desc': 'year.desc.nullslast',
    'km-asc': 'mileage.asc.nullslast',
    'recent': 'imported_at.desc.nullslast',
  }
  params.set('order', sortMap[options?.sort || 'recent'] || sortMap.recent)

  try {
    // O projeto Supabase está limitando cada resposta pública a cerca de 200 linhas.
    // Por isso pedir limit=1000 em uma única chamada ainda retornava apenas 200
    // anúncios importados (e, somando 1 anúncio FULLSEND, a home mostrava 201).
    // Fazemos paginação em lotes de 200 e unimos os resultados aqui.
    const PAGE_SIZE = 200
    const rows: GeckoListingRow[] = []

    while (rows.length < limit) {
      const remaining = limit - rows.length
      const pageLimit = Math.min(PAGE_SIZE, remaining)
      const pageParams = new URLSearchParams(params)
      pageParams.set('limit', String(pageLimit))
      pageParams.set('offset', String(initialOffset + rows.length))

      const endpoint = `${url}/rest/v1/gecko_listings?${pageParams.toString()}`
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      const text = await response.text()
      if (!response.ok) {
        let detail = text
        try {
          const parsed = JSON.parse(text)
          detail = parsed?.message || parsed?.hint || parsed?.details || text
        } catch {}
        console.error('FULLSEND gecko_listings read failed:', response.status, detail)
        return { data: rows, error: rows.length ? null : `Supabase respondeu ${response.status}: ${detail}` }
      }

      const parsed = JSON.parse(text)
      const pageRows: GeckoListingRow[] = Array.isArray(parsed) ? parsed : []
      rows.push(...pageRows)

      if (pageRows.length < pageLimit) break
    }

    return { data: rows.slice(0, limit), error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('FULLSEND gecko_listings request failed:', { message, url })
    return { data: [], error: `Falha de conexão com Supabase (${url}): ${message}` }
  }
}
