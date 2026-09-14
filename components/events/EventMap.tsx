'use client'
import { MapPin } from 'lucide-react'

type Props={
  title:string
  lat?:number|null
  lng?:number|null
  address?:string|null
  city?:string|null
  state?:string|null
  googleMapsUrl?:string|null
}

function coordinatesFromUrl(url:string){
  let decoded=url
  try{decoded=decodeURIComponent(url)}catch{}
  const query=decoded.match(/(?:@|[?&](?:query|q)=)(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/i)
  const encoded=decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i)
  const match=query||encoded
  if(!match)return null
  const lat=Number(match[1])
  const lng=Number(match[2])
  return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null
}

export default function EventMap({lat,lng,address,city,state,googleMapsUrl,title}:Props){
  const url=String(googleMapsUrl||'').trim()
  const linkedCoordinates=url?coordinatesFromUrl(url):null
  const hasCoordinates=Number.isFinite(lat)&&Number.isFinite(lng)
  const mapLat=linkedCoordinates?.lat??(hasCoordinates?Number(lat):null)
  const mapLng=linkedCoordinates?.lng??(hasCoordinates?Number(lng):null)
  const addressQuery=[address,city,state].filter(Boolean).join(', ')
  const query=mapLat!=null&&mapLng!=null?String(mapLat)+','+String(mapLng):addressQuery
  const embed=query
    ?'https://www.google.com/maps?q='+encodeURIComponent(query)+'&output=embed'
    :'https://www.google.com/maps?q='+encodeURIComponent(url)+'&output=embed'
  const directions=url||(query?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query):'')

  if(!url&&!query)return null

  return <div className="event-map-wrap">
    <iframe title={'Mapa de '+title} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
    {directions?<a href={directions} target="_blank" rel="noreferrer"><MapPin size={16}/> ABRIR NO GOOGLE MAPS</a>:null}
  </div>
}
