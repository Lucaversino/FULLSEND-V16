import CommunityFeed from '@/components/community/CommunityFeed'
import { notFound } from 'next/navigation'
export default async function Page({params}:{params:Promise<{tag:string}>}){const {tag}=await params;if(!/^[\p{L}\p{N}_]{1,40}$/u.test(tag))notFound();return <CommunityFeed tag={tag.toLowerCase()}/>}
