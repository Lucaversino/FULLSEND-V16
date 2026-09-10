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
  const {id,kind}=await req.json(); const table=tableFor(String(kind||'fullsend'))
  const {error}=await gate.admin.from(table).delete().eq('id',String(id))
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_listing_delete',entity:table,entity_id:String(id)})
  return NextResponse.json({success:true})
}
