import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export async function GET(req:Request){
  const secret=(process.env.CRON_SECRET||'').trim()
  const auth=req.headers.get('authorization')||''
  if(!secret||auth!==`Bearer ${secret}`)return NextResponse.json({error:'Não autorizado.'},{status:401})
  const admin=createAdminClient()
  const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||''
  const today=`${get('year')}-${get('month')}-${get('day')}`
  const {data,error}=await admin.from('events').delete().lt('event_date',today).select('id,title,event_date')
  if(error)return NextResponse.json({error:'Falha ao limpar eventos vencidos.',details:error.message},{status:500})
  return NextResponse.json({success:true,date:today,deleted:data?.length||0,events:data||[]})
}
