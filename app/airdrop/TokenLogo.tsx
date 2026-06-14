'use client'

import { useState } from 'react'

// Token logos come from external CDNs (cryptologos.cc) that frequently 404.
// Fall back to the symbol's initial so a broken image never leaves a blank box.
export function TokenLogo({
  src,
  symbol,
  size = 32,
}: {
  src: string
  symbol: string
  size?: number
}) {
  const [failed, setFailed] = useState(!src)

  if (failed) {
    return (
      <span aria-hidden="true" style={{ fontSize: size * 0.56, fontWeight: 900 }}>
        {symbol.charAt(0)}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}
