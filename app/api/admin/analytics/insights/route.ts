import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export const dynamic='force-dynamic'
export const maxDuration=60

const OPENAI_URL='https://api.openai.com/v1/responses'

function extractText(json:any){
  if(typeof json?.output_text==='string')return json.output_text
  const parts:string[]=[]
  for(const item of Array.isArray(json?.output)?json.output:[]){
    for(const c of Array.isArray(item?.content)?item.content:[]){
      if(typeof c?.text==='string')parts.push(c.text)
      if(typeof c?.output_text==='string')parts.push(c.output_text)
    }
  }
  return parts.join('\n')
}

function parseJson(text:string){
  const clean=text.replace(/^```(?:json)?/i,'').replace(/```$/i,'').trim()
  try{return JSON.parse(clean)}catch{}
  const a=clean.indexOf('{'),b=clean.lastIndexOf('}')
  if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1))
  throw new Error('IA não retornou JSON válido.')
}

export async function POST(req:Request){
  const gate=await requireAdmin()
  if(!gate.ok)return NextResponse.json({error:gate.error},{status:gate.status})

  const apiKey=(process.env.OPENAI_API_KEY||'').trim()
  if(!apiKey)return NextResponse.json({error:'OPENAI_API_KEY não configurada na Vercel.'},{status:503})

  const body=await req.json().catch(()=>({}))
  const analytics=body?.analytics
  if(!analytics?.summary)return NextResponse.json({error:'Dados de analytics inválidos.'},{status:400})

  // Recebemos do frontend somente o agregado já exibido ao administrador.
  // Não enviamos IDs de visitante/sessão para a IA.
  const safeData={
    periodDays:Number(analytics.days)||7,
    summary:analytics.summary,
    daily:Array.isArray(analytics.daily)?analytics.daily.slice(-30):[],
    topPages:Array.isArray(analytics.topPages)?analytics.topPages.slice(0,10):[],
    devices:Array.isArray(analytics.devices)?analytics.devices.slice(0,10):[],
    browsers:Array.isArray(analytics.browsers)?analytics.browsers.slice(0,10):[],
    referrers:Array.isArray(analytics.referrers)?analytics.referrers.slice(0,10):[],
  }

  const prompt=`Você é o analista de crescimento do marketplace automotivo FULLSEND.
Analise SOMENTE os dados agregados abaixo.

Objetivos:
- explicar o comportamento dos visitantes de forma simples;
- identificar pontos fortes;
- detectar problemas reais sem inventar causas;
- sugerir ações práticas para aumentar navegação, retorno e anúncios;
- considerar que métricas com pouco volume têm baixa confiança.

Retorne SOMENTE JSON:
{
  "headline":"frase curta",
  "summary":"análise em 2 a 4 frases",
  "opportunities":["até 4 oportunidades objetivas"],
  "alerts":["até 3 alertas, somente se houver evidência"],
  "actions":["até 4 ações recomendadas em ordem de prioridade"]
}

DADOS:
${JSON.stringify(safeData)}`

  try{
    const model=(process.env.OPENAI_ANALYTICS_MODEL||process.env.OPENAI_COPILOT_MODEL||'gpt-5.6-luna').trim()
    const r=await fetch(OPENAI_URL,{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        input:[{role:'user',content:[{type:'input_text',text:prompt}]}],
        max_output_tokens:900,
      }),
      signal:AbortSignal.timeout(35000),
    })

    const raw=await r.text()
    if(!r.ok){
      let message=raw
      try{message=JSON.parse(raw)?.error?.message||raw}catch{}
      return NextResponse.json({error:message},{status:502})
    }

    const parsed=parseJson(extractText(JSON.parse(raw)))
    return NextResponse.json({
      success:true,
      insight:{
        headline:String(parsed?.headline||'Leitura do tráfego').slice(0,160),
        summary:String(parsed?.summary||'').slice(0,1600),
        opportunities:Array.isArray(parsed?.opportunities)?parsed.opportunities.map(String).slice(0,4):[],
        alerts:Array.isArray(parsed?.alerts)?parsed.alerts.map(String).slice(0,3):[],
        actions:Array.isArray(parsed?.actions)?parsed.actions.map(String).slice(0,4):[],
      }
    })
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Falha na análise de IA.'},{status:500})
  }
}
