import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
export class CommunityError extends Error {constructor(message:string,public status=400){super(message)}}
export async function context(write=false){
 const s=await createClient();const {data:{user}}=await s.auth.getUser()
 const {data:profile,error}=user?await s.from('profiles').select('id,name,city,state,role,account_status').eq('id',user.id).maybeSingle():{data:null,error:null}
 if(write&&!user)throw new CommunityError('Entre na sua conta para continuar.',401)
 if(write&&(error||profile?.account_status!=='active'))throw new CommunityError('Sua conta não está habilitada para publicar ou interagir.',403)
 return {s,user,profile}
}
export function checked<T extends {error:any}>(result:T):T{if(result.error){console.error('Community database:',result.error.code);throw new CommunityError('Não foi possível acessar a Comunidade. Tente novamente ou contate o administrador.',503)}return result}
export function failure(e:unknown){
 if(e instanceof z.ZodError)return NextResponse.json({error:e.issues[0]?.message||'Dados inválidos.'},{status:400})
 if(e instanceof CommunityError)return NextResponse.json({error:e.message},{status:e.status})
 console.error('Community request failed',e instanceof Error?e.name:'unknown')
 return NextResponse.json({error:'Não foi possível concluir. Verifique sua conexão e tente novamente.'},{status:500})
}
export function origin(req:Request){const from=req.headers.get('origin');if(from&&from!==new URL(req.url).origin)throw new CommunityError('Origem não permitida.',403)}
export async function signedMedia(s:any,rows:any[]){
 const paths=Array.from(new Set(rows.flatMap(p=>(p.media||[]).map((m:any)=>m.path)))) as string[]
 if(!paths.length)return rows
 const {data}=checked(await s.storage.from('community-media').createSignedUrls(paths,300)) as any
 const urls=new Map((data||[]).map((m:any)=>[m.path,m.signedUrl]))
 return rows.map(p=>({...p,media:(p.media||[]).map((m:any)=>({...m,url:urls.get(m.path)||null}))}))
}
