import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STYLES=new Set(['rebaixado','turbo','antigo'])
function text(v:unknown,max=5000){return String(v??'').trim().slice(0,max)}
function nullable(v:unknown,max=500){const s=text(v,max);return s||null}
function num(v:unknown){if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null}

export async function POST(req:Request){
  const session=await createClient()
  const {data:{user}}=await session.auth.getUser()
  if(!user)return NextResponse.json({error:'Sua sessão expirou. Entre novamente.'},{status:401})

  const body=await req.json().catch(()=>null)
  if(!body)return NextResponse.json({error:'Dados inválidos.'},{status:400})

  const title=text(body.title,120)
  const description=text(body.description,5000)
  const city=text(body.city,120)
  const state=text(body.state,2).toUpperCase()
  const brand=text(body.brand,80)
  const model=text(body.model,100)
  const year=num(body.year)
  const mileage=num(body.mileage)

  if(!title||!brand||!model||year==null||year<1900||year>2100||mileage==null||mileage<0){
    return NextResponse.json({error:'Informe título, marca, modelo, ano e quilometragem.'},{status:400})
  }
  if(!city||state.length!==2){
    return NextResponse.json({error:'Informe cidade e UF.'},{status:400})
  }

  const media=Array.isArray(body.media)
    ? body.media.filter((x:unknown)=>typeof x==='string'&&x.startsWith('http')).slice(0,15)
    : []
  const styles=Array.isArray(body.vehicle_styles)
    ? body.vehicle_styles.map((x:unknown)=>text(x,20)).filter((x:string)=>STYLES.has(x)).slice(0,3)
    : []

  const slugBase=text(body.slug,180)||`${title}-${Date.now()}`
  const payload={
    user_id:user.id,
    category_slug:'carros',
    listing_mode:'garage',
    title,
    slug:slugBase,
    description:description||null,
    price:null,
    city,
    state,
    whatsapp:null,
    cover_url:media[0]||null,
    media,
    tags:Array.isArray(body.tags)?body.tags.map((x:unknown)=>text(x,40).toUpperCase()).filter(Boolean).slice(0,12):[],
    status:'active',
    source:'fullsend',
    is_featured:false,
    is_vip:false,
    brand,
    model,
    year,
    mileage,
    fuel:nullable(body.fuel,50),
    transmission:nullable(body.transmission,50),
    vehicle_styles:styles,
    color:nullable(body.color,50),
    body_type:nullable(body.body_type,50),
    engine:nullable(body.engine,80),
    power_cv:num(body.power_cv),
    doors:num(body.doors),
    condition:nullable(body.condition,80),
    features:nullable(body.features,5000),
  }

  const admin=createAdminClient()
  const {data,error}=await admin.from('listings').insert(payload).select('id,slug').single()
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({success:true,vehicle:data})
}
