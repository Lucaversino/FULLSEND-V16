import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function MobileAnnounceButton() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const href = user ? '/anunciar' : '/cadastro'
  const label = user ? 'ANUNCIAR' : 'ANUNCIAR'

  return (
    <Link
      href={href}
      className="mobile-announce-fab"
      aria-label={user ? 'Criar anúncio' : 'Criar conta para anunciar'}
      title={user ? 'Criar anúncio' : 'Crie sua conta para anunciar'}
    >
      <span className="mobile-announce-fab-icon"><Plus size={20} strokeWidth={3} /></span>
      <span>{label}</span>
    </Link>
  )
}
