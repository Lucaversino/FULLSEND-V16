'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit3, Trash2, X, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UserListingActions({listing}:{listing:any}){
  const [editing,setEditing]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const router=useRouter()

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(busy)return
    setBusy(true);setMessage('')
    const fd=new FormData(e.currentTarget)
    const priceText=String(fd.get('price')||'').replace(/[^\d]/g,'')
    const payload={
      title:String(fd.get('title')||'').trim(),
      price:priceText?Number(priceText):null,
      city:String(fd.get('city')||'').trim(),
      state:String(fd.get('state')||'').trim().toUpperCase().slice(0,2),
      updated_at:new Date().toISOString(),
    }
    const supabase=createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setBusy(false);setMessage('Sua sessão expirou. Entre novamente.');return}
    const {error}=await supabase.from('listings').update(payload).eq('id',listing.id).eq('user_id',user.id)
    setBusy(false)
    if(error){setMessage(error.message);return}
    setEditing(false)
    router.refresh()
  }

  async function remove(){
    if(busy)return
    if(!window.confirm('Excluir este anúncio definitivamente?'))return
    setBusy(true);setMessage('')
    const supabase=createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setBusy(false);setMessage('Sua sessão expirou.');return}
    const {error}=await supabase.from('listings').delete().eq('id',listing.id).eq('user_id',user.id)
    setBusy(false)
    if(error){setMessage(error.message);return}
    router.refresh()
  }

  return <>
    <div className="user-ad-actions">
      <button type="button" onClick={()=>setEditing(true)}><Edit3 size={14}/> EDITAR</button>
      <button type="button" className="danger" onClick={remove} disabled={busy}><Trash2 size={14}/> EXCLUIR</button>
    </div>
    {message?<div className="user-ad-error">{message}</div>:null}

    {editing?(
      <div className="user-edit-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setEditing(false)}}>
        <form className="user-edit-modal" onSubmit={save}>
          <div className="user-edit-head">
            <div><span>MEU ANÚNCIO</span><h3>EDITAR ANÚNCIO</h3></div>
            <button type="button" onClick={()=>setEditing(false)} aria-label="Fechar"><X size={18}/></button>
          </div>
          <label>Título<input name="title" defaultValue={listing.title||''} required/></label>
          <label>Preço (digite apenas números)<input name="price" inputMode="numeric" defaultValue={listing.price?String(Math.round(Number(listing.price))):''} placeholder="135000"/></label>
          <div className="user-edit-two">
            <label>Cidade<input name="city" defaultValue={listing.city||''}/></label>
            <label>UF<input name="state" maxLength={2} defaultValue={listing.state||''}/></label>
          </div>
          <button className="user-edit-save" disabled={busy}><Save size={15}/>{busy?' SALVANDO...':' SALVAR ALTERAÇÕES'}</button>
        </form>
      </div>
    ):null}
  </>
}
