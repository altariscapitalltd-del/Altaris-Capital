'use client'

import { useEffect, useState, memo } from 'react'
import Link from 'next/link'

interface TrendingCoin {
  id: string
  name: string
  symbol: string
  thumb: string
  marketCapRank: number | null
  priceBtc: number
}

const TrendingCoins = memo(function TrendingCoins() {
  const [coins, setCoins] = useState<TrendingCoin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/search/trending')
        const json = await res.json()
        if (!cancelled && json.coins) {
          setCoins(json.coins.slice(0, 6).map((c: any) => ({
            id: c.item.id,
            name: c.item.name,
            symbol: c.item.symbol?.toUpperCase() || '',
            thumb: c.item.thumb,
            marketCapRank: c.item.market_cap_rank,
            priceBtc: c.item.price_btc,
          })))
        }
      } catch {
        setCoins([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Trending</div>
        <div className="shimmer" style={{ height: 180, borderRadius: 12 }} />
      </div>
    )
  }

  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Trending Search</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>CoinGecko</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {coins.map((coin, idx) => (
          <Link key={coin.id} href={`/markets/${coin.symbol.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', textDecoration: 'none', transition: 'background .15s' }} className="pressable">
            <span style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>
              {idx + 1}
            </span>
            <img src={coin.thumb} alt="" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{coin.symbol}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{coin.name}</div>
            </div>
            {coin.marketCapRank && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 99 }}>#{coin.marketCapRank}</span>
            )}
          </Link>
        ))}
        {coins.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>No trending data available</div>
        )}
      </div>
    </div>
  )
})

export default TrendingCoins
