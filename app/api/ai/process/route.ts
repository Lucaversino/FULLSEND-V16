import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeVehicleStyle, aiDbPayload } from '@/lib/ai/vehicle-style'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req:Request) {
  const secret = (process.env.CRON_SECRET || '').trim()
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('gecko_listings')
    .select('id,title,brand,model,year,features,raw_data,image_url,images,external_url')
    .eq('status', 'active')
    .is('ai_analyzed_at', null)
    .order('imported_at', { ascending: false })
    .limit(4)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const results:any[] = []
  for (const row of rows || []) {
    try {
      const result = await analyzeVehicleStyle(row)
      const { error: updateError } = await admin
        .from('gecko_listings')
        .update(aiDbPayload(result))
        .eq('id', row.id)
      if (updateError) throw new Error(updateError.message)
      results.push({ id: row.id, ok: true, rebaixado: result.rebaixado, score: result.score })
    } catch (e:any) {
      results.push({ id: row.id, ok: false, error: e?.message || String(e) })
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}
