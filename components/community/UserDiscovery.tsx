'use client'
import { useEffect,useState } from 'react'
import { Search } from 'lucide-react'
import { request } from '@/lib/community/shared'
import UserResult,{type CommunityPerson} from './UserResult'
export default function UserDiscovery(){
 const [input,setInput]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[tick,setTick]=useState(0)
 const [items,setItems]=useState<CommunityPerson[]>([]),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(input.trim());setPage(1)},300);return()=>clearTimeout(timer)},[input])
 useEffect(()=>{let active=true;setLoading(true);setError('');setItems([])
  request(`/api/community?mode=users&q=${encodeURIComponent(query)}&page=${page}`).then(data=>{if(active){setItems(data.items);setMore(data.hasMore)}}).catch(e=>{if(active){setError(e instanceof Error?e.message:'Não foi possível carregar os usuários.');setMore(false)}}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[query,page,tick])
 return <section className="cm-user-discovery" aria-label="Buscar usuários da Comunidade"><h3>Encontre pessoas</h3><form className="cm-user-search" role="search" onSubmit={e=>{e.preventDefault();setQuery(input.trim());setPage(1);setTick(n=>n+1)}}><Search size={16} aria-hidden="true"/><input aria-label="Buscar somente usuários" placeholder="Nome do usuário…" value={input} maxLength={100} onChange={e=>setInput(e.target.value)}/><button type="submit" aria-label="Pesquisar usuários"><Search size={16}/></button></form><div className="cm-discovery-heading">{query?'Usuários encontrados':'Sugestões para conhecer'}</div>{loading?<p className="cm-discovery-message" role="status">Buscando pessoas…</p>:error?<div role="alert" className="cm-discovery-message"><p>{error}</p><button onClick={()=>setTick(n=>n+1)}>Tentar novamente</button></div>:<><div className="cm-discovery-list">{items.map(person=><UserResult key={person.id} person={person}/>)}</div>{!items.length&&<p className="cm-discovery-message">{query?'Nenhum usuário encontrado.':'Ainda não há sugestões de outros membros.'}</p>}<div className="cm-discovery-pages">{page>1&&<button onClick={()=>setPage(p=>p-1)}>Anterior</button>}{more&&<button onClick={()=>setPage(p=>p+1)}>Ver mais</button>}</div></>}</section>
}
