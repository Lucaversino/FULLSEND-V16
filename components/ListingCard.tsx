'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Gauge, CalendarDays, ArrowRight, X, ChevronLeft, ChevronRight, ExternalLink, Fuel, Settings2, Images as ImagesIcon, Crown, Sparkles } from 'lucide-react'
import type { UnifiedListing } from '@/lib/listings'
import UserBadge from '@/components/UserBadge'
import DirectMessageButton from '@/components/DirectMessageButton'
import FollowUserButton from '@/components/FollowUserButton'

function money(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 'Consulte'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default function ListingCard({ x, doubleClickToOpen=false }: { x: UnifiedListing; doubleClickToOpen?: boolean }) {
  const external = x.kind === 'gecko'
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [detailDescription, setDetailDescription] = useState<string | null>(x.description || null)
  const [detailPhone, setDetailPhone] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const detailAttemptedRef = useRef(false)
  const lastCarouselClickRef = useRef(0)
  const images = useMemo(() => {
    const values = [x.coverUrl, ...(x.images || [])].filter(Boolean) as string[]
    return Array.from(new Set(values)).slice(0, 8)
  }, [x.coverUrl, x.images])

  useEffect(() => {
    if (!open) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowRight' && images.length > 1) setActive((n) => (n + 1) % images.length)
      if (e.key === 'ArrowLeft' && images.length > 1) setActive((n) => (n - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, images.length])

  useEffect(() => {
    if (!open || !external || detailDescription || detailAttemptedRef.current) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 9000)
    let cancelled = false

    detailAttemptedRef.current = true
    setDetailLoading(true)

    fetch(`/api/partner-detail?id=${encodeURIComponent(x.id)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        return data
      })
      .then((data) => {
        if (cancelled || !data) return
        if (typeof data.description === 'string' && data.description.trim()) {
          setDetailDescription(data.description.trim())
        }
        if (typeof data.phone === 'string' && data.phone) setDetailPhone(data.phone)
      })
      .catch(() => null)
      .finally(() => {
        window.clearTimeout(timeout)
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [open, external, x.id, detailDescription])

  const openModal = () => {
    setActive(0)
    // Permite uma nova tentativa somente ao abrir novamente o anúncio.
    if (!detailDescription) detailAttemptedRef.current = false
    setOpen(true)
  }

  const handleCardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!doubleClickToOpen) {
      openModal()
      return
    }

    // No carrossel: primeiro clique seleciona; segundo clique rápido abre.
    const now = Date.now()
    const elapsed = now - lastCarouselClickRef.current
    lastCarouselClickRef.current = now

    if (elapsed > 0 && elapsed <= 500) {
      e.preventDefault()
      e.stopPropagation()
      lastCarouselClickRef.current = 0
      openModal()
    }
  }

  return (
    <>
      <button
        type="button"
        className={`listing-card listing-card-button ${x.isVip ? 'listing-card-vip' : x.isFeatured ? 'listing-card-featured' : ''}`}
        onClick={handleCardClick}
        aria-label={doubleClickToOpen ? `${x.title} — dois cliques para abrir` : x.title}
      >
        <div className="listing-media">
          {x.coverUrl ? <img src={x.coverUrl} alt={x.title} loading="lazy" /> : <div className="no-photo">SEM FOTO</div>}
          <span className={`source-badge ${external ? 'partner' : 'native'}`}>{x.sourceLabel}</span>
          {x.isVip?<span className="listing-promo-badge vip"><Crown size={12}/>VIP</span>:x.isFeatured?<span className="listing-promo-badge featured"><Sparkles size={12}/>DESTAQUE</span>:null}
        </div>
        <div className="listing-body">
          <h3>{x.title}</h3>
          <div className="listing-price">{money(x.price)}</div>
          <div className="listing-meta">
            {x.year ? <span><CalendarDays size={14}/>{x.year}</span> : null}
            {x.mileage != null ? <span><Gauge size={14}/>{x.mileage.toLocaleString('pt-BR')} km</span> : null}
          </div>
          <div className="listing-location"><MapPin size={15}/>{x.city || 'Brasil'}{x.state ? ` / ${x.state}` : ''}</div>
          {x.seller?.name?<div className="listing-seller-mini"><span>{x.seller.avatar_url?<img src={x.seller.avatar_url} alt=""/>:<b>{x.seller.name[0]?.toUpperCase()}</b>}</span><em>{x.seller.name}</em><UserBadge badge={x.seller.badge} compact/></div>:null}
          <div className="listing-cta">VER RÁPIDO <ArrowRight size={15}/></div>
        </div>
      </button>

      {open && typeof document !== 'undefined' ? createPortal(
        <div className="quick-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <section className="quick-modal" role="dialog" aria-modal="true" aria-label={x.title}>
            <button className="quick-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={22}/></button>

            <div className="quick-modal-media">
              {images[active] ? <img src={images[active]} alt={`${x.title} - foto ${active + 1}`} /> : <div className="quick-modal-no-photo">SEM FOTO</div>}
              {images.length > 1 ? (
                <>
                  <button type="button" className="quick-nav quick-nav-left" onClick={() => setActive((n) => (n - 1 + images.length) % images.length)} aria-label="Foto anterior"><ChevronLeft size={24}/></button>
                  <button type="button" className="quick-nav quick-nav-right" onClick={() => setActive((n) => (n + 1) % images.length)} aria-label="Próxima foto"><ChevronRight size={24}/></button>
                  <div className="quick-photo-count"><ImagesIcon size={14}/>{active + 1}/{images.length}</div>
                </>
              ) : null}
            </div>

            <div className="quick-modal-content">
              <div className="quick-modal-topline"><span className={`source-badge ${external ? 'partner' : 'native'} quick-source`}>{x.sourceLabel}</span>{x.isVip?<span className="listing-promo-badge vip static"><Crown size={12}/>VIP</span>:x.isFeatured?<span className="listing-promo-badge featured static"><Sparkles size={12}/>DESTAQUE</span>:null}</div>
              {x.seller?.name?<div className="quick-seller">
                <span className="quick-seller-avatar">{x.seller.avatar_url?<img src={x.seller.avatar_url} alt=""/>:<b>{x.seller.name[0]?.toUpperCase()}</b>}</span>
                <div className="quick-seller-copy"><small>ANUNCIANTE</small><strong>{x.seller.name}</strong></div>
                <UserBadge badge={x.seller.badge}/>
                {x.seller.id?<FollowUserButton userId={x.seller.id} compact/>:null}
              </div>:null}
              <h2>{x.title}</h2>
              <div className="quick-price">{money(x.price)}</div>

              <div className="quick-specs">
                {x.year ? <span><CalendarDays size={15}/><b>{x.year}</b></span> : null}
                {x.mileage != null ? <span><Gauge size={15}/><b>{x.mileage.toLocaleString('pt-BR')} km</b></span> : null}
                {x.fuel ? <span><Fuel size={15}/><b>{x.fuel}</b></span> : null}
                {x.transmission ? <span><Settings2 size={15}/><b>{x.transmission}</b></span> : null}
                <span><MapPin size={15}/><b>{x.city || 'Brasil'}{x.state ? ` / ${x.state}` : ''}</b></span>
              </div>

              {x.features ? <p className="quick-features">{x.features}</p> : null}

              <div className="quick-description-block">
                <h3>DESCRIÇÃO DO ANUNCIANTE</h3>
                {detailDescription ? (
                  <p>{detailDescription}</p>
                ) : detailLoading ? (
                  <p className="quick-description-loading">Carregando descrição...</p>
                ) : (
                  <p className="quick-description-loading">Descrição não disponibilizada pela integração. Use "VER ANÚNCIO NA OLX" para consultar o texto original.</p>
                )}
              </div>

              <div className="quick-modal-actions">
                {!external && x.seller?.id ? (
                  <DirectMessageButton recipientId={x.seller.id} listingId={x.id} listingTitle={x.title}/>
                ) : null}
                {external && detailPhone ? (
                  <a className="btn btn-whatsapp quick-primary" href={`https://wa.me/${detailPhone}?text=${encodeURIComponent(`Olá! Vi o anúncio \"${x.title}\" no FULLSEND e gostaria de mais informações.`)}`} target="_blank" rel="noopener noreferrer">FALAR COM ANUNCIANTE</a>
                ) : external && x.externalUrl ? (
                  <a className="btn btn-red quick-primary" href={x.externalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/> VER ANÚNCIO NA OLX</a>
                ) : (
                  <a className="btn btn-red quick-primary" href={x.url}>VER ANÚNCIO COMPLETO</a>
                )}
                <button type="button" className="btn btn-dark" onClick={() => setOpen(false)}>FECHAR</button>
              </div>
            </div>
          </section>
        </div>,
        document.body
      ) : null}
    </>
  )
}
