import { createAdminClient } from '@/lib/supabase/admin'

export type CopilotListing = {
  id: string
  kind: 'gecko' | 'fullsend'
  title: string
  price: number | null
  city: string | null
  state: string | null
  image: string | null
  url: string
  externalUrl?: string | null
  brand?: string | null
  model?: string | null
  year?: number | null
  mileage?: number | null
  fuel?: string | null
  transmission?: string | null
  description?: string | null
  features?: string | null
  category?: string | null
  isFeatured?: boolean
  isVip?: boolean
  aiRebaixado?: boolean | null
  aiRodaGrande?: boolean | null
  aiStance?: boolean | null
}

export type CopilotFilters = {
  query?: string
  city?: string
  state?: string
  maxPrice?: number
  minPrice?: number
  manual?: boolean
  turbo?: boolean
  lowered?: boolean
  old?: boolean
}

function norm(v: unknown) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function priceFromMessage(message: string) {
  const t = norm(message)
  const patterns = [
    /(?:ate|maximo|max|menos de)\s*r?\$?\s*([\d.,]+)\s*(mil|k)?/,
    /r?\$?\s*([\d.,]+)\s*(mil|k)\b/,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (!m) continue
    let n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(n)) continue
    if (m[2] === 'mil' || m[2] === 'k') n *= 1000
    if (n > 1000) return Math.round(n)
  }
  return undefined
}

export function inferFilters(message: string): CopilotFilters {
  const t = norm(message)
  const maxPrice = priceFromMessage(message)
  const manual = /\bmanual\b|\bmanopla\b|\btres pedais\b/.test(t)
  const turbo = /\bturbo\b|\bturbina\b|\bturbinad/.test(t)
  const lowered = /\brebaixad|\bstance\b|\bcarro baixo\b|\bsuspensao a ar\b|\brosca\b/.test(t)
  const old = /\bantigo\b|\bclassico\b|\bquadrado\b|\bvelho\b|\bprojeto raiz\b/.test(t)

  // Estado explícito (SC, SP etc.)
  const stateMatch = message.toUpperCase().match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/)
  const state = stateMatch?.[1]

  // Remove palavras genéricas para formar uma consulta lexical leve.
  const stop = new Set([
    'quero','um','uma','carro','veiculo','pra','para','me','mostra','mostrar','procuro','procurando',
    'ate','mil','reais','r$','com','de','do','da','no','na','e','ou','algo','tipo','mais','menos',
    'bom','legal','projeto','usar','dia','semana','fim','final','cidade','estado'
  ])
  const query = norm(message)
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .filter(x => x.length > 2 && !stop.has(x) && !/^\d+$/.test(x))
    .slice(0, 5)
    .join(' ')

  return {
    query: query || undefined,
    state,
    maxPrice,
    manual,
    turbo,
    lowered,
    old,
  }
}

function scoreListing(x: CopilotListing, filters: CopilotFilters, message: string) {
  let score = 0
  const text = norm([
    x.title,x.brand,x.model,x.description,x.features,x.category,
    x.city,x.state,x.transmission
  ].filter(Boolean).join(' '))

  const words = norm(message).split(/\s+/).filter(w => w.length >= 3)
  for (const word of words) {
    if (text.includes(word)) score += 2
  }

  if (filters.maxPrice != null && x.price != null) {
    const maxPrice = filters.maxPrice
    if (x.price <= maxPrice) score += 12
    else score -= Math.min(16, ((x.price - maxPrice) / maxPrice) * 18)
  }

  if (filters.manual) {
    if (/manual|mecanic/.test(text)) score += 9
    else score -= 3
  }

  if (filters.turbo) {
    if (/turbo|turbina|turbinad|tsi|tfsi|t-jet|turbo\/activeflex/.test(text)) score += 10
    else score -= 3
  }

  if (filters.lowered) {
    if (x.aiRebaixado === true) score += 18
    if (x.aiRodaGrande === true) score += 7
    if (x.aiStance === true) score += 6
    if (/rebaixad|stance|suspensao a ar|suspensao de rosca|coilover/.test(text)) score += 10
  }

  if (filters.old && x.year != null) {
    if (x.year <= 2007) score += 12
    else score -= 4
  }

  if (filters.state && norm(x.state) === norm(filters.state)) score += 7
  if (filters.city && norm(x.city).includes(norm(filters.city))) score += 10

  if (x.isVip) score += 1.5
  if (x.isFeatured) score += 1

  return score
}

export async function getCopilotCandidates(
  message: string,
  filters: CopilotFilters,
): Promise<CopilotListing[]> {
  const admin = createAdminClient()

  const [geckoRes, ownRes] = await Promise.all([
    admin
      .from('gecko_listings')
      .select('id,title,price,city,state,image_url,external_url,brand,model,year,mileage,fuel,transmission,features,category,is_featured,is_vip,ai_rebaixado,ai_roda_grande,ai_stance,raw_data')
      .eq('status', 'active')
      .order('imported_at', { ascending: false })
      .limit(240),

    admin
      .from('listings')
      .select('id,title,price,city,state,cover_url,slug,description,category_slug,tags,is_featured,is_vip,created_at,status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const gecko: CopilotListing[] = (geckoRes.data || []).map((x:any) => ({
    id: `gecko:${x.id}`,
    kind: 'gecko',
    title: x.title || 'Veículo',
    price: x.price == null ? null : Number(x.price),
    city: x.city || null,
    state: x.state || null,
    image: x.image_url ? `/api/image?url=${encodeURIComponent(x.image_url)}` : null,
    url: x.external_url || '#',
    externalUrl: x.external_url || null,
    brand: x.brand || null,
    model: x.model || null,
    year: x.year == null ? null : Number(x.year),
    mileage: x.mileage == null ? null : Number(x.mileage),
    fuel: x.fuel || null,
    transmission: x.transmission || null,
    description: x.raw_data?.description || null,
    features: x.features || null,
    category: x.category || null,
    isFeatured: Boolean(x.is_featured),
    isVip: Boolean(x.is_vip),
    aiRebaixado: x.ai_rebaixado == null ? null : Boolean(x.ai_rebaixado),
    aiRodaGrande: x.ai_roda_grande == null ? null : Boolean(x.ai_roda_grande),
    aiStance: x.ai_stance == null ? null : Boolean(x.ai_stance),
  }))

  const own: CopilotListing[] = (ownRes.data || []).map((x:any) => ({
    id: `fullsend:${x.id}`,
    kind: 'fullsend',
    title: x.title || 'Anúncio FULLSEND',
    price: x.price == null ? null : Number(x.price),
    city: x.city || null,
    state: x.state || null,
    image: x.cover_url || null,
    url: `/anuncio/${x.slug}`,
    description: x.description || null,
    category: x.category_slug || null,
    isFeatured: Boolean(x.is_featured),
    isVip: Boolean(x.is_vip),
  }))

  const all = [...gecko, ...own]

  // Hard filters somente quando são seguros e explícitos.
  let filtered = all
  if (filters.maxPrice != null) {
    const maxPrice = filters.maxPrice
    const within = filtered.filter(x => x.price == null || x.price <= maxPrice * 1.18)
    if (within.length >= 5) filtered = within
  }

  if (filters.state) {
    const inState = filtered.filter(x => norm(x.state) === norm(filters.state))
    if (inState.length >= 4) filtered = inState
  }

  if (filters.old) {
    const old = filtered.filter(x => x.year != null && x.year <= 2007)
    if (old.length >= 4) filtered = old
  }

  if (filters.lowered) {
    const lowered = filtered.filter(x =>
      x.aiRebaixado === true ||
      x.aiStance === true ||
      /rebaixad|stance|suspens[aã]o a ar|rosca|coilover/i.test(
        [x.title,x.description,x.features].filter(Boolean).join(' ')
      )
    )
    if (lowered.length >= 3) filtered = lowered
  }

  return filtered
    .map(x => ({ x, score: scoreListing(x, filters, message) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 22)
    .map(x => x.x)
}
