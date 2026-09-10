import type { CopilotListing } from './inventory'

const OPENAI_URL = 'https://api.openai.com/v1/responses'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type CopilotAIResult = {
  reply: string
  recommendation_ids: string[]
  follow_up: string | null
  understood: {
    budget?: string | null
    use?: string | null
    style?: string | null
    transmission?: string | null
  }
}

function extractOutputText(json:any) {
  if (typeof json?.output_text === 'string') return json.output_text
  const parts:string[] = []
  for (const item of Array.isArray(json?.output) ? json.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') parts.push(content.text)
      if (typeof content?.output_text === 'string') parts.push(content.output_text)
    }
  }
  return parts.join('\n')
}

function parseJson(text:string):any {
  const cleaned = text.replace(/^```(?:json)?/i,'').replace(/```$/i,'').trim()
  try { return JSON.parse(cleaned) } catch {}
  const start=cleaned.indexOf('{')
  const end=cleaned.lastIndexOf('}')
  if(start>=0&&end>start){
    try{return JSON.parse(cleaned.slice(start,end+1))}catch{}
  }
  throw new Error('Resposta da IA não veio no formato esperado.')
}

function listingLine(x:CopilotListing) {
  return JSON.stringify({
    id:x.id,
    title:x.title,
    price:x.price,
    city:x.city,
    state:x.state,
    brand:x.brand,
    model:x.model,
    year:x.year,
    mileage:x.mileage,
    fuel:x.fuel,
    transmission:x.transmission,
    category:x.category,
    rebaixado:x.aiRebaixado,
    roda_grande:x.aiRodaGrande,
    stance:x.aiStance,
    vip:x.isVip,
    destaque:x.isFeatured,
    description:(x.description || '').slice(0,420),
    features:(x.features || '').slice(0,420),
  })
}

export async function askCopilotAI(
  history: ChatMessage[],
  candidates: CopilotListing[],
): Promise<CopilotAIResult> {
  const apiKey=(process.env.OPENAI_API_KEY||'').trim()
  if(!apiKey)throw new Error('OPENAI_API_KEY não configurada na Vercel.')

  const model=(process.env.OPENAI_COPILOT_MODEL||'gpt-5.6-luna').trim()

  const recent=history.slice(-10)
  const conversation=recent.map(m=>`${m.role==='user'?'USUÁRIO':'COPILOTO'}: ${m.content}`).join('\n')

  const inventory=candidates.length
    ? candidates.map(listingLine).join('\n')
    : 'SEM CANDIDATOS ENCONTRADOS NESTA CONSULTA.'

  const prompt=`Você é FULLSEND COPILOT, um personagem ORIGINAL do marketplace automotivo FULLSEND.

PERSONALIDADE:
- jovem gearhead experiente, calmo, confiante e carismático;
- fala como alguém que realmente vive carros, oficina, pista e projetos de rua;
- técnico sem ser pedante;
- gosta de dirigibilidade, acerto bem-feito, carros manuais, turbo e projetos com propósito;
- sabe elogiar, mas também aponta manutenção, custo, uso diário e riscos;
- não força venda e não inventa fatos;
- faz perguntas curtas quando orçamento/uso/preferência ainda não estão claros;
- linguagem natural em português do Brasil, compacta e humana;
- NÃO mencione personagens, atores, filmes ou franquias e NÃO imite uma pessoa real.

REGRAS DE RECOMENDAÇÃO:
1. Use SOMENTE os anúncios fornecidos em INVENTÁRIO para recomendar cards.
2. Não invente preço, ano, km, câmbio ou localização.
3. recommendation_ids só pode conter IDs EXATOS do inventário.
4. Escolha de 0 a 4 anúncios realmente relevantes.
5. Se os dados forem insuficientes, diga isso claramente.
6. Destaque prós e contras quando ajudar.
7. Se o usuário pedir comparação, compare objetivamente.
8. O FULLSEND é classificado/marketplace; não garanta estado mecânico, histórico ou segurança de compra.
9. Para decisões de compra, lembre de inspeção/documentação quando for relevante, sem repetir isso em toda resposta.
10. Se não houver bom candidato, não force recomendação.

Retorne SOMENTE JSON válido:
{
  "reply":"resposta principal do copiloto",
  "recommendation_ids":["gecko:..."],
  "follow_up":"pergunta curta opcional ou null",
  "understood":{
    "budget":"orçamento percebido ou null",
    "use":"uso percebido ou null",
    "style":"estilo percebido ou null",
    "transmission":"preferência percebida ou null"
  }
}

CONVERSA:
${conversation}

INVENTÁRIO DISPONÍVEL:
${inventory}`

  const response=await fetch(OPENAI_URL,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${apiKey}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      model,
      input:[{role:'user',content:[{type:'input_text',text:prompt}]}],
      max_output_tokens:850,
    }),
    signal:AbortSignal.timeout(35000),
  })

  const raw=await response.text()
  if(!response.ok){
    let message=raw
    try{message=JSON.parse(raw)?.error?.message||raw}catch{}
    throw new Error(`OpenAI respondeu ${response.status}: ${message}`)
  }

  const json=JSON.parse(raw)
  const parsed=parseJson(extractOutputText(json))

  const validIds=new Set(candidates.map(x=>x.id))
  const recommendation_ids=Array.isArray(parsed?.recommendation_ids)
    ? parsed.recommendation_ids.map(String).filter((id:string)=>validIds.has(id)).slice(0,4)
    : []

  return{
    reply:String(parsed?.reply||'Me fala um pouco mais do carro que você procura.').slice(0,2400),
    recommendation_ids,
    follow_up:parsed?.follow_up?String(parsed.follow_up).slice(0,240):null,
    understood:{
      budget:parsed?.understood?.budget?String(parsed.understood.budget).slice(0,100):null,
      use:parsed?.understood?.use?String(parsed.understood.use).slice(0,100):null,
      style:parsed?.understood?.style?String(parsed.understood.style).slice(0,100):null,
      transmission:parsed?.understood?.transmission?String(parsed.understood.transmission).slice(0,100):null,
    }
  }
}
