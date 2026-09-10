import { NextResponse } from 'next/server'

export async function POST(){
  return NextResponse.json({
    error:'O sistema antigo de benefícios VIP foi encerrado. Use o botão IMPULSIONAR do anúncio.'
  },{status:410})
}
