'use client'

import { useEffect, useState, memo } from 'react'

interface FearGreedData {
  value: number
  classification: string
  timestamp: string
}

const getSentimentColor = (value: number): string => {
  if (value <= 20) return '#F6465D'
  if (value <= 40) return '#FF6B35'
  if (value <= 60) return '#C9A227'
  if (value <= 80) return '#0ECB81'
  return '#00D084'
}

const getSentimentLabel = (value: number): string => {
  if (value <= 20) return 'Extreme Fear'
  if (value <= 40) return 'Fear'
  if (value <= 60) return 'Neutral'
  if (value <= 80) return 'Greed'
  return 'Extreme Greed'
}

const FearGreedGauge = memo(function FearGreedGauge() {
  const [data, setData] = useState<FearGreedData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1')
        const json = await res.json()
        if (!cancelled && json.data?.[0]) {
          const item = json.data[0]
          setData({
            value: Number(item.value),
            classification: item.value_classification,
            timestamp: item.timestamp,
          })
        }
      } catch {
        setData({ value: 50, classification: 'Neutral', timestamp: String(Date.now() / 1000) })
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
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Fear & Greed</div>
        <div className="shimmer" style={{ height: 80, borderRadius: 12 }} />
      </div>
    )
  }

  const value = data?.value ?? 50
  const color = getSentimentColor(value)
  const label = getSentimentLabel(value)
  const rotation = (value / 100) * 180 - 90

  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fear & Greed</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>alternative.me</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Gauge */}
        <div style={{ position: 'relative', width: 80, height: 44, flexShrink: 0 }}>
          <svg width="80" height="44" viewBox="0 0 80 44">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F6465D" />
                <stop offset="25%" stopColor="#FF6B35" />
                <stop offset="50%" stopColor="#C9A227" />
                <stop offset="75%" stopColor="#0ECB81" />
                <stop offset="100%" stopColor="#00D084" />
              </linearGradient>
            </defs>
            <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeLinecap="round" />
            {/* Needle */}
            <line
              x1="40" y1="40"
              x2={40 + 28 * Math.cos((rotation * Math.PI) / 180)}
              y2={40 + 28 * Math.sin((rotation * Math.PI) / 180)}
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="40" cy="40" r="3" fill="#fff" />
          </svg>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Market Sentiment Index</div>
        </div>
      </div>
    </div>
  )
})

export default FearGreedGauge
