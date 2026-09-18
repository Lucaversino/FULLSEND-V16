import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CommunityError,context,failure,origin } from '@/lib/community/server'
import { getCloudinaryConfig,signCloudinaryUpload } from '@/lib/community/cloudinary'

export const dynamic='force-dynamic'

export async function POST(req:Request){try{
 origin(req)
 const {user}=await context(true)
 const {kind}=z.object({kind:z.enum(['video','audio'])}).parse(await req.json())
 const config=getCloudinaryConfig()
 if(!config)throw new CommunityError('O FULLSEND Studio ainda não está conectado ao Cloudinary. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no Vercel.',503)
 const timestamp=Math.floor(Date.now()/1000)
 const folder=`fullsend/community/${user!.id}/${kind}`
 const signature=signCloudinaryUpload({folder,timestamp},config.apiSecret)
 return NextResponse.json({cloudName:config.cloudName,apiKey:config.apiKey,timestamp,signature,folder})
}catch(e){return failure(e)}}
