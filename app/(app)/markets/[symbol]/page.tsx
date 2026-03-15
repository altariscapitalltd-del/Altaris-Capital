'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

declare global {
  interface Window {
    LightweightCharts?: any
  }
}

const TIMEFRAME_OPTIONS = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
]

const SYMBOL_OPTIONS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']

function ensureLightweightCharts() {
  if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts)

  return new Promise<any>((resolve, reject) => {
    const existing = document.querySelector('script[data-lwc="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(window.LightweightCharts))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js'
    script.async = true
    script.dataset.lwc = '1'
    script.onload = () => resolve(window.LightweightCharts)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function MarketChartPage() {
  const params = useParams()
  const initialPair = `${String(params?.symbol || 'btc').toUpperCase()}USDT`
  const defaultSymbol = SYMBOL_OPTIONS.includes(initialPair) ? initialPair : 'BTCUSDT'

  const [symbol, setSymbol] = useState(defaultSymbol)
  const [interval, setIntervalValue] = useState('1m')
  const [status, setStatus] = useState('Connecting…')

  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)

  useEffect(() => {
    let ro: ResizeObserver | null = null
    let disposed = false

    ;(async () => {
      try {
        const LWC = await ensureLightweightCharts()
        if (!containerRef.current || disposed) return

        const chart = LWC.createChart(containerRef.current, {
          layout: {
            background: { type: LWC.ColorType.Solid, color: '#090b10' },
            textColor: '#9ca3af',
          },
          width: containerRef.current.clientWidth,
          height: 420,
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.05)' },
          },
          rightPriceScale: { borderColor: 'rgba(255,255,255,0.12)' },
          timeScale: { borderColor: 'rgba(255,255,255,0.12)', timeVisible: true, secondsVisible: false },
          crosshair: { mode: 1 },
        })

        const candleSeries = chart.addCandlestickSeries({
          upColor: '#0ECB81',
          downColor: '#F6465D',
          borderVisible: false,
          wickUpColor: '#0ECB81',
          wickDownColor: '#F6465D',
        })

        chartRef.current = chart
        seriesRef.current = candleSeries

        ro = new ResizeObserver(() => {
          if (!containerRef.current || !chartRef.current) return
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
        })
        ro.observe(containerRef.current)
      } catch {
        setStatus('Failed to load chart library')
      }
    })()

    return () => {
      disposed = true
      ro?.disconnect()
      if (chartRef.current) chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    let socket: WebSocket | null = null
    let cancelled = false

    async function loadCandles() {
      if (!seriesRef.current) return
      setStatus('Loading candles…')
      try {
        const restUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`
        const res = await fetch(restUrl)
        if (!res.ok) throw new Error('Failed to load market history')

        const rows = await res.json()
        const candles = (rows as any[]).map((row: any[]) => ({
          time: Math.floor(Number(row[0]) / 1000),
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
        }))

        if (!cancelled && seriesRef.current) {
          seriesRef.current.setData(candles)
          chartRef.current?.timeScale().fitContent()
        }

        const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
        socket = new WebSocket(wsUrl)

        socket.onopen = () => !cancelled && setStatus('Live')
        socket.onerror = () => !cancelled && setStatus('WebSocket error')
        socket.onclose = () => !cancelled && setStatus('Disconnected')

        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data)
          const k = payload?.k
          if (!k || !seriesRef.current) return

          seriesRef.current.update({
            time: Math.floor(Number(k.t) / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
          })
        }
      } catch {
        if (!cancelled) setStatus('Unable to load chart data')
      }
    }

    const timer = setInterval(() => {
      if (seriesRef.current) {
        clearInterval(timer)
        loadCandles()
      }
    }, 80)

    return () => {
      cancelled = true
      clearInterval(timer)
      socket?.close()
    }
  }, [symbol, interval])

  const title = useMemo(() => `${symbol} · ${interval} · last 200 candles`, [symbol, interval])

  return (
    <div style={{ padding: '10px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>MARKETS</div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{title}</h1>
        </div>
        <Link href="/markets" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>Back</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 10 }}>
        <select className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {SYMBOL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={interval} onChange={(e) => setIntervalValue(e.target.value)}>
          {TIMEFRAME_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 10, color: status === 'Live' ? 'var(--success)' : 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
        {status}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#090b10', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', minHeight: 420 }} />
      </div>
    </div>
  )
}
