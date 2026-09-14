import CommunityFeed from '@/components/community/CommunityFeed'
import { notFound } from 'next/navigation'
import { z } from 'zod'
export const metadata={title:'Publicação da Comunidade'}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();return <CommunityFeed postId={id}/>}
