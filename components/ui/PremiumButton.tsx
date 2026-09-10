'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  tone?: 'red' | 'dark' | 'gold'
  glow?: boolean
}

export default function PremiumButton({
  children,
  tone = 'red',
  glow = true,
  className = '',
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`fs-premium-btn fs-premium-btn-${tone} ${glow ? 'fs-premium-glow' : ''} ${className}`}
    >
      <span className="fs-premium-btn-bg" aria-hidden="true" />
      <span className="fs-premium-btn-shine" aria-hidden="true" />
      <span className="fs-premium-btn-edge" aria-hidden="true" />
      <span className="fs-premium-btn-content">{children}</span>
    </button>
  )
}
