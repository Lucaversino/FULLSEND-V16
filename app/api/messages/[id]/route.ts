import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic='force-dynamic'
export const runtime='nodejs'

async function context(id:string){
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return {error:NextResponse.json({error:'Não autenticado.'},{status:401})}

  const admin=createAdminClient()
  const {data:conversation}=await admin.from('conversations')
    .select('id,starter_id,recipient_id')
    .eq('id',id)
    .maybeSingle()

  if(!conversation || (conversation.starter_id!==user.id && conversation.recipient_id!==user.id)){
    return {error:NextResponse.json({error:'Conversa não encontrada.'},{status:404})}
  }
  return {user,admin,conversation}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const ctx=await context(id)
    if(ctx.error)return ctx.error

    const input=await req.json().catch(()=>({}))
    const body=String(input?.body||'').trim().slice(0,2000)
    if(!body)return NextResponse.json({error:'Digite uma mensagem.'},{status:400})

    const now=new Date().toISOString()
    const {data:message,error}=await ctx.admin!.from('messages').insert({
      conversation_id:id,
      sender_id:ctx.user!.id,
      body
    }).select('id,conversation_id,sender_id,body,read_at,created_at').single()

    if(error||!message){
      console.error('FULLSEND message send error',error)
      return NextResponse.json({error:'Não foi possível enviar a mensagem.'},{status:500})
    }

    await ctx.admin!.from('conversations').update({
      updated_at:now,
      last_message_at:now
    }).eq('id',id)

    return NextResponse.json({ok:true,message})
  }catch(error){
    console.error('FULLSEND message POST error',error)
    return NextResponse.json({error:'Erro interno ao enviar mensagem.'},{status:500})
  }
}

export async function PATCH(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const ctx=await context(id)
    if(ctx.error)return ctx.error

    const {error}=await ctx.admin!.from('messages')
      .update({read_at:new Date().toISOString()})
      .eq('conversation_id',id)
      .neq('sender_id',ctx.user!.id)
      .is('read_at',null)

    if(error){
      console.error('FULLSEND mark read error',error)
      return NextResponse.json({error:'Não foi possível marcar como lida.'},{status:500})
    }

    return NextResponse.json({ok:true})
  }catch(error){
    console.error('FULLSEND message PATCH error',error)
    return NextResponse.json({error:'Erro interno.'},{status:500})
  }
}
