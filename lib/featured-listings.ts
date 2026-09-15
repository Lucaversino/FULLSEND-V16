import type { SupabaseClient } from '@supabase/supabase-js'
import { fromFullsend,fromGecko,type UnifiedListing } from '@/lib/listings'
export type FeaturedFilters={city?:string;state?:string;category?:string;brand?:string}
const ownFields='id,user_id,category_slug,title,slug,description,price,city,state,cover_url,media,tags,status,source,external_url,is_featured,is_vip,brand,model,year,mileage,fuel,transmission,vehicle_styles,features,engine,color,body_type,created_at'
const geckoFields='id,title,price,city,state,image_url,images,external_url,brand,model,year,mileage,fuel,transmission,features,category,category_id,import_search_category,status,listed_at,imported_at,is_featured,is_vip,raw_data,ai_rebaixado,ai_roda_grande,ai_stance,ai_style_score,ai_confidence,ai_reason,ai_tags,ai_analyzed_at,ai_manual_rebaixado'
// Percorre somente destaques ativos, em páginas, sem cortar os mais antigos.
export async function fetchFeaturedListings(client:SupabaseClient,filters:FeaturedFilters={}):Promise<UnifiedListing[]>{
 async function collect(table:string,fields:string){
  const result:any[]=[];let cursor:string|null=null
  for(;;){
   let query=client.from(table).select(fields).eq('status','active').or('is_featured.eq.true,is_vip.eq.true').order('id').limit(200)
   if(cursor)query=query.gt('id',cursor)
   if(filters.city)query=query.ilike('city',`%${filters.city}%`)
   if(filters.state)query=query.eq('state',filters.state)
   if(filters.brand)query=query.ilike('brand',`%${filters.brand}%`)
   if(filters.category&&table==='listings')query=query.eq('category_slug',filters.category)
   const {data,error}=await query
   if(error){console.error('Featured query failed:',table,error.code);throw new Error('Não foi possível atualizar os destaques. Tente novamente.')}
   const rows=(data||[]) as any[]
   if(!rows.length)break
   result.push(...rows)
   const next=String(rows[rows.length-1].id)
   if(next===cursor)throw new Error('Não foi possível paginar os destaques.')
   cursor=next
  }
  return result
 }
 const [own,gecko]=await Promise.all([collect('listings',ownFields),collect('gecko_listings',geckoFields)])
 const ids=Array.from(new Set(own.map(x=>x.user_id).filter(Boolean)));const sellers=new Map<string,any>()
 for(let offset=0;offset<ids.length;offset+=100){
  const {data,error}=await client.from('profiles').select('id,name,avatar_url,badge,xp_points,reputation_level,is_verified').in('id',ids.slice(offset,offset+100))
  if(error)console.warn('Featured seller metadata unavailable:',error.code)
  for(const seller of data||[])sellers.set(seller.id,seller)
 }
 return [...own.map(x=>fromFullsend({...x,seller_profile:sellers.get(x.user_id)||null})),...gecko.map(fromGecko)]
  .filter(x=>(x.isFeatured||x.isVip)&&(!filters.category||x.categorySlug===filters.category))
}
