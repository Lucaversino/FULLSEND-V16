import {createAdminClient} from '@/lib/supabase/admin'
export async function syncVerifiedPayment(payment:any){
 const external=String(payment?.external_reference||'')
 if(!external.startsWith('FULLSEND_VERIFY:'))return false
 const id=external.slice(16)
 const admin=createAdminClient()
 const {data:order,error}=await admin.from('verification_payments').select('*').eq('id',id).single()
 if(error||!order)throw new Error('Pedido de selo não encontrado.')
 if(payment.currency_id!=='BRL'||Number(payment.transaction_amount)!==7.99||!payment.id)throw new Error('Valor ou moeda divergente.')
 if(order.mp_payment_id&&String(payment.id)!==order.mp_payment_id)throw new Error('Pagamento divergente.')
 const status=String(payment.status)
 if(!['approved','pending','rejected','cancelled','refunded','charged_back'].includes(status))return true
 const result=await admin.rpc('sync_verified_payment',{p_order:id,p_payment:String(payment.id),p_status:status})
 if(result.error)throw result.error
 return true
}
