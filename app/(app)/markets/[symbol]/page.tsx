'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

declare global {
  interface Window {
    TradingView?: any
  }
}

function ensureTradingViewWidgetScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.TradingView?.widget) return resolve()
    const existing = document.querySelector('script[data-tv-widget="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('TradingView widget failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.dataset.tvWidget = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('TradingView widget failed to load'))
    document.head.appendChild(script)
  })
}

export default function MarketChartPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = ((params?.symbol as string) || 'btc').toUpperCase()
  const pair = `${symbol}USDT`

  const [price, setPrice] = useState<number | null>(null)
  const [change24h, setChange24h] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const mountId = `tv_chart_${pair.toLowerCase()}`
    let cancelled = false

    const mount = async () => {
      setLoading(true)
      setError(null)

      try {
        await ensureTradingViewWidgetScript()
        if (cancelled || !window.TradingView?.widget) return

        const host = document.getElementById(mountId)
        if (host) host.innerHTML = ''

        new window.TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${pair}`,
          interval: '1',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0b0d12',
          hide_side_toolbar: false,
          allow_symbol_change: true,
          withdateranges: true,
          details: false,
          hotlist: false,
          studies: ['STD;EMA'],
          container_id: mountId,
        })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Chart unavailable')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    mount()
    return () => {
      cancelled = true
    }
  }, [pair])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    fetch('/api/market')
      .then((r) => r.json())
      .then((data) => {
        const info = data[symbol]
        if (!info) return
        setPrice(info.price ?? null)
        setChange24h(info.change24h ?? null)
      })
      .catch(() => {})
  }, [symbol])


  async function openChartFullscreen() {
    const host = document.getElementById(`tv_chart_${pair.toLowerCase()}`)
    if (!host) return
    setIsExpanded(true)
    try {
      const el = host.parentElement || host
      if (el.requestFullscreen) await el.requestFullscreen()
      const orientation = (screen.orientation as any)
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => {})
      }
    } catch {
      // ignore fullscreen failures on unsupported browsers
    }
  }

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
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>TradingView Widget · BINANCE live</p>
        </div>
      </div>

      <div style={{ background: '#090b10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: isExpanded ? 0 : 16, padding: 14, marginBottom: 16, position: isExpanded ? 'fixed' : 'relative', inset: isExpanded ? 0 : 'auto', zIndex: isExpanded ? 90 : 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 800 }}>${displayPrice}</span>
          {change24h != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: change24h >= 0 ? '#0ECB81' : '#F6465D', background: change24h >= 0 ? 'rgba(14,203,129,0.16)' : 'rgba(246,70,93,0.16)', padding: '2px 8px', borderRadius: 99 }}>
              {(change24h >= 0 ? '+' : '') + change24h.toFixed(2)}%
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button"
            onClick={openChartFullscreen}
            style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
{isFullscreen || isExpanded ? '⌗ Fullscreen active' : '⌗ Fullscreen'}
          </button>
        </div>

        <div id={`tv_chart_${pair.toLowerCase()}`} style={{ width: '100%', height: isExpanded ? 'calc(100dvh - 170px)' : 360, borderRadius: isExpanded ? 0 : 12, overflow: 'hidden' }} />

        {isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            style={{ marginTop: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Exit fullscreen
          </button>
        )}

        {loading && <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>Loading TradingView chart…</div>}
        {error && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      </div>

      <Link href="/invest" style={{ display: 'block', width: '100%', padding: 14, background: 'var(--brand-primary)', color: '#000', borderRadius: 12, fontWeight: 800, fontSize: 15, textAlign: 'center', textDecoration: 'none' }} className="pressable">
        Invest in {symbol}
      </Link>
    </div>
  )
}
