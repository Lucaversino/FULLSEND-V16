import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFeaturedListings } from '@/lib/featured-listings'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(req:Request){
 const q=new URL(req.url).searchParams
 const headers={'Cache-Control':'private, no-store, max-age=0','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store'}
 try{
  const client=await createClient()
  const items=await fetchFeaturedListings(client,{city:(q.get('city')||'').slice(0,100),state:(q.get('state')||'').slice(0,2),category:(q.get('category')||'').slice(0,60),brand:(q.get('brand')||'').slice(0,100)})
  return NextResponse.json({items},{headers})
 }catch{return NextResponse.json({error:'Não foi possível atualizar os destaques. Tente novamente.'},{status:503,headers})}
}
