export type StoredAttachment={
  path:string
  name:string
  size:number
  type:string
}
export type SignedAttachment=StoredAttachment & {url?:string|null}

export function cleanStoredAttachments(value:any):StoredAttachment[]{
  if(!Array.isArray(value))return []
  return value.slice(0,3).map((x:any)=>({
    path:String(x?.path||''),
    name:String(x?.name||'arquivo').slice(0,180),
    size:Number(x?.size||0),
    type:String(x?.type||'application/octet-stream').slice(0,120)
  })).filter(x=>x.path)
}

export async function signAttachments(admin:any,value:any):Promise<SignedAttachment[]>{
  const items=cleanStoredAttachments(value)
  return Promise.all(items.map(async item=>{
    const {data}=await admin.storage.from('message-attachments').createSignedUrl(item.path,3600)
    return {...item,url:data?.signedUrl||null}
  }))
}

export function attachmentLabel(value:any){
  const items=cleanStoredAttachments(value)
  if(!items.length)return ''
  return items.length===1?'📎 Anexo':`📎 ${items.length} anexos`
}
