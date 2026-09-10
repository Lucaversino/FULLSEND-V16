import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic='force-dynamic'
export const runtime='nodejs'

export async function POST(){
  try{
    const supabase=await createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return NextResponse.json({error:'Faça login para cancelar a assinatura.'},{status:401})

    const admin=createAdminClient()

    const {data:profile,error:profileError}=await admin
      .from('profiles')
      .select('badge,vip_previous_badge,mercadopago_subscription_id,vip_subscription_status')
      .eq('id',user.id)
      .maybeSingle()

    if(profileError){
      console.error('FULLSEND cancel VIP profile error',profileError)
      return NextResponse.json({error:'Não foi possível carregar seu plano VIP.'},{status:500})
    }

    let subscriptionId=String(profile?.mercadopago_subscription_id||'')

    if(!subscriptionId){
      const {data:sub}=await admin.from('vip_subscriptions')
        .select('mp_subscription_id,status,updated_at')
        .eq('user_id',user.id)
        .in('status',['authorized','pending','paused'])
        .order('updated_at',{ascending:false})
        .limit(1)
        .maybeSingle()
      subscriptionId=String(sub?.mp_subscription_id||'')
    }

    if(!subscriptionId){
      return NextResponse.json({error:'Nenhuma assinatura VIP ativa ou pendente foi encontrada.'},{status:404})
    }

    const token=(process.env.MERCADOPAGO_ACCESS_TOKEN||'').trim()
    if(!token){
      return NextResponse.json({error:'MERCADOPAGO_ACCESS_TOKEN não configurado.'},{status:500})
    }

    const mp=await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`,{
      method:'PUT',
      headers:{
        Authorization:`Bearer ${token}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({status:'cancelled'}),
      cache:'no-store'
    })

    const mpData=await mp.json().catch(()=>null)

    if(!mp.ok){
      console.error('FULLSEND cancel VIP Mercado Pago error',{
        status:mp.status,
        message:mpData?.message,
        cause:mpData?.cause
      })
      return NextResponse.json({
        error:mpData?.message||'Mercado Pago recusou o cancelamento.'
      },{status:502})
    }

    const now=new Date().toISOString()

    await admin.from('vip_subscriptions').update({
      status:String(mpData?.status||'cancelled'),
      next_payment_date:null,
      raw_data:mpData,
      updated_at:now
    }).eq('mp_subscription_id',subscriptionId).eq('user_id',user.id)

    const currentBadge=String(profile?.badge||'new')
    const {error:updateError}=await admin.from('profiles').update({
      badge:currentBadge==='admin'?'admin':'none',
      vip_subscription_status:String(mpData?.status||'cancelled'),
      vip_next_payment_date:null,
      vip_updated_at:now
    }).eq('id',user.id)

    if(updateError){
      console.error('FULLSEND cancel VIP profile sync error',updateError)
      return NextResponse.json({
        ok:true,
        warning:'Assinatura cancelada no Mercado Pago, mas o perfil precisa ser sincronizado.',
        status:String(mpData?.status||'cancelled')
      })
    }

    return NextResponse.json({
      ok:true,
      status:String(mpData?.status||'cancelled'),
      message:'Assinatura FULLSEND VIP cancelada com sucesso.'
    })
  }catch(error){
    console.error('FULLSEND cancel VIP error',error)
    return NextResponse.json({
      error:error instanceof Error?error.message:'Erro interno ao cancelar a assinatura.'
    },{status:500})
  }
}
