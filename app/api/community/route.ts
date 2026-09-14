import { NextResponse } from 'next/server'
import { z } from 'zod'
import { postSchema, REASONS } from '@/lib/community/shared'
import { context, checked, failure, origin, signedMedia, CommunityError } from '@/lib/community/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic='force-dynamic'
const uuid=z.string().uuid()
export async function GET(req:Request){try{
 const {s,user,profile}=await context();const q=new URL(req.url).searchParams
 if(q.get('mode')==='session')return NextResponse.json({viewer:user?.id||null,isAdmin:profile?.role==='admin'},{headers:{'Cache-Control':'private, no-store'}})
 const optional=(k:string)=>q.get(k)?uuid.parse(q.get(k)):null
 const page=z.coerce.number().int().min(1).max(10000).parse(q.get('page')||1)
 if(q.get('mode')==='users'){
  const term=(q.get('q')||'').trim().slice(0,100).replace(/[\\%_]/g,'')
  const pageSize=5
  let query=s.from('profiles').select('id,name,avatar_url,city,state').eq('account_status','active')
  // Sugestões iniciais usam membros reais recentes; a pesquisa inclui a própria conta.
  if(term)query=query.ilike('name',`%${term}%`)
  else if(user)query=query.neq('id',user.id)
  const {data}=checked(await query.order('created_at',{ascending:false}).order('id').range((page-1)*pageSize,page*pageSize))
  return NextResponse.json({items:(data||[]).slice(0,pageSize),hasMore:(data||[]).length>pageSize},{headers:{'Cache-Control':'private, no-store'}})
 }
 if(q.get('mode')==='comments'){
  const post=uuid.parse(q.get('post'));const {data}=checked(await s.from('community_comments').select('id,content,user_id,created_at,author:profiles!user_id(id,name,avatar_url)').eq('post_id',post).eq('status','published').order('created_at').order('id').range((page-1)*20,page*20))
  return NextResponse.json({items:(data||[]).slice(0,20),hasMore:(data||[]).length>20})
 }
 if(q.get('mode')==='options'){
  if(!user)throw new CommunityError('Entre na sua conta.',401)
  // Busca paginada de carros/eventos; não carrega toda a garagem de uma só vez.
  const kind=q.get('kind')||'vehicles';const search=(q.get('q')||'').slice(0,100).replace(/[%_]/g,'')
  let query=kind==='events'?s.from('events').select('id,title,slug,status').eq('created_by',user.id):s.from('listings').select('id,title,slug').eq('user_id',user.id)
  if(search)query=query.ilike('title',`%${search}%`)
  const {data}=checked(await query.order('created_at',{ascending:false}).range((page-1)*20,page*20))
  return NextResponse.json({items:(data||[]).slice(0,20),hasMore:(data||[]).length>20})
 }
 const filter=q.get('filter')||'Recentes'
 if(['Seguindo','Salvos'].includes(filter)&&!user)throw new CommunityError('Entre na sua conta para acessar este feed.',401)
 const args={p_filter:filter,p_page:page,p_query:(q.get('q')||'').slice(0,100),p_author:optional('author'),p_vehicle:optional('vehicle'),p_tag:(q.get('tag')||'').toLowerCase().slice(0,40),p_id:optional('id'),p_city:(q.get('city')||profile?.city||'').slice(0,100),p_state:(q.get('state')||profile?.state||'').slice(0,2)}
 const {data}=checked(await s.rpc('community_feed',args))
 let people:any[]=[],cars:any[]=[]
 if(args.p_query&&page===1){
  const term=args.p_query.replace(/[%_]/g,'')
  const [p,v]=await Promise.all([s.from('profiles').select('id,name,avatar_url,city,state').ilike('name',`%${term}%`).limit(10),s.from('listings').select('id,title,cover_url').eq('status','active').ilike('title',`%${term}%`).limit(10)])
  people=checked(p).data||[];cars=checked(v).data||[]
 }
 return NextResponse.json({...data,items:await signedMedia(s,data?.items||[]),people,cars,viewer:user?.id||null,isAdmin:profile?.role==='admin',city:profile?.city||'',state:profile?.state||''})
}catch(e){return failure(e)}}
export async function POST(req:Request){try{
 origin(req);const {s,user}=await context(true);const b=await req.json()
 if(b.action==='post'){
  const p=postSchema.parse(b.post)
  if(p.media.some(m=>!m.path.startsWith(`${user!.id}/`)||m.path.includes('..')))throw new CommunityError('Mídia inválida.')
  // UUID do rascunho torna repetição após perda de conexão idempotente.
  const existing=checked(await s.from('community_posts').select('id,user_id').eq('id',p.id).maybeSingle()).data
  if(existing){if(existing.user_id!==user!.id)throw new CommunityError('Publicação inválida.',403);return NextResponse.json({id:existing.id})}
  checked(await s.from('community_posts').insert({...p,user_id:user!.id}));return NextResponse.json({id:p.id})
 }
 const id=uuid.parse(b.id)
 if(b.action==='like'||b.action==='save'){
  const enabled=z.boolean().parse(b.enabled),table=b.action==='like'?'community_likes':'community_saved_posts'
  checked(enabled?await s.from(table).upsert({post_id:id,user_id:user!.id},{onConflict:'post_id,user_id',ignoreDuplicates:true}):await s.from(table).delete().eq('post_id',id).eq('user_id',user!.id))
  const count=b.action==='like'?checked(await s.rpc('community_like_count',{target:id})).data:undefined
  return NextResponse.json({enabled,count})
 }
 if(b.action==='comment'){
  const content=z.string().trim().min(1).max(1500).parse(b.content);const commentId=uuid.parse(b.commentId)
  checked(await s.from('community_comments').upsert({id:commentId,post_id:id,user_id:user!.id,content},{onConflict:'id',ignoreDuplicates:true}));return NextResponse.json({ok:true})
 }
 if(b.action==='report'){
  const reason=z.enum(REASONS).parse(b.reason),details=z.string().max(1000).parse(b.details||'')
  const comment=b.commentId?uuid.parse(b.commentId):null
  const {data:target}=checked(comment?await s.from('community_comments').select('user_id,content').eq('id',comment).eq('post_id',id).maybeSingle():await s.from('community_posts').select('user_id,content').eq('id',id).eq('status','published').maybeSingle())
  if(!target)throw new CommunityError('Conteúdo indisponível.',404)
  const admin=createAdminClient()
  const {count}=checked(await admin.from('community_reports').select('id',{count:'exact',head:true}).eq('reported_by',user!.id).gte('created_at',new Date(Date.now()-3600000).toISOString()))
  if((count||0)>=20)throw new CommunityError('Limite de denúncias atingido. Tente mais tarde.',429)
  checked(await admin.from('community_reports').insert({post_id:id,comment_id:comment,reported_by:user!.id,reported_user_id:target.user_id,reason,details,snapshot:target.content}));return NextResponse.json({ok:true})
 }
 throw new CommunityError('Ação inválida.')
}catch(e){return failure(e)}}
export async function PATCH(req:Request){try{
 origin(req);const {s,user}=await context(true);const b=await req.json();const p=postSchema.parse(b.post)
 if(p.media.some(m=>!m.path.startsWith(`${user!.id}/`)||m.path.includes('..')))throw new CommunityError('Mídia inválida.')
 const {data}=checked(await s.from('community_posts').update(p).eq('id',p.id).eq('user_id',user!.id).select('id').maybeSingle())
 if(!data)throw new CommunityError('Publicação indisponível para edição.',404)
 return NextResponse.json({id:p.id})
}catch(e){return failure(e)}}
export async function DELETE(req:Request){try{
 origin(req);const {s,user}=await context(true);const b=await req.json();const id=uuid.parse(b.id)
 const table=b.action==='comment'?'community_comments':b.action==='post'?'community_posts':null
 if(!table)throw new CommunityError('Ação inválida.')
 const {data}=checked(await s.from(table).delete().eq('id',id).eq('user_id',user!.id).select('id').maybeSingle())
 if(!data)throw new CommunityError('Conteúdo indisponível.',404)
 return NextResponse.json({ok:true})
}catch(e){return failure(e)}}
