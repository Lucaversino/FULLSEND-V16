import { createAdminClient } from '@/lib/supabase/admin'

export type CopilotAuthState='logged_in'|'visitor'

export type CopilotPageContext={
  pathname:string
  pageName:string
  authState:CopilotAuthState
  filters:Record<string,string>
  content:Record<string,unknown>|null
}

const FILTER_KEYS=new Set(['q','category','state','city','style','page','dateFrom','dateTo'])

const PAGE_NAMES:Array<[RegExp,string]>=[
  [/^\/$/,'Página inicial'],
  [/^\/explorar/,'Classificados'],
  [/^\/anunciar/,'Anunciar'],
  [/^\/anuncio\/parceiro\//,'Anúncio parceiro'],
  [/^\/anuncio\//,'Página do anúncio'],
  [/^\/garagem\/adicionar/,'Adicionar à Minha Garagem'],
  [/^\/perfil/,'Perfil e painel do usuário'],
  [/^\/comunidade/,'Comunidade'],
  [/^\/eventos\/adicionar/,'Cadastrar evento'],
  [/^\/eventos\//,'Página do evento'],
  [/^\/eventos/,'Eventos'],
  [/^\/mensagens/,'Mensagens'],
  [/^\/vip/,'FULLSEND VIP'],
  [/^\/seguranca/,'Ajuda e segurança'],
  [/^\/privacidade/,'Privacidade'],
  [/^\/termos/,'Termos de uso'],
  [/^\/login/,'Login'],
  [/^\/cadastro/,'Cadastro'],
]

function cleanPath(value:unknown){
  if(typeof value!=='string')return'/'
  const path=value.split('?')[0].trim()
  return path.startsWith('/')?path.slice(0,240):'/'
}

function pageName(pathname:string){
  return PAGE_NAMES.find(([pattern])=>pattern.test(pathname))?.[1]||'FULLSEND'
}

function safeText(value:unknown,max=520){
  return typeof value==='string'?value.trim().slice(0,max):null
}

function safeNumber(value:unknown){
  const number=Number(value)
  return Number.isFinite(number)?number:null
}

function cleanFilters(value:unknown){
  if(!value||typeof value!=='object')return{}
  const result:Record<string,string>={}
  for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
    if(!FILTER_KEYS.has(key)||typeof raw!=='string')continue
    const clean=raw.trim().slice(0,100)
    if(clean)result[key]=clean
  }
  return result
}

export async function buildCopilotPageContext(
  raw:unknown,
  authState:CopilotAuthState,
):Promise<CopilotPageContext>{
  const input=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
  const pathname=cleanPath(input.pathname)
  const context:CopilotPageContext={
    pathname,
    pageName:pageName(pathname),
    authState,
    filters:cleanFilters(input.filters),
    content:null,
  }

  try{
    const admin=createAdminClient()
    const partner=pathname.match(/^\/anuncio\/parceiro\/([^/]+)$/)
    if(partner){
      const id=decodeURIComponent(partner[1]).slice(0,120)
      const {data}=await admin
        .from('gecko_listings')
        .select('title,price,city,state,brand,model,year,mileage,fuel,transmission,category,features,is_featured,is_vip,raw_data')
        .eq('id',id)
        .eq('status','active')
        .maybeSingle()
      if(data)context.content={
        type:'listing',
        source:'partner',
        title:safeText(data.title,180),
        price:safeNumber(data.price),
        city:safeText(data.city,100),
        state:safeText(data.state,2),
        brand:safeText(data.brand,80),
        model:safeText(data.model,100),
        year:safeNumber(data.year),
        mileage:safeNumber(data.mileage),
        fuel:safeText(data.fuel,80),
        transmission:safeText(data.transmission,80),
        category:safeText(data.category,80),
        features:safeText(data.features,420),
        description:safeText((data as any).raw_data?.description,520),
        featured:Boolean(data.is_featured),
        vip:Boolean(data.is_vip),
      }
      return context
    }

    const listing=pathname.match(/^\/anuncio\/([^/]+)$/)
    if(listing){
      const slug=decodeURIComponent(listing[1]).slice(0,180)
      const {data}=await admin
        .from('listings')
        .select('title,price,city,state,brand,model,year,mileage,fuel,transmission,power_cv,category_slug,description,is_featured,is_vip')
        .eq('slug',slug)
        .eq('status','active')
        .eq('listing_mode','classified')
        .maybeSingle()
      if(data)context.content={
        type:'listing',
        source:'fullsend',
        title:safeText(data.title,180),
        price:safeNumber(data.price),
        city:safeText(data.city,100),
        state:safeText(data.state,2),
        brand:safeText(data.brand,80),
        model:safeText(data.model,100),
        year:safeNumber(data.year),
        mileage:safeNumber(data.mileage),
        fuel:safeText(data.fuel,80),
        transmission:safeText(data.transmission,80),
        powerCv:safeNumber(data.power_cv),
        category:safeText(data.category_slug,80),
        description:safeText(data.description,520),
        featured:Boolean(data.is_featured),
        vip:Boolean(data.is_vip),
      }
      return context
    }

    const event=pathname.match(/^\/eventos\/([^/]+)$/)
    if(event&&event[1]!=='adicionar'){
      const slug=decodeURIComponent(event[1]).slice(0,180)
      const {data}=await admin
        .from('events')
        .select('title,description,category,event_date,end_date,event_time,venue,address,city,state,country,featured')
        .eq('slug',slug)
        .eq('status','published')
        .maybeSingle()
      if(data)context.content={
        type:'event',
        title:safeText(data.title,180),
        description:safeText(data.description,520),
        category:safeText(data.category,100),
        eventDate:safeText(data.event_date,20),
        endDate:safeText(data.end_date,20),
        eventTime:safeText(data.event_time,20),
        venue:safeText(data.venue,180),
        address:safeText(data.address,220),
        city:safeText(data.city,100),
        state:safeText(data.state,2),
        country:safeText(data.country,2),
        featured:Boolean(data.featured),
      }
    }
  }catch(error){
    console.error('FULLSEND COPILOT PAGE CONTEXT ERROR',error)
  }

  return context
}
