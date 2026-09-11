import Link from 'next/link'
import { MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function FloatingMessagesButton(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return null

  let unread=0
  try{
    const admin=createAdminClient()
    const {data:convs}=await admin.from('conversations')
      .select('id')
      .or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)

    const ids=(convs||[]).map((x:any)=>x.id)
    if(ids.length){
      const {count}=await admin.from('messages')
        .select('id',{count:'exact',head:true})
        .in('conversation_id',ids)
        .neq('sender_id',user.id)
        .is('read_at',null)
      unread=count||0
    }
  }catch{
    // Se a tabela de mensagens ainda não estiver disponível,
    // o botão continua funcionando sem quebrar o site.
  }

  return (
    <Link
      href="/mensagens"
      className="floating-messages-button"
      aria-label={unread?`Abrir mensagens: ${unread} não lida${unread===1?'':'s'}`:'Abrir mensagens'}
      title="Mensagens"
    >
      <span className="floating-messages-icon"><MessageSquareText size={22}/></span>
      <span className="floating-messages-copy">
        <b>MENSAGENS</b>
        <small>{unread?`${unread} não lida${unread===1?'':'s'}`:'Caixa de entrada'}</small>
      </span>
      {unread?<em>{unread>99?'99+':unread}</em>:null}
    </Link>
  )
}
