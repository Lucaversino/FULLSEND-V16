import { NextResponse } from 'next/server'
import { inferFilters, getCopilotCandidates } from '@/lib/copilot/inventory'
import { askCopilotAI } from '@/lib/copilot/openai'

export const dynamic='force-dynamic'
export const maxDuration=60

type IncomingMessage={role:'user'|'assistant';content:string}

function cleanMessages(value:unknown):IncomingMessage[]{
  if(!Array.isArray(value))return[]
  return value
    .filter((m:any)=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.content==='string')
    .map((m:any)=>({role:m.role,content:m.content.trim().slice(0,1800)}))
    .filter((m:any)=>m.content)
    .slice(-12)
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

    const filters=inferFilters(lastUser.content)
    const candidates=await getCopilotCandidates(lastUser.content,filters)
    const ai=await askCopilotAI(messages,candidates)

    const map=new Map(candidates.map(x=>[x.id,x]))
    const recommendations=ai.recommendation_ids
      .map(id=>map.get(id))
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

    return NextResponse.json({
      success:true,
      reply:ai.reply,
      followUp:ai.follow_up,
      understood:ai.understood,
      recommendations,
      candidateCount:candidates.length,
    })
  }catch(e:any){
    console.error('FULLSEND COPILOT ERROR',e)
    return NextResponse.json({
      error:e?.message||'O Copilot teve uma falha temporária. Tente novamente.'
    },{status:500})
  }
}
