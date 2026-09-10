import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncPromotionPayment } from '@/lib/promotion-payments'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function parseSignature(value:string|null){
  const parts=Object.fromEntries(
    String(value||'').split(',').map(x=>x.trim().split('=',2)).filter(x=>x.length===2)
  )
  return {ts:parts.ts||'',v1:parts.v1||''}
}

function safeEqualHex(a:string,b:string){
  try{
    const aa=Buffer.from(a,'hex')
    const bb=Buffer.from(b,'hex')
    return aa.length===bb.length&&aa.length>0&&timingSafeEqual(aa,bb)
  }catch{return false}
}

function validateWebhook(req:NextRequest,dataId:string){
  const secret=(process.env.MERCADOPAGO_WEBHOOK_SECRET||'').trim()
  if(!secret)return false

  const xSignature=req.headers.get('x-signature')
  const xRequestId=req.headers.get('x-request-id')||''
  const {ts,v1}=parseSignature(xSignature)
  if(!ts||!v1)return false

  // Manifest oficial do Mercado Pago:
  // id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  let manifest=''
  if(dataId)manifest+=`id:${dataId};`
  if(xRequestId)manifest+=`request-id:${xRequestId};`
  if(ts)manifest+=`ts:${ts};`

  const calculated=createHmac('sha256',secret).update(manifest).digest('hex')
  return safeEqualHex(calculated,v1)
}

async function mercadoPagoGet(path:string){
  const token=(process.env.MERCADOPAGO_ACCESS_TOKEN||'').trim()
  if(!token)throw new Error('MERCADOPAGO_ACCESS_TOKEN ausente.')
  const res=await fetch(`https://api.mercadopago.com${path}`,{
    headers:{Authorization:`Bearer ${token}`},
    cache:'no-store',
  })
  const data=await res.json().catch(()=>null)
  if(!res.ok)throw new Error(`Mercado Pago GET ${path} retornou ${res.status}`)
  return data
}

async function syncSubscription(subscription:any){
  const mpId=String(subscription?.id||'')
  const userId=String(subscription?.external_reference||'')
  if(!mpId||!userId)return

  const admin=createAdminClient()
  const status=String(subscription?.status||'pending')
  const now=new Date().toISOString()

  await admin.from('vip_subscriptions').upsert({
    user_id:userId,
    mp_subscription_id:mpId,
    payer_email:subscription?.payer_email||null,
    status,
    amount:Number(subscription?.auto_recurring?.transaction_amount||19.90),
    currency:String(subscription?.auto_recurring?.currency_id||'BRL'),
    init_point:subscription?.init_point||null,
    next_payment_date:subscription?.next_payment_date||null,
    raw_data:subscription,
    mode:String(process.env.MERCADOPAGO_MODE||'production').toLowerCase()==='test'?'test':'production',
    updated_at:now,
  },{onConflict:'mp_subscription_id'})

  const {data:profile}=await admin.from('profiles')
    .select('badge,vip_previous_badge')
    .eq('id',userId)
    .maybeSingle()

  if(status==='authorized'){
    const currentBadge=String(profile?.badge||'new')
    const preserve=['admin','premium'].includes(currentBadge)
    const previous=profile?.vip_previous_badge||(!['vip','admin','premium'].includes(currentBadge)?currentBadge:null)

    await admin.from('profiles').update({
      badge:currentBadge==='admin'?'admin':'none',
      vip_previous_badge:previous,
      vip_subscription_status:'authorized',
      mercadopago_subscription_id:mpId,
      vip_started_at:new Date().toISOString(),
      vip_next_payment_date:subscription?.next_payment_date||null,
      vip_updated_at:now,
    }).eq('id',userId)
  }else{
    const restore=String(profile?.vip_previous_badge||'new')
    const current=String(profile?.badge||'new')
    await admin.from('profiles').update({
      badge:current==='admin'?'admin':'none',
      vip_subscription_status:status,
      mercadopago_subscription_id:mpId,
      vip_next_payment_date:subscription?.next_payment_date||null,
      vip_updated_at:now,
    }).eq('id',userId)
  }
}

export async function POST(req:NextRequest){
  let body:any={}
  try{body=await req.json()}catch{}

  const url=new URL(req.url)
  const type=String(url.searchParams.get('type')||body?.type||'')
  const dataId=String(
    url.searchParams.get('data.id')||
    url.searchParams.get('data_id')||
    body?.data?.id||
    ''
  )

  if(!dataId){
    // Webhook de teste/handshake sem recurso: responde 200 para não provocar retries inúteis.
    return NextResponse.json({ok:true,ignored:'missing_data_id'})
  }

  if(!validateWebhook(req,dataId)){
    console.warn('FULLSEND webhook Mercado Pago assinatura inválida',{type,dataId})
    return NextResponse.json({error:'invalid_signature'},{status:401})
  }

  try{
    if(type==='subscription_preapproval'){
      const subscription=await mercadoPagoGet(`/preapproval/${encodeURIComponent(dataId)}`)
      await syncSubscription(subscription)
    }else if(type==='subscription_authorized_payment'){
      const payment=await mercadoPagoGet(`/authorized_payments/${encodeURIComponent(dataId)}`)
      const preapprovalId=String(payment?.preapproval_id||payment?.subscription_id||'')
      if(preapprovalId){
        const subscription=await mercadoPagoGet(`/preapproval/${encodeURIComponent(preapprovalId)}`)
        await syncSubscription(subscription)
      }
    }else if(type==='payment'){
      const payment=await mercadoPagoGet(`/v1/payments/${encodeURIComponent(dataId)}`)
      await syncPromotionPayment(payment)
    }
    return NextResponse.json({ok:true})
  }catch(error){
    console.error('FULLSEND webhook Mercado Pago sync error',error)
    // MP repetirá a notificação quando há erro 5xx.
    return NextResponse.json({error:'sync_failed'},{status:500})
  }
}
