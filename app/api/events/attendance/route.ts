import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req:NextRequest){
  const eventId=req.nextUrl.searchParams.get('eventId')
  if(!eventId)return NextResponse.json({error:'Evento inválido.'},{status:400})
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  const {count}=await s.from('event_attendees').select('id',{count:'exact',head:true}).eq('event_id',eventId)
  let going=false
  if(user){
    const {data}=await s.from('event_attendees').select('id').eq('event_id',eventId).eq('user_id',user.id).maybeSingle()
    going=Boolean(data)
  }
  return NextResponse.json({going,count:count||0,authenticated:Boolean(user)})
}

export async function POST(req:Request){
  const {eventId}=await req.json().catch(()=>({}))
  if(!eventId)return NextResponse.json({error:'Evento inválido.'},{status:400})
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return NextResponse.json({error:'Faça login para confirmar presença.'},{status:401})

  const {data:existing}=await s.from('event_attendees')
    .select('id')
    .eq('event_id',String(eventId))
    .eq('user_id',user.id)
    .maybeSingle()

  if(existing){
    const {error}=await s.from('event_attendees').delete().eq('id',existing.id).eq('user_id',user.id)
    if(error)return NextResponse.json({error:error.message},{status:400})
  }else{
    const {error}=await s.from('event_attendees').insert({event_id:String(eventId),user_id:user.id})
    if(error)return NextResponse.json({error:error.message},{status:400})
  }

  const {count}=await s.from('event_attendees').select('id',{count:'exact',head:true}).eq('event_id',String(eventId))
  return NextResponse.json({going:!existing,count:count||0})
}
