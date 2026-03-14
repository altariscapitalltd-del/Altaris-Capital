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

type OHLC = { times: number[]; values: number[]; open?: number[]; high?: number[]; low?: number[] }

function CandlestickChart({
  data,
  width,
  height,
  bullishColor,
  bearishColor,
}: {
  data: OHLC
  width: number
  height: number
  bullishColor: string
  bearishColor: string
}) {
  if (!data.times?.length || !data.values?.length) return null
  const opens = data.open ?? data.values
  const highs = data.high ?? data.values
  const lows = data.low ?? data.values
  const closes = data.values
  const padding = { top: 8, right: 8, bottom: 8, left: 8 }
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom
  const allPrices = highs.concat(lows).filter(Boolean)
  const min = Math.min(...allPrices)
  const max = Math.max(...allPrices)
  const range = max - min || 1
  const n = data.times.length
  const barW = Math.max(2, (w / n) * 0.6)
  const gap = w / n

  const candles = data.times.map((_, i) => {
    const o = opens[i] ?? closes[i]
    const hi = highs[i] ?? closes[i]
    const lo = lows[i] ?? closes[i]
    const c = closes[i]
    const x = padding.left + (i + 0.5) * gap - barW / 2
    const yHi = padding.top + h - ((hi - min) / range) * h
    const yLo = padding.top + h - ((lo - min) / range) * h
    const yO = padding.top + h - ((o - min) / range) * h
    const yC = padding.top + h - ((c - min) / range) * h
    const isUp = c >= o
    const bodyTop = Math.min(yO, yC)
    const bodyH = Math.abs(yC - yO) || 1
    return {
      x,
      barW,
      wickY: yHi,
      wickH: yLo - yHi,
      bodyY: bodyTop,
      bodyH,
      isUp,
      isLast: i === n - 1,
    }
  })

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {candles.map((c, i) => (
        <g key={i}>
          <line
            x1={c.x + c.barW / 2}
            y1={c.wickY}
            x2={c.x + c.barW / 2}
            y2={c.wickY + c.wickH}
            stroke={c.isUp ? bullishColor : bearishColor}
            strokeWidth="1.2"
          />
          <rect
            x={c.x}
            y={c.bodyY}
            width={c.barW}
            height={c.bodyH}
            fill={c.isUp ? bullishColor : bearishColor}
            stroke={c.isUp ? bullishColor : bearishColor}
            strokeWidth={c.isLast ? 1.5 : 0}
            opacity={c.isLast ? 1 : 0.9}
            style={c.isLast ? { animation: 'candlePulse 1.5s ease-in-out infinite' } : undefined}
          />
        </g>
      ))}
    </svg>
  )
}

export default function MarketChartPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params?.symbol as string) || ''
  const [days, setDays] = useState(7)
  const [chartData, setChartData] = useState<OHLC>({ times: [], values: [], open: [], high: [], low: [] })
  const [price, setPrice] = useState<number | null>(null)
  const [change24h, setChange24h] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState({ w: 340, h: 180 })

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.times && d.values) {
          setChartData({
            times: d.times,
            values: d.values,
            open: d.open ?? d.values,
            high: d.high ?? d.values,
            low: d.low ?? d.values,
          })
        } else setChartData({ times: [], values: [], open: [], high: [], low: [] })
      })
      .catch(() => setChartData({ times: [], values: [], open: [], high: [], low: [] }))
      .finally(() => setLoading(false))
  }, [symbol, days])

  useEffect(() => {
    if (!symbol) return
    fetch('/api/market')
      .then((r) => r.json())
      .then((data) => {
        const key = symbol.toUpperCase()
        const info = data[key] || data[symbol.toLowerCase()]
        if (info) {
          setPrice(info.price)
          setChange24h(info.change24h ?? null)
        } else {
          if (chartData.values.length) setPrice(chartData.values[chartData.values.length - 1])
        }
      })
      .catch(() => {
        if (chartData.values.length) setPrice(chartData.values[chartData.values.length - 1])
      })
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
        const open = parseFloat(k.o)
        const high = parseFloat(k.h)
        const low = parseFloat(k.l)
        const time = k.t
        setPrice(close)
        setChartData((prev) => {
          const times = [...prev.times, time]
          const values = [...prev.values, close]
          const opens = [...(prev.open ?? prev.values), open]
          const highs = [...(prev.high ?? prev.values), high]
          const lows = [...(prev.low ?? prev.values), low]
          const max = 60
          if (values.length > max) {
            return {
              times: times.slice(-max),
              values: values.slice(-max),
              open: opens.slice(-max),
              high: highs.slice(-max),
              low: lows.slice(-max),
            }
          }
          return { times, values, open: opens, high: highs, low: lows }
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
  const bullishColor = '#0ECB81'
  const bearishColor = '#F6465D'

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
            <CandlestickChart
              data={chartData}
              width={chartSize.w}
              height={chartSize.h}
              bullishColor={bullishColor}
              bearishColor={bearishColor}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {TIMEFRAMES.map((t) => (
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
