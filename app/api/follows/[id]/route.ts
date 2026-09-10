import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic='force-dynamic'
export const runtime='nodejs'

async function getContext(id:string){
  const s=await createClient()
  const {data:{user}}=await s.auth.getUser()

  if(!user){
    return {error:NextResponse.json({error:'Faça login para seguir usuários.'},{status:401})}
  }

  if(!id || id===user.id){
    return {error:NextResponse.json({error:'Usuário inválido.'},{status:400})}
  }

  const admin=createAdminClient()
  const {data:target,error}=await admin.from('profiles')
    .select('id,name,avatar_url,badge')
    .eq('id',id)
    .maybeSingle()

  if(error || !target){
    return {error:NextResponse.json({error:'Usuário não encontrado.'},{status:404})}
  }

  return {user,admin,target}
}

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const ctx=await getContext(id)
    if(ctx.error)return ctx.error

    const {data,error}=await ctx.admin!.from('user_follows')
      .select('followed_id')
      .eq('follower_id',ctx.user!.id)
      .eq('followed_id',id)
      .maybeSingle()

    if(error){
      console.error('FULLSEND follow status error',error)
      return NextResponse.json({error:'Não foi possível consultar o contato.'},{status:500})
    }

    return NextResponse.json({ok:true,following:Boolean(data)})
  }catch(error){
    console.error('FULLSEND follow GET error',error)
    return NextResponse.json({error:'Erro interno.'},{status:500})
  }
}

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const ctx=await getContext(id)
    if(ctx.error)return ctx.error

    const {data:existing,error:findError}=await ctx.admin!.from('user_follows')
      .select('followed_id')
      .eq('follower_id',ctx.user!.id)
      .eq('followed_id',id)
      .maybeSingle()

    if(findError){
      console.error('FULLSEND follow find error',findError)
      return NextResponse.json({error:'Não foi possível atualizar o contato.'},{status:500})
    }

    if(existing){
      const {error}=await ctx.admin!.from('user_follows')
        .delete()
        .eq('follower_id',ctx.user!.id)
        .eq('followed_id',id)

      if(error){
        console.error('FULLSEND unfollow error',error)
        return NextResponse.json({error:'Não foi possível deixar de seguir.'},{status:500})
      }

      return NextResponse.json({ok:true,following:false})
    }

    const {error}=await ctx.admin!.from('user_follows').insert({
      follower_id:ctx.user!.id,
      followed_id:id
    })

    if(error){
      console.error('FULLSEND follow insert error',error)
      return NextResponse.json({error:'Não foi possível seguir este usuário.'},{status:500})
    }

    return NextResponse.json({ok:true,following:true})
  }catch(error){
    console.error('FULLSEND follow POST error',error)
    return NextResponse.json({error:'Erro interno.'},{status:500})
  }
}
