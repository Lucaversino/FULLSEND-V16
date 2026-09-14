import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SearchBar from '@/components/SearchBar'
import BrandCarousel from '@/components/BrandCarousel'
import StyleBannerButtons from '@/components/StyleBannerButtons'
import FeaturedShowcase from '@/components/FeaturedShowcase'
import StateCitySelect from '@/components/StateCitySelect'
import { fromGecko, fromFullsend, type UnifiedListing } from '@/lib/listings'
import PaginatedListings from '@/components/PaginatedListings'
import ListingLoadError from '@/components/ListingLoadError'
import { fetchPublicListingsPage, ITEMS_PER_PAGE } from '@/lib/supabase/public-listings'
import { Filter, RotateCcw } from 'lucide-react'
import { expirePromotions } from '@/lib/promotion-payments'
import HomeEventsCarousel from '@/components/events/HomeEventsCarousel'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function num(v?: string) {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const PAGE_SIZE = ITEMS_PER_PAGE

function shuffleListings<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pageHref(base:string, p:Record<string,string|undefined>, page:number) {
  const qs = new URLSearchParams()
  Object.entries(p).forEach(([key,value]) => {
    if (key !== 'pagina' && value) qs.set(key, value)
  })
  if (page > 1) qs.set('pagina', String(page))
  const query = qs.toString()
  return query ? `${base}?${query}` : base
}


function styleHref(base:string, p:Record<string,string|undefined>, style:string) {
  const qs = new URLSearchParams()
  Object.entries(p).forEach(([key,value]) => {
    if (key !== 'pagina' && key !== 'estilo' && value) qs.set(key, value)
  })
  if (style) qs.set('estilo', style)
  const query = qs.toString()
  return query ? `${base}?${query}` : base
}

function visiblePages(current:number,total:number) {
  if (total <= 7) return Array.from({length:total},(_,i)=>i+1)
  const pages = new Set<number>([1,total,current-1,current,current+1])
  if (current <= 4) [2,3,4,5].forEach(n=>pages.add(n))
  if (current >= total-3) [total-4,total-3,total-2,total-1].forEach(n=>pages.add(n))
  return [...pages].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b)
}

function FilterFields({ p, base }:{ p:Record<string,string|undefined>, base:string }) {
  return <>
    {p.q ? <input type="hidden" name="q" value={p.q}/> : null}
    {p.categoria ? <input type="hidden" name="categoria" value={p.categoria}/> : null}

    <div className="filter-group filter-style-visual">
      <label>Estilo</label>
      <StyleBannerButtons params={p} base="/" compact />
    </div>
    <StateCitySelect defaultState={p.estado || ''} defaultCity={p.cidade || ''} />

    <div className="filter-group">
      <label>Marca</label>
      <input name="marca" defaultValue={p.marca || ''} placeholder="Ex.: Volkswagen"/>
    </div>

    <div className="filter-group">
      <label>Modelo</label>
      <input name="modelo" defaultValue={p.modelo || ''} placeholder="Ex.: Golf GTI"/>
    </div>

    <div className="filter-group">
      <label>Preço</label>
      <div className="filter-range">
        <input type="number" min="0" step="1000" name="precoMin" defaultValue={p.precoMin || ''} placeholder="Mínimo"/>
        <input type="number" min="0" step="1000" name="precoMax" defaultValue={p.precoMax || ''} placeholder="Máximo"/>
      </div>
    </div>

    <div className="filter-group">
      <label>Ano</label>
      <div className="filter-range">
        <input type="number" min="1950" max="2100" name="anoMin" defaultValue={p.anoMin || ''} placeholder="De"/>
        <input type="number" min="1950" max="2100" name="anoMax" defaultValue={p.anoMax || ''} placeholder="Até"/>
      </div>
    </div>

    <div className="filter-group">
      <label>Quilometragem</label>
      <div className="filter-range">
        <input type="number" min="0" step="1000" name="kmMin" defaultValue={p.kmMin || ''} placeholder="Km mín."/>
        <input type="number" min="0" step="1000" name="kmMax" defaultValue={p.kmMax || ''} placeholder="Km máx."/>
      </div>
    </div>

    <div className="filter-group">
      <label>Combustível</label>
      <select name="combustivel" defaultValue={p.combustivel || ''}>
        <option value="">Todos</option>
        <option value="Gasolina">Gasolina</option>
        <option value="Álcool">Álcool</option>
        <option value="Flex">Flex</option>
        <option value="Diesel">Diesel</option>
        <option value="Elétrico">Elétrico</option>
        <option value="Híbrido">Híbrido</option>
      </select>
    </div>

    <div className="filter-group">
      <label>Câmbio</label>
      <select name="cambio" defaultValue={p.cambio || ''}>
        <option value="">Todos</option>
        <option value="Manual">Manual</option>
        <option value="Automático">Automático</option>
        <option value="Automatizado">Automatizado</option>
        <option value="CVT">CVT</option>
      </select>
    </div>

    <div className="filter-group">
      <label>Ordenar por</label>
      <select name="ordem" defaultValue={p.ordem || 'random'}>
        <option value="recent">Mais recentes</option>
        <option value="random">Aleatório</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
        <option value="year-desc">Ano mais novo</option>
        <option value="km-asc">Menor km</option>
      </select>
    </div>

    <button className="btn btn-red filter-apply fs-hero-action" type="submit"><Filter size={15}/> APLICAR FILTROS</button>
    <Link href="/" className="filter-clear"><RotateCcw size={14}/> LIMPAR FILTROS</Link>
  </>
}

function FilterSidebar({ p }:{ p:Record<string,string|undefined> }) {
  return <aside className="filters-sidebar">
    <Link href="/eventos" className="filters-events-button" aria-label="Abrir agenda de eventos automotivos">
      <img src="/fullsend-eventos-button.png" alt="Eventos automotivos FULLSEND"/>
    </Link>
    <div className="filters-card desktop-filters">
      <div className="filters-title"><Filter size={17}/><div><strong>FILTROS</strong><span>Refine sua busca</span></div></div>
      <form method="GET" action="/"><FilterFields p={p} base="/"/></form>
    </div>
    <details className="mobile-filters">
      <summary><Filter size={16}/> FILTROS AVANÇADOS</summary>
      <form method="GET" action="/"><FilterFields p={p} base="/"/></form>
    </details>
  </aside>
}

function normalizedSearchText(item: UnifiedListing) {
  return [
    item.title,
    item.brand,
    item.model,
    item.features,
    item.description,
    item.rawCategory,
    item.smartText,
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}


function loweredStyleScore(item: UnifiedListing) {
  const text = normalizedSearchText(item)
  let score = 0

  const explicitLow =
    /\brebaixad[oa]s?\b|\brebaixamento\b|\bcarro baixo\b|\bbaixinho\b|\bsocado\b|\bno chao\b|\bchora boy\b|\bstance\b|\bstatic\b/.test(text)

  const suspensionPrepared =
    /\bsuspens[aã]o (a ar|de ar|rosca|fixa|regulavel|preparada|esportiva)\b|\bair ?ride\b|\bcoilover\b|\bkit (rosca|fixa)\b|\baltura regulavel\b|\bregulagem de altura\b|\bmolas? esportiv/.test(text)

  const wheelMatches = [
    ...text.matchAll(/\baro[\s\-:]*(1[6-9]|2[0-4])\b/g),
    ...text.matchAll(/\b(1[7-9]|2[0-4])\s*(?:pol|polegadas)\b/g),
  ].map((m) => Number(m[1]))

  const maxWheel = wheelMatches.length ? Math.max(...wheelMatches) : 0
  const largeWheel = maxWheel >= 17
  const veryLargeWheel = maxWheel >= 18

  const wheelLanguage =
    /\brodas?\b|\bliga leve\b|\btala\s*(?:7|8|9|10)\b|\bperfil baixo\b|\bpneus? baixos?\b|\bdiamantad[ao]\b/.test(text)

  const fitment =
    /\bcambagem\b|\bcamber\b|\bfitment\b|\boffset\b|\bparalama\b|\bcaixa de roda\b/.test(text)

  const likelySuvOrPickup =
    /\bsuv\b|\bpick[\s-]?up\b|\bcaminhonete\b|\bx1\b|\bx3\b|\bx5\b|\bcompass\b|\brenegade\b|\btracker\b|\bcreta\b|\btoro\b|\bhilux\b|\branger\b|\bs10\b|\bf-?250\b/.test(text)

  const original =
    /\b100% original\b|\boriginal de fabrica\b|\bsuspens[aã]o original\b|\bsem modificacoes\b|\bsem modificacao\b/.test(text)

  if (explicitLow) score += 12
  if (suspensionPrepared) score += 8
  if (largeWheel) score += 3
  if (veryLargeWheel) score += 2
  if (wheelLanguage) score += 1
  if (largeWheel && wheelLanguage) score += 3
  if (fitment) score += 3
  if (largeWheel && suspensionPrepared) score += 5
  if (explicitLow && largeWheel) score += 3

  if (likelySuvOrPickup && !explicitLow && !suspensionPrepared) score -= 5
  if (original && !explicitLow && !suspensionPrepared) score -= 8

  return score
}

function isStrongLoweredCandidate(item: UnifiedListing) {
  // Controle manual do ADM sempre vence.
  if (item.aiManualRebaixado === true) return true
  if (item.aiManualRebaixado === false) return false

  // Depois que a IA analisou, usamos a decisão da IA.
  if (item.aiAnalyzedAt) return item.aiRebaixado === true

  const text = normalizedSearchText(item)
  const score = loweredStyleScore(item)

  if (/\brebaixad[oa]s?\b|\brebaixamento\b|\bcarro baixo\b|\bstance\b|\bsocado\b/.test(text)) return true
  if (/suspens[aã]o (a ar|de ar|rosca|fixa|regulavel|preparada)|coilover|air ?ride/.test(text)) return true

  // Roda grande + linguagem de preparação.
  if (score >= 7) return true

  return false
}

function isProbableLoweredCandidate(item: UnifiedListing) {
  if (item.aiManualRebaixado === true) return true
  if (item.aiManualRebaixado === false) return false
  if (item.aiAnalyzedAt) return item.aiRebaixado === true

  const text = normalizedSearchText(item)
  const score = loweredStyleScore(item)

  // Não enche o filtro com SUV/picape original só por ter roda de liga.
  if (/\bsuv\b|\bpick[\s-]?up\b|\bcaminhonete\b|\bx1\b|\bx3\b|\bx5\b|\bcompass\b|\brenegade\b|\btracker\b|\bcreta\b|\btoro\b|\bhilux\b|\branger\b|\bs10\b|\bf-?250\b/.test(text) && score < 7) {
    return false
  }

  return score >= 3
}

function applyStyleFilter(data: UnifiedListing[], style?: string) {
  if (!style) return data

  if (style === 'antigos') {
    return data.filter((item) => typeof item.year === 'number' && item.year < 2008)
  }

  if (style === 'turbo') {
    return data.filter((item) => {
      const text = normalizedSearchText(item)
      return /\bturbo\b|turbina|turbinado|turbinada/.test(text)
    })
  }

  if (style === 'rebaixado') {
    const ranked = data
      .map((item) => ({ item, score: (item.aiManualRebaixado === true ? 1000 : item.aiRebaixado === true ? 900 : 0) + loweredStyleScore(item) }))
      .sort((a, b) => b.score - a.score)

    const strong = ranked.filter((x) => isStrongLoweredCandidate(x.item)).map((x) => x.item)

    // Se a base tiver poucos anúncios descritos explicitamente como rebaixados,
    // completa com candidatos prováveis: rodas grandes + preparação/fitment.
    if (strong.length >= 9) return strong

    const seen = new Set(strong.map((x) => `${x.kind}-${x.id}`))
    const probable = ranked
      .filter((x) => !seen.has(`${x.item.kind}-${x.item.id}`) && isProbableLoweredCandidate(x.item))
      .map((x) => x.item)

    return [...strong, ...probable].slice(0, 90)
  }

  return data
}

export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  await expirePromotions()
  const p = await searchParams
  const authClient = await createClient()

  const q = p.q?.replace(/[,%()]/g, ' ').trim()
  const city = p.cidade?.trim()
  const state = p.estado?.trim().toUpperCase()
  const priceMin = num(p.precoMin)
  const priceMax = num(p.precoMax)
  const requestedPage = Math.max(1, Math.trunc(num(p.page || p.pagina) || 1))

  // A página inicial usa ordem aleatória por padrão.
  // Sem seed na URL, cada novo carregamento recebe uma seed diferente.
  // Ao navegar pelas páginas, a mesma seed é preservada para evitar
  // repetição/troca de anúncios durante a paginação.
  const effectiveSort = p.ordem || 'random'
  const randomSeed = p.seed?.trim() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`

  let result = await fetchPublicListingsPage({
    page: requestedPage,
    query: q,
    city,
    state,
    category: p.categoria,
    brand: p.marca,
    model: p.modelo,
    yearMin: num(p.anoMin),
    yearMax: num(p.anoMax),
    kmMin: num(p.kmMin),
    kmMax: num(p.kmMax),
    priceMin,
    priceMax,
    fuel: p.combustivel,
    transmission: p.cambio,
    style: p.estilo,
    sort: effectiveSort,
    randomSeed: effectiveSort === 'random' ? randomSeed : undefined,
  })

  let totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
  let currentPage = Math.min(requestedPage, totalPages)

  // URL antiga ou compartilhada apontando para uma página além do total:
  // busca somente a última página válida, sem carregar todos os anúncios.
  if (!result.error && result.total > 0 && requestedPage > totalPages) {
    result = await fetchPublicListingsPage({
      page: totalPages,
      query: q,
      city,
      state,
      category: p.categoria,
      brand: p.marca,
      model: p.modelo,
      yearMin: num(p.anoMin),
      yearMax: num(p.anoMax),
      kmMin: num(p.kmMin),
      kmMax: num(p.kmMax),
      priceMin,
      priceMax,
      fuel: p.combustivel,
      transmission: p.cambio,
      style: p.estilo,
      sort: p.ordem || 'recent',
    })
    currentPage = totalPages
  }

  // O carrossel de Destaques/VIP é uma coleção pequena e independente da paginação
  // principal. Mantemos a regra atual, com limite de segurança no banco.
  let promotedOwnQuery = authClient
    .from('listings')
    .select('id,user_id,category_slug,title,slug,description,price,city,state,cover_url,media,tags,status,source,external_url,is_featured,is_vip,brand,model,year,mileage,fuel,transmission,vehicle_styles,features,engine,color,body_type,created_at')
    .eq('status','active')
    .or('is_featured.eq.true,is_vip.eq.true')

  let promotedGeckoQuery = authClient
    .from('gecko_listings')
    .select('id,title,price,city,state,image_url,images,external_url,brand,model,year,mileage,fuel,transmission,features,category,category_id,import_search_category,status,listed_at,imported_at,is_featured,is_vip,raw_data,ai_rebaixado,ai_roda_grande,ai_stance,ai_style_score,ai_confidence,ai_reason,ai_tags,ai_analyzed_at,ai_manual_rebaixado')
    .eq('status','active')
    .or('is_featured.eq.true,is_vip.eq.true')

  if(city) {
    promotedOwnQuery = promotedOwnQuery.ilike('city', `%${city}%`)
    promotedGeckoQuery = promotedGeckoQuery.ilike('city', `%${city}%`)
  }
  if(state) {
    promotedOwnQuery = promotedOwnQuery.eq('state', state)
    promotedGeckoQuery = promotedGeckoQuery.eq('state', state)
  }
  if (p.categoria) promotedOwnQuery = promotedOwnQuery.eq('category_slug', p.categoria)
  if(p.marca) promotedGeckoQuery = promotedGeckoQuery.ilike('brand', `%${p.marca}%`)

  const [promotedOwnRes,promotedGeckoRes] = await Promise.all([
    promotedOwnQuery.order('created_at',{ascending:false}).limit(60),
    promotedGeckoQuery.order('imported_at',{ascending:false}).limit(60),
  ])

  const promotedOwnRows = promotedOwnRes.data || []
  const promotedSellerIds = Array.from(new Set(promotedOwnRows.map((x:any)=>x.user_id).filter(Boolean)))
  const promotedSellerRes = promotedSellerIds.length
    ? await authClient.from('profiles').select('id,name,avatar_url,badge,xp_points,reputation_level').in('id',promotedSellerIds)
    : { data: [] as any[] }
  const promotedSellerMap = new Map((promotedSellerRes.data||[]).map((x:any)=>[x.id,x]))

  const promotedListings:UnifiedListing[] = shuffleListings([
    ...(promotedGeckoRes.data||[]).map(fromGecko),
    ...(p.marca ? [] : promotedOwnRows.map((x:any)=>fromFullsend({...x,seller_profile:promotedSellerMap.get(x.user_id)||null}))),
  ].filter((item) => !p.categoria || item.categorySlug === p.categoria))

  const today=new Date().toISOString().slice(0,10)
  const {data:homeEventsData}=await authClient
    .from('events')
    .select('id,slug,title,category,event_date,city,state,image_url,featured')
    .eq('status','published')
    .gte('event_date',today)
    .order('featured',{ascending:false})
    .order('event_date',{ascending:true})
    .limit(18)
  const homeEvents=(homeEventsData||[]) as any[]

  const hasFilters = Boolean(
    p.q || p.estilo || p.estado || p.cidade || p.categoria || p.marca || p.modelo ||
    p.precoMin || p.precoMax || p.anoMin || p.anoMax || p.kmMin || p.kmMax ||
    p.combustivel || p.cambio
  )

  return <main className="section explore-page home-market-page">
    <div className="container">
      <SearchBar target="/" initialQuery={p.q || ''} initialCategory={p.categoria || ''} initialState={p.estado || ''} initialCity={p.cidade || ''}/>
      <BrandCarousel />
      <FeaturedShowcase items={promotedListings}/>
      <HomeEventsCarousel events={homeEvents} compact title="PRÓXIMOS EVENTOS"/>

      <div className="explore-layout">
        <FilterSidebar p={p}/>
        <section id="resultados" className="explore-results">
          <div className="results-toolbar">
            <div className="result-count"><strong>{result.total.toLocaleString('pt-BR')}</strong> resultados <span>• página {currentPage} de {totalPages}</span></div>
            {hasFilters ? <span className="filters-active">FILTROS ATIVOS</span> : null}
          </div>

          {result.error ? <ListingLoadError message={result.error}/> : result.total ? (
            <PaginatedListings
              items={result.data}
              total={result.total}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={PAGE_SIZE}
              randomSeed={effectiveSort === 'random' ? randomSeed : undefined}
            />
          ) : <div className="empty-state"><h3>Nenhum anúncio encontrado.</h3><p>Ajuste ou limpe os filtros para ampliar a busca.</p></div>}
        </section>
      </div>

      <HomeEventsCarousel events={homeEvents} title="AGENDA AUTOMOTIVA FULLSEND"/>
    </div>
  </main>
}
