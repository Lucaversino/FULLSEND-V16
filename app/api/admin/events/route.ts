import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { slugifyEvent } from '@/lib/events-shared'

const allowedStatus=['pending','published','rejected']
const allowedCategories=[
  'Encontro','Carros Rebaixados','Carros Antigos','Drift','Arrancada',
  'Track Day','Som Automotivo','Off-road','Motorsport','Exposição','Outros'
]

function clean(body:any){
  const title=String(body.title||'').trim()
  const slugBase=String(body.slug||'').trim()||`${title}-${body.city||''}-${body.event_date||''}`
  return {
    title,
    slug:slugifyEvent(slugBase),
    description:String(body.description||'').trim()||null,
    category:allowedCategories.includes(body.category)?body.category:'Outros',
    event_date:body.event_date||null,
    end_date:body.end_date||null,
    event_time:body.event_time||null,
    venue:String(body.venue||'').trim()||null,
    address:String(body.address||'').trim()||null,
    city:String(body.city||'').trim()||null,
    state:String(body.state||'').trim().toUpperCase().slice(0,2)||null,
    country:String(body.country||'BR').trim().toUpperCase()||'BR',
    latitude:body.latitude===''||body.latitude==null?null:Number(body.latitude),
    longitude:body.longitude===''||body.longitude==null?null:Number(body.longitude),
    image_url:String(body.image_url||'').trim()||null,
    ticket_url:String(body.ticket_url||'').trim()||null,
    source_url:String(body.source_url||'').trim()||null,
    source:String(body.source||'fullsend').trim()||'fullsend',
    status:allowedStatus.includes(body.status)?body.status:'pending',
    featured:Boolean(body.featured),
    updated_at:new Date().toISOString(),
  }
}

export async function GET(req:NextRequest){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const q=req.nextUrl.searchParams.get('q')?.trim()
  const status=req.nextUrl.searchParams.get('status')?.trim()
  const source=req.nextUrl.searchParams.get('source')?.trim()
  let query=gate.admin.from('events').select('*').order('event_date',{ascending:true}).limit(500)
  if(status&&allowedStatus.includes(status))query=query.eq('status',status)
  if(source)query=query.eq('source',source)
  if(q)query=query.or(`title.ilike.%${q.replace(/[,%()]/g,' ')}%,city.ilike.%${q.replace(/[,%()]/g,' ')}%,state.ilike.%${q.replace(/[,%()]/g,' ')}%`)
  const {data,error}=await query
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({events:data||[]})
}

export async function POST(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json()
  const payload=clean(body)
  if(!payload.title||!payload.event_date)return NextResponse.json({error:'Nome e data são obrigatórios.'},{status:400})
  const {data,error}=await gate.admin.from('events').insert({...payload,created_by:gate.user.id}).select('*').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_event_create',entity:'events',entity_id:data.id})
  return NextResponse.json({event:data})
}

export async function PATCH(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json()
  const id=String(body.id||'')
  if(!id)return NextResponse.json({error:'Evento inválido.'},{status:400})
  const payload=clean(body)
  const {data,error}=await gate.admin.from('events').update(payload).eq('id',id).select('*').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_event_update',entity:'events',entity_id:id,data:{status:payload.status,featured:payload.featured}})
  return NextResponse.json({event:data})
}

export async function DELETE(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json().catch(()=>({}))

  if(body?.all===true){
    const {count,error:countError}=await gate.admin.from('events').select('id',{count:'exact',head:true})
    if(countError)return NextResponse.json({error:countError.message},{status:400})

    const {error}=await gate.admin.from('events')
      .delete()
      .neq('id','00000000-0000-0000-0000-000000000000')

    if(error)return NextResponse.json({error:error.message},{status:400})

    const {error:auditError}=await gate.admin.from('audit_logs').insert({
      actor_id:gate.user.id,
      action:'admin_events_delete_all',
      entity:'events',
      data:{deleted:count||0}
    })

    if(auditError){
      console.warn('Falha ao registrar auditoria de exclusão em massa de eventos:',auditError.message)
    }

    return NextResponse.json({success:true,deleted:count||0})
  }

  const id=String(body?.id||'')
  if(!id)return NextResponse.json({error:'Evento inválido.'},{status:400})
  const {error}=await gate.admin.from('events').delete().eq('id',id)
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_event_delete',entity:'events',entity_id:id})
  return NextResponse.json({success:true})
}
