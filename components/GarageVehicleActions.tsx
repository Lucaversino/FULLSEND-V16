'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit3, Trash2, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function GarageVehicleActions({vehicle}:{vehicle:any}){
  const [editing,setEditing]=useState(false)
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const router=useRouter()

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return
    setBusy(true);setMsg('')
    try{
      const fd=new FormData(e.currentTarget)
      const s=createClient()
      const {data:{user}}=await s.auth.getUser()
      if(!user)throw new Error('Sua sessão expirou.')
      const payload={
        title:String(fd.get('title')||'').trim(),
        description:String(fd.get('description')||'').trim()||null,
        city:String(fd.get('city')||'').trim(),
        state:String(fd.get('state')||'').trim().toUpperCase().slice(0,2),
        engine:String(fd.get('engine')||'').trim()||null,
        power_cv:fd.get('power_cv')?Number(fd.get('power_cv')):null,
        features:String(fd.get('features')||'').trim()||null,
        updated_at:new Date().toISOString(),
      }
      if(!payload.title||!payload.city||payload.state.length!==2)throw new Error('Preencha título, cidade e UF.')
      const {data,error}=await s.from('listings').update(payload)
        .eq('id',vehicle.id).eq('user_id',user.id).eq('listing_mode','garage')
        .select('id').maybeSingle()
      if(error)throw error
      if(!data)throw new Error('Carro não encontrado na sua garagem.')
      setEditing(false);router.refresh()
    }catch(e){setMsg(e instanceof Error?e.message:'Não foi possível salvar.')}
    finally{setBusy(false)}
  }

  async function remove(){
    if(busy||!confirm(`Excluir "${vehicle.title}" da sua garagem? As publicações da comunidade continuarão existindo, mas deixarão de estar vinculadas a este projeto.`))return
    setBusy(true);setMsg('')
    try{
      const s=createClient()
      const {data:{user}}=await s.auth.getUser()
      if(!user)throw new Error('Sua sessão expirou.')
      const {error}=await s.from('listings').delete().eq('id',vehicle.id).eq('user_id',user.id).eq('listing_mode','garage')
      if(error)throw error
      router.refresh()
    }catch(e){setMsg(e instanceof Error?e.message:'Não foi possível excluir.')}
    finally{setBusy(false)}
  }

  return <>
    <div className="garage-project-actions">
      <button type="button" onClick={()=>setEditing(true)}><Edit3 size={14}/> EDITAR</button>
      <button type="button" className="danger" onClick={remove} disabled={busy}><Trash2 size={14}/> EXCLUIR</button>
    </div>
    {msg?<div className="user-ad-error">{msg}</div>:null}

    {editing?<div className="user-edit-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target&&!busy)setEditing(false)}}>
      <form className="user-edit-modal" onSubmit={save}>
        <div className="user-edit-head"><div><span>MINHA GARAGEM</span><h2>EDITAR PROJETO</h2></div><button type="button" onClick={()=>setEditing(false)}><X size={18}/></button></div>
        <div className="user-edit-grid">
          <label className="wide">Nome do projeto<input name="title" defaultValue={vehicle.title} required/></label>
          <label>Cidade<input name="city" defaultValue={vehicle.city||''} required/></label>
          <label>UF<input name="state" maxLength={2} defaultValue={vehicle.state||''} required/></label>
          <label>Motor<input name="engine" defaultValue={vehicle.engine||''}/></label>
          <label>Potência (cv)<input name="power_cv" type="number" min="0" defaultValue={vehicle.power_cv??''}/></label>
          <label className="wide">Descrição<textarea name="description" rows={5} defaultValue={vehicle.description||''}/></label>
          <label className="wide">Peças / modificações<textarea name="features" rows={4} defaultValue={vehicle.features||''}/></label>
        </div>
        <div className="user-edit-footer"><button type="button" onClick={()=>setEditing(false)}>CANCELAR</button><button className="save" disabled={busy}><Save size={15}/>{busy?' SALVANDO...':' SALVAR'}</button></div>
      </form>
    </div>:null}
  </>
}
