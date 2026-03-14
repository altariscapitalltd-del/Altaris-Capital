'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const TIMEFRAMES = [
  { id: '1', label: '24H', days: 1 },
  { id: '7', label: '7D', days: 7 },
  { id: '30', label: '30D', days: 30 },
  { id: '90', label: '90D', days: 90 },
  { id: '180', label: '180D', days: 180 },
]

function ChartLine({ times, values, width, height, color }: { times: number[]; values: number[]; width: number; height: number; color: string }) {
  if (times.length < 2 || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padding = { top: 8, right: 8, bottom: 8, left: 8 }
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom
  const points = values.map((v, i) => {
    const x = padding.left + (i / (values.length - 1)) * w
    const y = padding.top + h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const areaPoints = `${padding.left},${height - padding.bottom} ${points} ${width - padding.right},${height - padding.bottom}`
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MarketChartPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params?.symbol as string) || ''
  const [days, setDays] = useState(7)
  const [chartData, setChartData] = useState<{ times: number[]; values: number[] }>({ times: [], values: [] })
  const [price, setPrice] = useState<number | null>(null)
  const [change24h, setChange24h] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState({ w: 340, h: 180 })

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.times && d.values) setChartData({ times: d.times, values: d.values })
        else setChartData({ times: [], values: [] })
      })
      .catch(() => setChartData({ times: [], values: [] }))
      .finally(() => setLoading(false))
  }, [symbol, days])

  useEffect(() => {
    if (!symbol) return
    fetch('/api/market')
      .then(r => r.json())
      .then(data => {
        const key = symbol.toUpperCase()
        const info = data[key] || data[symbol.toLowerCase()]
        if (info) {
          setPrice(info.price)
          setChange24h(info.change24h ?? null)
        } else {
          if (chartData.values.length) setPrice(chartData.values[chartData.values.length - 1])
        }
      })
      .catch(() => { if (chartData.values.length) setPrice(chartData.values[chartData.values.length - 1]) })
  }, [symbol, chartData.values.length])

  useEffect(() => {
    if (!symbol) return
    const stream = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}usdt@kline_1m`
    const ws = new WebSocket(stream)

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data)
        const k = msg.k
        if (!k) return
        const close = parseFloat(k.c)
        const time = k.t
        setPrice(close)
        setChartData(prev => {
          const values = [...prev.values, close]
          const times = [...prev.times, time]
          const max = 60
          if (values.length > max) {
            values.splice(0, values.length - max)
            times.splice(0, times.length - max)
          }
          return { times, values }
        })
      } catch {
        // ignore
      }
    })

    return () => ws.close()
  }, [symbol])

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 340
      setChartSize({ w, h: Math.min(200, w * 0.55) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const displayPrice = price != null ? (price < 0.01 ? price.toFixed(6) : price.toLocaleString('en-US', { minimumFractionDigits: price < 1 ? 4 : 2, maximumFractionDigits: 8 })) : '—'
  const name = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase()

  return (
    <div style={{ padding: '16px', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{symbol.toUpperCase()} / USD</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{name}</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 800 }}>${displayPrice}</span>
          {change24h != null && (
            <span style={{ fontSize: 14, fontWeight: 700, color: change24h >= 0 ? 'var(--success)' : 'var(--danger)', background: change24h >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', padding: '2px 8px', borderRadius: 99 }}>
              {(change24h >= 0 ? '+' : '') + change24h.toFixed(2)}%
            </span>
          )}
        </div>
        <div ref={chartRef} style={{ width: '100%', minHeight: 180 }}>
          {loading ? (
            <div style={{ height: chartSize.h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading chart...</div>
          ) : (
            <ChartLine
              times={chartData.times}
              values={chartData.values}
              width={chartSize.w}
              height={chartSize.h}
              color={change24h != null && change24h < 0 ? '#F6465D' : '#0ECB81'}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {TIMEFRAMES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDays(t.days)}
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                border: days === t.days ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
                background: days === t.days ? 'rgba(242,186,14,0.12)' : 'transparent',
                color: days === t.days ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Link
        href="/invest"
        style={{
          display: 'block',
          width: '100%',
          padding: '14px',
          background: 'var(--brand-primary)',
          color: '#000',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 15,
          textAlign: 'center',
          textDecoration: 'none',
        }}
        className="pressable"
      >
        Invest in {symbol.toUpperCase()}
      </Link>
    </div>
  )
}
