import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
export const dynamic='force-dynamic'
export async function GET(req:Request){
 try{
  const id=z.string().uuid().safeParse(new URL(req.url).searchParams.get('vehicleId'))
  if(!id.success)return NextResponse.json({error:'Carro inválido.'},{status:400})
  const s=await createClient();const {data:{user},error:authError}=await s.auth.getUser()
  if(authError||!user)return NextResponse.json({error:'Entre na sua conta para vender este carro.'},{status:401})
  const {data:vehicle,error}=await s.from('listings').select('*').eq('id',id.data).eq('user_id',user.id).eq('listing_mode','garage').eq('category_slug','carros').maybeSingle()
  if(error)throw error
  if(!vehicle)return NextResponse.json({error:'Carro não encontrado na sua garagem.'},{status:404})
  const {data:profile,error:profileError}=await s.from('profiles').select('whatsapp,account_status').eq('id',user.id).maybeSingle()
  if(profileError)throw profileError
  if(profile?.account_status!=='active')return NextResponse.json({error:'Sua conta não está habilitada para anunciar.'},{status:403})
  const {data:existing,error:saleError}=await s.from('listings').select('id,title,slug,status').eq('source_garage_id',id.data).eq('user_id',user.id).neq('status','sold').maybeSingle()
  if(saleError)return NextResponse.json({error:'Não foi possível consultar o anúncio vinculado. Confira se o SQL 029 foi aplicado.'},{status:503})
  return NextResponse.json({vehicle,existing,whatsapp:profile?.whatsapp||''},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível abrir o formulário. Tente novamente.'},{status:503})}
}
