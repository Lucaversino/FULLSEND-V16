import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CommunityError,context,failure,origin } from '@/lib/community/server'
import { cloudinaryLayerId,cloudinaryVideoUrl,encodeCloudinaryMediaPath,getCloudinaryConfig } from '@/lib/community/cloudinary'

export const dynamic='force-dynamic'

const speedSchema=z.union([z.literal(.5),z.literal(1),z.literal(1.5),z.literal(2)])
const bodySchema=z.object({
 publicId:z.string().min(1).max(300).regex(/^[a-zA-Z0-9/_-]+$/),
 start:z.number().min(0).max(7200),
 end:z.number().positive().max(7200),
 ratio:z.enum(['original','vertical','square']),
 cropMode:z.enum(['fill','fit']),
 quality:z.enum(['720','1080']),
 speed:speedSchema,
 originalVolume:z.number().min(0).max(1),
 captions:z.boolean().default(false),
 tracks:z.array(z.object({
  publicId:z.string().min(1).max(300).regex(/^[a-zA-Z0-9/_-]+$/),
  start:z.number().min(0).max(7200),
  volume:z.number().min(0).max(1)
 })).max(4)
}).superRefine((value,ctx)=>{
 if(value.end-value.start<.2)ctx.addIssue({code:'custom',message:'O corte precisa ter pelo menos 0,2 segundo.'})
})

const n=(value:number)=>Number(value.toFixed(2)).toString()
const speedEffect=(speed:number)=>Math.round((speed-1)*100)

export async function POST(req:Request){try{
 origin(req)
 const {user}=await context(true)
 const config=getCloudinaryConfig()
 if(!config)throw new CommunityError('O FULLSEND Studio ainda não está conectado ao Cloudinary.',503)
 const b=bodySchema.parse(await req.json())
 const videoPrefix=`fullsend/community/${user!.id}/video/`
 const audioPrefix=`fullsend/community/${user!.id}/audio/`
 if(!b.publicId.startsWith(videoPrefix))throw new CommunityError('Vídeo de origem inválido.',403)
 if(b.tracks.some(track=>!track.publicId.startsWith(audioPrefix)))throw new CommunityError('Faixa de áudio inválida.',403)

 const components:string[]=[]
 components.push(`so_${n(b.start)},eo_${n(b.end)}`)
 const accelerate=speedEffect(b.speed)
 if(accelerate)components.push(`e_accelerate:${accelerate}`)
 if(b.originalVolume===0)components.push('ac_none')
 else if(b.originalVolume!==1)components.push(`e_volume:${Math.round(b.originalVolume*100)-100}`)

 if(b.ratio==='vertical'){
  const w=b.quality==='1080'?1080:720,h=b.quality==='1080'?1920:1280
  components.push(b.cropMode==='fill'?`c_fill,g_auto,w_${w},h_${h}`:`c_pad,b_black,w_${w},h_${h}`)
 }else if(b.ratio==='square'){
  const size=b.quality==='1080'?1080:720
  components.push(b.cropMode==='fill'?`c_fill,g_auto,w_${size},h_${size}`:`c_pad,b_black,w_${size},h_${size}`)
 }else{
  const max=b.quality==='1080'?1920:1280
  components.push(`c_limit,w_${max},h_${max}`)
 }

 for(const track of b.tracks){
  components.push(`l_audio:${cloudinaryLayerId(track.publicId)}`)
  const sourceOffset=Math.max(0,b.start-track.start)
  if(sourceOffset>0)components.push(`so_${n(sourceOffset)}`)
  if(accelerate)components.push(`e_accelerate:${accelerate}`)
  if(track.volume!==1)components.push(`e_volume:${Math.round(track.volume*100)-100}`)
  const outputStart=Math.max(0,(track.start-b.start)/b.speed)
  components.push(`fl_layer_apply,so_${n(outputStart)}`)
 }

 if(b.captions){
  components.push(`l_subtitles:${cloudinaryLayerId(b.publicId)}.transcript`)
  components.push('fl_layer_apply,g_south,y_70')
 }

 components.push('q_auto:good,vc_h264,ac_aac')
 const transformation=components.join('/')
 const url=cloudinaryVideoUrl(b.publicId,transformation)
 if(!url)throw new CommunityError('Cloudinary indisponível.',503)
 const path=encodeCloudinaryMediaPath(user!.id,b.publicId,transformation)
 return NextResponse.json({path,type:'video/mp4',url})
}catch(e){return failure(e)}}
