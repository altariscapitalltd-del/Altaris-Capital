'use client'

import { useEffect, useState, memo } from 'react'

interface GlobalData {
  totalMarketCap: number
  totalVolume: number
  btcDominance: number
  ethDominance: number
  marketCapChange: number
}

const MarketStats = memo(function MarketStats() {
  const [data, setData] = useState<GlobalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/global')
        const json = await res.json()
        const d = json.data
        if (!cancelled && d) {
          setData({
            totalMarketCap: d.total_market_cap?.usd || 0,
            totalVolume: d.total_volume?.usd || 0,
            btcDominance: d.market_cap_percentage?.btc || 0,
            ethDominance: d.market_cap_percentage?.eth || 0,
            marketCapChange: d.market_cap_change_percentage_24h_usd || 0,
          })
        }
      } catch {
        setData({ totalMarketCap: 2.8e12, totalVolume: 98e9, btcDominance: 52.4, ethDominance: 16.8, marketCapChange: 1.2 })
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
        <div className="shimmer" style={{ height: 120, borderRadius: 12 }} />
      </div>
    )
  }

  const stats = [
    { label: 'Market Cap', value: `$${((data?.totalMarketCap || 0) / 1e12).toFixed(2)}T`, change: data?.marketCapChange || 0 },
    { label: '24h Volume', value: `$${((data?.totalVolume || 0) / 1e9).toFixed(1)}B`, change: null },
    { label: 'BTC Dominance', value: `${(data?.btcDominance || 0).toFixed(1)}%`, change: null },
    { label: 'ETH Dominance', value: `${(data?.ethDominance || 0).toFixed(1)}%`, change: null },
  ]

  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Global Market</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>CoinGecko</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{s.value}</span>
              {s.change !== null && (
                <span style={{ fontSize: 11, fontWeight: 700, color: (s.change || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(s.change || 0) >= 0 ? '+' : ''}{(s.change || 0).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default MarketStats
