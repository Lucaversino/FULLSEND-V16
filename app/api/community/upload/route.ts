import { NextResponse } from 'next/server'
import { z } from 'zod'
import { context,checked,failure,origin } from '@/lib/community/server'
import { MIME } from '@/lib/community/shared'
export async function POST(req:Request){try{
 origin(req);const {s,user}=await context(true)
 const b=z.object({type:z.enum(MIME),size:z.number().int().positive().max(200*1024*1024)}).superRefine((value,ctx)=>{if(value.type.startsWith('image/')&&value.size>20*1024*1024)ctx.addIssue({code:'custom',message:'A imagem deve ter no máximo 20 MB.'})}).parse(await req.json())
 const ext:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'}
 const path=`${user!.id}/${crypto.randomUUID()}.${ext[b.type]}`
 const {data}=checked(await s.storage.from('community-media').createSignedUploadUrl(path))
 return NextResponse.json({path,token:data!.token})
}catch(e){return failure(e)}}
