import { createClient } from '@/lib/supabase/server'
import CommunityFeed from '@/components/community/CommunityFeed'
import FollowUserButton from '@/components/FollowUserButton'
import DirectMessageButton from '@/components/DirectMessageButton'
import ReputationBadge from '@/components/ReputationBadge'
import UserBadge from '@/components/UserBadge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { safeImage } from '@/lib/community/shared'
import { z } from 'zod'
import ProfileCoverEditor from '@/components/ProfileCoverEditor'
import { CalendarDays, Car, MapPin, MessageSquareText, Pencil, Plus, Trophy, Users, Wrench, Zap } from 'lucide-react'

export const dynamic='force-dynamic'

function number(value:unknown){return Math.max(0,Number(value)||0)}

export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{pagina?:string}>}){
  const {id}=await params
  if(!z.string().uuid().safeParse(id).success)notFound()
  const q=await searchParams
  const page=Math.max(1,Math.min(10000,Number(q.pagina)||1))
  const s=await createClient()

  const [{data:p,error},{data:{user}},counts,cars,postCount,eventCount]=await Promise.all([
    s.from('profiles').select('id,name,avatar_url,profile_cover_url,city,state,bio,badge,xp_points,reputation_level,created_at').eq('id',id).maybeSingle(),
    s.auth.getUser(),
    s.rpc('community_follow_counts',{target:id}),
    s.from('listings').select('id,title,cover_url,brand,model,year,power_cv,vehicle_styles,description').eq('user_id',id).eq('listing_mode','garage').eq('status','active').order('created_at',{ascending:false}).range((page-1)*12,page*12),
    s.from('community_posts').select('id',{count:'exact',head:true}).eq('user_id',id).eq('status','published'),
    s.from('events').select('id',{count:'exact',head:true}).eq('created_by',id).in('status',['published','pending'])
  ])

  if(error)throw new Error('Não foi possível carregar o perfil.')
  if(!p)notFound()

  const own=user?.id===id
  const followers=counts.error?0:number(counts.data?.followers)
  const following=counts.error?0:number(counts.data?.following)
  const garage=(cars.data||[]).slice(0,12)
  const xp=number((p as any).xp_points)
  const level=String((p as any).reputation_level||'ROOKIE').toUpperCase()
  const joined=(p as any).created_at?new Date((p as any).created_at).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}):null

  return <>
    <section className="cm-public-profile" id="perfil">
      <div className={`cm-profile-cover ${safeImage((p as any).profile_cover_url)?'has-image':''}`} style={safeImage((p as any).profile_cover_url)?{backgroundImage:`linear-gradient(90deg,rgba(5,5,7,.42),rgba(10,0,3,.22)),url(${safeImage((p as any).profile_cover_url)})`}:undefined}><span>FULLSEND</span><b>GARAGE PROFILE</b>{own?<ProfileCoverEditor/>:null}</div>
      <div className="cm-profile-shell">
        <div className="cm-profile-identity">
          <span className="cm-profile-avatar-xl">{safeImage(p.avatar_url)?<img src={safeImage(p.avatar_url)} alt={`Foto de ${p.name||'membro FULLSEND'}`}/>:<b>{(p.name||'F').slice(0,1).toUpperCase()}</b>}</span>
          <div className="cm-profile-nameblock">
            <div className="cm-profile-name-line"><h1>{p.name||'Membro FULLSEND'}</h1><UserBadge badge={(p as any).badge}/><ReputationBadge level={level} xp={xp}/></div>
            <p className="cm-profile-location">{p.city||p.state?<><MapPin size={14}/>{[p.city,p.state].filter(Boolean).join(' / ')}</>:<>FULLSEND COMMUNITY</>}</p>
            {p.bio?<p className="cm-profile-bio">{p.bio}</p>:<p className="cm-profile-bio muted">Esse gearhead ainda não contou a história da garagem.</p>}
          </div>
          <div className="cm-profile-actions">
            {own?<><Link className="cm-profile-action primary" href="/perfil"><Pencil size={15}/> EDITAR PERFIL</Link><Link className="cm-profile-action" href="/garagem/adicionar"><Plus size={15}/> ADICIONAR PROJETO</Link></>:<><FollowUserButton userId={id}/><DirectMessageButton recipientId={id}/></>}
          </div>
        </div>

        <div className="cm-profile-stats">
          <div><strong>{followers.toLocaleString('pt-BR')}</strong><span><Users size={13}/> SEGUIDORES</span></div>
          <div><strong>{following.toLocaleString('pt-BR')}</strong><span>SEGUINDO</span></div>
          <div><strong>{garage.length.toLocaleString('pt-BR')}</strong><span><Car size={13}/> PROJETOS</span></div>
          <div><strong>{xp.toLocaleString('pt-BR')}</strong><span><Zap size={13}/> XP</span></div>
        </div>

        <div className="cm-profile-level">
          <div><span>NÍVEL FULLSEND</span><strong>{level}</strong></div>
          <div className="cm-profile-level-track"><i style={{width:`${Math.min(100,Math.max(8,xp?((xp%2500)/2500)*100:8))}%`}}/></div>
          <small>{joined?`Na comunidade desde ${joined}`:'Cultura automotiva • Projetos • Conexão'}</small>
        </div>
      </div>
    </section>

    <nav className="cm-profile-tabs" aria-label="Navegação do perfil">
      <a href="#garagem"><Car size={15}/> GARAGEM</a>
      <a href="#publicacoes"><MessageSquareText size={15}/> PUBLICAÇÕES</a>
      <a href="#eventos"><CalendarDays size={15}/> EVENTOS</a>
      <a href="#sobre"><Trophy size={15}/> SOBRE</a>
    </nav>

    <section className="cm-profile-section" id="garagem">
      <div className="cm-profile-section-head"><div><span>GARAGE BUILDS</span><h2>Minha Garagem</h2></div>{own?<Link href="/garagem/adicionar"><Plus size={15}/> NOVO PROJETO</Link>:null}</div>
      {cars.error?<p className="cm-error">Não foi possível carregar os carros.</p>:garage.length?<div className="cm-profile-garage-grid">{garage.map((c:any)=><Link key={c.id} className="cm-profile-car" href={`/comunidade/projeto/${c.id}`}>
        <div className="cm-profile-car-media">{safeImage(c.cover_url)?<img loading="lazy" src={safeImage(c.cover_url)} alt={c.title}/>:<Car size={38}/>}<span>PROJETO FULLSEND</span></div>
        <div className="cm-profile-car-copy"><small>{[c.brand,c.model].filter(Boolean).join(' • ')||'MINHA GARAGEM'}</small><h3>{c.title}</h3><p>{[c.year,c.power_cv?`${c.power_cv} cv`:null,Array.isArray(c.vehicle_styles)?c.vehicle_styles.slice(0,2).join(' • '):null].filter(Boolean).join(' • ')||'Projeto automotivo'}</p><b>VER PROJETO →</b></div>
      </Link>)}</div>:<div className="cm-profile-empty"><Wrench size={30}/><h3>Nenhum projeto público ainda</h3><p>Os carros adicionados à Minha Garagem aparecem aqui.</p>{own?<Link href="/garagem/adicionar">ADICIONAR PRIMEIRO PROJETO</Link>:null}</div>}
      <div className="cm-row cm-profile-pages">{page>1&&<Link href={`?pagina=${page-1}#garagem`}>← Projetos anteriores</Link>}{(cars.data||[]).length>12&&<Link href={`?pagina=${page+1}#garagem`}>Mais projetos →</Link>}</div>
    </section>

    <section className="cm-profile-about" id="sobre">
      <div><span>ATIVIDADE</span><strong>{number(postCount.count)}</strong><small>PUBLICAÇÕES</small></div>
      <div><span>AGENDA</span><strong>{number(eventCount.count)}</strong><small>EVENTOS CRIADOS</small></div>
      <div><span>REPUTAÇÃO</span><strong>{level}</strong><small>{xp.toLocaleString('pt-BR')} XP</small></div>
      <div><span>GARAGEM</span><strong>{garage.length}</strong><small>PROJETOS PÚBLICOS</small></div>
    </section>

    <div id="eventos" className="cm-profile-event-link">{number(eventCount.count)>0?<Link href="/eventos"> <CalendarDays size={16}/> Ver eventos da comunidade e os eventos deste gearhead →</Link>:null}</div>
    <div id="publicacoes" className="cm-profile-feed-title"><span>ATIVIDADE RECENTE</span><h2>Publicações de {p.name||'membro FULLSEND'}</h2></div>
    <CommunityFeed author={id}/>
  </>
}
