'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

const BRANDS = [
  { name: 'Volkswagen', logo: 'https://cdn.simpleicons.org/volkswagen' },
  { name: 'Chevrolet', logo: 'https://cdn.simpleicons.org/chevrolet' },
  { name: 'Fiat', logo: 'https://cdn.simpleicons.org/fiat' },
  { name: 'Ford', logo: 'https://cdn.simpleicons.org/ford' },
  { name: 'Honda', logo: 'https://cdn.simpleicons.org/honda' },
  { name: 'Toyota', logo: 'https://cdn.simpleicons.org/toyota' },
  { name: 'BMW', logo: 'https://cdn.simpleicons.org/bmw' },
  { name: 'Audi', logo: 'https://cdn.simpleicons.org/audi' },
  { name: 'Porsche', logo: 'https://cdn.simpleicons.org/porsche' },
  { name: 'Mercedes-Benz', logo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_free_logo.svg' },
]

function BrandLogo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <span className="brand-logo-box" aria-hidden="true">
      {!failed ? (
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="brand-logo-fallback">{name.slice(0, 3).toUpperCase()}</span>
      )}
    </span>
  )
}

export default function BrandCarousel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeBrand = searchParams.get('marca') || ''

  const chooseBrand = useCallback((brand: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (activeBrand.toLowerCase() === brand.toLowerCase()) {
      params.delete('marca')
    } else {
      params.set('marca', brand)
    }

    params.delete('pagina')
    const query = params.toString()
    router.push(query ? `/?${query}` : '/')
  }, [activeBrand, router, searchParams])

  const items = [...BRANDS, ...BRANDS]

  return (
    <section className="brand-carousel-section" aria-label="Buscar por marca">
      <div className="brand-carousel-heading">
        <div>
          <span className="brand-kicker">MARCAS</span>
          <h2>BUSQUE POR MARCA</h2>
        </div>

        {activeBrand ? (
          <button
            className="brand-clear"
            type="button"
            onClick={() => chooseBrand(activeBrand)}
          >
            LIMPAR MARCA
          </button>
        ) : null}
      </div>

      <div className="brand-carousel-viewport">
        <div className="brand-carousel-track">
          {items.map((brand, index) => {
            const active = activeBrand.toLowerCase() === brand.name.toLowerCase()

            return (
              <button
                key={`${brand.name}-${index}`}
                type="button"
                className={`brand-carousel-item brand-carousel-item-original ${active ? 'active' : ''}`}
                onClick={() => chooseBrand(brand.name)}
                aria-pressed={active}
                title={`Filtrar por ${brand.name}`}
              >
                <BrandLogo src={brand.logo} name={brand.name} />
                <span className="brand-carousel-name">{brand.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
