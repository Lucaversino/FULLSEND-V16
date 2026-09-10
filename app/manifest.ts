import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FULLSEND Classificados',
    short_name: 'FULLSEND',
    description: 'Classificados para gearheads: carros preparados, turbo, rodas, suspensão, som e acessórios.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#070707',
    theme_color: '#070707',
    categories: ['automotive', 'shopping', 'lifestyle'],
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Explorar anúncios', short_name: 'Explorar', url: '/explorar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Anunciar', short_name: 'Anunciar', url: '/anunciar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
    ]
  }
}
