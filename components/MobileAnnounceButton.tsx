import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function MobileAnnounceButton() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const href = user ? '/anunciar' : '/cadastro'

  return (
    <Link
      href={href}
      className="mobile-announce-fab"
      aria-label={user ? 'Criar anúncio' : 'Criar conta para anunciar'}
      title={user ? 'Criar anúncio' : 'Crie sua conta para anunciar'}
    >
      <Image src="/fullsend-anunciar.png" alt="" width={2048} height={682}/>
      <span className="sr-only">Anunciar</span>
    </Link>
  )
}
