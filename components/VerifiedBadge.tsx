import Image from 'next/image'
export default function VerifiedBadge({active}:{active?:boolean}){return active?<span title="Selo Verificado FULLSEND" style={{display:'inline-flex',verticalAlign:'middle',flexShrink:0}}><Image src="/badges/verified.png" alt="Verificado FULLSEND" width={32} height={32} style={{objectFit:'contain'}}/></span>:null}
