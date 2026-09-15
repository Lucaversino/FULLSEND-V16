import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function PATCH(req:Request){
  const gate=await requireAdmin(); if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json(); const id=String(body.id||'')
  if(!id)return NextResponse.json({error:'Usuário inválido.'},{status:400})
  if(body.verified_override!==undefined&&body.verified_override!==null&&typeof body.verified_override!=='boolean')return NextResponse.json({error:'Opção de selo inválida.'},{status:400})
  const allowedRoles=['user','admin']
  const allowedStatus=['active','suspended','blocked']
  if(!allowedRoles.includes(body.role)||!allowedStatus.includes(body.account_status))return NextResponse.json({error:'Valores inválidos.'},{status:400})
  const profilePayload={...(body.verified_override!==undefined?{verified_override:body.verified_override}:{}),name:String(body.name||'').trim(),city:String(body.city||'').trim(),state:String(body.state||'').trim().toUpperCase(),whatsapp:String(body.whatsapp||'').trim(),badge:body.role==='admin'?'admin':'none',role:body.role,account_status:body.account_status,last_admin_note:String(body.last_admin_note||'').trim(),updated_at:new Date().toISOString()}
  const {error:pErr}=await gate.admin.from('profiles').update(profilePayload).eq('id',id)
  if(pErr)return NextResponse.json({error:pErr.message},{status:400})
  if(body.email){const {error:eErr}=await gate.admin.auth.admin.updateUserById(id,{email:String(body.email).trim()});if(eErr)return NextResponse.json({error:eErr.message},{status:400})}
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_user_update',entity:'user',entity_id:id,data:{verified_override:body.verified_override,badge:body.role==='admin'?'admin':'none',role:body.role,status:body.account_status}})
  return NextResponse.json({success:true})
}

export async function DELETE(req:Request){
  const gate=await requireAdmin(); if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const {id}=await req.json(); if(!id)return NextResponse.json({error:'Usuário inválido.'},{status:400})
  if(id===gate.user.id)return NextResponse.json({error:'Você não pode excluir sua própria conta administrativa.'},{status:400})
  const {error}=await gate.admin.auth.admin.deleteUser(String(id))
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_user_delete',entity:'user',entity_id:String(id)})
  return NextResponse.json({success:true})
}
