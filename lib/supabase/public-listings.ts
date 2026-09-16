import { createClient } from '@/lib/supabase/server'
import { proxiedImage, type UnifiedListing } from '@/lib/listings'

export const ITEMS_PER_PAGE = 16

type PublicSearchParams = {
  page: number
  query?: string
  state?: string
  city?: string
  category?: string
  brand?: string
  model?: string
  priceMin?: number
  priceMax?: number
  yearMin?: number
  yearMax?: number
  kmMin?: number
  kmMax?: number
  fuel?: string
  transmission?: string
  style?: string
  sort?: string
  randomSeed?: string
}

type RpcItem = {
  id: string
  kind: 'gecko' | 'fullsend'
  title: string
  price: number | string | null
  city: string | null
  state: string | null
  cover_url: string | null
  slug: string | null
  external_url: string | null
  brand: string | null
  model: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  transmission: string | null
  features?: string | null
  category_slug: string | null
  is_featured: boolean
  is_vip: boolean
  created_at: string | null
  seller?: { id?: string | null; name?: string | null; avatar_url?: string | null; badge?: string | null; xp_points?: number | null; reputation_level?: string | null } | null
}

function toUnified(row: RpcItem): UnifiedListing {
  const gecko = row.kind === 'gecko'
  return {
    id: String(row.id),
    kind: row.kind,
    title: row.title || 'Anúncio',
    price: row.price == null ? null : Number(row.price),
    city: row.city || null,
    state: row.state || null,
    coverUrl: gecko ? proxiedImage(row.cover_url) : row.cover_url,
    // As demais fotos são carregadas somente quando o usuário abre o anúncio.
    images: [],
    url: gecko ? `/anuncio/parceiro/${row.id}` : `/anuncio/${row.slug}`,
    externalUrl: row.external_url || null,
    sourceLabel: gecko ? 'ANÚNCIO PARCEIRO' : 'FULLSEND',
    brand: row.brand || null,
    model: row.model || null,
    year: row.year == null ? null : Number(row.year),
    mileage: row.mileage == null ? null : Number(row.mileage),
    fuel: row.fuel || null,
    transmission: row.transmission || null,
    features: row.features || null,
    categorySlug: row.category_slug || null,
    rawCategory: row.category_slug || null,
    isFeatured: Boolean(row.is_featured),
    isVip: Boolean(row.is_vip),
    seller: row.seller || null,
  }
}

export async function fetchPublicListingsPage(params: PublicSearchParams): Promise<{
  data: UnifiedListing[]
  total: number
  page: number
  pageSize: number
  error: string | null
}> {
  const supabase = await createClient()
  const page = Math.max(1, Math.trunc(params.page || 1))

  const { data, error } = await supabase.rpc('search_public_listings', {
    p_page: page,
    p_page_size: ITEMS_PER_PAGE,
    p_query: params.query || null,
    p_state: params.state || null,
    p_city: params.city || null,
    p_category: params.category || null,
    p_brand: params.brand || null,
    p_model: params.model || null,
    p_price_min: params.priceMin ?? null,
    p_price_max: params.priceMax ?? null,
    p_year_min: params.yearMin ?? null,
    p_year_max: params.yearMax ?? null,
    p_km_min: params.kmMin ?? null,
    p_km_max: params.kmMax ?? null,
    p_fuel: params.fuel || null,
    p_transmission: params.transmission || null,
    p_style: params.style || null,
    p_sort:
      params.sort === 'random' && params.randomSeed
        ? `random:${params.randomSeed}`
        : (params.sort || 'recent'),
  })

  if (error) {
    return { data: [], total: 0, page, pageSize: ITEMS_PER_PAGE, error: error.message }
  }

  const payload = (data || {}) as any
  const items = Array.isArray(payload.items) ? payload.items : []
  return {
    data: items.map((row: RpcItem) => toUnified(row)),
    total: Number(payload.total || 0),
    page: Number(payload.page || page),
    pageSize: Number(payload.page_size || ITEMS_PER_PAGE),
    error: null,
  }
}
