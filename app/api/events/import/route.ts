import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { importSymplaEvents } from '@/lib/events/importer'

async function authorized(req:Request){
  const cron=process.env.CRON_SECRET
  const supplied=req.headers.get('x-cron-secret')
  if(cron&&supplied&&supplied===cron)return {ok:true as const}
  const gate=await requireAdmin()
  if(!gate.ok)return gate
  return {ok:true as const}
}

export async function POST(req:Request){
  const auth=await authorized(req)
  if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status})

  const body=await req.json().catch(()=>({}))
  const requested=body?.status==='pending'?'pending':'published'
  const envDefault=process.env.EVENTS_IMPORT_STATUS==='pending'?'pending':'published'
  const status=body?.status?requested:envDefault

  const result=await importSymplaEvents({
    status,
    keyword:typeof body?.keyword==='string'?body.keyword:'',
    pages:Number(body?.pages||1),
    batch:Boolean(body?.batch),
  })

  return NextResponse.json(result,{status:result.configured?200:503})
}
