import { NextResponse } from 'next/server'
import { z } from 'zod'
import { context,checked,failure,origin } from '@/lib/community/server'
import { MIME } from '@/lib/community/shared'

const bodySchema=z.object({
 type:z.enum(MIME),
 size:z.number().int().positive().max(250*1024*1024),
 purpose:z.enum(['image','video','thumbnail']).default('image'),
 postId:z.string().uuid().optional(),
 duration:z.number().positive().max(60*60*6).optional(),
 width:z.number().int().positive().max(7680).optional(),
 height:z.number().int().positive().max(7680).optional(),
 aspectRatio:z.string().max(20).optional(),
})

export async function POST(req:Request){try{
 origin(req);const {s,user}=await context(true)
 const b=bodySchema.parse(await req.json())
 const ext:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'}
 if(b.purpose==='video'&&b.type!=='video/mp4')throw new Error('O vídeo final precisa estar em MP4.')
 if(b.purpose==='thumbnail'&&b.type!=='image/jpeg')throw new Error('A capa do vídeo precisa estar em JPEG.')
 if((b.purpose==='video'||b.purpose==='thumbnail')&&!b.postId)throw new Error('Publicação inválida.')
 const uid=user!.id,token=crypto.randomUUID()
 const path=b.purpose==='video'
  ? `${uid}/posts/videos/${b.postId}-${token}.mp4`
  : b.purpose==='thumbnail'
   ? `${uid}/posts/thumbnails/${b.postId}-${token}.jpg`
   : `${uid}/posts/images/${token}.${ext[b.type]}`
 const {data}=checked(await s.storage.from('community-media').createSignedUploadUrl(path))
 return NextResponse.json({path,token:data!.token})
}catch(e){return failure(e)}}
