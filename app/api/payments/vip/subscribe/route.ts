import { NextResponse } from 'next/server'
export async function POST(){
  return NextResponse.json({error:'As assinaturas mensais foram encerradas. Agora o FULLSEND usa impulsionamento por anúncio via Pix.'},{status:410})
}
