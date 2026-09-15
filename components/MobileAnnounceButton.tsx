import { createClient } from '@/lib/supabase/server'
import MobileQuickActions from './MobileQuickActions'
export default async function MobileAnnounceButton(){const s=await createClient();const {data:{user}}=await s.auth.getUser();return <MobileQuickActions loggedIn={!!user}/> }
