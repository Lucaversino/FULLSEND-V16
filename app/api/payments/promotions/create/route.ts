import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPromotionType, PROMOTION_PACKAGES } from '@/lib/promotion-payments'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function siteUrl(){
  return String(process.env.NEXT_PUBLIC_SITE_URL||'https://fullsendmarket.vercel.app').replace(/\/$/,'')
}

export async function POST(req:Request){
  try{
    const token=String(process.env.MERCADOPAGO_ACCESS_TOKEN||'').trim()
    if(!token)return NextResponse.json({error:'Mercado Pago não configurado.'},{status:500})

    const supabase=await createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return NextResponse.json({error:'Faça login para impulsionar seu anúncio.'},{status:401})
    if(!user.email)return NextResponse.json({error:'Sua conta precisa de um e-mail válido.'},{status:400})

    const body=await req.json().catch(()=>({}))
    const listingId=String(body?.listingId||'')
    const promotionType=body?.promotionType
    if(!listingId||!isPromotionType(promotionType))return NextResponse.json({error:'Pacote inválido.'},{status:400})

    const pkg=PROMOTION_PACKAGES[promotionType]
    const admin=createAdminClient()
    const {data:listing,error:listingError}=await admin.from('listings')
      .select('id,user_id,title,status')
      .eq('id',listingId)
      .maybeSingle()

    if(listingError||!listing)return NextResponse.json({error:'Anúncio não encontrado.'},{status:404})
    if(String(listing.user_id)!==user.id)return NextResponse.json({error:'Você só pode impulsionar seus próprios anúncios.'},{status:403})
    if(String(listing.status)!=='active')return NextResponse.json({error:'Somente anúncios ativos podem ser impulsionados.'},{status:400})

    const now=new Date().toISOString()
    const {data:active}=await admin.from('listing_promotions')
      .select('id,expires_at')
      .eq('listing_id',listingId)
      .eq('promotion_type',promotionType)
      .eq('status','approved')
      .gt('expires_at',now)
      .order('expires_at',{ascending:false})
      .limit(1)
      .maybeSingle()

    if(active)return NextResponse.json({error:`${pkg.label} já está ativo neste anúncio.`,already_active:true,expires_at:active.expires_at},{status:409})

    const {data:pending}=await admin.from('listing_promotions')
      .select('*')
      .eq('listing_id',listingId)
      .eq('user_id',user.id)
      .eq('promotion_type',promotionType)
      .eq('status','pending')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle()

    if(pending?.pix_qr_code && pending?.mp_payment_id){
      return NextResponse.json({
        promotion_id:pending.id,
        payment_id:pending.mp_payment_id,
        status:'pending',
        qr_code:pending.pix_qr_code,
        qr_code_base64:pending.pix_qr_code_base64,
        ticket_url:pending.ticket_url,
        amount:Number(pending.amount),
        days:Number(pending.duration_days),
        label:pkg.label,
        reused:true,
      })
    }

    const promotionId=randomUUID()
    const {error:insertError}=await admin.from('listing_promotions').insert({
      id:promotionId,
      listing_id:listingId,
      user_id:user.id,
      promotion_type:promotionType,
      amount:pkg.amount,
      duration_days:pkg.days,
      status:'pending',
      source:'mercadopago',
    })
    if(insertError)return NextResponse.json({error:'Rode a migration 014_listing_promotions_pix.sql no Supabase.'},{status:500})

    const payload={
      transaction_amount:pkg.amount,
      description:`FULLSEND ${pkg.label} - ${String(listing.title).slice(0,90)}`,
      payment_method_id:'pix',
      external_reference:`FULLSEND_PROMO:${promotionId}`,
      notification_url:`${siteUrl()}/api/payments/webhook`,
      payer:{email:user.email},
    }

    const mp=await fetch('https://api.mercadopago.com/v1/payments',{
      method:'POST',
      headers:{
        Authorization:`Bearer ${token}`,
        'Content-Type':'application/json',
        'X-Idempotency-Key':promotionId,
      },
      body:JSON.stringify(payload),
      cache:'no-store',
    })
    const data=await mp.json().catch(()=>null)

    if(!mp.ok||!data?.id){
      await admin.from('listing_promotions').update({status:'failed',mp_status:String(data?.status||'error'),admin_note:String(data?.message||'Mercado Pago recusou o pagamento.'),updated_at:new Date().toISOString()}).eq('id',promotionId)
      return NextResponse.json({error:data?.message||'Não foi possível gerar o Pix.'},{status:502})
    }

    const tx=data?.point_of_interaction?.transaction_data||{}
    await admin.from('listing_promotions').update({
      mp_payment_id:String(data.id),
      mp_status:String(data.status||'pending'),
      pix_qr_code:tx.qr_code||null,
      pix_qr_code_base64:tx.qr_code_base64||null,
      ticket_url:tx.ticket_url||null,
      updated_at:new Date().toISOString(),
    }).eq('id',promotionId)

    return NextResponse.json({
      promotion_id:promotionId,
      payment_id:String(data.id),
      status:String(data.status||'pending'),
      qr_code:tx.qr_code||null,
      qr_code_base64:tx.qr_code_base64||null,
      ticket_url:tx.ticket_url||null,
      amount:pkg.amount,
      days:pkg.days,
      label:pkg.label,
    })
  }catch(error){
    console.error('FULLSEND promotion Pix create error',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Erro ao gerar Pix.'},{status:500})
  }
}
