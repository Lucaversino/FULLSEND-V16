'use client'
import { MapPin } from 'lucide-react'

export default function EventMap({lat,lng,title}:{lat:number;lng:number;title:string}){
  const d=.012
  const bbox=`${lng-d},${lat-d},${lng+d},${lat+d}`
  const embed=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
  const directions=`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  return <div className="event-map-wrap">
    <iframe title={`Mapa de ${title}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
    <a href={directions} target="_blank" rel="noreferrer"><MapPin size={16}/> ABRIR NO MAPA</a>
  </div>
}
