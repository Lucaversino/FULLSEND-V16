import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CommunityError,context,failure,origin } from '@/lib/community/server'
import { cloudinaryRawUrl,getCloudinaryConfig,signCloudinaryUpload } from '@/lib/community/cloudinary'

export const dynamic='force-dynamic'

const bodySchema=z.object({
 action:z.enum(['start','status']),
 publicId:z.string().min(1).max(300).regex(/^[a-zA-Z0-9/_-]+$/)
})

export async function POST(req:Request){try{
 origin(req)
 const {user}=await context(true)
 const {action,publicId}=bodySchema.parse(await req.json())
 const config=getCloudinaryConfig()
 if(!config)throw new CommunityError('Cloudinary não configurado.',503)
 if(!publicId.startsWith(`fullsend/community/${user!.id}/video/`))throw new CommunityError('Vídeo inválido.',403)

 const transcriptUrl=cloudinaryRawUrl(publicId,'transcript')
 if(!transcriptUrl)throw new CommunityError('Cloudinary indisponível.',503)

 if(action==='status'){
  const check=await fetch(transcriptUrl,{method:'HEAD',cache:'no-store'})
  return NextResponse.json({ready:check.ok})
 }

 const timestamp=Math.floor(Date.now()/1000)
 const params={auto_transcription:true,public_id:publicId,timestamp,type:'upload'}
 const signature=signCloudinaryUpload(params,config.apiSecret)
 const form=new FormData()
 form.set('public_id',publicId)
 form.set('type','upload')
 form.set('auto_transcription','true')
 form.set('timestamp',String(timestamp))
 form.set('api_key',config.apiKey)
 form.set('signature',signature)
 const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/video/explicit`,{method:'POST',body:form,cache:'no-store'})
 const data=await response.json().catch(()=>({})) as any
 if(!response.ok)throw new CommunityError(data?.error?.message||'A geração automática de legendas não está disponível neste Cloudinary.',502)
 return NextResponse.json({started:true,status:data?.auto_transcription?.status||data?.status||'pending'})
}catch(e){return failure(e)}}
