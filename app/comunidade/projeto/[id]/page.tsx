import {createClient} from '@/lib/supabase/server'
import CommunityFeed from '@/components/community/CommunityFeed'
import ReputationBadge from '@/components/ReputationBadge'
import UserBadge from '@/components/UserBadge'
import ProjectCoverEditor from '@/components/ProjectCoverEditor'
import GarageVehicleActions from '@/components/GarageVehicleActions'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {safeImage} from '@/lib/community/shared'
import {z} from 'zod'
import {Car, Gauge, MapPin, Settings2, Wrench, Zap, Images, BookOpen, UserRound} from 'lucide-react'
export const dynamic='force-dynamic'
function txt(v:any){return v==null||v===''?'—':String(v)}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();const s=await createClient();const {data:{user}}=await s.auth.getUser()
 const {data:v,error}=await s.from('listings').select('id,user_id,title,slug,description,cover_url,media,brand,model,year,mileage,fuel,transmission,color,body_type,engine,power_cv,doors,condition,features,vehicle_styles,city,state,listing_mode,created_at').eq('id',id).maybeSingle()
 if(error)throw new Error('Não foi possível carregar o projeto.');if(!v)notFound();
 const {data:owner}=await s.from('profiles').select('id,name,avatar_url,city,state,badge,xp_points,reputation_level').eq('id',v.user_id).maybeSingle();const own=user?.id===v.user_id
 const media=Array.from(new Set([v.cover_url,...(Array.isArray(v.media)?v.media:[])].filter(Boolean))).slice(0,15) as string[]
 const specs=[['Marca',v.brand],['Modelo',v.model],['Ano',v.year],['Cidade',[v.city,v.state].filter(Boolean).join(' - ')],['Motor',v.engine],['Potência',v.power_cv?`${v.power_cv} cv`:null],['Câmbio',v.transmission],['Combustível',v.fuel],['Cor',v.color],['Quilometragem',v.mileage!=null?`${Number(v.mileage).toLocaleString('pt-BR')} km`:null],['Condição',v.condition]]
 return <>
  <section className="cm-project-pro">
   <div className="cm-project-hero" style={safeImage(v.cover_url)?{backgroundImage:`linear-gradient(90deg,rgba(4,4,6,.78),rgba(4,4,6,.12) 55%,rgba(4,4,6,.5)),url(${safeImage(v.cover_url)})`}:undefined}>
    <div className="cm-project-hero-copy"><span>FULLSEND PROJECT GARAGE</span><small>{v.brand||'PROJETO'}</small><h1>{v.title}</h1><p>MORE THAN A CAR • A LIFESTYLE</p></div>{own?<ProjectCoverEditor projectId={v.id}/>:null}
   </div>
   <div className="cm-project-ownerbar"><div className="cm-project-avatar">{safeImage(owner?.avatar_url)?<img src={safeImage(owner?.avatar_url)} alt=""/>:<UserRound/>}</div><div className="cm-project-title"><span>PROJETO</span><h2>{v.title}</h2><p>{[v.brand,v.model,v.year,v.city,v.state].filter(Boolean).join(' · ')}</p></div><Link className="cm-project-owner" href={`/comunidade/usuario/${v.user_id}`}><b>{owner?.name||'Membro FULLSEND'}</b><div><UserBadge badge={(owner as any)?.badge}/><ReputationBadge level={(owner as any)?.reputation_level||'ROOKIE'} xp={Number((owner as any)?.xp_points)||0}/></div><small>VER PERFIL DO PROPRIETÁRIO →</small></Link></div>
   <nav className="cm-project-tabs"><a href="#visao"><Car size={15}/> VISÃO GERAL</a><a href="#fotos"><Images size={15}/> FOTOS</a><a href="#mods"><Wrench size={15}/> MODIFICAÇÕES</a><a href="#diario"><BookOpen size={15}/> DIÁRIO DO PROJETO</a><a href="#specs"><Settings2 size={15}/> ESPECIFICAÇÕES</a></nav>
   <div className="cm-project-grid" id="visao"><div>
    <section className="cm-project-gallery" id="fotos">{media.length?<><div className="cm-project-mainphoto"><img src={safeImage(media[0])!} alt={v.title}/></div><div className="cm-project-thumbs">{media.slice(0,6).map((m,i)=><div key={m}><img loading="lazy" src={safeImage(m)!} alt={`${v.title} ${i+1}`}/>{i===5&&media.length>6?<b>+{media.length-6}</b>:null}</div>)}</div></>:<div className="cm-project-no-photo"><Car size={50}/><span>Adicione fotos ao seu projeto</span></div>}</section>
    <section className="cm-project-panel" id="mods"><div className="cm-project-panel-head"><h3>MODIFICAÇÕES / PEÇAS</h3><Wrench size={18}/></div>{v.features?<p className="cm-project-featuretext">{v.features}</p>:<p className="cm-project-muted">Nenhuma modificação cadastrada ainda. A evolução começa aqui.</p>}{Array.isArray(v.vehicle_styles)&&v.vehicle_styles.length?<div className="cm-project-tags">{v.vehicle_styles.map((x:string)=><span key={x}>#{x}</span>)}</div>:null}</section>
   </div><aside>
    <section className="cm-project-panel"><div className="cm-project-panel-head"><h3>SOBRE O PROJETO</h3><Zap size={18}/></div><p>{v.description||'Esse gearhead ainda não contou todos os detalhes deste projeto.'}</p><div className="cm-project-quote">SONHO. PLANO. PROJETO. REALIDADE.</div></section>
    <section className="cm-project-panel" id="specs"><div className="cm-project-panel-head"><h3>ESPECIFICAÇÕES</h3><Gauge size={18}/></div><div className="cm-project-specs">{specs.map(([a,b])=><div key={String(a)}><span>{a}</span><b>{txt(b)}</b></div>)}</div></section>
    {own?<section className="cm-project-manage"><strong>GERENCIAR MEU PROJETO</strong><p>Edite os dados ou coloque este carro à venda nos Classificados.</p><GarageVehicleActions vehicle={v}/></section>:null}
   </aside></div>
  </section>
  <div id="diario" className="cm-project-diary-head"><span>DIÁRIO DO PROJETO</span><h2>A evolução continua</h2><p>Publicações vinculadas a este carro ficam reunidas aqui.</p></div>
  <CommunityFeed vehicle={id}/>
 </>
}
