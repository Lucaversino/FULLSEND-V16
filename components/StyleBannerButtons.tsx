import Link from 'next/link'

type Params = Record<string, string | undefined>

function hrefFor(base: string, params: Params, style: string) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === 'pagina' || key === 'page' || key === 'estilo') return
    qs.set(key, value)
  })
  if (style) qs.set('estilo', style)
  const query = qs.toString()
  return query ? `${base}?${query}` : base
}

const ITEMS = [
  { key: '', label: 'Todos', image: '/style-buttons/todos.png' },
  { key: 'turbo', label: 'Turbo', image: '/style-buttons/turbo.png' },
  { key: 'antigos', label: 'Antigos', image: '/style-buttons/antigos.png' },
  { key: 'rebaixado', label: 'Rebaixados', image: '/style-buttons/rebaixados.png' },
]

export default function StyleBannerButtons({
  params,
  base = '/',
  compact = false,
}: {
  params: Params
  base?: string
  compact?: boolean
}) {
  return (
    <section className={`style-banner-section ${compact ? 'style-banner-compact' : ''}`} aria-label="Escolha um estilo de carro">
      <div className="style-banner-heading">
        <div>
          <span>FULLSEND STYLE</span>
          <h2>ESCOLHA SEU ESTILO</h2>
        </div>
        <small>Toque em uma categoria para filtrar os anúncios.</small>
      </div>

      <div className="style-banner-grid">
        {ITEMS.map((item) => {
          const active = (params.estilo || '') === item.key
          return (
            <Link
              key={item.label}
              href={hrefFor(base, params, item.key)}
              className={`style-banner-card ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              title={`Mostrar ${item.label}`}
            >
              <img src={item.image} alt={`Botão ${item.label}`} loading="eager" />
              <span className="style-banner-active-dot" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
