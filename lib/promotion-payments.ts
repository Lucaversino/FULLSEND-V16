import { createAdminClient } from '@/lib/supabase/admin'

export const PROMOTION_PACKAGES = {
  featured: { label:'DESTAQUE', amount:4.99, days:7 },
  vip: { label:'VIP', amount:9.99, days:15 },
} as const

export type PromotionType = keyof typeof PROMOTION_PACKAGES

export function isPromotionType(value:unknown): value is PromotionType {
  return value === 'featured' || value === 'vip'
}

function addDays(iso:string, days:number){
  const d=new Date(iso)
  d.setUTCDate(d.getUTCDate()+days)
  return d.toISOString()
}

export async function recomputeListingPromotionFlags(listingId:string){
  const admin=createAdminClient()
  const now=new Date().toISOString()
  const {data}=await admin.from('listing_promotions')
    .select('promotion_type')
    .eq('listing_id',listingId)
    .eq('status','approved')
    .gt('expires_at',now)

  const active=data||[]
  const isVip=active.some((x:any)=>x.promotion_type==='vip')
  const isFeatured=active.some((x:any)=>x.promotion_type==='featured')

  await admin.from('listings').update({
    is_vip:isVip,
    is_featured:isFeatured,
    updated_at:now,
  }).eq('id',listingId)

  return {isVip,isFeatured}
}

export async function expirePromotions(){
  try{
    const admin=createAdminClient()
    const now=new Date().toISOString()
    const {data,error}=await admin.from('listing_promotions')
      .select('id,listing_id')
      .eq('status','approved')
      .lte('expires_at',now)
      .limit(250)

    if(error)return
    const rows=data||[]
    if(!rows.length)return

    await admin.from('listing_promotions')
      .update({status:'expired',updated_at:now})
      .in('id',rows.map((x:any)=>x.id))

    const listingIds:string[]=Array.from(new Set<string>(rows.map((x:any)=>String(x.listing_id))))
    for(const listingId of listingIds){
      await recomputeListingPromotionFlags(listingId)
    }
  }catch{}
}

export async function syncPromotionPayment(payment:any){
  const external=String(payment?.external_reference||'')
  if(!external.startsWith('FULLSEND_PROMO:'))return {handled:false as const}

  const promotionId=external.slice('FULLSEND_PROMO:'.length)
  if(!promotionId)return {handled:false as const}

  const admin=createAdminClient()
  const {data:promo,error}=await admin.from('listing_promotions')
    .select('*')
    .eq('id',promotionId)
    .maybeSingle()

  if(error||!promo)return {handled:false as const}

  const mpStatus=String(payment?.status||'pending').toLowerCase()
  const paidAmount=Number(payment?.transaction_amount||0)
  const expected=Number(promo.amount||0)
  const amountMatches=Math.abs(paidAmount-expected)<0.01
  const paymentId=String(payment?.id||promo.mp_payment_id||'')
  const now=new Date().toISOString()

  if(mpStatus==='approved' && amountMatches){
    const firstActivation=promo.status!=='approved'||!promo.started_at||!promo.expires_at
    const startedAt=firstActivation?now:String(promo.started_at)
    const expiresAt=firstActivation?addDays(startedAt,Number(promo.duration_days)):String(promo.expires_at)

    await admin.from('listing_promotions').update({
      status:'approved',
      mp_status:mpStatus,
      mp_payment_id:paymentId||null,
      approved_at:promo.approved_at||now,
      started_at:startedAt,
      expires_at:expiresAt,
      updated_at:now,
    }).eq('id',promo.id)

    await recomputeListingPromotionFlags(String(promo.listing_id))
    return {handled:true as const,status:'approved',expiresAt}
  }

  const statusMap:Record<string,string>={
    rejected:'rejected',cancelled:'cancelled',refunded:'refunded',charged_back:'refunded'
  }
  const localStatus=statusMap[mpStatus]||'pending'

  await admin.from('listing_promotions').update({
    status:localStatus,
    mp_status:mpStatus,
    mp_payment_id:paymentId||null,
    updated_at:now,
  }).eq('id',promo.id)

  if(['rejected','cancelled','refunded'].includes(localStatus)){
    await recomputeListingPromotionFlags(String(promo.listing_id))
  }

  return {handled:true as const,status:localStatus,expiresAt:promo.expires_at||null}
}
