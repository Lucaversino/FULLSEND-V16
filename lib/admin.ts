import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireAdmin() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' }
  const { data: profile } = await sessionClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Acesso exclusivo do administrador.' }
  return { ok: true as const, user, admin: createAdminClient() }
}
