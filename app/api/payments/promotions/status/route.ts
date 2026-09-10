import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncPromotionPayment } from '@/lib/promotion-payments'

export const dynamic='force-dynamic'
export const runtime='nodejs'

export async function GET(req:Request){
  try{
    const supabase=await createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return NextResponse.json({error:'Não autenticado.'},{status:401})

    const id=new URL(req.url).searchParams.get('promotionId')||''
    if(!id)return NextResponse.json({error:'Impulsionamento inválido.'},{status:400})

    const admin=createAdminClient()
    let {data:promo,error}=await admin.from('listing_promotions').select('*').eq('id',id).eq('user_id',user.id).maybeSingle()
    if(error||!promo)return NextResponse.json({error:'Impulsionamento não encontrado.'},{status:404})

    if(promo.status==='pending'&&promo.mp_payment_id){
      const token=String(process.env.MERCADOPAGO_ACCESS_TOKEN||'').trim()
      if(token){
        const mp=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(promo.mp_payment_id)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
        const payment=await mp.json().catch(()=>null)
        if(mp.ok&&payment)await syncPromotionPayment(payment)
        const fresh=await admin.from('listing_promotions').select('*').eq('id',id).maybeSingle()
        promo=fresh.data||promo
      }
    }

    return NextResponse.json({
      ok:true,status:promo.status,mp_status:promo.mp_status,
      promotion_type:promo.promotion_type,expires_at:promo.expires_at,
      started_at:promo.started_at,
    })
  }catch(error){
    console.error('FULLSEND promotion status error',error)
    return NextResponse.json({error:'Erro ao consultar pagamento.'},{status:500})
  }
}
