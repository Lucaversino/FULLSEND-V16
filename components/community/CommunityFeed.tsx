'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { Plus,Search,ArrowUpRight,RefreshCw } from 'lucide-react'
import { FILTERS,request,type CommunityPost } from '@/lib/community/shared'
import Composer from './Composer'
import UserResult from './UserResult'
import UserDiscovery from './UserDiscovery'
import PostCard from './PostCard'
import './community.css'
export default function CommunityFeed({author,vehicle,tag,postId,saved=false}:{author?:string;vehicle?:string;tag?:string;postId?:string;saved?:boolean}){
 const [filter,setFilter]=useState(saved?'Salvos':'Recentes'),[query,setQuery]=useState(''),[input,setInput]=useState(''),[city,setCity]=useState(''),[state,setState]=useState(''),[location,setLocation]=useState({city:'',state:''})
 const [posts,setPosts]=useState<CommunityPost[]>([]),[page,setPage]=useState(1),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tick,setTick]=useState(0),[composing,setComposing]=useState(false)
 const [sessionBusy,setSessionBusy]=useState(false),[sessionError,setSessionError]=useState('')
 const [viewer,setViewer]=useState<string|null>(null),[isAdmin,setIsAdmin]=useState(false),[people,setPeople]=useState<any[]>([]),[cars,setCars]=useState<any[]>([])
 function refresh(){setPage(1);setTick(n=>n+1)}
 // A sessão não depende da consulta do feed ou das tabelas da Comunidade.
 useEffect(()=>{let active=true
  request('/api/community?mode=session').then(d=>{if(active){setViewer(d.viewer);setIsAdmin(d.isAdmin)}}).catch(()=>{/* O clique verifica novamente e mostra falhas temporárias. */})
  return()=>{active=false}
 },[])
 useEffect(()=>{let active=true;setLoading(true);setError('');if(page===1)setPosts([])
  const params=new URLSearchParams({filter,page:String(page),q:query,city:location.city,state:location.state})
  if(author)params.set('author',author);if(vehicle)params.set('vehicle',vehicle);if(tag)params.set('tag',tag);if(postId)params.set('id',postId)
  request(`/api/community?${params}`).then(d=>{if(!active)return;setPosts(old=>page===1?d.items:Array.from(new Map([...old,...d.items].map((x:any)=>[x.id,x])).values()));setMore(d.hasMore);if(page===1){setPeople(d.people);setCars(d.cars)}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[author,vehicle,tag,postId,filter,page,query,location,tick])
 async function create(){
  if(sessionBusy)return
  setSessionBusy(true);setSessionError('')
  try{
   const session=await request('/api/community?mode=session')
   setViewer(session.viewer);setIsAdmin(session.isAdmin)
   if(!session.viewer){window.location.href='/login?next='+encodeURIComponent(window.location.pathname+window.location.search);return}
   setComposing(true)
  }catch(e){setSessionError(e instanceof Error?e.message:'Não foi possível verificar sua sessão. Tente novamente.')}
  finally{setSessionBusy(false)}
 }
 return <div className="cm-root">
  <nav className="cm-nav" aria-label="Comunidade"><Link href="/comunidade">Comunidade</Link><Link href="/perfil">Minha Garagem</Link><Link href="/comunidade/salvos">Publicações salvas</Link><Link href="/eventos">Eventos <ArrowUpRight size={13}/></Link></nav>
  <div className="cm-layout"><aside className="cm-sidebar"><span className="cm-eyebrow">CULTURA AUTOMOTIVA</span><h2>Sua garagem.<br/>Sua história.</h2><p>Projetos, encontros e conversas de quem vive o mundo automotivo.</p><button className="cm-primary" onClick={create} disabled={sessionBusy}><Plus size={17}/> Criar publicação</button><Link className="cm-side-link" href="/perfil">Abrir minha garagem →</Link><Link className="cm-side-link" href="/comunidade/salvos">Ver publicações salvas →</Link><UserDiscovery/><div className="cm-side-note">Compartilhe conhecimento. Respeite outros membros. Denuncie golpes e conteúdo inadequado.</div></aside>
  <section className="cm-feed"><div className="cm-row cm-feed-title"><h2>{postId?'Publicação':tag?`#${tag}`:saved?'Publicações salvas':vehicle?'Diário e publicações do projeto':author?'Publicações do membro':'Na comunidade'}</h2><button onClick={refresh} disabled={loading} aria-label="Atualizar feed"><RefreshCw size={16}/></button></div>
   {!postId&&<form className="cm-search" onSubmit={e=>{e.preventDefault();setQuery(input);setPage(1)}}><Search size={18}/><input aria-label="Buscar na Comunidade" value={input} onChange={e=>setInput(e.target.value)} maxLength={100} placeholder="Busque pessoas, carros, projetos e hashtags"/><button>Buscar</button></form>}
   {!postId&&!saved&&!vehicle&&!author&&!tag&&<div className="cm-filters" role="group" aria-label="Filtros do feed">{FILTERS.map(f=><button key={f} aria-pressed={filter===f} onClick={()=>{setFilter(f);setPage(1)}}>{f}</button>)}</div>}
   {filter==='Para você'&&<p className="cm-muted">Prioriza quem você segue e publicações da cidade do seu perfil.</p>}
   {filter==='Perto de mim'&&<form className="cm-location" onSubmit={e=>{e.preventDefault();setLocation({city,state});setPage(1)}}><p>Informe sua cidade ou UF. Se deixar em branco, será usada a região do seu perfil.</p><label>Cidade<input value={city} maxLength={100} onChange={e=>setCity(e.target.value)}/></label><label>UF<input value={state} maxLength={2} onChange={e=>setState(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))}/></label><button>Aplicar região</button></form>}
   <button className="cm-mobile-create cm-primary" onClick={create} disabled={sessionBusy}><Plus size={18}/> Criar publicação</button>
   {sessionError&&<p className="cm-error" role="alert">{sessionError}</p>}
   {composing&&<Composer vehicleId={vehicle} onClose={()=>setComposing(false)} onDone={()=>{setComposing(false);refresh()}}/>}
   {(people.length>0||cars.length>0)&&<div className="cm-card cm-search-results">{people.length>0&&<><h3>Pessoas</h3>{people.map(p=><UserResult key={p.id} person={p}/>)}</>}{cars.length>0&&<><h3>Carros e projetos</h3>{cars.map(c=><Link key={c.id} href={`/comunidade/projeto/${c.id}`}>{c.title} →</Link>)}</>}</div>}
   {error&&<div role="alert" className="cm-card cm-error"><p>{error}</p><button onClick={()=>setTick(n=>n+1)}>Tentar novamente</button></div>}
   {posts.map(p=><PostCard key={`${p.id}:${p.updated_at}`} post={p} viewer={viewer} isAdmin={isAdmin} onChange={refresh}/>)}
   {loading&&<div className="cm-card cm-empty" role="status">Carregando publicações…</div>}
   {!loading&&!error&&!posts.length&&<div className="cm-card cm-empty"><h3>{postId?'Publicação indisponível':'Nenhuma publicação por aqui ainda'}</h3><p>{postId?'O conteúdo pode ter sido removido ou ocultado.':query?'Tente outro termo de busca.':saved?'As publicações que você salvar aparecerão aqui.':'Compartilhe uma foto, uma dúvida ou a evolução do seu carro.'}</p>{!postId&&!saved&&<button className="cm-primary" onClick={create} disabled={sessionBusy}>Criar publicação</button>}</div>}
   {more&&!loading&&!error&&<button className="cm-load" onClick={()=>setPage(p=>p+1)}>Carregar mais publicações</button>}
  </section></div>
 </div>
}
