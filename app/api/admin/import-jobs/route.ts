import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { runGeckoSearch } from '@/lib/importer/gecko-search'
import { normalizeCategory } from '@/lib/importer/search-categories'

export const dynamic='force-dynamic'
export const maxDuration=60

function text(v:any,max=120){return String(v??'').trim().slice(0,max)}
function bool(v:any){return Boolean(v)}

export async function GET(){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})

  const [jobsRes,logsRes]=await Promise.all([
    gate.admin.from('import_search_jobs').select('*').order('created_at',{ascending:false}).limit(100),
    gate.admin.from('import_search_logs').select('*').order('started_at',{ascending:false}).limit(50),
  ])
  if(jobsRes.error)return NextResponse.json({error:jobsRes.error.message},{status:400})
  if(logsRes.error)return NextResponse.json({error:logsRes.error.message},{status:400})
  return NextResponse.json({jobs:jobsRes.data||[],logs:logsRes.data||[]})
}

export async function POST(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const b=await req.json().catch(()=>({}))

  if(b?.action==='preview'){
    const id=text(b.id,80)
    if(!id)return NextResponse.json({error:'ID obrigatório.'},{status:400})
    const {data:job,error}=await gate.admin.from('import_search_jobs').select('*').eq('id',id).maybeSingle()
    if(error||!job)return NextResponse.json({error:error?.message||'Busca não encontrada.'},{status:404})
    try{
      const result=await runGeckoSearch({keyword:job.keyword,city:job.city,state:job.state,pages:job.pages,searchCategory:job.search_category,locationMode:job.location_mode,dryRun:true})
      return NextResponse.json({success:true,result})
    }catch(e:any){
      return NextResponse.json({error:e?.message||String(e)},{status:502})
    }
  }

  if(b?.action==='run'){
    const id=text(b.id,80)
    if(!id)return NextResponse.json({error:'ID obrigatório.'},{status:400})

    const {data:job,error}=await gate.admin.from('import_search_jobs').select('*').eq('id',id).maybeSingle()
    if(error||!job)return NextResponse.json({error:error?.message||'Busca não encontrada.'},{status:404})

    const {data:log,error:logError}=await gate.admin.from('import_search_logs').insert({
      job_id:job.id,keyword:job.keyword,city:job.city,state:job.state,search_category:job.search_category,location_mode:job.location_mode,trigger_source:'manual',status:'running'
    }).select('*').single()
    if(logError)return NextResponse.json({error:logError.message},{status:400})

    try{
      const result=await runGeckoSearch({keyword:job.keyword,city:job.city,state:job.state,pages:job.pages,searchCategory:job.search_category,locationMode:job.location_mode})
      const now=new Date().toISOString()
      await Promise.all([
        gate.admin.from('import_search_logs').update({
          finished_at:now,status:'success',received:result.received,imported:result.imported,
          pages_processed:result.pagesProcessed,details:result
        }).eq('id',log.id),
        gate.admin.from('import_search_jobs').update({
          last_run_at:now,last_status:'success',last_received:result.received,last_imported:result.imported,last_error:null,updated_at:now
        }).eq('id',job.id),
      ])
      return NextResponse.json({success:true,result})
    }catch(e:any){
      const message=e?.message||String(e)
      const now=new Date().toISOString()
      await Promise.all([
        gate.admin.from('import_search_logs').update({finished_at:now,status:'error',error:message}).eq('id',log.id),
        gate.admin.from('import_search_jobs').update({last_run_at:now,last_status:'error',last_error:message,updated_at:now}).eq('id',job.id),
      ])
      return NextResponse.json({error:message},{status:502})
    }
  }

  const keyword=text(b.keyword,120)
  if(!keyword)return NextResponse.json({error:'Informe o carro ou termo.'},{status:400})

  const row={
    name:text(b.name,120)||null,
    keyword,
    search_category:normalizeCategory(b.search_category),
    location_mode:['exact','region','state','any'].includes(String(b.location_mode))?String(b.location_mode):'exact',
    city:text(b.city,80)||null,
    state:text(b.state,2).toUpperCase()||null,
    pages:Math.max(1,Math.min(5,Math.trunc(Number(b.pages||1)))),
    enabled:bool(b.enabled),
    frequency:'daily',
    run_ai_after_import:bool(b.run_ai_after_import),
    created_by:gate.user.id,
    updated_at:new Date().toISOString(),
  }
  const {data,error}=await gate.admin.from('import_search_jobs').insert(row).select('*').single()
  if(error)return NextResponse.json({error:error.message},{status:400})

  await gate.admin.from('audit_logs').insert({
    actor_id:gate.user.id,action:'admin_import_job_create',entity:'import_search_jobs',entity_id:data.id,data:row
  })

  return NextResponse.json({success:true,job:data})
}

export async function PATCH(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const b=await req.json().catch(()=>({}))
  const id=text(b.id,80)
  if(!id)return NextResponse.json({error:'ID obrigatório.'},{status:400})

  const patch:any={updated_at:new Date().toISOString()}
  if('name'in b)patch.name=text(b.name,120)||null
  if('keyword'in b)patch.keyword=text(b.keyword,120)
  if('search_category'in b)patch.search_category=normalizeCategory(b.search_category)
  if('location_mode'in b)patch.location_mode=['exact','region','state','any'].includes(String(b.location_mode))?String(b.location_mode):'exact'
  if('city'in b)patch.city=text(b.city,80)||null
  if('state'in b)patch.state=text(b.state,2).toUpperCase()||null
  if('pages'in b)patch.pages=Math.max(1,Math.min(5,Math.trunc(Number(b.pages||1))))
  if('enabled'in b)patch.enabled=bool(b.enabled)
  if('run_ai_after_import'in b)patch.run_ai_after_import=bool(b.run_ai_after_import)

  const {data,error}=await gate.admin.from('import_search_jobs').update(patch).eq('id',id).select('*').single()
  if(error)return NextResponse.json({error:error.message},{status:400})

  await gate.admin.from('audit_logs').insert({
    actor_id:gate.user.id,action:'admin_import_job_update',entity:'import_search_jobs',entity_id:id,data:patch
  })
  return NextResponse.json({success:true,job:data})
}

export async function DELETE(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})
  const b=await req.json().catch(()=>({}))
  const id=text(b.id,80)
  if(!id)return NextResponse.json({error:'ID obrigatório.'},{status:400})
  const {error}=await gate.admin.from('import_search_jobs').delete().eq('id',id)
  if(error)return NextResponse.json({error:error.message},{status:400})
  await gate.admin.from('audit_logs').insert({
    actor_id:gate.user.id,action:'admin_import_job_delete',entity:'import_search_jobs',entity_id:id
  })
  return NextResponse.json({success:true})
}
