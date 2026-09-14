import { NextResponse } from 'next/server'
import { inferFilters, getCopilotCandidates } from '@/lib/copilot/inventory'
import { askCopilotAI } from '@/lib/copilot/openai'
import { buildCopilotPageContext } from '@/lib/copilot/page-context'
import { createClient } from '@/lib/supabase/server'

export const dynamic='force-dynamic'
export const maxDuration=60

type IncomingMessage={role:'user'|'assistant';content:string}

const ACTIONS={
  classifieds:{label:'VER CLASSIFICADOS',href:'/explorar'},
  announce:{label:'ANUNCIAR AGORA',href:'/anunciar'},
  garage:{label:'ADICIONAR À GARAGEM',href:'/garagem/adicionar'},
  community:{label:'IR PARA A COMUNIDADE',href:'/comunidade'},
  events:{label:'VER EVENTOS',href:'/eventos'},
  add_event:{label:'CADASTRAR EVENTO',href:'/eventos/adicionar'},
  profile:{label:'ABRIR MEU PERFIL',href:'/perfil'},
  xp:{label:'VER XP E REPUTAÇÃO',href:'/perfil'},
  boost:{label:'IMPULSIONAR ANÚNCIO',href:'/perfil'},
  help:{label:'AJUDA E SEGURANÇA',href:'/seguranca'},
  login:{label:'ENTRAR NO FULLSEND',href:'/login'},
} as const

function cleanMessages(value:unknown):IncomingMessage[]{
  if(!Array.isArray(value))return[]
  return value
    .filter((m:any)=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.content==='string')
    .map((m:any)=>({role:m.role,content:m.content.trim().slice(0,1800)}))
    .filter((m:any)=>m.content)
    .slice(-12)
}

function normalize(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
}

function shouldSearchInventory(message:string){
  const text=normalize(message)
  const siteOnly=/\b(anunciar|vender|garagem|comunidade|evento|xp|reputacao|gearhead|builder|elite|impulsionar|destaque|vip|login|senha|perfil|ajuda)\b/.test(text)
  const explicit=/\b(buscar|busca|procuro|procurando|encontrar|ache|mostre|opcoes|classificados|comprar|quero um|quero uma)\b/.test(text)
  const vehicleCriteria=/\b(turbo|manual|rebaixad|stance|carro antigo|veiculo|carro|moto)\b/.test(text)&&/\b(ate|por menos|r\$|mil|comprar|quero|procuro|buscar)\b/.test(text)
  return explicit||(!siteOnly&&vehicleCriteria)
}

export async function POST(req:Request){
  if(!process.env.OPENAI_API_KEY){
    return NextResponse.json({error:'FULLSEND COPILOT ainda não está configurado. Falta OPENAI_API_KEY na Vercel.'},{status:503})
  }

  try{
    const body=await req.json().catch(()=>({}))
    const messages=cleanMessages(body?.messages)
    const lastUser=[...messages].reverse().find(m=>m.role==='user')
    if(!lastUser){
      return NextResponse.json({error:'Digite uma mensagem para o Copilot.'},{status:400})
    }

    let authState:'logged_in'|'visitor'='visitor'
    try{
      const supabase=await createClient()
      const {data:{user}}=await supabase.auth.getUser()
      if(user)authState='logged_in'
    }catch{}

    const pageContext=await buildCopilotPageContext(body?.context,authState)
    const candidates=shouldSearchInventory(lastUser.content)
      ?await getCopilotCandidates(lastUser.content,inferFilters(lastUser.content))
      :[]
    const ai=await askCopilotAI(messages,candidates,pageContext)

    const listingMap=new Map(candidates.map(x=>[x.id,x]))
    const recommendations=ai.recommendation_ids
      .map(id=>listingMap.get(id))
      .filter(Boolean)
      .map((x:any)=>({
        id:x.id,
        kind:x.kind,
        title:x.title,
        price:x.price,
        city:x.city,
        state:x.state,
        image:x.image,
        url:x.url,
        externalUrl:x.externalUrl||null,
        year:x.year||null,
        mileage:x.mileage||null,
        transmission:x.transmission||null,
        fuel:x.fuel||null,
        vip:Boolean(x.isVip),
        featured:Boolean(x.isFeatured),
      }))

    const seen=new Set<string>()
    const actions=ai.action_ids
      .filter((id):id is keyof typeof ACTIONS=>id in ACTIONS&&!seen.has(id)&&Boolean(seen.add(id)))
      .map(id=>({id,...ACTIONS[id]}))

    return NextResponse.json({
      success:true,
      reply:ai.reply,
      followUp:ai.follow_up,
      understood:ai.understood,
      recommendations,
      actions,
      candidateCount:candidates.length,
      page:{name:pageContext.pageName,authState:pageContext.authState},
    })
  }catch(e:any){
    console.error('FULLSEND COPILOT ERROR',e)
    return NextResponse.json({
      error:e?.message||'O Copilot teve uma falha temporária. Tente novamente.'
    },{status:500})
  }
}
