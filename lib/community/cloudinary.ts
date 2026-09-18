import { createHash, createHmac, timingSafeEqual } from 'crypto'

const CLOUDINARY_PREFIX='cld:'

type CloudinaryConfig={
 cloudName:string
 apiKey:string
 apiSecret:string
}

type CloudinaryToken={
 u:string
 p:string
 t:string
}

export function getCloudinaryConfig():CloudinaryConfig|null{
 const cloudName=process.env.CLOUDINARY_CLOUD_NAME?.trim()
 const apiKey=process.env.CLOUDINARY_API_KEY?.trim()
 const apiSecret=process.env.CLOUDINARY_API_SECRET?.trim()
 return cloudName&&apiKey&&apiSecret?{cloudName,apiKey,apiSecret}:null
}

export function signCloudinaryUpload(params:Record<string,string|number|boolean>,secret:string){
 const serialized=Object.entries(params)
  .filter(([,value])=>value!==''&&value!==undefined&&value!==null)
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([key,value])=>`${key}=${value}`)
  .join('&')
 return createHash('sha1').update(serialized+secret).digest('hex')
}

function tokenSignature(body:string,secret:string){
 return createHmac('sha256',secret).update(body).digest('base64url').slice(0,32)
}

export function encodeCloudinaryMediaPath(userId:string,publicId:string,transformation:string){
 const config=getCloudinaryConfig()
 if(!config)throw new Error('Cloudinary não configurado.')
 const payload:CloudinaryToken={u:userId,p:publicId,t:transformation}
 const body=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url')
 return `${CLOUDINARY_PREFIX}${body}.${tokenSignature(body,config.apiSecret)}`
}

export function decodeCloudinaryMediaPath(path:string):CloudinaryToken|null{
 if(!path.startsWith(CLOUDINARY_PREFIX))return null
 const config=getCloudinaryConfig()
 if(!config)return null
 const raw=path.slice(CLOUDINARY_PREFIX.length)
 const dot=raw.lastIndexOf('.')
 if(dot<=0)return null
 const body=raw.slice(0,dot),signature=raw.slice(dot+1)
 const expected=tokenSignature(body,config.apiSecret)
 const a=Buffer.from(signature),b=Buffer.from(expected)
 if(a.length!==b.length||!timingSafeEqual(a,b))return null
 try{
  const parsed=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as CloudinaryToken
  if(!parsed||typeof parsed.u!=='string'||typeof parsed.p!=='string'||typeof parsed.t!=='string')return null
  if(parsed.p.includes('..')||parsed.t.includes('..'))return null
  return parsed
 }catch{return null}
}

export function isOwnedCommunityMediaPath(path:string,userId:string){
 if(path.startsWith(`${userId}/`)&&!path.includes('..'))return true
 const decoded=decodeCloudinaryMediaPath(path)
 return Boolean(decoded&&decoded.u===userId&&decoded.p.startsWith(`fullsend/community/${userId}/video/`))
}

const publicIdPath=(publicId:string)=>publicId.split('/').map(part=>encodeURIComponent(part)).join('/')

export function cloudinaryVideoUrl(publicId:string,transformation:string){
 const config=getCloudinaryConfig()
 if(!config)return null
 const transform=transformation?`${transformation}/`:''
 return `https://res.cloudinary.com/${encodeURIComponent(config.cloudName)}/video/upload/${transform}${publicIdPath(publicId)}.mp4`
}

export function cloudinaryRawUrl(publicId:string,extension='transcript'){
 const config=getCloudinaryConfig()
 if(!config)return null
 return `https://res.cloudinary.com/${encodeURIComponent(config.cloudName)}/raw/upload/${publicIdPath(publicId)}.${encodeURIComponent(extension)}`
}

export function cloudinaryLayerId(publicId:string){
 return publicId.split('/').map(part=>encodeURIComponent(part)).join(':')
}
