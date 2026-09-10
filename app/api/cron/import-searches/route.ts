import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runGeckoSearch } from '@/lib/importer/gecko-search'

export const dynamic='force-dynamic'
export const maxDuration=60

export async function GET(req:Request){
  const secret=(process.env.CRON_SECRET||'').trim()
  const auth=req.headers.get('authorization')||''
  if(!secret||auth!==`Bearer ${secret}`){
    return NextResponse.json({error:'Não autorizado.'},{status:401})
  }

  const admin=createAdminClient()
  const {data:jobs,error}=await admin
    .from('import_search_jobs')
    .select('*')
    .eq('enabled',true)
    .order('updated_at',{ascending:true})
    .limit(8)

  if(error)return NextResponse.json({error:error.message},{status:400})

  const results:any[]=[]
  for(const job of jobs||[]){
    const {data:log}=await admin.from('import_search_logs').insert({
      job_id:job.id,keyword:job.keyword,city:job.city,state:job.state,search_category:job.search_category,location_mode:job.location_mode,trigger_source:'cron',status:'running'
    }).select('*').single()

    try{
      const result=await runGeckoSearch({keyword:job.keyword,city:job.city,state:job.state,pages:job.pages,searchCategory:job.search_category,locationMode:job.location_mode})
      const now=new Date().toISOString()
      if(log?.id)await admin.from('import_search_logs').update({
        finished_at:now,status:'success',received:result.received,imported:result.imported,
        pages_processed:result.pagesProcessed,details:result
      }).eq('id',log.id)
      await admin.from('import_search_jobs').update({
        last_run_at:now,last_status:'success',last_received:result.received,last_imported:result.imported,last_error:null,updated_at:now
      }).eq('id',job.id)
      results.push({id:job.id,success:true,received:result.received,imported:result.imported})
    }catch(e:any){
      const message=e?.message||String(e)
      const now=new Date().toISOString()
      if(log?.id)await admin.from('import_search_logs').update({finished_at:now,status:'error',error:message}).eq('id',log.id)
      await admin.from('import_search_jobs').update({last_run_at:now,last_status:'error',last_error:message,updated_at:now}).eq('id',job.id)
      results.push({id:job.id,success:false,error:message})
    }
  }

  return NextResponse.json({success:true,processed:results.length,results})
}
