'use client'
import { useMemo, useState } from 'react'
import { Car } from 'lucide-react'
import { VEHICLE_BRANDS, vehicleModelsFor } from '@/lib/vehicle-catalog'

export default function VehicleBrandModelFields({defaultBrand='',defaultModel='',className='field',required=true}:{defaultBrand?:string;defaultModel?:string;className?:string;required?:boolean}){
  const [brand,setBrand]=useState(defaultBrand)
  const [model,setModel]=useState(defaultModel)
  const models=useMemo(()=>{
    const base=vehicleModelsFor(brand)
    return defaultModel&&brand===defaultBrand&&!base.includes(defaultModel)?[defaultModel,...base]:base
  },[brand,defaultBrand,defaultModel])

  return <>
    <label><span><Car size={14}/>Marca</span><select className={className} name="brand" value={brand} required={required} onChange={e=>{setBrand(e.target.value);setModel('')}}><option value="">Selecione a marca</option>{VEHICLE_BRANDS.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label><span><Car size={14}/>Modelo</span><select className={className} name="model" value={model} required={required} disabled={!brand} onChange={e=>setModel(e.target.value)}><option value="">{brand?'Selecione o modelo':'Selecione a marca primeiro'}</option>{models.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
  </>
}
