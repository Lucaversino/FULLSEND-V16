import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import PublishPage from '@/components/community/PublishPage'
export default async function Page(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login?next=/comunidade/publicar');return <PublishPage/>}
