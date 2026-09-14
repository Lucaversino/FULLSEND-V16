import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CATEGORIES=new Set(['carros','motores','rodas','suspensao','som','acessorios'])
const STYLES=new Set(['rebaixado','turbo','antigo'])

function text(v:unknown,max=5000){return String(v??'').trim().slice(0,max)}
function nullableText(v:unknown,max=500){const x=text(v,max);return x||null}
function numberOrNull(v:unknown){if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null}

export async function POST(req:Request){
  const session=await createClient()
  const {data:{user},error:userError}=await session.auth.getUser()
  if(userError||!user)return NextResponse.json({error:'Sua sessão expirou. Entre novamente.'},{status:401})

  const body=await req.json().catch(()=>null)
  if(!body)return NextResponse.json({error:'Dados inválidos.'},{status:400})

  const title=text(body.title,120)
  const description=text(body.description,5000)
  const category_slug=text(body.category_slug,40)
  const price=numberOrNull(body.price)
  const city=text(body.city,120)
  const state=text(body.state,2).toUpperCase()
  const whatsapp=text(body.whatsapp,30)
  if(!title||!description||!CATEGORIES.has(category_slug)||price==null||price<0||!city||state.length!==2||!whatsapp){
    return NextResponse.json({error:'Confira os campos obrigatórios do anúncio.'},{status:400})
  }

  const media=Array.isArray(body.media)?body.media.filter((x:unknown)=>typeof x==='string'&&x.startsWith('http')).slice(0,15):[]
  const tags=Array.isArray(body.tags)?body.tags.map((x:unknown)=>text(x,40).toUpperCase()).filter(Boolean).slice(0,12):[]
  const vehicle_styles=Array.isArray(body.vehicle_styles)?body.vehicle_styles.map((x:unknown)=>text(x,20)).filter((x:string)=>STYLES.has(x)).slice(0,3):[]
  const isCar=category_slug==='carros'

  if(isCar){
    if(!text(body.brand,80)||!text(body.model,100)||numberOrNull(body.year)==null||numberOrNull(body.mileage)==null){
      return NextResponse.json({error:'Marca, modelo, ano e quilometragem são obrigatórios para carros.'},{status:400})
    }
  }

  const slugBase=text(body.slug,180)||`${title}-${Date.now()}`
  const payload={
    user_id:user.id,
    title,
    slug:slugBase,
    description,
    price,
    category_slug,
    city,
    state,
    whatsapp,
    cover_url:media[0]||null,
    media,
    tags,
    source:'fullsend',
    listing_mode:'classified',
    status:'active',
    is_featured:false,
    is_vip:false,
    brand:isCar?nullableText(body.brand,80):null,
    model:isCar?nullableText(body.model,100):null,
    year:isCar?numberOrNull(body.year):null,
    mileage:isCar?numberOrNull(body.mileage):null,
    fuel:isCar?nullableText(body.fuel,50):null,
    transmission:isCar?nullableText(body.transmission,50):null,
    vehicle_styles:isCar?vehicle_styles:[],
    color:isCar?nullableText(body.color,50):null,
    body_type:isCar?nullableText(body.body_type,50):null,
    engine:isCar?nullableText(body.engine,80):null,
    power_cv:isCar?numberOrNull(body.power_cv):null,
    doors:isCar?numberOrNull(body.doors):null,
    condition:isCar?nullableText(body.condition,80):null,
    features:nullableText(body.features,5000),
  }

  // O endpoint usa a Service Role somente no servidor, depois de validar a sessão.
  // Isso evita falhas de GRANT/RLS no navegador sem permitir publicar em nome de outro usuário.
  const admin=createAdminClient()
  const {data,error}=await admin.from('listings').insert(payload).select('id,slug').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({success:true,listing:data})
}
