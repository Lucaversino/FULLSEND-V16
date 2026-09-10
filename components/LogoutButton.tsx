'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton(){
  const router = useRouter()
  return <button className="logout-link fx-logout-link" onClick={async()=>{await createClient().auth.signOut(); router.push('/'); router.refresh()}}>SAIR</button>
}
