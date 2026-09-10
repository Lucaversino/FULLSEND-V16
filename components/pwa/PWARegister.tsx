'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const register = async () => {
      try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }) } catch (err) { console.error('Falha ao registrar PWA', err) }
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
