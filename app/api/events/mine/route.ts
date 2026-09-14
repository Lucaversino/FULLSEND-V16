import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedCategories=new Set([
  'Encontro','Carros Rebaixados','Carros Antigos','Drift','Arrancada',
  'Track Day','Som Automotivo','Off-road','Motorsport','Exposição','Outros'
])

function clean(v:any){return typeof v==='string'?v.trim():''}

export async function PATCH(req:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Faça login para editar seu evento.'},{status:401})

  const body=await req.json().catch(()=>({}))
  const id=clean(body?.id)
  if(!id)return NextResponse.json({error:'Evento inválido.'},{status:400})

  const {data:existing,error:findError}=await supabase
    .from('events')
    .select('id,created_by')
    .eq('id',id)
    .eq('created_by',user.id)
    .maybeSingle()

  if(findError)return NextResponse.json({error:findError.message},{status:400})
  if(!existing)return NextResponse.json({error:'Evento não encontrado ou não pertence a você.'},{status:404})

  const category=allowedCategories.has(clean(body?.category))?clean(body?.category):'Outros'
  const payload={
    title:clean(body?.title),
    description:clean(body?.description)||null,
    category,
    event_date:clean(body?.event_date),
    end_date:clean(body?.end_date)||null,
    event_time:clean(body?.event_time)||null,
    venue:clean(body?.venue)||null,
    address:clean(body?.address)||null,
    google_maps_url:clean(body?.google_maps_url)||null,
    latitude:clean(body?.latitude)===''?null:Number(body.latitude),
    longitude:clean(body?.longitude)===''?null:Number(body.longitude),
    city:clean(body?.city)||null,
    state:clean(body?.state).toUpperCase().slice(0,2)||null,
    ticket_url:clean(body?.ticket_url)||null,
    source_url:clean(body?.source_url)||null,
    status:'pending',
    featured:false,
    updated_at:new Date().toISOString(),
  }

  if(!payload.title||!payload.event_date){
    return NextResponse.json({error:'Título e data são obrigatórios.'},{status:400})
  }

  const {data:event,error}=await supabase
    .from('events')
    .update(payload)
    .eq('id',id)
    .eq('created_by',user.id)
    .select('*')
    .single()

  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({success:true,event})
}

export async function DELETE(req:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:'Faça login para excluir seu evento.'},{status:401})

  const body=await req.json().catch(()=>({}))
  const id=clean(body?.id)
  if(!id)return NextResponse.json({error:'Evento inválido.'},{status:400})

  const {data:existing,error:findError}=await supabase
    .from('events')
    .select('id')
    .eq('id',id)
    .eq('created_by',user.id)
    .maybeSingle()

  if(findError)return NextResponse.json({error:findError.message},{status:400})
  if(!existing)return NextResponse.json({error:'Evento não encontrado ou não pertence a você.'},{status:404})

  const {error}=await supabase
    .from('events')
    .delete()
    .eq('id',id)
    .eq('created_by',user.id)

  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({success:true})
}
