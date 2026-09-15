'use client'
import {useEffect,useRef,useState} from 'react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import {Plus,X,UserPlus,LogIn,Car,User} from 'lucide-react'
export default function MobileQuickActions({loggedIn}:{loggedIn:boolean}){
 const [open,setOpen]=useState(false)
 const root=useRef<HTMLDivElement>(null)
 const trigger=useRef<HTMLButtonElement>(null)
 const path=usePathname()
 useEffect(()=>setOpen(false),[path])
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}};const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside)}},[open])
 return <div className="mobile-quick-actions" ref={root}>
 {open&&<nav id="mobile-quick-menu" className="mobile-quick-menu" aria-label="Ações rápidas" onClick={()=>setOpen(false)}>
 <Link href={loggedIn?'/anunciar':'/login?next=/anunciar'}><Car size={18}/>Anunciar</Link>
 <Link href="/comunidade/publicar"><Plus size={18}/>Publicar</Link>
 {loggedIn?<Link href="/perfil"><User size={18}/>Meu painel</Link>:<><Link href="/cadastro"><UserPlus size={18}/>Criar conta</Link><Link href="/login"><LogIn size={18}/>Fazer login</Link></>}
 </nav>}
 <button ref={trigger} type="button" className="mobile-quick-trigger" aria-label={open?'Fechar ações rápidas':'Abrir ações rápidas'} aria-expanded={open} aria-controls="mobile-quick-menu" onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<Plus size={26}/>}</button>
 </div>
}
