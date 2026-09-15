'use client'
import {useRouter} from 'next/navigation'
import Composer from './Composer'
export default function PublishPage(){const router=useRouter();return <div className="cm-root"><Composer onClose={()=>router.push('/comunidade')} onDone={()=>{router.push('/comunidade');router.refresh()}}/></div>}
