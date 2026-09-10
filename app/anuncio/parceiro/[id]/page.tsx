import { notFound } from 'next/navigation'
import { MapPin, Gauge, CalendarDays, Fuel, Settings2, MessageCircle, ShieldCheck, Images as ImagesIcon, ExternalLink } from 'lucide-react'
import { fetchOlxPdp, findPublicPhone, collectImages, attributesFrom } from '@/lib/gecko-pdp'
import { proxiedImage } from '@/lib/listings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function money(value: any) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'Consulte'
}

async function getListing(id: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!base || !key) return null
  const u = `${base}/rest/v1/gecko_listings?id=eq.${encodeURIComponent(id)}&select=*`
  const r = await fetch(u, { cache: 'no-store', headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!r.ok) return null
  const rows = await r.json()
  return rows?.[0] || null
}

export default async function PartnerListingPage({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params
  const row = await getListing(id)
  if (!row) notFound()

  const pdp = await fetchOlxPdp(row.external_url)
  const detail = pdp.data
  const images = collectImages(row, detail)
  const phone = findPublicPhone(detail)
  const title = detail?.title || row.title
  const price = detail?.price ?? row.price
  const city = detail?.location?.city || row.city
  const state = detail?.location?.state || row.state
  const description = detail?.description || row.raw_data?.description || null
  const attrs = attributesFrom(row, detail)
  const waText = encodeURIComponent(`Olá! Vi o anúncio "${title}" no FULLSEND e gostaria de mais informações.`)

  return <main className="partner-detail-page">
    <section className="detail-hero-line"><div className="container"><span>FULLSEND MARKET</span><strong>ANÚNCIO PARCEIRO</strong></div></section>
    <div className="container detail-shell">
      <div className="detail-gallery">
        <div className="gallery-main">
          {images[0] ? <img src={proxiedImage(images[0])!} alt={title}/> : <div className="detail-no-photo">SEM FOTO</div>}
          <div className="photo-count"><ImagesIcon size={16}/>{images.length} FOTOS</div>
        </div>
        <div className="gallery-side">
          {images.slice(1,5).map((url,i)=><img src={proxiedImage(url)!} alt={`${title} ${i+2}`} key={url}/>)}
        </div>
      </div>

      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-title-row">
            <div><span className="section-kicker">PROJETO / PERFORMANCE</span><h1>{title}</h1></div>
            <div className="detail-price">{money(price)}</div>
          </div>
          <div className="detail-chips">
            {row.year ? <span><CalendarDays size={17}/>{row.year}</span> : null}
            {row.mileage != null ? <span><Gauge size={17}/>{Number(row.mileage).toLocaleString('pt-BR')} km</span> : null}
            {row.fuel ? <span><Fuel size={17}/>{row.fuel}</span> : null}
            {row.transmission ? <span><Settings2 size={17}/>{row.transmission}</span> : null}
            <span><MapPin size={17}/>{city || 'Brasil'}{state ? ` / ${state}` : ''}</span>
          </div>

          <section className="detail-block"><h2>DETALHES DO VEÍCULO</h2><div className="spec-grid">{attrs.map((a:any,i:number)=><div className="spec" key={`${a.label}-${i}`}><span>{a.label}</span><strong>{String(a.value)}</strong></div>)}</div></section>
          {description ? <section className="detail-block"><h2>DESCRIÇÃO</h2><p className="detail-description">{description}</p></section> : null}
          {row.features ? <section className="detail-block"><h2>EQUIPAMENTOS & OPCIONAIS</h2><p className="detail-description">{row.features}</p></section> : null}
          {pdp.error ? <div className="detail-note">Alguns detalhes extras não puderam ser atualizados agora: {pdp.error}</div> : null}
        </article>

        <aside className="seller-card">
          <span className="seller-label">CONTATO DO ANUNCIANTE</span>
          <h2>Fale direto com o anunciante</h2>
          <p>Use o contato disponibilizado pela fonte do anúncio quando ele estiver presente na resposta da integração.</p>
          {phone ? <>
            <div className="seller-phone">+{phone.slice(0,2)} {phone.slice(2)}</div>
            <a className="btn btn-whatsapp" href={`https://wa.me/${phone}?text=${waText}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={20}/> FALAR COM ANUNCIANTE</a>
          </> : <>
            <div className="contact-unavailable"><ShieldCheck size={20}/><div><strong>Contato direto não disponibilizado</strong><span>A integração não retornou um telefone público para este anúncio.</span></div></div>
            {row.external_url ? <a className="btn btn-olx" href={row.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={19}/> VER ANÚNCIO NA OLX</a> : null}
          </>}
          <div className="seller-trust"><ShieldCheck size={17}/> Dados exibidos conforme retorno da integração.</div>
        </aside>
      </div>
    </div>
  </main>
}
