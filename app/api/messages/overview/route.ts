import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachmentLabel } from '@/lib/messages/attachments'

export const dynamic='force-dynamic'
export const runtime='nodejs'

export async function GET(){
  try{
    const s=await createClient()
    const {data:{user}}=await s.auth.getUser()
    if(!user)return NextResponse.json({error:'Não autenticado.'},{status:401})

    const admin=createAdminClient()
    const {data:raw,error}=await admin.from('conversations')
      .select('id,listing_id,starter_id,recipient_id,last_message_at,created_at')
      .or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('last_message_at',{ascending:false})
      .limit(100)
    if(error)return NextResponse.json({error:'Não foi possível carregar as conversas.'},{status:500})

    const convs=raw||[]
    const otherIds=[...new Set(convs.map((c:any)=>c.starter_id===user.id?c.recipient_id:c.starter_id))]
    const listingIds=[...new Set(convs.map((c:any)=>c.listing_id).filter(Boolean))]
    const convIds=convs.map((c:any)=>c.id)

    const [{data:profiles},{data:listings},{data:lastMessages},{data:unreads},{data:follows}]=await Promise.all([
      otherIds.length?admin.from('profiles').select('id,name,avatar_url,badge,city,state').in('id',otherIds):Promise.resolve({data:[] as any[]}),
      listingIds.length?admin.from('listings').select('id,title,slug,cover_url').in('id',listingIds):Promise.resolve({data:[] as any[]}),
      convIds.length?admin.from('messages').select('id,conversation_id,sender_id,body,attachments,read_at,created_at').in('conversation_id',convIds).order('created_at',{ascending:false}):Promise.resolve({data:[] as any[]}),
      convIds.length?admin.from('messages').select('id,conversation_id,sender_id,read_at').in('conversation_id',convIds).neq('sender_id',user.id).is('read_at',null):Promise.resolve({data:[] as any[]}),
      admin.from('user_follows').select('followed_id,created_at').eq('follower_id',user.id).order('created_at',{ascending:false}).limit(100)
    ])

    const followedIds=(follows||[]).map((x:any)=>x.followed_id)
    const {data:contactProfiles}=followedIds.length
      ? await admin.from('profiles').select('id,name,avatar_url,badge,city,state').in('id',followedIds)
      : {data:[] as any[]}

    const profileMap=new Map((profiles||[]).map((x:any)=>[x.id,x]))
    const listingMap=new Map((listings||[]).map((x:any)=>[x.id,x]))
    const lastMap=new Map<string,any>()
    for(const m of (lastMessages||[])){if(!lastMap.has(m.conversation_id))lastMap.set(m.conversation_id,m)}
    const unreadMap=new Map<string,number>()
    for(const m of (unreads||[]))unreadMap.set(m.conversation_id,(unreadMap.get(m.conversation_id)||0)+1)

    const conversations=convs.map((c:any)=>{
      const otherId=c.starter_id===user.id?c.recipient_id:c.starter_id
      const last=lastMap.get(c.id)||null
      return {
        id:c.id,
        other:profileMap.get(otherId)||{id:otherId,name:'Usuário FULLSEND'},
        listing:c.listing_id?listingMap.get(c.listing_id)||null:null,
        lastMessage:last?{...last,preview:last.body||attachmentLabel(last.attachments)||'Conversa iniciada'}:null,
        unread:unreadMap.get(c.id)||0,
        last_message_at:c.last_message_at
      }
    })

    const contactMap=new Map((contactProfiles||[]).map((x:any)=>[x.id,x]))
    const contacts=(follows||[]).map((x:any)=>contactMap.get(x.followed_id)).filter(Boolean)

    return NextResponse.json({ok:true,currentUserId:user.id,conversations,contacts})
  }catch(error){
    console.error('FULLSEND messages overview error',error)
    return NextResponse.json({error:'Erro interno.'},{status:500})
  }
}
