import { createClient } from '@/lib/supabase/server'
import CommunityFeed from '@/components/community/CommunityFeed'
import FollowUserButton from '@/components/FollowUserButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { safeImage } from '@/lib/community/shared'
import { z } from 'zod'
export const dynamic='force-dynamic'
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{pagina?:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();const q=await searchParams;const page=Math.max(1,Math.min(10000,Number(q.pagina)||1));const s=await createClient()
 const [{data:p,error},{data:{user}},counts,cars]=await Promise.all([s.from('profiles').select('id,name,avatar_url,city,state,bio').eq('id',id).maybeSingle(),s.auth.getUser(),s.rpc('community_follow_counts',{target:id}),s.from('listings').select('id,title,cover_url').eq('user_id',id).order('created_at',{ascending:false}).range((page-1)*12,page*12)])
 if(error)throw new Error('Não foi possível carregar o perfil.');if(!p)notFound()
 return <><section className="cm-card cm-profile"><div className="cm-author"><span className="cm-avatar cm-avatar-large">{safeImage(p.avatar_url)?<img src={safeImage(p.avatar_url)} alt=""/>:(p.name||'F').slice(0,1)}</span><div><h2>{p.name||'Membro FULLSEND'}</h2><p>{p.city} {p.state&&`/ ${p.state}`}</p></div>{user?.id!==id&&<FollowUserButton userId={id}/>}</div><p className="cm-content">{p.bio}</p>{counts.error?<p className="cm-error">Seguidores indisponíveis no momento.</p>:<p>{counts.data?.followers||0} seguidores · {counts.data?.following||0} seguindo</p>}
 <h3>Garagem e projetos</h3>{cars.error?<p className="cm-error">Não foi possível carregar os carros.</p>:<><div className="cm-car-grid">{(cars.data||[]).slice(0,12).map(c=><Link key={c.id} href={`/comunidade/projeto/${c.id}`}>{safeImage(c.cover_url)&&<img loading="lazy" src={safeImage(c.cover_url)} alt=""/>}<strong>{c.title}</strong></Link>)}</div>{!cars.data?.length&&<p>Nenhum carro público nesta garagem.</p>}<div className="cm-row">{page>1&&<Link href={`?pagina=${page-1}`}>← Carros anteriores</Link>}{(cars.data||[]).length>12&&<Link href={`?pagina=${page+1}`}>Mais carros →</Link>}</div></>}{user?.id===id&&<Link href="/comunidade/salvos">Minhas publicações salvas →</Link>}</section><CommunityFeed author={id}/></>
}
