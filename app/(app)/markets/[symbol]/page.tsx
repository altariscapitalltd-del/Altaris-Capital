'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
]

declare global {
  interface Window {
    LightweightCharts?: any
  }
}

function toCandle(kline: BinanceKline) {
  return {
    time: Math.floor(kline[0] / 1000),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
  }
}

export default function MarketChartPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = ((params?.symbol as string) || 'btc').toUpperCase()
  const pair = `${symbol}USDT`

  const chartWrapRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candlesRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [price, setPrice] = useState<number | null>(null)
  const [change24h, setChange24h] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    const setup = async () => {
      if (!window.LightweightCharts) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[data-tv-lightweight="1"]') as HTMLScriptElement | null
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true })
            existing.addEventListener('error', () => reject(new Error('Lightweight Charts failed to load')), { once: true })
            return
          }
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js'
          script.async = true
          script.dataset.tvLightweight = '1'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Lightweight Charts failed to load'))
          document.head.appendChild(script)
        })
      }

      if (disposed || !chartWrapRef.current || !window.LightweightCharts) return
      const { createChart, CrosshairMode, ColorType } = window.LightweightCharts
      const host = chartWrapRef.current

      const chart = createChart(host, {
        width: host.clientWidth,
        height: 330,
        layout: {
          background: { type: ColorType.Solid, color: '#090b10' },
          textColor: '#9aa4b5',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.06)' },
          horzLines: { color: 'rgba(255,255,255,0.06)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.10)',
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.10)',
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
      })

      const candles = chart.addCandlestickSeries({
        upColor: '#0ECB81',
        downColor: '#F6465D',
        borderUpColor: '#0ECB81',
        borderDownColor: '#F6465D',
        wickUpColor: '#0ECB81',
        wickDownColor: '#F6465D',
      })

      chartRef.current = chart
      candlesRef.current = candles

      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: host.clientWidth })
      })
      ro.observe(host)

      return () => ro.disconnect()
    }

    let cleanupResize: (() => void) | undefined
    setup().then((cleanup) => {
      cleanupResize = cleanup
    }).catch((e) => {
      setErr(e?.message || 'Chart library unavailable')
    })

    return () => {
      disposed = true
      cleanupResize?.()
      if (chartRef.current) chartRef.current.remove()
      chartRef.current = null
      candlesRef.current = null
    }
  }, [])

  useEffect(() => {
    let closed = false
    setLoading(true)
    setErr(null)

    fetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=1m&limit=200`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load Binance candles')
        const rows = (await res.json()) as BinanceKline[]
        const candles = rows.map(toCandle)
        if (closed) return
        candlesRef.current?.setData(candles)
        chartRef.current?.timeScale().fitContent()
        const last = candles[candles.length - 1]
        if (last) setPrice(last.close)
      })
      .catch((e) => {
        if (!closed) setErr(e?.message || 'Chart unavailable')
      })
      .finally(() => {
        if (!closed) setLoading(false)
      })

    return () => {
      closed = true
    }
  }, [pair])

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
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@kline_1m`)
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const k = msg?.k
        if (!k?.t) return
        const candle = {
          time: Math.floor(Number(k.t) / 1000),
          open: Number(k.o),
          high: Number(k.h),
          low: Number(k.l),
          close: Number(k.c),
        }
        candlesRef.current?.update(candle)
        setPrice(candle.close)
      } catch {
        // ignore malformed frame
      }
    }
    return () => ws.close()
  }, [pair])

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{pair}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>TradingView Lightweight Charts · Binance 1m live</p>
        </div>
      </div>

      <div style={{ background: '#090b10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 800 }}>${displayPrice}</span>
          {change24h != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: change24h >= 0 ? '#0ECB81' : '#F6465D', background: change24h >= 0 ? 'rgba(14,203,129,0.16)' : 'rgba(246,70,93,0.16)', padding: '2px 8px', borderRadius: 99 }}>
              {(change24h >= 0 ? '+' : '') + change24h.toFixed(2)}%
            </span>
          )}
        </div>
        <div ref={chartWrapRef} style={{ width: '100%', height: 330, borderRadius: 12, overflow: 'hidden' }} />
        {loading && <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>Loading last 200 candles…</div>}
        {err && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{err}</div>}
      </div>

      <Link href="/invest" style={{ display: 'block', width: '100%', padding: 14, background: 'var(--brand-primary)', color: '#000', borderRadius: 12, fontWeight: 800, fontSize: 15, textAlign: 'center', textDecoration: 'none' }} className="pressable">
        Invest in {symbol}
      </Link>
    </div>
  )
}
