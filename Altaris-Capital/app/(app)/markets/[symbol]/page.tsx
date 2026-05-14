'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, ChevronDown, MoreHorizontal, Send, TrendingDown, TrendingUp } from 'lucide-react'

type RangeKey = '1H' | '1D' | '1W' | '1M' | '1Y'

type MarketInfo = {
  symbol: string
  name: string
  price: number
  change24h: number
  spark: number[]
}

const RANGES: RangeKey[] = ['1H', '1D', '1W', '1M', '1Y']

const FALLBACK_SERIES = [80220, 80192, 80244, 80150, 80098, 80120, 80072, 79990, 80032, 79944, 80012, 79970, 79900, 79882, 79918, 79840, 79896, 79870, 79818, 79856, 79802, 79792]

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  })}`
}

function AssetChart({ data, negative }: { data: number[]; negative: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const color = negative ? '#F6465D' : '#0ECB81'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth || 340
    const height = canvas.clientHeight || 260
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const points = data.length > 1 ? data : FALLBACK_SERIES
    const padX = 8
    const padY = 22
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const xs = points.map((_, i) => padX + (i / (points.length - 1)) * (width - padX * 2))
    const ys = points.map(v => padY + (1 - (v - min) / range) * (height - padY * 2))

    ctx.strokeStyle = 'rgba(255,255,255,0.045)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i += 1) {
      const y = padY + (i / 3) * (height - padY * 2)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    const fill = ctx.createLinearGradient(0, 0, 0, height)
    fill.addColorStop(0, `${color}24`)
    fill.addColorStop(0.72, `${color}06`)
    fill.addColorStop(1, `${color}00`)
    ctx.beginPath()
    ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i += 1) ctx.lineTo(xs[i], ys[i])
    ctx.lineTo(xs[xs.length - 1], height)
    ctx.lineTo(xs[0], height)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i += 1) {
      const midX = (xs[i - 1] + xs[i]) / 2
      ctx.bezierCurveTo(midX, ys[i - 1], midX, ys[i], xs[i], ys[i])
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = `${color}66`
    ctx.shadowBlur = 12
    ctx.stroke()
    ctx.shadowBlur = 0

    const lastX = xs[xs.length - 1]
    const lastY = ys[ys.length - 1]
    ctx.fillStyle = '#0b0f18'
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }, [data, color])

  return <canvas ref={canvasRef} aria-label="Asset price chart" style={{ width: '100%', height: 190, display: 'block' }} />
}

function ActionButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="trade-action pressable">
        <div className="trade-action-icon">{icon}</div>
        <span>{label}</span>
      </div>
    </Link>
  )
}

export default function MarketChartPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = ((params?.symbol as string) || 'btc').toUpperCase()
  const [range, setRange] = useState<RangeKey>('1D')
  const [market, setMarket] = useState<MarketInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/markets/list?per_page=100')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const found = (data.list || []).find((c: any) => String(c.symbol).toUpperCase() === symbol)
        if (found) {
          setMarket({
            symbol,
            name: found.name || symbol,
            price: Number(found.price || 0),
            change24h: Number(found.change24h || 0),
            spark: Array.isArray(found.spark) ? found.spark.map(Number).filter(Boolean) : [],
          })
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol])

  const baseSeries = market?.spark?.length ? market.spark : FALLBACK_SERIES
  const series = useMemo(() => {
    const multiplier = range === '1H' ? 0.25 : range === '1D' ? 1 : range === '1W' ? 1.8 : range === '1M' ? 2.8 : 4
    return baseSeries.map((value, index) => value * (1 + Math.sin(index / 3) * 0.002 * multiplier))
  }, [baseSeries, range])

  const price = market?.price || series[series.length - 1] || null
  const first = series[0] || price || 0
  const last = series[series.length - 1] || price || 0
  const absoluteChange = last - first
  const percentChange = first ? (absoluteChange / first) * 100 : (market?.change24h || 0)
  const negative = percentChange < 0
  const chainLabel = symbol === 'BTC' ? 'Native SegWit' : symbol === 'ETH' ? 'Ethereum Network' : 'Spot Market'

  return (
    <main className="trade-screen">
      <header className="trade-topbar">
        <button type="button" onClick={() => router.back()} className="trade-icon-button" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="trade-title">
          <div>{symbol}</div>
          <span>{chainLabel}</span>
        </div>
        <button type="button" className="trade-icon-button" aria-label="More market actions">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <section className="trade-hero" aria-busy={loading}>
        <div className="trade-value-label">{market?.name || `${symbol} portfolio`}</div>
        <div className="trade-value">{formatCurrency(price)}</div>
        <div className={negative ? 'trade-change negative' : 'trade-change positive'}>
          {absoluteChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(absoluteChange)).replace('$', '$')} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
        </div>
      </section>

      <section className="trade-chart-card">
        <AssetChart data={series} negative={negative} />
        <div className="trade-range-row" role="tablist" aria-label="Chart time range">
          {RANGES.map(item => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={range === item}
              onClick={() => setRange(item)}
              className={range === item ? 'active' : ''}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="trade-primary-actions" aria-label="Trading actions">
        <Link href="/invest" className="trade-buy pressable">Buy</Link>
        <Link href="/wallet" className="trade-sell pressable">Sell</Link>
      </section>

      <section className="trade-secondary-actions" aria-label="Quick actions">
        <ActionButton href="/wallet" label="Send" icon={<Send size={18} />} />
        <ActionButton href="/invest" label="Long" icon={<TrendingUp size={18} />} />
        <ActionButton href="/invest" label="Short" icon={<TrendingDown size={18} />} />
        <ActionButton href="/markets" label="More" icon={<ChevronDown size={18} />} />
      </section>

      <section className="trade-info-card">
        <div>
          <span>Market</span>
          <strong>{symbol}/USDT</strong>
        </div>
        <div>
          <span>24h change</span>
          <strong className={Number(market?.change24h || percentChange) >= 0 ? 'positive-text' : 'negative-text'}>
            {Number(market?.change24h || percentChange) >= 0 ? '+' : ''}{Number(market?.change24h || percentChange).toFixed(2)}%
          </strong>
        </div>
        <div>
          <span>Chart type</span>
          <strong><BarChart3 size={14} /> Live line</strong>
        </div>
      </section>
    </main>
  )
}
