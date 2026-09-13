import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { proxiedImage } from '@/lib/listings'

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const raw = typeof item === 'string'
      ? item
      : (item as any)?.webpUrl || (item as any)?.url || (item as any)?.imageUrl
    if (typeof raw === 'string' && raw.startsWith('http') && !out.includes(raw)) out.push(raw)
  }
  return out.slice(0, 12)
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind')
  const id = req.nextUrl.searchParams.get('id')
  if (!id || (kind !== 'gecko' && kind !== 'fullsend')) {
    return NextResponse.json({ error: 'Anúncio inválido.' }, { status: 400 })
  }

  const supabase = await createClient()

  if (kind === 'gecko') {
    const { data, error } = await supabase
      .from('gecko_listings')
      .select('id,image_url,images,features,raw_data,external_url')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 })

    const raw = normalizeImages(data.images)
    const all = [data.image_url, ...raw].filter(Boolean) as string[]
    const unique = Array.from(new Set(all)).slice(0, 12).map((url) => proxiedImage(url)!)
    const description = typeof (data.raw_data as any)?.description === 'string'
      ? (data.raw_data as any).description
      : null

    return NextResponse.json({
      images: unique,
      features: data.features || null,
      description,
      externalUrl: data.external_url || null,
    })
  }

  const { data, error } = await supabase
    .from('listings')
    .select('id,cover_url,media,description,user_id')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 })

  const media = Array.isArray(data.media) ? data.media.filter((u: unknown) => typeof u === 'string') as string[] : []
  const images = Array.from(new Set([data.cover_url, ...media].filter(Boolean) as string[])).slice(0, 12)

  return NextResponse.json({ images, description: data.description || null, features: null })
}
