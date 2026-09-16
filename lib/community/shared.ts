import { z } from 'zod'
export const POST_TYPES = ['Post normal','Meu projeto','Dúvida','Evento','Encontro','Antes e depois','Upgrade','Foto','Vídeo'] as const
export const FILTERS = ['Para você','Seguindo','Projetos','Perto de mim','Eventos','Dúvidas','Mais curtidos','Recentes'] as const
export const REASONS = ['Spam','Conteúdo ofensivo','Golpe','Anúncio irregular','Conteúdo impróprio','Outro'] as const
export const MIME = ['image/jpeg','image/png','image/webp','video/mp4','video/webm'] as const
export const mediaSchema = z.object({
 path:z.string().min(1).max(250),
 type:z.enum(MIME),
 posterPath:z.string().min(1).max(250).optional(),
 duration:z.number().positive().max(60*60*6).optional(),
 width:z.number().int().positive().max(7680).optional(),
 height:z.number().int().positive().max(7680).optional(),
 aspectRatio:z.string().max(20).optional(),
})
export const postSchema = z.object({
 id:z.string().uuid(), content:z.string().trim().min(1).max(5000), post_type:z.enum(POST_TYPES),
 vehicle_id:z.string().uuid().nullable(), event_id:z.string().uuid().nullable(),
 category:z.string().trim().min(1).max(60), city:z.string().trim().max(100),state:z.string().regex(/^([A-Z]{2})?$/),
 tags:z.array(z.string().regex(/^[\p{L}\p{N}_]{1,40}$/u)).max(15),media:z.array(mediaSchema).max(10),
 title:z.string().trim().max(120),project_date:z.string().date().nullable(),parts:z.string().max(1500),
 power:z.number().min(0).max(999999).nullable(),cost:z.number().min(0).max(999999999999).nullable(),
}).superRefine((p,c)=>{
 if(p.project_date&&(!p.vehicle_id||!p.title))c.addIssue({code:'custom',message:'Selecione o carro e informe o título do diário.'})
 if(['Evento','Encontro'].includes(p.post_type)&&!p.event_id)c.addIssue({code:'custom',message:'Selecione um evento cadastrado.'})
 if(p.post_type==='Foto'&&!p.media.some(m=>m.type.startsWith('image/')))c.addIssue({code:'custom',message:'Adicione uma foto.'})
 if(p.post_type==='Vídeo'&&!p.media.some(m=>m.type.startsWith('video/')))c.addIssue({code:'custom',message:'Adicione um vídeo.'})
})
export type PostInput = z.infer<typeof postSchema>
export type CommunityPost = Omit<PostInput,'media'> & {user_id:string;created_at:string;updated_at:string;likes_count:number;comments_count:number;liked:boolean;saved:boolean;status:string;author:any;vehicle:any;event:any;media:(z.infer<typeof mediaSchema>&{url?:string;posterUrl?:string})[]}
export function safeImage(url?:string|null){return url && /^https?:\/\//i.test(url) ? url : undefined}
export async function request(url:string,body?:unknown,method='POST'){
 const res=await fetch(url,body===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 const data=await res.json().catch(()=>({}))
 if(res.status===401){window.location.href=`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`;throw new Error('Entre na sua conta para continuar.')}
 if(!res.ok)throw new Error(data.error||'Não foi possível concluir. Tente novamente.')
 return data
}
