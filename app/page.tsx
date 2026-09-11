import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchGeckoListings, fetchLoweredStyleCandidates } from '@/lib/supabase/data'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import BrandCarousel from '@/components/BrandCarousel'
import StyleBannerButtons from '@/components/StyleBannerButtons'
import FeaturedShowcase from '@/components/FeaturedShowcase'
import StateCitySelect from '@/components/StateCitySelect'
import { fromGecko, fromFullsend, type UnifiedListing } from '@/lib/listings'
import { Filter, RotateCcw } from 'lucide-react'
import { expirePromotions } from '@/lib/promotion-payments'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function num(v?: string) {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const PAGE_SIZE = 9

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
        <option value="random">Aleatório</option>
        <option value="recent">Mais recentes</option>
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

  let own = authClient
    .from('listings')
    .select('*')
    .eq('status','active')
    .order('created_at',{ascending:false})
    .limit(1000)

  if(q) own = own.or(`title.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%`)
  if(p.categoria) own = own.eq('category_slug',p.categoria)
  if(city) own = own.ilike('city',`%${city}%`)
  if(state) own = own.eq('state',state)
  if(priceMin !== undefined) own = own.gte('price',priceMin)
  if(priceMax !== undefined) own = own.lte('price',priceMax)

  let promotedOwnQuery = authClient
    .from('listings')
    .select('*')
    .eq('status','active')
    .or('is_featured.eq.true,is_vip.eq.true')

  let promotedGeckoQuery = authClient
    .from('gecko_listings')
    .select('*')
    .eq('status','active')
    .or('is_featured.eq.true,is_vip.eq.true')

  // Quando o usuário escolhe localização, até o carrossel de destaque respeita.
  if(city) {
    promotedOwnQuery = promotedOwnQuery.ilike('city', `%${city}%`)
    promotedGeckoQuery = promotedGeckoQuery.ilike('city', `%${city}%`)
  }
  if(state) {
    promotedOwnQuery = promotedOwnQuery.eq('state', state)
    promotedGeckoQuery = promotedGeckoQuery.eq('state', state)
  }
  if (p.categoria) {
    promotedOwnQuery = promotedOwnQuery.eq('category_slug', p.categoria)
  }

  // Marca é estruturada nos anúncios Gecko. Nos anúncios FULLSEND antigos não há
  // campo de marca confiável, então ao filtrar marca mostramos somente os que
  // conseguimos validar corretamente.
  if(p.marca) {
    promotedGeckoQuery = promotedGeckoQuery.ilike('brand', `%${p.marca}%`)
  }

  const [geckoRes, ownRes, promotedOwnRes, promotedGeckoRes] = await Promise.all([
    p.estilo === 'rebaixado'
      ? fetchLoweredStyleCandidates({
          city,
          state,
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
          sort: p.ordem,
        })
      : fetchGeckoListings({
          limit: 1000,
          query: q,
          city,
          state,
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
          sort: p.ordem,
        }),
    own,
    promotedOwnQuery.order('created_at',{ascending:false}).limit(1000),
    promotedGeckoQuery.order('imported_at',{ascending:false}).limit(1000),
  ])

  const ownRows = ownRes.data || []
  const sellerIds = Array.from(new Set(ownRows.map((x:any)=>x.user_id).filter(Boolean)))
  const sellerRes = sellerIds.length
    ? await authClient.from('profiles').select('id,name,avatar_url,badge').in('id',sellerIds)
    : { data: [] as any[] }
  const sellerMap = new Map((sellerRes.data||[]).map((x:any)=>[x.id,x]))

  let data:UnifiedListing[] = [
    ...geckoRes.data.map(fromGecko),
    ...ownRows.map((x:any)=>fromFullsend({...x,seller_profile:sellerMap.get(x.user_id)||null})),
  ]

  // O painel pode marcar quantos anúncios quiser como Destaque/VIP.
  // A home busca essa coleção separadamente dos resultados normais e o
  // carrossel escolhe 10 aleatórios a cada abertura/atualização.
  const promotedOwnRows = promotedOwnRes.data || []
  const promotedSellerIds = Array.from(new Set(promotedOwnRows.map((x:any)=>x.user_id).filter(Boolean)))
  const promotedSellerRes = promotedSellerIds.length
    ? await authClient.from('profiles').select('id,name,avatar_url,badge').in('id',promotedSellerIds)
    : { data: [] as any[] }
  const promotedSellerMap = new Map((promotedSellerRes.data||[]).map((x:any)=>[x.id,x]))

  const promotedListings:UnifiedListing[] = shuffleListings([
    ...(promotedGeckoRes.data||[]).map(fromGecko),
    ...(p.marca ? [] : promotedOwnRows.map((x:any)=>fromFullsend({...x,seller_profile:promotedSellerMap.get(x.user_id)||null}))),
  ].filter((item) => !p.categoria || item.categorySlug === p.categoria))

  // Na busca inteligente de rebaixados, respeita também o texto principal.
  if (p.estilo === 'rebaixado' && q) {
    const qn = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    data = data.filter((item) => normalizedSearchText(item).includes(qn))
  }

  // Categoria precisa valer para TODAS as origens. Os anúncios importados da
  // Gecko trazem a categoria da OLX; os anúncios FULLSEND usam category_slug.
  // Assim, ao selecionar "Carros", nenhum anúncio de outra categoria entra.
  if (p.categoria) {
    data = data.filter((item) => item.categorySlug === p.categoria)
  }

  // Filtro especial do FULLSEND: Turbo, Rebaixado e Antigos.
  // "Antigos" segue a regra pedida: carros com ano abaixo de 2008 (até 2007).
  data = applyStyleFilter(data, p.estilo)

  // Native FULLSEND ads do not yet have structured vehicle fields in the old schema.
  // When advanced vehicle filters are active, keep results precise by excluding rows
  // that cannot be evaluated reliably.
  const advancedVehicleFilter = Boolean(p.marca || p.modelo || p.anoMin || p.anoMax || p.kmMin || p.kmMax || p.combustivel || p.cambio)
  if (advancedVehicleFilter) data = data.filter(x => x.kind === 'gecko')

  const sort = p.ordem || 'random'
  if (sort === 'random') data = shuffleListings(data)
  if (sort === 'price-asc') data.sort((a,b)=>(a.price ?? Number.MAX_SAFE_INTEGER)-(b.price ?? Number.MAX_SAFE_INTEGER))
  if (sort === 'price-desc') data.sort((a,b)=>(b.price ?? -1)-(a.price ?? -1))
  if (sort === 'year-desc') data.sort((a,b)=>(b.year ?? -1)-(a.year ?? -1))
  if (sort === 'km-asc') data.sort((a,b)=>(a.mileage ?? Number.MAX_SAFE_INTEGER)-(b.mileage ?? Number.MAX_SAFE_INTEGER))

  const totalResults = data.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const requestedPage = Math.max(1, Math.trunc(num(p.pagina) || 1))
  const currentPage = Math.min(requestedPage, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageData = data.slice(startIndex, startIndex + PAGE_SIZE)
  const pages = visiblePages(currentPage, totalPages)

  return <main className="section explore-page home-market-page">
    <div className="container">
      <SearchBar target="/" initialQuery={p.q || ''} initialCategory={p.categoria || ''} initialState={p.estado || ''} initialCity={p.cidade || ''}/>
      <BrandCarousel />
      <FeaturedShowcase items={promotedListings}/>

      <div className="explore-layout">
        <FilterSidebar p={p}/>
        <section id="resultados" className="explore-results">
          <div className="results-toolbar">
            <div className="result-count"><strong>{totalResults}</strong> resultados <span>• página {currentPage} de {totalPages}</span></div>
            {(p.estilo || p.estado || p.cidade || p.marca || p.modelo || p.precoMin || p.precoMax || p.anoMin || p.anoMax || p.kmMin || p.kmMax || p.combustivel || p.cambio) ? <span className="filters-active">FILTROS ATIVOS</span> : null}
          </div>
          {geckoRes.error ? <div className="data-warning"><strong>Não foi possível carregar os anúncios importados.</strong><span>{geckoRes.error}</span></div> : null}
          {totalResults ? <>
            <div className="listing-grid explore-grid">{pageData.map(x=><ListingCard key={`${x.kind}-${x.id}`} x={x}/>)}</div>
            {totalPages > 1 ? <nav className="manual-pagination" aria-label="Paginação dos anúncios">
              <Link className={`page-arrow ${currentPage === 1 ? 'disabled' : ''}`} aria-disabled={currentPage===1} href={pageHref('/',p,Math.max(1,currentPage-1))}>‹</Link>
              <div className="page-numbers">
                {pages.map((n,i)=>{
                  const prev = pages[i-1]
                  return <span key={n} className="page-slot">
                    {prev && n-prev>1 ? <span className="page-ellipsis">…</span> : null}
                    <Link className={`page-number ${n===currentPage?'active':''}`} href={pageHref('/',p,n)}>{n}</Link>
                  </span>
                })}
              </div>
              <Link className={`page-arrow ${currentPage === totalPages ? 'disabled' : ''}`} aria-disabled={currentPage===totalPages} href={pageHref('/',p,Math.min(totalPages,currentPage+1))}>›</Link>
            </nav> : null}
          </> : <div className="empty-state"><h3>Nenhum resultado</h3><p>Ajuste ou limpe os filtros para ampliar a busca.</p></div>}
        </section>
      </div>
    </div>
  </main>
}
