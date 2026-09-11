import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const MAX_SIZE=8*1024*1024
const ALLOWED=new Set([
  'image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

function safeName(name:string){
  const cleaned=name.normalize('NFKD').replace(/[^\w.\-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,120)
  return cleaned||'arquivo'
}

export async function POST(req:Request){
  try{
    const supabase=await createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return NextResponse.json({error:'Faça login para enviar anexos.'},{status:401})

    const form=await req.formData()
    const conversationId=String(form.get('conversationId')||'').trim()
    const file=form.get('file')
    if(!conversationId || !(file instanceof File))return NextResponse.json({error:'Arquivo ou conversa inválida.'},{status:400})
    if(!file.size || file.size>MAX_SIZE)return NextResponse.json({error:'O arquivo deve ter no máximo 8 MB.'},{status:400})
    if(!ALLOWED.has(file.type))return NextResponse.json({error:'Formato não permitido. Use imagem, PDF, TXT, DOC ou DOCX.'},{status:400})

    const admin=createAdminClient()
    const {data:conv}=await admin.from('conversations').select('id,starter_id,recipient_id').eq('id',conversationId).maybeSingle()
    if(!conv || (conv.starter_id!==user.id && conv.recipient_id!==user.id))return NextResponse.json({error:'Conversa não encontrada.'},{status:404})

    const path=`${conversationId}/${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`
    const {error}=await admin.storage.from('message-attachments').upload(path,await file.arrayBuffer(),{
      contentType:file.type,upsert:false,cacheControl:'3600'
    })
    if(error){
      console.error('FULLSEND message attachment upload error',error)
      return NextResponse.json({error:'Não foi possível enviar o anexo.'},{status:500})
    }

    return NextResponse.json({ok:true,attachment:{path,name:file.name.slice(0,180),size:file.size,type:file.type}})
  }catch(error){
    console.error('FULLSEND message upload error',error)
    return NextResponse.json({error:'Erro interno ao enviar anexo.'},{status:500})
  }
}
