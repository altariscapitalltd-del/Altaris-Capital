'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown
    }
  }
}

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
]

export default function MarketChartPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = ((params?.symbol as string) || 'btc').toUpperCase()
  const pair = `${symbol}USDT`
  const [interval, setIntervalValue] = useState('1')
  const [price, setPrice] = useState<number | null>(null)
  const [change24h, setChange24h] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [widgetReady, setWidgetReady] = useState(false)

  const widgetIdRef = useRef(`tv_chart_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    fetch('/api/market')
      .then((r) => r.json())
      .then((d) => {
        const m = d[symbol]
        if (!m) return
        setPrice(m.price ?? null)
        setChange24h(m.change24h ?? null)
      })
      .catch(() => {})
  }, [symbol])

  useEffect(() => {
    let cancelled = false
    setWidgetReady(false)
    setError(null)

    const loadWidget = async () => {
      if (!window.TradingView) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[data-tv-widget="1"]') as HTMLScriptElement | null
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true })
            existing.addEventListener('error', () => reject(new Error('TradingView script failed to load')), { once: true })
            return
          }
          const script = document.createElement('script')
          script.src = 'https://s3.tradingview.com/tv.js'
          script.async = true
          script.dataset.tvWidget = '1'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('TradingView script failed to load'))
          document.head.appendChild(script)
        })
      }

      if (cancelled || !window.TradingView) return

      const mountNode = document.getElementById(widgetIdRef.current)
      if (!mountNode) return
      mountNode.innerHTML = ''

      new window.TradingView.widget({
        autosize: true,
        symbol: `BINANCE:${pair}`,
        interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        allow_symbol_change: true,
        container_id: widgetIdRef.current,
      })

      if (!cancelled) setWidgetReady(true)
    }

    loadWidget().catch((e) => {
      if (!cancelled) setError((e as Error).message || 'Unable to load TradingView widget')
    })

    return () => {
      cancelled = true
    }
  }, [pair, interval])

  const displayPrice = useMemo(() => {
    if (price == null) return '—'
    return price.toLocaleString('en-US', {
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: 8,
    })
  }, [price])

  return (
    <div style={{ padding: 16, paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{pair}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>TradingView Advanced Chart · BINANCE</p>
        </div>
      </div>

      <div style={{ background: '#090b10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 30, fontWeight: 800 }}>${displayPrice}</span>
            {change24h != null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: change24h >= 0 ? '#0ECB81' : '#F6465D', background: change24h >= 0 ? 'rgba(14,203,129,0.16)' : 'rgba(246,70,93,0.16)', padding: '2px 8px', borderRadius: 99 }}>
                {(change24h >= 0 ? '+' : '') + change24h.toFixed(2)}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {INTERVALS.map((i) => (
              <button
                key={i.value}
                type="button"
                onClick={() => setIntervalValue(i.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: interval === i.value ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
                  background: interval === i.value ? 'rgba(242,186,14,0.12)' : 'transparent',
                  color: interval === i.value ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', height: 420, borderRadius: 12, overflow: 'hidden', background: '#0a0e14', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div id={widgetIdRef.current} style={{ width: '100%', height: '100%' }} />
        </div>

        {!widgetReady && !error && <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>Loading chart widget...</div>}
        {error && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      </div>

      <Link href="/invest" style={{ display: 'block', width: '100%', padding: 14, background: 'var(--brand-primary)', color: '#000', borderRadius: 12, fontWeight: 800, fontSize: 15, textAlign: 'center', textDecoration: 'none' }} className="pressable">
        Invest in {symbol}
      </Link>
    </div>
  )
}
