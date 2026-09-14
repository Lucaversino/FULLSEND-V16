import { createAdminClient } from '@/lib/supabase/admin'
import { fetchTicketmasterEvents } from '@/lib/events/providers/ticketmaster'

export async function importTicketmasterEvents(status:'pending'|'published'='published'){
  const key=process.env.TICKETMASTER_API_KEY
  if(!key){
    return {
      ok:false,
      configured:false,
      found:0,
      imported:0,
      updated:0,
      existing:0,
      errors:['TICKETMASTER_API_KEY não configurada no servidor.'],
    }
  }

  const {events,errors}=await fetchTicketmasterEvents(key)
  const admin=createAdminClient()
  const ids=events.map((x:any)=>x.external_id)
  let existingIds=new Set<string>()

  if(ids.length){
    for(let i=0;i<ids.length;i+=100){
      const chunk=ids.slice(i,i+100)
      const {data,error}=await admin.from('events').select('external_id').in('external_id',chunk)
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
  }
}
