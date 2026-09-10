import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

function SetupError({ title, details }: { title: string; details: string[] }) {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state" style={{ maxWidth: 820, margin: '30px auto', textAlign: 'left' }}>
          <h2>{title}</h2>
          <p>O acesso administrativo foi reconhecido, mas falta concluir uma configuração do painel.</p>
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            {details.map((d, i) => (
              <div key={i} style={{ border: '1px solid #2a2a2f', borderRadius: 10, padding: 12, background: '#0b0b0d' }}>
                <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#ddd' }}>{d}</code>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 18 }}>
            Depois de corrigir, faça um novo deploy na Vercel e abra <strong>/admin</strong> novamente.
          </p>
        </div>
      </div>
    </main>
  )
}

export default async function AdminPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()

  if (!user) redirect('/login?next=/admin')

  const { data: p, error: profileError } = await s
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return <SetupError title="ERRO AO LER PERFIL ADMIN" details={[profileError.message]} />
  }

  if (p?.role !== 'admin') {
    return (
      <main className="section">
        <div className="container">
          <div className="empty-state">
            <h2>ACESSO RESTRITO</h2>
            <p>Este painel é exclusivo para administradores FULLSEND.</p>
          </div>
        </div>
      </main>
    )
  }

  // Evita a tela branca de "server-side exception" quando a Service Role
  // não foi configurada no ambiente do deployment atual.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <SetupError title="SUPABASE URL NÃO CONFIGURADA" details={[
      'Crie NEXT_PUBLIC_SUPABASE_URL em Vercel > Project > Settings > Environment Variables.',
      'Marque Production, Preview e Development se quiser usar em todos os ambientes.'
    ]} />
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <SetupError title="SERVICE ROLE NÃO CONFIGURADA" details={[
      'Crie SUPABASE_SERVICE_ROLE_KEY em Vercel > Project > Settings > Environment Variables.',
      'Use a Service Role Key do MESMO projeto Supabase usado em NEXT_PUBLIC_SUPABASE_URL.',
      'Nunca use prefixo NEXT_PUBLIC_ nessa chave.',
      'Depois clique em Redeploy para a variável entrar no deployment.'
    ]} />
  }

  try {
    const admin = createAdminClient()

    const [profilesRes, authUsersRes, ownRes, geckoRes, logsRes, importJobsRes, importLogsRes] = await Promise.all([
      admin.from('profiles')
        .select('id,name,city,state,whatsapp,avatar_url,badge,role,account_status,last_admin_note,created_at')
        .order('created_at', { ascending: false }),

      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),

      admin.from('listings')
        .select('id,user_id,title,slug,price,status,city,state,source,is_featured,is_vip,admin_note,external_url,created_at')
        .order('created_at', { ascending: false })
        .limit(1000),

      admin.from('gecko_listings')
        .select('id,title,price,status,city,state,is_featured,is_vip,admin_note,external_url,imported_at,ai_rebaixado,ai_roda_grande,ai_stance,ai_style_score,ai_confidence,ai_reason,ai_analyzed_at,ai_manual_rebaixado,image_url')
        .order('imported_at', { ascending: false })
        .limit(1000),

      admin.from('audit_logs')
        .select('id,action,entity,entity_id,created_at')
        .order('created_at', { ascending: false })
        .limit(20),

      admin.from('import_search_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),

      admin.from('import_search_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50),
    ])

    const errors = [
      profilesRes.error ? `profiles: ${profilesRes.error.message}` : '',
      authUsersRes.error ? `auth.users: ${authUsersRes.error.message}` : '',
      ownRes.error ? `listings: ${ownRes.error.message}` : '',
      geckoRes.error ? `gecko_listings: ${geckoRes.error.message}` : '',
      logsRes.error ? `audit_logs: ${logsRes.error.message}` : '',
      importJobsRes.error ? `import_search_jobs: ${importJobsRes.error.message}` : '',
      importLogsRes.error ? `import_search_logs: ${importLogsRes.error.message}` : '',
    ].filter(Boolean)

    if (errors.length) {
      return <SetupError title="BANCO AINDA NÃO ESTÁ PRONTO PARA O PAINEL" details={[
        ...errors,
        'Rode no SQL Editor: supabase/migrations/003_admin_vip_profiles.sql',
        'Depois rode: supabase/migrations/004_bootstrap_admin.sql',
        'Para Buscas Automáticas rode: supabase/migrations/007_import_search_jobs.sql'
      ]} />
    }

    const profiles = profilesRes.data || []
    const authUsers = authUsersRes.data
    const own = ownRes.data || []
    const gecko = geckoRes.data || []
    const logs = logsRes.data || []
    const importJobs = importJobsRes.data || []
    const importLogs = importLogsRes.data || []

    let promotions:any[]=[]
    try{
      const {data}=await admin.from('listing_promotions').select('*').order('created_at',{ascending:false}).limit(500)
      promotions=data||[]
    }catch{}

    const emailMap = new Map((authUsers?.users || []).map((u: any) => [u.id, u.email || '']))
    const users = profiles.map((x: any) => ({ ...x, email: emailMap.get(x.id) || '' }))
    const listings = [
      ...own.map((x: any) => ({ ...x, kind: 'fullsend' as const })),
      ...gecko.map((x: any) => ({ ...x, kind: 'gecko' as const, created_at: x.imported_at })),
    ]
    const userMap=new Map<string,any>(users.map((u:any)=>[String(u.id),u]))
    const ownMap=new Map<string,any>(own.map((l:any)=>[String(l.id),l]))
    promotions=promotions.map((pr:any)=>{const u:any=userMap.get(pr.user_id);const l:any=ownMap.get(pr.listing_id);return {...pr,user_name:u?.name||'',user_email:u?.email||'',listing_title:l?.title||'',listing_slug:l?.slug||''}})

    return <AdminDashboard users={users as any} listings={listings as any} logs={logs as any} importJobs={importJobs as any} importLogs={importLogs as any} promotions={promotions as any} />
  } catch (err: any) {
    return <SetupError title="ERRO DE CONFIGURAÇÃO DO PAINEL" details={[
      err?.message || String(err),
      'Confira SUPABASE_SERVICE_ROLE_KEY na Vercel e faça Redeploy.',
      'Confira se as migrations 003 e 004 foram executadas no Supabase.'
    ]} />
  }
}
