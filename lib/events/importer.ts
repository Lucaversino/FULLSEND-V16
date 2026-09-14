import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSymplaEvents, SYMPLA_AUTOMOTIVE_KEYWORDS } from '@/lib/events/providers/sympla-gecko'

type ImportOptions={
  status?:'pending'|'published'
  keyword?:string
  pages?:number
  batch?:boolean
}

export async function importSymplaEvents(options:ImportOptions={}){
  const key=(process.env.GECKO_API_KEY||'').trim()
  if(!key){
    return {
      ok:false,
      configured:false,
      found:0,
      imported:0,
      updated:0,
      existing:0,
      errors:['GECKO_API_KEY não configurada no servidor.'],
      diagnostics:null,
    }
  }

  const status=options.status==='pending'?'pending':'published'
  const pages=Math.min(5,Math.max(1,Math.trunc(Number(options.pages)||1)))
  const custom=String(options.keyword||'').trim()
  const searches=options.batch
    ? SYMPLA_AUTOMOTIVE_KEYWORDS.map(keyword=>({keyword,pages:1}))
    : [{keyword:custom||'encontro de carros',pages}]

  const {events,errors,diagnostics}=await fetchSymplaEvents(searches)
  const admin=createAdminClient()
  const ids=events.map((x:any)=>x.external_id)
  const existingIds=new Set<string>()

  if(ids.length){
    for(let i=0;i<ids.length;i+=100){
      const chunk=ids.slice(i,i+100)
      const {data,error}=await admin.from('events')
        .select('external_id')
        .eq('source','sympla_gecko')
        .in('external_id',chunk)
      if(error)errors.push(`Supabase existentes: ${error.message}`)
      for(const row of data||[])if(row.external_id)existingIds.add(String(row.external_id))
    }
  }

  let imported=0
  let updated=0

  for(let i=0;i<events.length;i+=100){
    const chunk=events.slice(i,i+100).map((x:any)=>({
      ...x,
      status,
      featured:false,
      updated_at:new Date().toISOString(),
    }))

    const {error}=await admin.from('events').upsert(chunk,{onConflict:'external_id'})
    if(error){
      errors.push(`Supabase upsert: ${error.message}`)
      continue
    }
    for(const x of chunk){
      if(existingIds.has(x.external_id))updated++
      else imported++
    }
  }

  return {
    ok:errors.length===0,
    configured:true,
    found:events.length,
    imported,
    updated,
    existing:existingIds.size,
    errors,
    diagnostics,
  }
}
