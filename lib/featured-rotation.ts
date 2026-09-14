import type { UnifiedListing } from './listings'

export const featuredKey=(item:UnifiedListing)=>`${item.kind}:${item.id}`
export type RotationHistory={seen:string[];last:string[]}
export function selectFeatured(items:UnifiedListing[],history:RotationHistory={seen:[],last:[]},size=10,rng= Math.random){
 const pool=Array.from(new Map(items.filter(x=>x.isFeatured||x.isVip).map(x=>[featuredKey(x),x])).values())
 const ids=new Set(pool.map(featuredKey));const seen=new Set(history.seen.filter(id=>ids.has(id)));const last=new Set(history.last)
 const shuffle=(list:UnifiedListing[])=>{const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
 const fresh=shuffle(pool.filter(x=>!seen.has(featuredKey(x))))
 const old=shuffle(pool.filter(x=>seen.has(featuredKey(x))&&!last.has(featuredKey(x))))
 const previous=shuffle(pool.filter(x=>seen.has(featuredKey(x))&&last.has(featuredKey(x))))
 const chosen=[...fresh,...old,...previous].slice(0,size)
 // Ao completar um ciclo, os itens usados para completar este lote iniciam o próximo.
 if(fresh.length<size){seen.clear();chosen.slice(fresh.length).forEach(x=>seen.add(featuredKey(x)))}
 else chosen.forEach(x=>seen.add(featuredKey(x)))
 if(chosen.length>1&&featuredKey(chosen[0])===history.last[0]){const j=1+Math.floor(rng()*(chosen.length-1));[chosen[0],chosen[j]]=[chosen[j],chosen[0]]}
 return {items:chosen,history:{seen:[...seen],last:chosen.map(featuredKey)}}
}
