import Image from 'next/image'
export default function VerifiedAvatarBadge({active}:{active?:boolean}){
  if(!active)return null
  return <span className="verified-avatar-badge" title="Perfil Verificado FULLSEND" aria-label="Perfil Verificado FULLSEND">
    <Image src="/badges/verified.png" alt="" width={18} height={18}/>
  </span>
}
