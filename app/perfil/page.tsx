import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Car, BadgeCheck, Sparkles, ChevronRight, MessageSquareText, Zap } from 'lucide-react'
import UserBadge from '@/components/UserBadge'
import ProfileOverview from '@/components/ProfileOverview'
import UserListingActions from '@/components/UserListingActions'
import GarageVehicleActions from '@/components/GarageVehicleActions'
import DirectMessageButton from '@/components/DirectMessageButton'
import FollowUserButton from '@/components/FollowUserButton'
import ListingBoostButton from '@/components/ListingBoostButton'
import ReputationPanel from '@/components/ReputationPanel'
import UserEventsPanel from '@/components/events/UserEventsPanel'

export const dynamic='force-dynamic'

function money(value:any){
  if(value===null||value===undefined||value==='')return 'Consulte'
  const n=Number(value)
  if(!Number.isFinite(n))return 'Consulte'
  return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
}

export default async function Perfil(){
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)redirect('/login')

  let unreadMessages=0
  try{
    const admin=createAdminClient()
    const {data:convs}=await admin.from('conversations')
      .select('id')
      .or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)
    const ids=(convs||[]).map((x:any)=>x.id)
    if(ids.length){
      const {count}=await admin.from('messages')
        .select('id',{count:'exact',head:true})
        .in('conversation_id',ids)
        .neq('sender_id',user.id)
        .is('read_at',null)
      unreadMessages=count||0
    }
  }catch{}

  let followedContacts:any[]=[]
  try{
    const admin=createAdminClient()
    const {data:follows}=await admin.from('user_follows')
      .select('followed_id,created_at')
      .eq('follower_id',user.id)
      .order('created_at',{ascending:false})
      .limit(50)

    const ids=(follows||[]).map((x:any)=>x.followed_id)
    if(ids.length){
      const {data:contacts}=await admin.from('profiles')
        .select('id,name,avatar_url,badge,city,state')
        .in('id',ids)

      const map=new Map((contacts||[]).map((x:any)=>[x.id,x]))
      followedContacts=(follows||[]).map((x:any)=>map.get(x.followed_id)).filter(Boolean)
    }
  }catch{}

  let xpHistory:any[]=[]
  try{
    const admin=createAdminClient()
    const {data}=await admin.from('xp_ledger')
      .select('id,action_key,points,note,created_at')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false})
      .limit(8)
    xpHistory=data||[]
  }catch{}

  let myEvents:any[]=[]
  try{
    const admin=createAdminClient()
    const {data}=await admin.from('events')
      .select('id,slug,title,description,category,event_date,end_date,event_time,venue,address,google_maps_url,latitude,longitude,city,state,image_url,ticket_url,source_url,status,featured,created_at,created_by')
      .eq('created_by',user.id)
      .order('created_at',{ascending:false})
    myEvents=data||[]
  }catch{}

  const [{data:p},{data:a,error:adsError}]=await Promise.all([
    s.from('profiles').select('*').eq('id',user.id).maybeSingle(),
    s.from('listings')
      .select('id,title,status,created_at,slug,is_featured,is_vip,cover_url,media,description,category_slug,tags,whatsapp,price,city,state,brand,model,year,mileage,fuel,transmission,vehicle_styles,color,body_type,engine,power_cv,doors,condition,features,listing_mode')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false})
  ])

  const allItems=a||[]
  const ads=allItems.filter((x:any)=>x.listing_mode!=='garage')
  const garageCars=allItems.filter((x:any)=>x.listing_mode==='garage'&&x.category_slug==='carros')
  const active=ads.filter((x:any)=>x.status==='active').length
  const featured=ads.filter((x:any)=>x.is_featured).length
  const vipAds=ads.filter((x:any)=>x.is_vip).length
  const boosted=ads.filter((x:any)=>x.is_featured||x.is_vip).length

  return <main className="section user-dashboard-page">
    <div className="container user-dashboard-container">
      <div className="user-dashboard-head">
        <div>
          <span className="section-kicker">PAINEL FULLSEND</span>
          <h1>PAINEL DO USUÁRIO</h1>
          <p>Seus classificados, sua garagem pessoal, comunidade e eventos em áreas separadas.</p>
        </div>
        <div className="user-dashboard-top-actions">
          <Link className="user-messages-cta" href="/mensagens"><MessageSquareText size={16}/><span><b>MENSAGENS</b><small>{unreadMessages?`${unreadMessages} não lida${unreadMessages===1?'':'s'}`:'Caixa de entrada'}</small></span>{unreadMessages?<em>{unreadMessages}</em>:null}</Link>
          <Link className="btn fx-main-btn" href="/garagem/adicionar"><Plus size={16}/> ADICIONAR À GARAGEM</Link><Link className="btn btn-red fx-main-btn fx-main-btn-red fs-hero-action" href="/anunciar"><Plus size={16}/> NOVO ANÚNCIO</Link>
        </div>
      </div>

      <ProfileOverview profile={p||{}} email={user.email} isVip={false}/>
      <ReputationPanel xp={Number((p as any)?.xp_points||0)} level={(p as any)?.reputation_level||'ROOKIE'} history={xpHistory}/>

      <section className="user-stats">
        <article><Car size={18}/><div><small>CLASSIFICADOS</small><b>{ads.length}</b></div></article>
        <article><BadgeCheck size={18}/><div><small>ATIVOS</small><b>{active}</b></div></article>
        <article><Sparkles size={18}/><div><small>MINHA GARAGEM</small><b>{garageCars.length}</b></div></article>
        <article><Zap size={18}/><div><small>IMPULSIONADOS</small><b>{boosted}</b></div></article>
      </section>

      <section className="user-boost-info"><div><span>IMPULSIONE SEU ANÚNCIO</span><h2>MAIS VISIBILIDADE, SEM ASSINATURA</h2><p>Escolha DESTAQUE por 7 dias ou VIP por 15 dias. Pagamento único por Pix e ativação automática.</p></div><div className="user-boost-prices"><b>DESTAQUE <em>R$ 4,99</em></b><b>VIP <em>R$ 9,99</em></b></div></section>

      <section className="user-contacts-panel">
        <div className="user-ads-head">
          <div><span>REDE FULLSEND</span><h2>CONTATOS SALVOS</h2></div>
          <small>{followedContacts.length} contato{followedContacts.length===1?'':'s'}</small>
        </div>
        {followedContacts.length ? (
          <div className="user-contacts-grid">
            {followedContacts.map((contact:any)=><article key={contact.id} className="user-contact-card">
              <div className="user-contact-avatar">
                {contact.avatar_url?<img src={contact.avatar_url} alt=""/>:<span>{String(contact.name||'U').slice(0,1).toUpperCase()}</span>}
              </div>
              <div className="user-contact-copy">
                <strong>{contact.name||'Usuário FULLSEND'}</strong>
                <small>{contact.city?`${contact.city}${contact.state?` / ${contact.state}`:''}`:'Membro FULLSEND'}</small>
                <UserBadge badge={contact.badge} compact/>
              </div>
              <div className="user-contact-actions">
                <DirectMessageButton recipientId={contact.id}/>
                <FollowUserButton userId={contact.id} compact/>
              </div>
            </article>)}
          </div>
        ) : (
          <div className="user-contacts-empty">Quando você clicar em <b>SEGUIR</b> em um anunciante, o contato ficará salvo aqui.</div>
        )}
      </section>

      <section className="user-contacts-panel"><div className="user-ads-head"><div><span>REDE FULLSEND</span><h2>COMUNIDADE</h2></div></div><div className="user-dashboard-top-actions"><Link className="btn btn-red" href="/comunidade">ABRIR COMUNIDADE</Link><Link className="btn" href="/comunidade/salvos">PUBLICAÇÕES SALVAS</Link><Link className="btn" href={`/comunidade/usuario/${user.id}`}>MEU PERFIL PÚBLICO</Link></div></section>
      <section className="user-garage-projects-panel">
        <div className="user-ads-head">
          <div><span>MEUS CARROS</span><h2>MINHA GARAGEM</h2><p>Carros e projetos que são realmente seus. Eles aparecem na Comunidade FULLSEND e não nos classificados.</p></div>
          <div className="garage-head-actions"><small>{garageCars.length} carro{garageCars.length===1?'':'s'}</small><Link className="btn btn-red" href="/garagem/adicionar"><Plus size={14}/> ADICIONAR CARRO</Link></div>
        </div>
        {garageCars.length?(
          <div className="garage-project-grid">
            {garageCars.map((x:any)=><article key={x.id} className="garage-project-card">
              <Link href={`/comunidade/projeto/${x.id}`} className="garage-project-cover">
                {x.cover_url?<img src={x.cover_url} alt={x.title}/>:<div><Car size={34}/><span>SEM FOTO</span></div>}
                <span className="garage-project-label">MEU PROJETO</span>
              </Link>
              <div className="garage-project-body">
                <small>{[x.brand,x.model,x.year].filter(Boolean).join(' · ')}</small>
                <h3>{x.title}</h3>
                <p>{x.city||'Brasil'}{x.state?` / ${x.state}`:''}{x.power_cv?` • ${x.power_cv} cv`:''}</p>
                <div className="garage-project-links">
                  <Link href={`/comunidade/projeto/${x.id}`}>DIÁRIO DO PROJETO</Link>
                  <Link href={`/comunidade?vehicle=${x.id}`}>POSTS DO CARRO</Link>
                </div>
                <GarageVehicleActions vehicle={x}/>
              </div>
            </article>)}
          </div>
        ):<div className="user-empty-garage"><Car size={42}/><h3>SUA GARAGEM PESSOAL ESTÁ VAZIA</h3><p>Adicione seu próprio carro ou projeto para usar na Comunidade FULLSEND.</p><Link href="/garagem/adicionar">ADICIONAR MEU CARRO</Link></div>}
      </section>

      <UserEventsPanel events={myEvents}/>

      <section className="user-ads-panel">
        <div className="user-ads-head"><div><span>CLASSIFICADOS</span><h2>MEUS ANÚNCIOS À VENDA</h2><p>Veículos e itens que você está anunciando. Aqui você pode ativar, pausar, editar e excluir.</p></div><small>{ads.length} anúncio{ads.length===1?'':'s'}</small></div>
        {adsError?<div className="user-dashboard-warning">Não foi possível carregar os anúncios agora. Atualize a página.</div>:null}
        {ads.length?(
          <div className="user-ad-list">
            {ads.map((x:any)=><article key={x.id} className={`user-ad-card ${x.is_vip?'vip':''} ${x.is_featured?'featured':''}`}>
              <Link href={`/anuncio/${x.slug}`} className="user-ad-thumb">
                {x.cover_url?<img src={x.cover_url} alt={x.title}/>:<div><Car size={30}/><span>SEM FOTO</span></div>}
                {x.is_vip?<span className="user-ad-badge vip">VIP</span>:x.is_featured?<span className="user-ad-badge featured">DESTAQUE</span>:null}
              </Link>
              <div className="user-ad-body">
                <div className="user-ad-title-row"><div><h3>{x.title}</h3><p>{x.city||'Brasil'}{x.state?` / ${x.state}`:''}</p></div><span className={`user-status ${x.status==='active'?'active':x.status==='draft'?'paused':x.status==='sold'?'sold':x.status==='blocked'?'blocked':''}`}>{x.status==='active'?'NOS CLASSIFICADOS':x.status==='draft'?'FORA DOS CLASSIFICADOS':x.status==='sold'?'VENDIDO':x.status==='blocked'?'BLOQUEADO':String(x.status).toUpperCase()}</span></div>
                <strong>{money(x.price)}</strong>
                <div className="user-ad-bottom">
                  <Link href={`/anuncio/${x.slug}`} className="user-view-ad">VER ANÚNCIO <ChevronRight size={14}/></Link>
                  <div className="user-ad-management">
                    <ListingBoostButton listingId={x.id} title={x.title} status={x.status} initialVip={Boolean(x.is_vip)} initialFeatured={Boolean(x.is_featured)}/>
                    <UserListingActions listing={x}/>
                  </div>
                </div>
              </div>
            </article>)}
          </div>
        ):<div className="user-empty-garage"><Car size={42}/><h3>VOCÊ NÃO POSSUI ANÚNCIOS</h3><p>Publique um veículo ou item nos classificados FULLSEND.</p><Link href="/anunciar">CRIAR ANÚNCIO</Link></div>}
      </section>
    </div>
  </main>
}
