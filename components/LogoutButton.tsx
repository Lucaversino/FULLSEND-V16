'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton(){
  const router = useRouter()
  return <button type="button" className="logout-link fx-logout-link" aria-label="Sair da conta" title="Sair da conta" onClick={async()=>{await createClient().auth.signOut(); router.push('/'); router.refresh()}}><LogOut className="logout-mobile-icon" size={18}/><span>SAIR</span></button>
}
