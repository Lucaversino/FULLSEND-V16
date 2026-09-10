import { NextRequest, NextResponse } from 'next/server'

const ALLOWED = new Set(['img.olx.com.br', 'images.olx.com.br'])

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('Missing url', { status: 400 })

  let url: URL
  try { url = new URL(raw) } catch { return new NextResponse('Invalid url', { status: 400 }) }
  if (url.protocol !== 'https:' || !ALLOWED.has(url.hostname)) return new NextResponse('Host not allowed', { status: 403 })

  try {
    const r = await fetch(url.toString(), {
      cache: 'force-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.olx.com.br/',
      },
    })
    if (!r.ok) return new NextResponse('Image unavailable', { status: r.status })
    const contentType = r.headers.get('content-type') || 'image/jpeg'
    const body = await r.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      },
    })
  } catch {
    return new NextResponse('Image fetch failed', { status: 502 })
  }
}
