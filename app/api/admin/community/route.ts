import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin'
import { checked,failure,origin,CommunityError,signedMedia } from '@/lib/community/server'
export const dynamic='force-dynamic'
const tables={posts:'community_posts',comments:'community_comments',reports:'community_reports'} as const
export async function GET(req:Request){try{
 const gate=await requireAdmin();if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
 const q=new URL(req.url).searchParams,kind=z.enum(['posts','comments','reports']).parse(q.get('kind')||'reports'),page=z.coerce.number().int().min(1).max(10000).parse(q.get('page')||1)
 let query=gate.admin.from(tables[kind]).select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*20,page*20-1)
 if(q.get('status'))query=query.eq('status',q.get('status'))
 const {data,count}=checked(await query)
 const ids=Array.from(new Set((data||[]).flatMap(r=>[r.user_id,r.reported_user_id,r.reported_by]).filter(Boolean)))
 const people=ids.length?checked(await gate.admin.from('profiles').select('id,name,account_status').in('id',ids)).data:[]
 return NextResponse.json({items:kind==='posts'?await signedMedia(gate.admin,data||[]):data||[],people,total:count||0})
}catch(e){return failure(e)}}
export async function PATCH(req:Request){try{
 origin(req);const gate=await requireAdmin();if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
 const b=z.object({kind:z.enum(['posts','comments','reports','user']),id:z.string().uuid(),status:z.string()}).parse(await req.json())
 if(b.kind==='user'){
  if(b.id===gate.user.id)throw new CommunityError('Não suspenda sua própria conta.')
  const status=z.enum(['active','suspended']).parse(b.status)
  const target=checked(await gate.admin.from('profiles').select('role').eq('id',b.id).maybeSingle()).data
  if(!target||target.role==='admin')throw new CommunityError('Use a gestão de usuários para administrar outros administradores.')
  checked(await gate.admin.from('profiles').update({account_status:status}).eq('id',b.id))
 }else{
  const status=b.kind==='reports'?z.enum(['open','reviewed','dismissed']).parse(b.status):z.enum(['published','hidden','removed']).parse(b.status)
  const result=checked(await gate.admin.from(tables[b.kind]).update({status}).eq('id',b.id).select('id').maybeSingle())
  if(!result.data)throw new CommunityError('Registro não encontrado.',404)
 }
 checked(await gate.admin.from('audit_logs').insert({actor_id:gate.user.id,action:'community_moderate',entity:b.kind,entity_id:b.id,data:{status:b.status}}))
 return NextResponse.json({ok:true})
}catch(e){return failure(e)}}
