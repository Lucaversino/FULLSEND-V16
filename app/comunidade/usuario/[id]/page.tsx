import { createClient } from '@/lib/supabase/server'
import CommunityFeed from '@/components/community/CommunityFeed'
import FollowUserButton from '@/components/FollowUserButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { safeImage } from '@/lib/community/shared'
import { z } from 'zod'
import './profile.css'
import type {CSSProperties} from 'react'
import ReputationBadge from '@/components/ReputationBadge'
import VerifiedAvatarBadge from '@/components/VerifiedAvatarBadge'
import UserBadge from '@/components/UserBadge'
export const dynamic='force-dynamic'
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{pagina?:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();const q=await searchParams;const page=Math.max(1,Math.min(10000,Number(q.pagina)||1));const s=await createClient()
 const [{data:p,error},{data:{user}},counts,cars]=await Promise.all([s.from('profiles').select('id,name,avatar_url,city,state,bio,banner_url,profile_color,badge,role,reputation_level,xp_points,is_verified').eq('id',id).maybeSingle(),s.auth.getUser(),s.rpc('community_follow_counts',{target:id}),s.from('listings').select('id,title,cover_url,brand,model,year,power_cv',{count:'exact'}).eq('user_id',id).eq('listing_mode','garage').eq('status','active').order('created_at',{ascending:false}).range((page-1)*12,page*12)])
 if(error)throw new Error('Não foi possível carregar o perfil.');if(!p)notFound()
 const owner=user?.id===id
 const location=[p.city,p.state].filter(Boolean).join(' / ')
 return <div className="fs-public-profile" style={{'--profile-accent':/^#[0-9a-fA-F]{6}$/.test(p.profile_color||'')?p.profile_color:'#ff2546'} as CSSProperties}><section className="fs-profile-shell">
 <div className={`fs-profile-cover ${safeImage(p.banner_url)?'has-custom-cover':''}`}>{safeImage(p.banner_url)&&<img className="fs-profile-cover-photo" src={safeImage(p.banner_url)} alt="Capa do perfil"/>}<span>FULLSEND COMMUNITY</span><strong>SUA GARAGEM.<br/><em>SUA IDENTIDADE.</em></strong><small>CARROS CONECTAM PESSOAS.</small></div>
 <div className="fs-profile-identity"><div className="fs-profile-avatar-stack"><span className="verified-avatar-wrap"><div className="fs-profile-avatar">{safeImage(p.avatar_url)?<img src={safeImage(p.avatar_url)} alt={`Foto de ${p.name||'membro'}`}/>:(p.name||'F').slice(0,1)}</div><VerifiedAvatarBadge active={p.is_verified}/></span><UserBadge badge={p.role==='admin'?'admin':p.badge}/></div><div className="fs-profile-name"><span className="fs-profile-kicker">MEMBRO FULLSEND</span><div className="fs-profile-name-line"><h1>{p.name||'Membro FULLSEND'}</h1><div className="fs-profile-badges"><ReputationBadge level={p.reputation_level} xp={p.xp_points}/></div></div>{location&&<p>{location}</p>}</div><div className="fs-profile-actions">{owner?<Link href="/perfil">Editar meu perfil</Link>:<FollowUserButton userId={id}/>}<a href="#garagem">Ver garagem ↓</a></div></div>
 <div className="fs-profile-details"><p className="fs-profile-bio">{p.bio||(owner?'Sua história merece espaço aqui. Adicione uma bio no seu painel e conte o que move sua paixão por carros.':'Cada projeto tem uma história. Conheça a garagem e acompanhe as publicações deste membro.')}</p><div className="fs-profile-stats"><div><strong>{cars.error?'—':cars.count||0}</strong><span>na garagem</span></div><div><strong>{counts.error?'—':counts.data?.followers||0}</strong><span>seguidores</span></div><div><strong>{counts.error?'—':counts.data?.following||0}</strong><span>seguindo</span></div></div></div>
 {counts.error&&<p className="cm-error">Seguidores indisponíveis no momento.</p>}
 <nav className="fs-profile-nav" aria-label="Seções do perfil"><a href="#garagem">Garagem e projetos</a><a href="#publicacoes">Publicações</a>{owner&&<Link href="/comunidade/salvos">Minhas salvas</Link>}</nav></section>
 <section id="garagem" className="fs-profile-garage"><header><div><span className="fs-profile-kicker">MUITO ALÉM DE UM CARRO</span><h2>Garagem e projetos</h2></div>{owner&&<Link href="/perfil">Gerenciar garagem ↗</Link>}</header>
 {cars.error?<p className="cm-error">Não foi possível carregar os carros.</p>:<><div className="fs-profile-cars">{(cars.data||[]).slice(0,12).map(c=><Link className="fs-profile-car" key={c.id} href={`/comunidade/projeto/${c.id}`}><div className="fs-profile-car-image">{safeImage(c.cover_url)?<img loading="lazy" src={safeImage(c.cover_url)} alt={c.title}/>:<b>FULLSEND</b>}<span>PROJETO DA GARAGEM</span></div><div className="fs-profile-car-body"><small>{[c.brand,c.model,c.year].filter(Boolean).join(' · ')||'CULTURA AUTOMOTIVA'}</small><h3>{c.title}</h3><p>{c.power_cv?`${c.power_cv} cv · `:''}Conheça a história deste projeto</p><div>Explorar projeto <span>↗</span></div></div></Link>)}</div>{!cars.data?.length&&<div className="fs-profile-empty"><h3>Uma nova história começa na garagem.</h3><p>{owner?'Adicione seu carro e compartilhe a evolução do seu projeto.':'Este membro ainda não adicionou um carro público.'}</p>{owner&&<Link href="/perfil">Adicionar meu carro →</Link>}</div>}<div className="cm-row">{page>1&&<Link href={`?pagina=${page-1}#garagem`}>← Carros anteriores</Link>}{(cars.data||[]).length>12&&<Link href={`?pagina=${page+1}#garagem`}>Mais carros →</Link>}</div></>}
 </section><div id="publicacoes"><CommunityFeed author={id}/></div></div>
}
