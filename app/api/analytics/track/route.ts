import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cleanText(v:unknown,max:number){
  return String(v??'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,max)
}

function cleanPath(v:unknown){
  const x=cleanText(v,300)
  if(!x.startsWith('/'))return '/'
  // Não armazenamos query string para reduzir coleta desnecessária.
  return x.split('?')[0].split('#')[0] || '/'
}

function deviceFromUA(ua:string){
  const t=ua.toLowerCase()
  if(/ipad|tablet|playbook|silk/.test(t))return'tablet'
  if(/mobi|iphone|android/.test(t))return'mobile'
  return'desktop'
}

function browserFromUA(ua:string){
  if(/edg\//i.test(ua))return'Edge'
  if(/opr\//i.test(ua))return'Opera'
  if(/firefox\//i.test(ua))return'Firefox'
  if(/chrome\//i.test(ua))return'Chrome'
  if(/safari\//i.test(ua))return'Safari'
  return'Other'
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}))
    const sessionKey=cleanText(body?.sessionKey,36)
    const visitorKey=cleanText(body?.visitorKey,36)
    const action=cleanText(body?.action,20)
    const path=cleanPath(body?.path)
    const duration=Math.max(0,Math.min(43200,Math.trunc(Number(body?.duration)||0)))

    if(!UUID_RE.test(sessionKey)||!UUID_RE.test(visitorKey)){
      return NextResponse.json({ok:false},{status:400})
    }
    if(!['pageview','heartbeat','end'].includes(action)){
      return NextResponse.json({ok:false},{status:400})
    }

    let referrerHost=''
    if(action==='pageview'){
      try{
        const raw=cleanText(body?.referrer,500)
        if(raw){
          const url=new URL(raw)
          referrerHost=url.hostname.replace(/^www\./,'').slice(0,180)
        }
      }catch{}
    }

    const ua=req.headers.get('user-agent')||''
    const admin=createAdminClient()
    const {error}=await admin.rpc('analytics_touch_session',{
      p_session_key:sessionKey,
      p_visitor_key:visitorKey,
      p_action:action,
      p_path:path,
      p_duration:duration,
      p_referrer_host:referrerHost,
      p_device_type:deviceFromUA(ua),
      p_browser_family:browserFromUA(ua),
    })

    if(error){
      console.error('ANALYTICS TRACK',error.message)
      return NextResponse.json({ok:false},{status:500})
    }
    return NextResponse.json({ok:true})
  }catch{
    return NextResponse.json({ok:false},{status:500})
  }
}
