import { NextResponse } from 'next/server'

export const dynamic='force-dynamic'

export async function GET(){
  const mode=String(process.env.MERCADOPAGO_MODE||'production').trim().toLowerCase()==='test'
    ? 'test'
    : 'production'

  return NextResponse.json({
    ok:true,
    mode,
    tokenConfigured:Boolean((process.env.MERCADOPAGO_ACCESS_TOKEN||'').trim()),
    webhookSecretConfigured:Boolean((process.env.MERCADOPAGO_WEBHOOK_SECRET||'').trim()),
    testPayerConfigured:mode==='test'
      ? Boolean((process.env.MERCADOPAGO_TEST_PAYER_EMAIL||'').trim())
      : null
  })
}
