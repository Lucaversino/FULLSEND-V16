import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MiniMessagesWidget from '@/components/MiniMessagesWidget'

export default async function FloatingMessagesButton(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return null

  let unread=0
  try{
    const admin=createAdminClient()
    const {data:convs}=await admin.from('conversations').select('id').or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)
    const ids=(convs||[]).map((x:any)=>x.id)
    if(ids.length){
      const {count}=await admin.from('messages').select('id',{count:'exact',head:true}).in('conversation_id',ids).neq('sender_id',user.id).is('read_at',null)
      unread=count||0
    }
  }catch{}

  return <MiniMessagesWidget currentUserId={user.id} initialUnread={unread}/>
}
