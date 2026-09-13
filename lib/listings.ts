export type UnifiedListing = {
  id: string
  kind: 'gecko' | 'fullsend'
  title: string
  price: number | null
  city: string | null
  state: string | null
  coverUrl: string | null
  images?: string[]
  url: string
  externalUrl?: string | null
  sourceLabel: string
  brand?: string | null
  model?: string | null
  year?: number | null
  mileage?: number | null
  fuel?: string | null
  transmission?: string | null
  features?: string | null
  description?: string | null
  tags?: string[]
  categorySlug?: string | null
  rawCategory?: string | null
  smartText?: string | null
  isFeatured?: boolean
  isVip?: boolean
  aiRebaixado?: boolean | null
  aiRodaGrande?: boolean | null
  aiStance?: boolean | null
  aiStyleScore?: number | null
  aiConfidence?: number | null
  aiReason?: string | null
  aiAnalyzedAt?: string | null
  aiManualRebaixado?: boolean | null
  seller?: { id?: string | null; name?: string | null; avatar_url?: string | null; badge?: string | null } | null
}

export function proxiedImage(url: string | null | undefined) {
  return url ? `/api/image?url=${encodeURIComponent(url)}` : null
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const urls: string[] = []
  for (const item of value) {
    const raw = typeof item === 'string' ? item : (item as any)?.webpUrl || (item as any)?.url || (item as any)?.imageUrl
    if (typeof raw === 'string' && raw.startsWith('http') && !urls.includes(raw)) urls.push(raw)
  }
  return urls.slice(0, 12)
}


function categorySlugFromGecko(category: unknown, importSearchCategory?: unknown): string {
  // A categoria escolhida na importação é a fonte mais confiável para separar
  // Motor/Turbo, Rodas, Suspensão, Som e Acessórios. A categoria genérica da OLX
  // muitas vezes vem apenas como "Peças e acessórios", o que fazia tudo cair
  // em "acessorios" e deixava "Motores & Turbo" vazio.
  const imported = String(importSearchCategory || '').toLowerCase().trim()
  if (imported === 'vehicles') return 'carros'
  if (imported === 'engine_parts' || imported === 'performance') return 'motores'
  if (imported === 'wheels_tires') return 'rodas'
  if (imported === 'suspension') return 'suspensao'
  if (imported === 'audio') return 'som'
  if (imported === 'accessories') return 'acessorios'

  // Fallback para registros antigos que ainda não possuem import_search_category.
  const value = String(category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/carro|van|utilitario|automovel|veiculo/.test(value)) return 'carros'
  if (/motor|turbo|turbina|injecao/.test(value)) return 'motores'
  if (/roda|pneu/.test(value)) return 'rodas'
  if (/suspens/.test(value)) return 'suspensao'
  if (/som|audio/.test(value)) return 'som'
  if (/acessor|peca/.test(value)) return 'acessorios'
  return 'carros'
}

export function fromGecko(x: any): UnifiedListing {
  const rawImages = normalizeImages(x.images)
  const rawCover = x.image_url || rawImages[0] || null
  return {
    id: String(x.id),
    kind: 'gecko',
    title: x.title || 'Veículo',
    price: x.price == null ? null : Number(x.price),
    city: x.city || null,
    state: x.state || null,
    coverUrl: proxiedImage(rawCover),
    images: rawImages.map((u) => proxiedImage(u)!).filter(Boolean),
    url: `/anuncio/parceiro/${x.id}`,
    externalUrl: x.external_url || null,
    sourceLabel: 'ANÚNCIO PARCEIRO',
    brand: x.brand || null,
    model: x.model || null,
    year: x.year == null ? null : Number(x.year),
    mileage: x.mileage == null ? null : Number(x.mileage),
    fuel: x.fuel || null,
    transmission: x.transmission || null,
    features: x.features || null,
    description: x.description || x.raw_data?.description || null,
    tags: ['PARCEIRO'],
    categorySlug: categorySlugFromGecko(x.category, x.import_search_category),
    rawCategory: x.category || null,
    smartText: [
      x.title,
      x.description,
      x.features,
      x.brand,
      x.model,
      x.category,
      (x as any).raw_data ? JSON.stringify((x as any).raw_data) : ''
    ].filter(Boolean).join(' '),
    isFeatured: Boolean(x.is_featured),
    isVip: Boolean(x.is_vip),
    aiRebaixado: x.ai_rebaixado == null ? null : Boolean(x.ai_rebaixado),
    aiRodaGrande: x.ai_roda_grande == null ? null : Boolean(x.ai_roda_grande),
    aiStance: x.ai_stance == null ? null : Boolean(x.ai_stance),
    aiStyleScore: x.ai_style_score == null ? null : Number(x.ai_style_score),
    aiConfidence: x.ai_confidence == null ? null : Number(x.ai_confidence),
    aiReason: x.ai_reason || null,
    aiAnalyzedAt: x.ai_analyzed_at || null,
    aiManualRebaixado: x.ai_manual_rebaixado == null ? null : Boolean(x.ai_manual_rebaixado),
    seller: null,
  }
}

export function fromFullsend(x: any): UnifiedListing {
  const media = Array.isArray(x.media) ? x.media.filter((u:any) => typeof u === 'string') : []
  return {
    id: String(x.id),
    kind: 'fullsend',
    title: x.title || 'Anúncio',
    price: x.price == null ? null : Number(x.price),
    city: x.city || null,
    state: x.state || null,
    coverUrl: x.cover_url || media[0] || null,
    images: [x.cover_url, ...media].filter(Boolean),
    url: `/anuncio/${x.slug}`,
    externalUrl: null,
    sourceLabel: 'FULLSEND',
    tags: Array.isArray(x.tags) ? x.tags : [],
    categorySlug: x.category_slug || null,
    brand: x.brand || null,
    model: x.model || null,
    year: x.year == null ? null : Number(x.year),
    mileage: x.mileage == null ? null : Number(x.mileage),
    fuel: x.fuel || null,
    transmission: x.transmission || null,
    features: x.features || null,
    description: x.description || null,
    rawCategory: x.category_slug || null,
    smartText: [
      x.title,
      x.description,
      Array.isArray(x.tags) ? x.tags.join(' ') : '',
      x.category_slug,
      x.brand,
      x.model,
      x.features,
      Array.isArray(x.vehicle_styles) ? x.vehicle_styles.join(' ') : '',
      x.engine,
      x.color,
      x.body_type
    ].filter(Boolean).join(' '),
    isFeatured: Boolean(x.is_featured),
    isVip: Boolean(x.is_vip),
    seller: x.seller_profile || null,
  }
}
