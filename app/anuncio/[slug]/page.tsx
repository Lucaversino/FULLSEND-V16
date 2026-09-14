import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, MessageCircle, CalendarDays, Gauge, Fuel, Settings2, Car, Zap } from 'lucide-react'
import UserBadge from '@/components/UserBadge'
import ReputationBadge from '@/components/ReputationBadge'
import DirectMessageButton from '@/components/DirectMessageButton'

export default async function Anuncio({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const s=await createClient();const {data:x}=await s.from('listings').select('*').eq('slug',slug).eq('status','active').eq('listing_mode','classified').maybeSingle();if(!x)notFound()
  const {data:seller}=x.user_id?await s.from('profiles').select('name,avatar_url,badge,city,state,bio,xp_points,reputation_level').eq('id',x.user_id).maybeSingle():{data:null as any}
  const wa=(x.whatsapp||'').replace(/\D/g,'');const txt=encodeURIComponent(`Olá! Vi seu anúncio ${x.title} no FULLSEND.`);const imgs=Array.isArray(x.media)?x.media:[]
  return <main className="section"><div className="container"><div className="page-head"><span className="section-kicker">ANÚNCIO FULLSEND</span><h1>{x.title}</h1></div><div className="native-ad-layout"><div>{x.cover_url?<img src={x.cover_url} alt={x.title} className="native-ad-cover"/>:<div className="empty-state">Sem foto</div>}<div className="profile-list native-ad-details"><h3>DESCRIÇÃO DO ANUNCIANTE</h3><p className="muted native-ad-description">{x.description}</p>{imgs.length>1?<div className="native-ad-gallery">{imgs.slice(1).map((u:string)=><img key={u} src={u} alt="Foto do anúncio"/>)}</div>:null}</div></div><aside className="profile-card native-ad-sidebar"><span className="source-badge native static-source">FULLSEND</span><div className="listing-price native-ad-price">{x.price!=null?Number(x.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Consulte'}</div><div className="listing-location"><MapPin size={16}/>{x.city||'Brasil'}{x.state?` / ${x.state}`:''}</div>{x.category_slug==='carros'?<div className="native-vehicle-specs">
  {x.brand||x.model?<span><Car size={15}/><b>{[x.brand,x.model].filter(Boolean).join(' ')}</b></span>:null}
  {x.year?<span><CalendarDays size={15}/><b>{x.year}</b></span>:null}
  {x.mileage!=null?<span><Gauge size={15}/><b>{Number(x.mileage).toLocaleString('pt-BR')} km</b></span>:null}
  {x.fuel?<span><Fuel size={15}/><b>{x.fuel}</b></span>:null}
  {x.transmission?<span><Settings2 size={15}/><b>{x.transmission}</b></span>:null}
  {x.power_cv?<span><Zap size={15}/><b>{x.power_cv} cv</b></span>:null}
</div>:null}{seller?<div className="native-seller-card"><div className="native-seller-avatar">{seller.avatar_url?<img src={seller.avatar_url} alt=""/>:<span>{String(seller.name||'F')[0].toUpperCase()}</span>}</div><div><small>ANUNCIANTE</small><strong>{seller.name||'Membro FULLSEND'}</strong><div className="native-seller-badges"><UserBadge badge={seller.badge}/><ReputationBadge level={(seller as any).reputation_level||'ROOKIE'} xp={(seller as any).xp_points}/></div></div></div>:null}{seller&&x.user_id?<DirectMessageButton recipientId={x.user_id} listingId={x.id} listingTitle={x.title}/>:null}{wa?<a className="btn btn-red native-wa" href={`https://wa.me/55${wa}?text=${txt}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> CHAMAR NO WHATSAPP</a>:null}</aside></div></div></main>
}
