import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

export default function EventsSideButton(){
  return <Link href="/eventos" className="events-side-button" aria-label="Abrir eventos automotivos">
    <CalendarDays size={19}/>
    <span>EVENTOS</span>
  </Link>
}
