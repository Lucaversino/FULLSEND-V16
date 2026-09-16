'use client'

import Link from 'next/link'
import {UsersRound} from 'lucide-react'
import {usePathname} from 'next/navigation'

export default function FloatingCommunityButton(){
  const pathname=usePathname()||'/'

  if(pathname.startsWith('/comunidade'))return null

  return <Link
    href="/comunidade"
    className="floating-community-button"
    aria-label="Entrar na Comunidade FULLSEND"
    title="Entrar na Comunidade"
  >
    <span className="floating-community-icon" aria-hidden="true"><UsersRound size={21}/></span>
    <span className="floating-community-copy"><small>FULLSEND</small><b>COMUNIDADE</b></span>
  </Link>
}
