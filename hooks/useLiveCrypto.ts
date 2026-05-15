'use client'

import { useEffect, useState } from 'react'

type CoinPrice = { usd?: number; usd_24h_change?: number }
type Prices = Record<string, CoinPrice>

export function useLiveCrypto(intervalMs = 10000) {
  const [prices, setPrices] = useState<Prices | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const res = await fetch('/api/markets/live', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data?.prices) setPrices(data.prices)
      } catch {
        // Silently keep fallback UI values on network failure.
      }
    }

    run()
    const timer = window.setInterval(run, intervalMs)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [intervalMs])

  return { prices }
}
