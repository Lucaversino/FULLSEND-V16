import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status })

  const checks: Record<string, any> = {
    serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  }

  const [profiles, listings, gecko, logs] = await Promise.all([
    gate.admin.from('profiles').select('id,badge,role,account_status').limit(1),
    gate.admin.from('listings').select('id,is_featured,is_vip,admin_note').limit(1),
    gate.admin.from('gecko_listings').select('id,is_featured,is_vip,admin_note').limit(1),
    gate.admin.from('audit_logs').select('id').limit(1),
  ])

  checks.profiles = profiles.error?.message || 'ok'
  checks.listings = listings.error?.message || 'ok'
  checks.gecko_listings = gecko.error?.message || 'ok'
  checks.audit_logs = logs.error?.message || 'ok'

  const ok = Object.values(checks).every(v => v === true || v === 'ok')
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 })
}
