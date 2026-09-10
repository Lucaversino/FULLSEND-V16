const OPENAI_URL = 'https://api.openai.com/v1/responses'
const ANALYSIS_VERSION = 'fullsend-style-v1'

export type VehicleStyleResult = {
  rebaixado: boolean
  roda_grande: boolean
  stance: boolean
  score: number
  confidence: number
  reason: string
  tags: string[]
}

function clamp(n: unknown, min: number, max: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function compactText(value: unknown, max = 5000) {
  if (value == null) return ''
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.replace(/\s+/g, ' ').trim().slice(0, max)
}

function firstImage(row: any): string | null {
  if (typeof row?.image_url === 'string' && row.image_url.startsWith('http')) return row.image_url
  if (Array.isArray(row?.images)) {
    for (const item of row.images) {
      const url = typeof item === 'string'
        ? item
        : item?.webpUrl || item?.url || item?.imageUrl
      if (typeof url === 'string' && url.startsWith('http')) return url
    }
  }
  return null
}

async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null

    const headers: Record<string,string> = {
      Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 FULLSEND-AI/1.0',
    }
    if (u.hostname.endsWith('olx.com.br')) headers.Referer = 'https://www.olx.com.br/'

    const r = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null

    const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0]
    if (!type.startsWith('image/')) return null

    const buf = Buffer.from(await r.arrayBuffer())
    // Evita payloads enormes na API.
    if (!buf.length || buf.length > 8 * 1024 * 1024) return null
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function extractResponseText(json: any): string {
  if (typeof json?.output_text === 'string') return json.output_text
  const parts: string[] = []
  for (const item of Array.isArray(json?.output) ? json.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') parts.push(content.text)
      if (typeof content?.output_text === 'string') parts.push(content.output_text)
    }
  }
  return parts.join('\n')
}

function parseJson(text: string): any {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  throw new Error('A IA não retornou JSON válido.')
}

export async function analyzeVehicleStyle(row: any): Promise<VehicleStyleResult> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada na Vercel.')

  const model = (process.env.OPENAI_VISION_MODEL || 'gpt-5.6-luna').trim()
  const imageUrl = firstImage(row)
  const imageData = imageUrl ? await imageToDataUrl(imageUrl) : null

  const adText = [
    `Título: ${compactText(row?.title, 600)}`,
    `Marca/modelo: ${compactText([row?.brand, row?.model].filter(Boolean).join(' '), 500)}`,
    `Ano: ${row?.year ?? ''}`,
    `Features: ${compactText(row?.features, 1800)}`,
    `Dados do anúncio: ${compactText(row?.raw_data, 5200)}`,
  ].join('\n')

  const prompt = `Você é um classificador automotivo brasileiro do marketplace FULLSEND.
Analise o TEXTO e, quando houver imagem, a FOTO do veículo.

Objetivo: identificar carros REBAIXADOS, STANCE ou visualmente muito baixos, principalmente com rodas grandes.

REBAIXADO = carro com altura visivelmente reduzida OU evidência forte de suspensão a ar/rosca/fixa/coilover.
RODA_GRANDE = roda visualmente grande para o veículo, normalmente aro 17+ em hatch/sedã, ou indicação explícita no anúncio.
STANCE = conjunto de carro baixo + fitment/cambagem/roda preenchendo bem o paralama.

Não classifique SUV/picape original como rebaixado apenas porque tem roda grande.
Não invente informação invisível ou ausente.

Retorne SOMENTE JSON neste formato:
{
  "rebaixado": true,
  "roda_grande": true,
  "stance": false,
  "score": 0,
  "confidence": 0.0,
  "reason": "motivo curto em português",
  "tags": ["rebaixado","aro_grande"]
}

Regras:
- score: 0 a 100, quanto mais forte o estilo rebaixado.
- confidence: 0 a 1.
- rebaixado=true somente com evidência razoável.
- reason com no máximo 180 caracteres.
- tags no máximo 8 itens.

ANÚNCIO:
${adText}`

  const content: any[] = [{ type: 'input_text', text: prompt }]
  if (imageData) content.push({ type: 'input_image', image_url: imageData, detail: 'low' })

  const r = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content }],
      max_output_tokens: 500,
    }),
    signal: AbortSignal.timeout(30000),
  })

  const raw = await r.text()
  if (!r.ok) {
    let message = raw
    try {
      const parsed = JSON.parse(raw)
      message = parsed?.error?.message || raw
    } catch {}
    throw new Error(`OpenAI respondeu ${r.status}: ${message}`)
  }

  const json = JSON.parse(raw)
  const parsed = parseJson(extractResponseText(json))

  return {
    rebaixado: Boolean(parsed?.rebaixado),
    roda_grande: Boolean(parsed?.roda_grande),
    stance: Boolean(parsed?.stance),
    score: Math.round(clamp(parsed?.score, 0, 100)),
    confidence: clamp(parsed?.confidence, 0, 1),
    reason: String(parsed?.reason || '').slice(0, 180),
    tags: Array.isArray(parsed?.tags)
      ? parsed.tags.map((x:any) => String(x).slice(0, 40)).slice(0, 8)
      : [],
  }
}

export function aiDbPayload(result: VehicleStyleResult) {
  return {
    ai_rebaixado: result.rebaixado,
    ai_roda_grande: result.roda_grande,
    ai_stance: result.stance,
    ai_style_score: result.score,
    ai_confidence: result.confidence,
    ai_reason: result.reason,
    ai_tags: {
      tags: result.tags,
      rebaixado: result.rebaixado,
      roda_grande: result.roda_grande,
      stance: result.stance,
    },
    ai_style_source: 'openai_vision_text',
    ai_analyzed_at: new Date().toISOString(),
    ai_analysis_version: ANALYSIS_VERSION,
  }
}
