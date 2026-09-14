import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

function tableFor(kind:string){return kind==='gecko'?'gecko_listings':'listings'}

export async function PATCH(req:Request){
  const gate=await requireAdmin(); if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json(); const id=String(body.id||''); const kind=String(body.kind||'fullsend'); const table=tableFor(kind)
  if(!id)return NextResponse.json({error:'Anúncio inválido.'},{status:400})
  const payload:any={title:String(body.title||'').trim(),price:body.price===''||body.price==null?null:Number(body.price),is_featured:Boolean(body.is_featured),is_vip:Boolean(body.is_vip),admin_note:String(body.admin_note||'').trim(),updated_at:new Date().toISOString()}
  if(kind==='fullsend')payload.status=['draft','pending','active','sold','blocked'].includes(body.status)?body.status:'active'
  else payload.status=['active','inactive','blocked'].includes(body.status)?body.status:'active'
  const {error}=await gate.admin.from(table).update(payload).eq('id',id)
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_listing_update',entity:table,entity_id:id,data:{featured:payload.is_featured,vip:payload.is_vip,status:payload.status}})
  return NextResponse.json({success:true})
}

export async function DELETE(req:Request){
  const gate=await requireAdmin(); if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json().catch(()=>({}))

  if(Array.isArray(body.items)){
    const items=body.items
      .map((x:any)=>({id:String(x?.id||'').trim(),kind:String(x?.kind||'fullsend')}))
      .filter((x:any)=>x.id&&(x.kind==='fullsend'||x.kind==='gecko'))
      .slice(0,200)

    if(!items.length)return NextResponse.json({error:'Nenhum anúncio válido selecionado.'},{status:400})

    const fullsendIds=items.filter((x:any)=>x.kind==='fullsend').map((x:any)=>x.id)
    const geckoIds=items.filter((x:any)=>x.kind==='gecko').map((x:any)=>x.id)
    const deleted:any[]=[]

    if(fullsendIds.length){
      const {error}=await gate.admin.from('listings').delete().in('id',fullsendIds)
      if(error)return NextResponse.json({error:`FULLSEND: ${error.message}`},{status:400})
      deleted.push(...fullsendIds.map((id:string)=>({id,kind:'fullsend'})))
    }

    if(geckoIds.length){
      const {error}=await gate.admin.from('gecko_listings').delete().in('id',geckoIds)
      if(error)return NextResponse.json({error:`Gecko: ${error.message}`},{status:400})
      deleted.push(...geckoIds.map((id:string)=>({id,kind:'gecko'})))
    }

    const {error:auditError}=await gate.admin.from('audit_logs').insert({
      actor_id:gate.user.id,
      action:'admin_listings_bulk_delete',
      entity:'listings',
      entity_id:null,
      data:{count:deleted.length,items:deleted.slice(0,200)}
    })
    if(auditError)console.warn('Falha ao registrar auditoria de exclusão em lote:',auditError.message)

    return NextResponse.json({success:true,deletedCount:deleted.length,deleted})
  }

  const id=String(body.id||'')
  const kind=String(body.kind||'fullsend')
  const table=tableFor(kind)
  if(!id)return NextResponse.json({error:'Anúncio inválido.'},{status:400})

  const {error}=await gate.admin.from(table).delete().eq('id',id)
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_listing_delete',entity:table,entity_id:id})
  return NextResponse.json({success:true})
}
