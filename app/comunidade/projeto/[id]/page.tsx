import { createClient } from '@/lib/supabase/server'
import CommunityFeed from '@/components/community/CommunityFeed'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { safeImage } from '@/lib/community/shared'
import { z } from 'zod'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();const s=await createClient()
 const {data:v,error}=await s.from('listings').select('id,user_id,title,slug,description,cover_url,brand,model,year,power_cv,city,state').eq('id',id).maybeSingle()
 if(error)throw new Error('Não foi possível carregar o projeto.');if(!v)notFound()
 return <><section className="cm-card cm-project">{safeImage(v.cover_url)&&<img className="cm-project-cover" src={safeImage(v.cover_url)} alt={v.title}/>}<span className="cm-eyebrow">DIÁRIO DO PROJETO</span><h2>{v.title}</h2><p>{[v.brand,v.model,v.year,v.city,v.state].filter(Boolean).join(' · ')}</p><p className="cm-content">{v.description}</p><div className="cm-row"><Link href={`/comunidade/usuario/${v.user_id}`}>Perfil do proprietário →</Link><Link href={`/anuncio/${v.slug}`}>Ver anúncio original →</Link></div></section><CommunityFeed vehicle={id}/></>
}
