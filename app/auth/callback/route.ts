import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/perfil'
}

export async function GET(request: Request){
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const next=safeNext(url.searchParams.get('next'))
  const errorDescription=url.searchParams.get('error_description')

  if(errorDescription){
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription)}`,request.url))
  }

  if(code){
    const supabase=await createClient()
    const { error }=await supabase.auth.exchangeCodeForSession(code)
    if(error){
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`,request.url))
    }

    // Google normalmente envia full_name/name e picture/avatar_url nos metadados.
    // Mantemos os dados locais já preenchidos e completamos apenas o que vier do OAuth.
    const { data:{ user } }=await supabase.auth.getUser()
    if(user){
      const meta=user.user_metadata || {}
      const googleName=meta.full_name || meta.name || meta.user_name || ''
      const googleAvatar=meta.avatar_url || meta.picture || ''
      const patch:Record<string,string>={}
      if(googleName) patch.name=String(googleName)
      if(googleAvatar) patch.avatar_url=String(googleAvatar)
      if(Object.keys(patch).length){
        await supabase.from('profiles').update(patch).eq('id',user.id)
      }
    }
  }

  return NextResponse.redirect(new URL(next,request.url))
}
