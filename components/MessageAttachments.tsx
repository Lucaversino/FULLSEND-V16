'use client'

import { FileText, Download } from 'lucide-react'

export type ChatAttachment={path:string;name:string;size:number;type:string;url?:string|null}

function formatSize(bytes:number){
  if(bytes<1024)return `${bytes} B`
  if(bytes<1024*1024)return `${Math.round(bytes/1024)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

export default function MessageAttachments({items=[]}:{items?:ChatAttachment[]}){
  if(!items.length)return null
  return <div className="chat-attachments">
    {items.map((a,i)=>{
      const image=a.type?.startsWith('image/')
      return <a key={`${a.path}-${i}`} className={`chat-attachment ${image?'image':''}`} href={a.url||'#'} target="_blank" rel="noreferrer" onClick={e=>{if(!a.url)e.preventDefault()}}>
        {image&&a.url?<img src={a.url} alt={a.name}/>:<span className="chat-attachment-file"><FileText size={18}/></span>}
        <span className="chat-attachment-copy"><b>{a.name}</b><small>{formatSize(a.size)}</small></span>
        <Download size={15}/>
      </a>
    })}
  </div>
}
