import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function POST(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const fd=await req.formData()
  const file=fd.get('file')
  if(!(file instanceof File)||file.size===0)return NextResponse.json({error:'Arquivo inválido.'},{status:400})
  if(file.size>10*1024*1024)return NextResponse.json({error:'Imagem maior que 10 MB.'},{status:400})
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'Formato não suportado.'},{status:400})
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
  const path=`admin/${gate.user.id}/${crypto.randomUUID()}-${safe}`
  const {error}=await gate.admin.storage.from('event-images').upload(path,file,{contentType:file.type,upsert:false})
  if(error)return NextResponse.json({error:error.message},{status:400})
  const {data}=gate.admin.storage.from('event-images').getPublicUrl(path)
  return NextResponse.json({url:data.publicUrl})
}
