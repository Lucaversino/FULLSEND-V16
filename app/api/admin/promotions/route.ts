import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { PROMOTION_PACKAGES, isPromotionType, recomputeListingPromotionFlags } from '@/lib/promotion-payments'

function addDays(days:number){const d=new Date();d.setUTCDate(d.getUTCDate()+days);return d.toISOString()}

export async function PATCH(req:Request){
  const gate=await requireAdmin(); if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const body=await req.json().catch(()=>({}))
  const action=String(body.action||'')
  const promotionId=String(body.promotionId||'')
  const listingId=String(body.listingId||'')
  const type=body.promotionType
  const now=new Date().toISOString()

  if(action==='manual_activate'){
    if(!listingId||!isPromotionType(type))return NextResponse.json({error:'Dados inválidos.'},{status:400})
    const pkg=PROMOTION_PACKAGES[type]
    const {data:listing}=await gate.admin.from('listings').select('id,user_id').eq('id',listingId).maybeSingle()
    if(!listing)return NextResponse.json({error:'Anúncio FULLSEND não encontrado.'},{status:404})
    const {error}=await gate.admin.from('listing_promotions').insert({listing_id:listingId,user_id:listing.user_id,promotion_type:type,amount:0,duration_days:pkg.days,status:'approved',source:'admin',approved_at:now,started_at:now,expires_at:addDays(pkg.days),admin_note:'Ativado manualmente pelo administrador'})
    if(error)return NextResponse.json({error:error.message},{status:400})
    await recomputeListingPromotionFlags(listingId)
    return NextResponse.json({success:true})
  }

  if(!promotionId)return NextResponse.json({error:'Impulsionamento inválido.'},{status:400})
  const {data:promo}=await gate.admin.from('listing_promotions').select('id,listing_id,status').eq('id',promotionId).maybeSingle()
  if(!promo)return NextResponse.json({error:'Registro não encontrado.'},{status:404})

  if(action==='end'){
    await gate.admin.from('listing_promotions').update({status:'expired',expires_at:now,updated_at:now,admin_note:'Encerrado manualmente pelo administrador'}).eq('id',promotionId)
    await recomputeListingPromotionFlags(String(promo.listing_id))
    return NextResponse.json({success:true})
  }

  return NextResponse.json({error:'Ação inválida.'},{status:400})
}
