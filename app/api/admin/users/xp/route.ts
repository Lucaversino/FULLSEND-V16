import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { levelForXp } from '@/lib/reputation'

export async function POST(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json().catch(()=>({}))
  const id=String(body.id||'')
  const delta=Math.trunc(Number(body.delta)||0)
  const note=String(body.note||'Ajuste administrativo').trim().slice(0,300)
  if(!id||!delta||Math.abs(delta)>5000)return NextResponse.json({error:'Informe um ajuste entre -5000 e +5000 XP.'},{status:400})

  const {data:profile,error:readError}=await gate.admin.from('profiles').select('xp_points').eq('id',id).maybeSingle()
  if(readError||!profile)return NextResponse.json({error:readError?.message||'Usuário não encontrado.'},{status:404})
  const oldXp=Math.max(0,Number(profile.xp_points||0))
  const newXp=Math.max(0,oldXp+delta)
  const applied=newXp-oldXp
  if(applied===0)return NextResponse.json({success:true,xp_points:newXp,reputation_level:levelForXp(newXp),applied:0})

  const level=levelForXp(newXp)
  const {error:updateError}=await gate.admin.from('profiles').update({xp_points:newXp,reputation_level:level,updated_at:new Date().toISOString()}).eq('id',id)
  if(updateError)return NextResponse.json({error:updateError.message},{status:400})

  const sourceId=`admin-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
  const {error:ledgerError}=await gate.admin.from('xp_ledger').insert({user_id:id,action_key:'admin_adjustment',points:applied,source_type:'admin',source_id:sourceId,note})
  if(ledgerError)console.warn('FULLSEND XP: falha no ledger administrativo:',ledgerError.message)

  await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'admin_xp_adjust',entity:'user',entity_id:id,data:{from:oldXp,to:newXp,delta:applied,level,note}})
  return NextResponse.json({success:true,xp_points:newXp,reputation_level:level,applied})
}
