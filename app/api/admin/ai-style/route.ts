import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { analyzeVehicleStyle, aiDbPayload } from '@/lib/ai/vehicle-style'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function analyzeOne(admin:any, id:string) {
  const { data: row, error } = await admin
    .from('gecko_listings')
    .select('id,title,brand,model,year,features,raw_data,image_url,images,external_url,ai_manual_rebaixado')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!row) throw new Error('Anúncio não encontrado.')

  const result = await analyzeVehicleStyle(row)
  const { error: updateError } = await admin
    .from('gecko_listings')
    .update(aiDbPayload(result))
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)
  return { id, ...result }
}

export async function POST(req:Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada na Vercel.' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '').trim()

  try {
    if (id) {
      const result = await analyzeOne(gate.admin, id)
      await gate.admin.from('audit_logs').insert({
        actor_id: gate.user.id,
        action: 'admin_ai_style_analyze',
        entity: 'gecko_listings',
        entity_id: id,
        data: result,
      })
      return NextResponse.json({ success: true, results: [result] })
    }

    const requested = Number(body?.limit || 4)
    const limit = Math.max(1, Math.min(Number.isFinite(requested) ? Math.trunc(requested) : 4, 6))

    const { data: rows, error } = await gate.admin
      .from('gecko_listings')
      .select('id')
      .eq('status', 'active')
      .is('ai_analyzed_at', null)
      .order('imported_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const results:any[] = []
    const errors:any[] = []
    // Sequencial para não estourar rate limit nem duração da função.
    for (const row of rows || []) {
      try {
        results.push(await analyzeOne(gate.admin, row.id))
      } catch (e:any) {
        errors.push({ id: row.id, error: e?.message || String(e) })
      }
    }

    await gate.admin.from('audit_logs').insert({
      actor_id: gate.user.id,
      action: 'admin_ai_style_batch',
      entity: 'gecko_listings',
      data: { analyzed: results.length, errors: errors.length },
    })

    return NextResponse.json({ success: true, analyzed: results.length, results, errors })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PATCH(req:Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const mode = body?.mode
  let value:boolean|null
  if (mode === 'yes') value = true
  else if (mode === 'no') value = false
  else if (mode === 'auto') value = null
  else return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 })

  const { error } = await gate.admin
    .from('gecko_listings')
    .update({ ai_manual_rebaixado: value })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await gate.admin.from('audit_logs').insert({
    actor_id: gate.user.id,
    action: 'admin_ai_style_override',
    entity: 'gecko_listings',
    entity_id: id,
    data: { mode },
  })

  return NextResponse.json({ success: true, ai_manual_rebaixado: value })
}
