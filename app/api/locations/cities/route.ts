import { NextResponse } from 'next/server'

export const revalidate = 86400

const FALLBACK_SC=['Balneário Camboriú','Bombinhas','Camboriú','Itajaí','Itapema','Navegantes','Penha','Porto Belo','Tijucas']

export async function GET(req:Request){
  const state=(new URL(req.url).searchParams.get('state')||'').trim().toUpperCase()
  if(!/^[A-Z]{2}$/.test(state)) return NextResponse.json({cities:[]})
  try{
    const r=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`,{next:{revalidate:86400},signal:AbortSignal.timeout(8000)})
    if(!r.ok) throw new Error(`IBGE ${r.status}`)
    const data=await r.json()
    const cities=(Array.isArray(data)?data:[]).map((x:any)=>String(x?.nome||'').trim()).filter(Boolean)
    return NextResponse.json({state,cities},{headers:{'Cache-Control':'public, max-age=86400, stale-while-revalidate=604800'}})
  }catch{
    return NextResponse.json({state,cities:state==='SC'?FALLBACK_SC:[]},{status:200})
  }
}
