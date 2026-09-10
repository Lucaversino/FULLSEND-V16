import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function cleanBody(value:unknown){
  return String(value||'').trim().slice(0,2000)
}

export async function POST(req:Request){
  try{
    const s=await createClient()
    const {data:{user}}=await s.auth.getUser()
    if(!user)return NextResponse.json({error:'Faça login para enviar mensagens.'},{status:401})

    const input=await req.json().catch(()=>({}))
    const recipientId=String(input?.recipientId||'').trim()
    const listingId=String(input?.listingId||'').trim()||null
    const body=cleanBody(input?.body)

    if(!recipientId)return NextResponse.json({error:'Destinatário inválido.'},{status:400})
    if(recipientId===user.id)return NextResponse.json({error:'Você não pode enviar mensagem para si mesmo.'},{status:400})

    const admin=createAdminClient()

    const {data:recipient}=await admin.from('profiles')
      .select('id,name')
      .eq('id',recipientId)
      .maybeSingle()

    if(!recipient)return NextResponse.json({error:'Usuário não encontrado.'},{status:404})

    if(listingId){
      const {data:listing}=await admin.from('listings')
        .select('id,user_id,status')
        .eq('id',listingId)
        .maybeSingle()

      if(!listing || listing.user_id!==recipientId || listing.status!=='active'){
        return NextResponse.json({error:'Este anúncio não está disponível para mensagens.'},{status:400})
      }
    }

    let query=admin.from('conversations')
      .select('id')
      .or(`and(starter_id.eq.${user.id},recipient_id.eq.${recipientId}),and(starter_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .order('last_message_at',{ascending:false})
      .limit(1)

    if(listingId) query=query.eq('listing_id',listingId)
    else query=query.is('listing_id',null)

    const {data:existing,error:findError}=await query.maybeSingle()
    if(findError){
      console.error('FULLSEND messages find conversation error',findError)
      return NextResponse.json({error:'Não foi possível abrir a conversa.'},{status:500})
    }

    let conversationId=existing?.id as string|undefined

    if(!conversationId){
      const {data:created,error:createError}=await admin.from('conversations')
        .insert({
          listing_id:listingId,
          starter_id:user.id,
          recipient_id:recipientId,
          last_message_at:new Date().toISOString()
        })
        .select('id')
        .single()

      if(createError||!created){
        console.error('FULLSEND messages create conversation error',createError)
        return NextResponse.json({error:'Não foi possível criar a conversa.'},{status:500})
      }
      conversationId=created.id
    }

    if(body){
      const now=new Date().toISOString()
      const {error:messageError}=await admin.from('messages').insert({
        conversation_id:conversationId,
        sender_id:user.id,
        body
      })
      if(messageError){
        console.error('FULLSEND messages initial message error',messageError)
        return NextResponse.json({error:'Não foi possível enviar sua mensagem.'},{status:500})
      }
      await admin.from('conversations').update({
        updated_at:now,
        last_message_at:now
      }).eq('id',conversationId)
    }

    return NextResponse.json({ok:true,conversationId})
  }catch(error){
    console.error('FULLSEND messages start error',error)
    return NextResponse.json({error:'Erro interno ao iniciar conversa.'},{status:500})
  }
}
