'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Heart,MessageCircle,Bookmark,Share2,MoreHorizontal,Flag,Car,ChevronLeft,ChevronRight } from 'lucide-react'
import { request,REASONS,safeImage,type CommunityPost } from '@/lib/community/shared'
import FollowUserButton from '@/components/FollowUserButton'
import EventAttendance from '@/components/events/EventAttendance'
import Composer from './Composer'

export default function PostCard({post:p,viewer,isAdmin,onChange}:{post:CommunityPost;viewer:string|null;isAdmin:boolean;onChange:()=>void}){
 const [liked,setLiked]=useState(p.liked),[saved,setSaved]=useState(p.saved),[likes,setLikes]=useState(Number(p.likes_count)),[count,setCount]=useState(Number(p.comments_count))
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState(false),[comments,setComments]=useState<any[]|null>(null),[page,setPage]=useState(1),[more,setMore]=useState(false)
 const [text,setText]=useState(''),[commentId,setCommentId]=useState(()=>crypto.randomUUID()),[report,setReport]=useState<string|null|false>(false),[reason,setReason]=useState<string>(REASONS[0]),[details,setDetails]=useState(''),[notice,setNotice]=useState('')
 const [captionExpanded,setCaptionExpanded]=useState(false),[activeMedia,setActiveMedia]=useState(0)
 const url=()=>`${window.location.origin}/comunidade/post/${p.id}`
 const captionIsLong=p.content.length>240||p.content.split('\n').length>4
 const visibleCaption=captionExpanded||!captionIsLong?p.content:`${p.content.slice(0,240).trimEnd()}…`
 const active=p.media[activeMedia]
 async function act(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir.')}finally{setBusy(false)}}
 async function loadComments(next=1){const d=await request(`/api/community?mode=comments&post=${p.id}&page=${next}`);setComments(c=>next===1?d.items:[...(c||[]),...d.items]);setPage(next);setMore(d.hasMore)}
 async function copy(){await navigator.clipboard.writeText(url());setNotice('Link copiado.')}
 async function toggleLike(force?:boolean){const next=force??!liked;if(next===liked)return;const result=await request('/api/community',{action:'like',id:p.id,enabled:next});setLikes(Number(result.count));setLiked(result.enabled)}
 async function toggleComments(){if(comments)setComments(null);else await loadComments()}
 function renderText(value:string){return value.split(/(#[\p{L}\p{N}_]+)/gu).map((part,i)=>part.startsWith('#')?<Link key={i} href={`/comunidade/tag/${encodeURIComponent(part.slice(1).toLowerCase())}`}>{part}</Link>:part)}
 if(editing)return <Composer initial={p} onClose={()=>setEditing(false)} onDone={()=>{setEditing(false);onChange()}}/>
 return <article className="cm-card cm-post cm-post-social">
  <header className="cm-post-head cm-post-head-social">
   <Link className="cm-author" href={`/comunidade/usuario/${p.user_id}`}>
    <span className="cm-avatar">{safeImage(p.author?.avatar_url)?<img src={safeImage(p.author.avatar_url)} alt="" loading="lazy"/>:(p.author?.name||'F').slice(0,1)}</span>
    <span><strong>{p.author?.name||'Membro FULLSEND'}</strong><small><time dateTime={p.created_at}>{new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time>{p.city?` · ${p.city}${p.state?` / ${p.state}`:''}`:''}</small></span>
   </Link>
   <div className="cm-post-head-actions">{viewer!==p.user_id&&<FollowUserButton userId={p.user_id} compact/>}<details className="cm-menu"><summary aria-label="Opções da publicação"><MoreHorizontal size={24}/></summary><div><button onClick={()=>act(copy)}>Copiar link</button><button onClick={()=>setReport(null)}>Denunciar</button>{viewer===p.user_id&&<><button onClick={()=>setEditing(true)}>Editar publicação</button><button disabled={busy} onClick={()=>{if(confirm('Excluir esta publicação?'))act(async()=>{await request('/api/community',{action:'post',id:p.id},'DELETE');onChange()})}}>Excluir publicação</button></>}{isAdmin&&<button disabled={busy} onClick={()=>act(async()=>{await request('/api/admin/community',{kind:'posts',id:p.id,status:'hidden'},'PATCH');onChange()})}>Ocultar como administrador</button>}</div></details></div>
  </header>

  {(p.vehicle||p.project_date)&&<div className="cm-context-row">{p.vehicle&&<Link className="cm-vehicle cm-vehicle-social" href={`/comunidade/projeto/${p.vehicle.id}`}><Car size={17}/><span>{p.vehicle.title}</span><b>Ver projeto →</b></Link>}{p.project_date&&<span className="cm-diary-tag cm-diary-tag-social">DIÁRIO · {p.project_date.split('-').reverse().join('/')}</span>}</div>}

  {!!p.media.length&&<div className="cm-media cm-media-social" onDoubleClick={()=>{if(!liked)act(()=>toggleLike(true))}}>
   <div className="cm-media-stage">
    {active?.url?(active.type.startsWith('video/')?<video key={active.path} src={active.url} controls playsInline preload="metadata" aria-label={`Vídeo ${activeMedia+1} da publicação`}/>:<img key={active.path} src={active.url} alt={`${p.title||'Publicação de '+p.author?.name} — foto ${activeMedia+1}`} loading="lazy"/>):<p>Mídia indisponível. Atualize a página.</p>}
    {p.media.length>1&&<><button className="cm-media-nav cm-media-prev" aria-label="Mídia anterior" onClick={()=>setActiveMedia(i=>(i-1+p.media.length)%p.media.length)}><ChevronLeft size={25}/></button><button className="cm-media-nav cm-media-next" aria-label="Próxima mídia" onClick={()=>setActiveMedia(i=>(i+1)%p.media.length)}><ChevronRight size={25}/></button><span className="cm-media-counter">{activeMedia+1}/{p.media.length}</span></>}
   </div>
   {p.media.length>1&&<div className="cm-media-dots" aria-label="Posição da galeria">{p.media.map((m,i)=><button key={m.path} aria-label={`Ir para mídia ${i+1}`} aria-current={i===activeMedia} onClick={()=>setActiveMedia(i)}/>)}</div>}
  </div>}

  <div className="cm-socialbar" aria-label="Ações da publicação">
   <div className="cm-socialbar-left">
    <button className={liked?'is-active':''} aria-pressed={liked} disabled={busy} title="Curtir" onClick={()=>act(()=>toggleLike())}><Heart size={25} fill={liked?'currentColor':'none'}/><span>{likes||''}</span></button>
    <button disabled={busy} title="Comentar" onClick={()=>act(toggleComments)}><MessageCircle size={25}/><span>{count||''}</span></button>
    <button disabled={busy} title="Compartilhar" onClick={()=>act(async()=>{if(navigator.share){try{await navigator.share({title:'FULLSEND Comunidade',url:url()})}catch(e){if((e as Error).name!=='AbortError')await copy()}}else await copy()})}><Share2 size={24}/><span className="cm-action-label">Compartilhar</span></button>
   </div>
   <button className={saved?'is-active':''} aria-pressed={saved} disabled={busy} title={saved?'Remover dos salvos':'Salvar'} onClick={()=>act(async()=>{await request('/api/community',{action:'save',id:p.id,enabled:!saved});setSaved(!saved)})}><Bookmark size={25} fill={saved?'currentColor':'none'}/></button>
  </div>

  <div className="cm-post-copy">
   <button className="cm-likes-line" disabled={busy} onClick={()=>act(()=>toggleLike())}>{likes>0?`${likes.toLocaleString('pt-BR')} ${likes===1?'curtida':'curtidas'}`:'Seja o primeiro a curtir'}</button>
   {p.title&&<h2 className="cm-post-title">{p.title}</h2>}
   <p className="cm-content cm-caption"><Link className="cm-caption-author" href={`/comunidade/usuario/${p.user_id}`}>{p.author?.name||'Membro FULLSEND'}</Link>{' '}{renderText(visibleCaption)}{captionIsLong&&<button className="cm-caption-more" onClick={()=>setCaptionExpanded(v=>!v)}>{captionExpanded?'menos':'mais'}</button>}</p>
   {p.parts&&<p className="cm-content cm-post-extra"><b>Peças instaladas:</b> {p.parts}</p>}
   {(p.power!==null||p.cost!==null)&&<div className="cm-specs cm-specs-social">{p.power!==null&&<span>{Number(p.power).toLocaleString('pt-BR')} cv</span>}{p.cost!==null&&<span>Custo: {Number(p.cost).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>}</div>}
   <div className="cm-tags cm-tags-social">{p.tags.map(t=><Link key={t} href={`/comunidade/tag/${encodeURIComponent(t)}`}>#{t}</Link>)}</div>
   {count>0&&<button className="cm-view-comments" disabled={busy} onClick={()=>act(toggleComments)}>{comments?'Ocultar comentários':`Ver ${count===1?'1 comentário':`todos os ${count} comentários`}`}</button>}
   <time className="cm-post-time" dateTime={p.created_at}>{new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short'})}</time>
  </div>

  {p.event&&<div className="cm-event"><Link href={`/eventos/${p.event.slug}`}><b>{p.event.title}</b><small>{p.event.event_date?.split('-').reverse().join('/')} {p.event.event_time?.slice(0,5)} · {p.event.venue} · {p.event.city} / {p.event.state}</small></Link>{p.event.status==='published'?<EventAttendance eventId={p.event.id}/>:<small>Aguardando aprovação na agenda</small>}</div>}

  {comments&&<section className="cm-comments" aria-label="Comentários">{comments.length===0&&<p className="cm-muted">Seja o primeiro a comentar.</p>}{comments.map(c=><div key={c.id} className="cm-comment"><Link href={`/comunidade/usuario/${c.user_id}`} className="cm-author"><span className="cm-avatar cm-avatar-small">{safeImage(c.author?.avatar_url)?<img src={safeImage(c.author.avatar_url)} alt="" loading="lazy"/>:(c.author?.name||'F').slice(0,1)}</span><b>{c.author?.name||'Membro FULLSEND'}</b></Link><p>{c.content}</p><small>{new Date(c.created_at).toLocaleString('pt-BR')}</small><div className="cm-row">{viewer===c.user_id&&<button disabled={busy} onClick={()=>act(async()=>{await request('/api/community',{action:'comment',id:c.id},'DELETE');setCount(n=>Math.max(0,n-1));await loadComments()})}>Excluir</button>}{isAdmin&&<button disabled={busy} onClick={()=>act(async()=>{await request('/api/admin/community',{kind:'comments',id:c.id,status:'hidden'},'PATCH');setCount(n=>Math.max(0,n-1));await loadComments()})}>Ocultar</button>}<button onClick={()=>setReport(c.id)}>Denunciar</button></div></div>)}{more&&<button disabled={busy} onClick={()=>act(()=>loadComments(page+1))}>Mais comentários</button>}<form className="cm-comment-form" onSubmit={e=>{e.preventDefault();act(async()=>{await request('/api/community',{action:'comment',id:p.id,commentId,content:text});setText('');setCommentId(crypto.randomUUID());setCount(n=>n+1);await loadComments()})}}><label>Seu comentário<textarea required maxLength={1500} value={text} onChange={e=>setText(e.target.value)} rows={2}/></label><button className="cm-primary" disabled={busy}>Publicar</button></form></section>}

  {report!==false&&<form className="cm-report" onSubmit={e=>{e.preventDefault();act(async()=>{await request('/api/community',{action:'report',id:p.id,commentId:report,reason,details});setReport(false);setNotice('Denúncia enviada para análise administrativa.')})}}><h3><Flag size={16}/> Denunciar conteúdo</h3><label>Motivo<select value={reason} onChange={e=>setReason(e.target.value)}>{REASONS.map(r=><option key={r}>{r}</option>)}</select></label><label>Detalhes (opcional)<textarea maxLength={1000} value={details} onChange={e=>setDetails(e.target.value)}/></label><div className="cm-row"><button type="button" onClick={()=>setReport(false)}>Cancelar</button><button disabled={busy} className="cm-primary">Enviar denúncia</button></div></form>}
  {error&&<p role="alert" className="cm-error">{error}</p>}{notice&&<p role="status" className="cm-notice">{notice}</p>}
 </article>
}
