import Link from 'next/link'
import { CalendarDays, Clock3, MapPin, Navigation, Star } from 'lucide-react'
import type { AutomotiveEvent } from '@/lib/events'
import { formatEventDate, formatEventTime } from '@/lib/events'
import EventAttendance from '@/components/events/EventAttendance'
import EventShare from '@/components/events/EventShare'

export default function EventCard({event}:{event:AutomotiveEvent}){
  return <article className={`event-card ${event.featured?'featured':''}`}>
    <Link href={`/eventos/${event.slug}`} className="event-card-media">
      {event.image_url?<img src={event.image_url} alt={event.title} loading="lazy"/>:<div className="event-no-image">FULLSEND EVENTOS</div>}
      <span className="event-category">{event.category}</span>
      {event.featured?<span className="event-featured"><Star size={12}/>DESTAQUE</span>:null}
    </Link>
    <div className="event-card-body">
      <h3><Link href={`/eventos/${event.slug}`}>{event.title}</Link></h3>
      <div className="event-card-meta">
        <span><CalendarDays size={14}/>{formatEventDate(event.event_date)}</span>
        <span><Clock3 size={14}/>{formatEventTime(event.event_time)}</span>
        <span><MapPin size={14}/>{event.city||'Brasil'}{event.state?` / ${event.state}`:''}</span>
        {event.venue?<span><MapPin size={14}/>{event.venue}</span>:null}
        {event.distance_km!=null?<span className="distance"><Navigation size={14}/>{event.distance_km.toFixed(1)} km de você</span>:null}
      </div>
      <div className="event-card-actions">
        <Link href={`/eventos/${event.slug}`} className="event-view">VER EVENTO</Link>
        <EventAttendance eventId={event.id} initialCount={event.attendees_count||0} compact/>
        <EventShare title={event.title} url={`/eventos/${event.slug}`} compact/>
      </div>
    </div>
  </article>
}
