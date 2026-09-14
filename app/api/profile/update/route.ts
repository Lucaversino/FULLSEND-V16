import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'

const MAX_AVATAR_SIZE=5*1024*1024
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp'])

function clean(value:FormDataEntryValue|null){
  return typeof value==='string'?value.trim():''
}

function extensionFor(file:File){
  if(file.type==='image/png')return 'png'
  if(file.type==='image/webp')return 'webp'
  return 'jpg'
}

export async function POST(req:Request){
  const supabase=await createClient()
  const {data:{user},error:userError}=await supabase.auth.getUser()

  if(userError||!user){
    return NextResponse.json({error:'Sessão expirada. Faça login novamente.'},{status:401})
  }

  const form=await req.formData()
  const admin=createAdminClient()

  let avatarUrl=clean(form.get('current_avatar'))||null
  const avatar=form.get('avatar')

  if(avatar instanceof File && avatar.size>0){
    if(avatar.size>MAX_AVATAR_SIZE){
      return NextResponse.json({error:'A foto deve ter no máximo 5 MB.'},{status:400})
    }
    if(!ALLOWED_TYPES.has(avatar.type)){
      return NextResponse.json({error:'Formato inválido. Use JPG, PNG ou WEBP.'},{status:400})
    }

    const ext=extensionFor(avatar)
    const path=`${user.id}/avatar-${Date.now()}.${ext}`
    const bytes=new Uint8Array(await avatar.arrayBuffer())

    const {error:uploadError}=await admin.storage
      .from('profile-avatars')
      .upload(path,bytes,{
        contentType:avatar.type,
        cacheControl:'3600',
        upsert:false,
      })

    if(uploadError){
      return NextResponse.json({
        error:`Não foi possível enviar a foto: ${uploadError.message}`
      },{status:400})
    }

    avatarUrl=admin.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl
  }

  const payload={
    name:clean(form.get('name')),
    city:clean(form.get('city')),
    state:clean(form.get('state')).toUpperCase().slice(0,2),
    whatsapp:clean(form.get('whatsapp')),
    bio:clean(form.get('bio')),
    instagram:clean(form.get('instagram')),
    avatar_url:avatarUrl,
    updated_at:new Date().toISOString(),
  }

  const {data:profile,error:updateError}=await admin
    .from('profiles')
    .update(payload)
    .eq('id',user.id)
    .select('*')
    .single()

  if(updateError){
    return NextResponse.json({error:updateError.message},{status:400})
  }

  // Mantém também nos metadados do usuário. Isso evita que partes futuras do
  // projeto voltem a usar a foto antiga recebida do Google.
  const {error:metaError}=await admin.auth.admin.updateUserById(user.id,{
    user_metadata:{
      ...user.user_metadata,
      fullsend_avatar_url:avatarUrl,
    }
  })

  if(metaError){
    console.warn('FULLSEND: perfil salvo, mas metadata do avatar não atualizou:',metaError.message)
  }

  // XP de perfil é idempotente: cada recompensa só pode ser recebida uma vez.
  if(avatar instanceof File && avatar.size>0){
    try{await admin.rpc('award_xp',{
      p_user:user.id,p_action:'avatar_added',p_points:10,p_source_type:'profile',p_source_id:'avatar',p_daily_cap:null,p_note:'Foto de perfil personalizada'
    })}catch{}
  }
  if(payload.name&&payload.city&&payload.state&&payload.whatsapp&&payload.bio&&avatarUrl){
    try{await admin.rpc('award_xp',{
      p_user:user.id,p_action:'profile_complete',p_points:30,p_source_type:'profile',p_source_id:'complete',p_daily_cap:null,p_note:'Perfil FULLSEND completo'
    })}catch{}
  }

  return NextResponse.json({
    success:true,
    message:'Perfil atualizado com sucesso.',
    profile,
  })
}
