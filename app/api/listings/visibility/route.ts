import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req:Request){
  const session=await createClient()
  const {data:{user},error:userError}=await session.auth.getUser()

  if(userError||!user){
    return NextResponse.json({error:'Sua sessão expirou. Entre novamente.'},{status:401})
  }

  const body=await req.json().catch(()=>null)
  if(!body){
    return NextResponse.json({error:'Dados inválidos.'},{status:400})
  }

  const id=String(body.id||'').trim()
  const enabled=Boolean(body.enabled)

  if(!id){
    return NextResponse.json({error:'Anúncio inválido.'},{status:400})
  }

  const admin=createAdminClient()

  const {data:listing,error:findError}=await admin
    .from('listings')
    .select('id,user_id,category_slug,status,title,listing_mode')
    .eq('id',id)
    .eq('user_id',user.id)
    .maybeSingle()

  if(findError){
    return NextResponse.json({error:findError.message},{status:400})
  }

  if(!listing){
    return NextResponse.json({error:'Anúncio não encontrado ou não pertence à sua conta.'},{status:404})
  }

  if(listing.listing_mode==='garage'){
    return NextResponse.json({error:'Carros da Minha Garagem não fazem parte dos classificados.'},{status:400})
  }

  if(listing.category_slug!=='carros'){
    return NextResponse.json({error:'Este controle é exclusivo para anúncios de carros.'},{status:400})
  }

  if(listing.status==='sold'){
    return NextResponse.json({
      error:'Este carro está marcado como vendido. Edite o anúncio e altere o status antes de reativar.'
    },{status:409})
  }

  if(listing.status==='blocked'){
    return NextResponse.json({
      error:'Este anúncio está bloqueado pela administração e não pode ser reativado pelo usuário.'
    },{status:403})
  }

  const nextStatus=enabled?'active':'draft'

  const {data:updated,error:updateError}=await admin
    .from('listings')
    .update({
      status:nextStatus,
      updated_at:new Date().toISOString(),
    })
    .eq('id',id)
    .eq('user_id',user.id)
    .select('id,status')
    .single()

  if(updateError){
    return NextResponse.json({error:updateError.message},{status:400})
  }

  return NextResponse.json({
    success:true,
    status:updated.status,
    enabled:updated.status==='active',
    message:updated.status==='active'
      ?'Carro ativado nos classificados.'
      :'Carro removido temporariamente dos classificados.',
  })
}
