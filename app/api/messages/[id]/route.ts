import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanStoredAttachments, signAttachments } from '@/lib/messages/attachments'

export const dynamic='force-dynamic'
export const runtime='nodejs'

async function context(id:string){
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)return {error:NextResponse.json({error:'Não autenticado.'},{status:401})}
  const admin=createAdminClient()
  const {data:conversation}=await admin.from('conversations').select('id,starter_id,recipient_id').eq('id',id).maybeSingle()
  if(!conversation || (conversation.starter_id!==user.id && conversation.recipient_id!==user.id)){
    return {error:NextResponse.json({error:'Conversa não encontrada.'},{status:404})}
  }
  return {user,admin,conversation}
}

async function withSigned(admin:any,message:any){
  return {...message,attachments:await signAttachments(admin,message?.attachments)}
}

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const ctx=await context(id)
    if(ctx.error)return ctx.error

    const {data,error}=await ctx.admin!.from('messages')
      .select('id,conversation_id,sender_id,body,attachments,read_at,created_at')
      .eq('conversation_id',id).order('created_at',{ascending:true}).limit(500)
    if(error)return NextResponse.json({error:'Não foi possível carregar as mensagens.'},{status:500})

    await ctx.admin!.from('messages').update({read_at:new Date().toISOString()})
      .eq('conversation_id',id).neq('sender_id',ctx.user!.id).is('read_at',null)

    const messages=await Promise.all((data||[]).map((m:any)=>withSigned(ctx.admin!,m)))
    return NextResponse.json({ok:true,messages})
  }catch(error){
    console.error('FULLSEND message GET error',error)
    return NextResponse.json({error:'Erro interno.'},{status:500})
  }
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const ctx=await context(id)
    if(ctx.error)return ctx.error

    const input=await req.json().catch(()=>({}))
    const body=String(input?.body||'').trim().slice(0,2000)
    const attachments=cleanStoredAttachments(input?.attachments)
    if(!body&&!attachments.length)return NextResponse.json({error:'Digite uma mensagem ou adicione um anexo.'},{status:400})

    for(const file of attachments){
      if(!file.path.startsWith(`${id}/${ctx.user!.id}/`))return NextResponse.json({error:'Anexo inválido.'},{status:400})
    }

    const messageBody=body||(attachments.length===1?'📎 Anexo':`📎 ${attachments.length} anexos`)
    const now=new Date().toISOString()
    const {data:message,error}=await ctx.admin!.from('messages').insert({
      conversation_id:id,sender_id:ctx.user!.id,body:messageBody,attachments
    }).select('id,conversation_id,sender_id,body,attachments,read_at,created_at').single()

    if(error||!message){
      console.error('FULLSEND message send error',error)
      return NextResponse.json({error:'Não foi possível enviar a mensagem.'},{status:500})
    }

    await ctx.admin!.from('conversations').update({updated_at:now,last_message_at:now}).eq('id',id)
    return NextResponse.json({ok:true,message:await withSigned(ctx.admin!,message)})
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
    const {error}=await ctx.admin!.from('messages').update({read_at:new Date().toISOString()})
      .eq('conversation_id',id).neq('sender_id',ctx.user!.id).is('read_at',null)
    if(error)return NextResponse.json({error:'Não foi possível marcar como lida.'},{status:500})
    return NextResponse.json({ok:true})
  }catch(error){
    console.error('FULLSEND message PATCH error',error)
    return NextResponse.json({error:'Erro interno.'},{status:500})
  }
}
