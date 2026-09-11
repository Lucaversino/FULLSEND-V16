import './globals.css'
import type { Metadata, Viewport } from 'next'
import Header from '@/components/Header'
import PWARegister from '@/components/pwa/PWARegister'
import InstallPWA from '@/components/pwa/InstallPWA'
import MobileAnnounceButton from '@/components/MobileAnnounceButton'
import Footer from '@/components/Footer'
import FullsendCopilot from '@/components/FullsendCopilot'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import FloatingMessagesButton from '@/components/FloatingMessagesButton'

export const metadata: Metadata = {
  applicationName: 'FULLSEND Classificados',
  title: { default: 'FULLSEND Classificados', template: '%s | FULLSEND' },
  description: 'Marketplace de projetos, performance e cultura automotiva.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'FULLSEND' },
  formatDetection: { telephone: false }
}

export const viewport: Viewport = { themeColor: '#070707', colorScheme: 'dark', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body><PWARegister/><AnalyticsTracker/><Header/><MobileAnnounceButton/>{children}<Footer/><FloatingMessagesButton/><FullsendCopilot/><InstallPWA/></body></html>
}
