import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MessagesHub from '@/components/MessagesHub'
import { signAttachments } from '@/lib/messages/attachments'

export const dynamic='force-dynamic'

export default async function MessagesPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const p=await searchParams
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()
  if(!user)redirect('/login?next=/mensagens')

  const admin=createAdminClient()

  const {data:rawConversations,error:convError}=await admin.from('conversations')
    .select('id,listing_id,starter_id,recipient_id,last_message_at,created_at')
    .or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('last_message_at',{ascending:false})
    .limit(100)

  // Se a migration ainda não foi executada, a página não derruba o site.
  if(convError){
    return <main className="section messages-page"><div className="container">
      <div className="page-head"><span className="section-kicker">FULLSEND CHAT</span><h1>MENSAGENS</h1></div>
      <div className="messages-setup-warning">
        <h2>CAIXA DE MENSAGENS AINDA NÃO FOI ATIVADA NO BANCO</h2>
        <p>Execute a migration <b>012_messages_all_users.sql</b> no Supabase e atualize esta página.</p>
      </div>
    </div></main>
  }

  const convs=rawConversations||[]
  const otherIds=[...new Set(convs.map((c:any)=>c.starter_id===user.id?c.recipient_id:c.starter_id))]
  const listingIds=[...new Set(convs.map((c:any)=>c.listing_id).filter(Boolean))]

  const [{data:profiles},{data:listings},{data:lastMessages},{data:unreads}]=await Promise.all([
    otherIds.length?admin.from('profiles').select('id,name,avatar_url,badge').in('id',otherIds):Promise.resolve({data:[] as any[]}),
    listingIds.length?admin.from('listings').select('id,title,slug,cover_url').in('id',listingIds):Promise.resolve({data:[] as any[]}),
    convs.length?admin.from('messages').select('id,conversation_id,sender_id,body,attachments,read_at,created_at').in('conversation_id',convs.map((c:any)=>c.id)).order('created_at',{ascending:false}):Promise.resolve({data:[] as any[]}),
    convs.length?admin.from('messages').select('id,conversation_id,sender_id,read_at').in('conversation_id',convs.map((c:any)=>c.id)).neq('sender_id',user.id).is('read_at',null):Promise.resolve({data:[] as any[]})
  ])

  const profileMap=new Map((profiles||[]).map((x:any)=>[x.id,x]))
  const listingMap=new Map((listings||[]).map((x:any)=>[x.id,x]))
  const lastMap=new Map<string,any>()
  for(const m of (lastMessages||[])){if(!lastMap.has(m.conversation_id))lastMap.set(m.conversation_id,m)}
  const unreadMap=new Map<string,number>()
  for(const m of (unreads||[]))unreadMap.set(m.conversation_id,(unreadMap.get(m.conversation_id)||0)+1)

  const conversations=convs.map((c:any)=>{
    const otherId=c.starter_id===user.id?c.recipient_id:c.starter_id
    return {
      id:c.id,
      other:profileMap.get(otherId)||{id:otherId,name:'Usuário FULLSEND'},
      listing:c.listing_id?listingMap.get(c.listing_id)||null:null,
      lastMessage:lastMap.get(c.id)||null,
      unread:unreadMap.get(c.id)||0,
      last_message_at:c.last_message_at
    }
  })

  const selectedId = p.conversa && conversations.some((c:any)=>c.id===p.conversa)
    ? p.conversa
    : conversations[0]?.id || null

  let initialMessages:any[]=[]
  if(selectedId){
    const {data}=await admin.from('messages')
      .select('id,conversation_id,sender_id,body,attachments,read_at,created_at')
      .eq('conversation_id',selectedId)
      .order('created_at',{ascending:true})
      .limit(500)
    initialMessages=data||[]

    await admin.from('messages')
      .update({read_at:new Date().toISOString()})
      .eq('conversation_id',selectedId)
      .neq('sender_id',user.id)
      .is('read_at',null)
  }

  return <main className="section messages-page">
    <div className="container">
      <div className="page-head messages-page-head">
        <span className="section-kicker">FULLSEND CHAT</span>
        <h1>MINHAS MENSAGENS</h1>
        <p>Converse diretamente com outros membros do FULLSEND sem sair do site.</p>
      </div>
      <MessagesHub currentUserId={user.id} conversations={conversations as any} selectedId={selectedId} initialMessages={initialMessages}/>
    </div>
  </main>
}
