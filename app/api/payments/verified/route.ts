import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {syncVerifiedPayment} from '@/lib/verified-payments'
export const dynamic='force-dynamic'
async function run(create:boolean){try{
 const s=await createClient();const {data:{user}}=await s.auth.getUser()
 if(!user)return NextResponse.json({error:'Entre na sua conta.'},{status:401})
 const admin=createAdminClient()
 const {data:p,error}=await admin.from('profiles').select('is_verified,verified_override,account_status').eq('id',user.id).single()
 if(error)throw new Error('Aplique o SQL 031 para habilitar o selo.')
 if(p.is_verified)return NextResponse.json({active:true})
 if(p.verified_override===false||p.account_status!=='active')return NextResponse.json({error:'A aquisição do selo não está disponível para esta conta. Contate a administração.'},{status:403})
 const token=process.env.MERCADOPAGO_ACCESS_TOKEN
 if(!token)throw new Error('Mercado Pago não configurado.')
 let {data:order,error:readError}=await admin.from('verification_payments').select('*').eq('user_id',user.id).eq('status','pending').maybeSingle()
 if(readError)throw readError
 if(!order&&create){
  const inserted=await admin.from('verification_payments').insert({user_id:user.id}).select('*').single()
  if(inserted.error&&inserted.error.code!=='23505')throw inserted.error
  order=inserted.data
  if(!order){const retry=await admin.from('verification_payments').select('*').eq('user_id',user.id).eq('status','pending').single();if(retry.error)throw retry.error;order=retry.data}
 }
 if(!order)return NextResponse.json({active:false})
 let payment:any=null
 if(order.mp_payment_id){
  const res=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(order.mp_payment_id)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
  if(!res.ok)throw new Error('Não foi possível consultar o Pix. Tente novamente.')
  payment=await res.json()
 }else if(create){
  if(!user.email)throw new Error('Sua conta precisa de e-mail para gerar o Pix.')
  const base=String(process.env.NEXT_PUBLIC_SITE_URL||'https://fullsendmarket.vercel.app').replace(/\/$/,'')
  const res=await fetch('https://api.mercadopago.com/v1/payments',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Idempotency-Key':order.id},body:JSON.stringify({transaction_amount:7.99,description:'FULLSEND — Selo Verificado (pagamento único)',payment_method_id:'pix',external_reference:`FULLSEND_VERIFY:${order.id}`,notification_url:`${base}/api/payments/webhook`,payer:{email:user.email}}),cache:'no-store'})
  payment=await res.json()
  if(!res.ok||!payment.id)throw new Error('Não foi possível gerar o Pix. Tente novamente.')
  const tx=payment.point_of_interaction?.transaction_data||{}
  const update=await admin.from('verification_payments').update({mp_payment_id:String(payment.id),qr_code:tx.qr_code||null,qr_code_base64:tx.qr_code_base64||null}).eq('id',order.id)
  if(update.error)throw update.error
 }
 if(payment)await syncVerifiedPayment(payment)
 const fresh=await admin.from('verification_payments').select('*').eq('id',order.id).single()
 if(fresh.error)throw fresh.error
 const profile=await admin.from('profiles').select('is_verified').eq('id',user.id).single()
 if(profile.error)throw profile.error
 return NextResponse.json({active:profile.data.is_verified,status:fresh.data.status,ticket_url:payment?.point_of_interaction?.transaction_data?.ticket_url||null},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível processar o selo.'},{status:503})}}
export async function POST(){return run(true)}
export async function GET(){return run(false)}
