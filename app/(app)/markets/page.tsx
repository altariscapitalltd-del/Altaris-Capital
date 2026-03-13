'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function Sparkline({ data, color, width=60, height=28 }: { data:number[], color:string, width?:number, height?:number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio||1; canvas.width=width*dpr; canvas.height=height*dpr; ctx.scale(dpr,dpr)
    if (data.length === 0) return
    const min=Math.min(...data),max=Math.max(...data),range=max-min||1
    const xs=data.map((_,i)=>(i/(data.length-1))*width)
    const ys=data.map(v=>height-((v-min)/range)*(height-4)-2)
    const grad=ctx.createLinearGradient(0,0,0,height)
    grad.addColorStop(0,color+'28'); grad.addColorStop(1,color+'00')
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.lineTo(xs[xs.length-1],height); ctx.lineTo(xs[0],height); ctx.closePath()
    ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke()
  },[data,color,width,height])
  return <canvas ref={canvasRef} style={{width,height,display:'block'}}/>
}

type Coin = {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  change24h: number
  volumeFormatted: string
  marketCapRank: number
  spark: number[]
}

const RANK_TABS = [
  { id: 'all', label: 'All', type: 'all' as const },
  { id: 'gainers', label: 'Gainers', type: 'gainers' as const },
  { id: 'losers', label: 'Losers', type: 'losers' as const },
  { id: 'top_10', label: 'Top 10', type: 'rank' as const, rank: 10 },
  { id: 'top_20', label: 'Top 20', type: 'rank' as const, rank: 20 },
  { id: 'top_50', label: 'Top 50', type: 'rank' as const, rank: 50 },
  { id: 'top_100', label: 'Top 100', type: 'rank' as const, rank: 100 },
]

export default function MarketsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = (searchParams?.get('q') || '').trim().toLowerCase()

  const [list, setList] = useState<Coin[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)

  const fetchList = useCallback(async (categoryId?: string) => {
    setLoading(true)
    const url = categoryId
      ? `/api/markets/list?category_id=${encodeURIComponent(categoryId)}&per_page=100`
      : '/api/markets/list?per_page=100'
    const res = await fetch(url)
    const data = await res.json().catch(() => ({ list: [] }))
    setList(data.list || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/markets/categories')
      .then(r => r.json())
      .then(d => { setCategories(d.categories || []); setLoadingCategories(false) })
      .catch(() => setLoadingCategories(false))
  }, [])

  useEffect(() => {
    const isCategoryTab = tab && !RANK_TABS.some(t => t.id === tab)
    if (isCategoryTab) fetchList(tab)
    else fetchList()
  }, [tab, fetchList])

  const filtered = list
    .filter(c => {
      if (!q) return true
      return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    })
    .filter(c => {
      const r = RANK_TABS.find(t => t.id === tab)
      if (!r) return true
      if (r.type === 'gainers') return c.change24h > 0
      if (r.type === 'losers') return c.change24h < 0
      if (r.type === 'rank' && r.rank) return c.marketCapRank <= r.rank
      return true
    })
    .sort((a, b) => {
      if (tab === 'gainers') return b.change24h - a.change24h
      if (tab === 'losers') return a.change24h - b.change24h
      return a.marketCapRank - b.marketCapRank
    })

  const allTabs = [...RANK_TABS, ...categories.map(c => ({ id: c.id, label: c.name, type: 'category' as const }))]

  return (
    <div style={{ padding: '0 0 12px' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Markets</h1>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
          {allTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`chip ${tab === t.id ? 'active' : ''}`}
              style={{ flexShrink: 0 }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto 70px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
          {['Asset', 'Price', '24h', ''].map(h => (
            <span key={h} style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
        ) : (
          <>
            {filtered.map(coin => (
              <div
                key={coin.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/markets/${coin.symbol.toLowerCase()}`)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/markets/${coin.symbol.toLowerCase()}`) } }}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto auto 70px', gap: 8, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                className="pressable"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {coin.image ? (
                    <img src={coin.image} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#F2BA0E', flexShrink: 0 }}>{coin.symbol.slice(0, 3)}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{coin.symbol}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{coin.name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    ${coin.price < 0.01 ? coin.price.toFixed(6) : coin.price.toLocaleString('en-US', { minimumFractionDigits: coin.price < 1 ? 4 : coin.price < 100 ? 2 : 0, maximumFractionDigits: 8 })}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Vol {coin.volumeFormatted}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: coin.change24h >= 0 ? 'var(--success)' : 'var(--danger)', background: coin.change24h >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', padding: '4px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {(coin.change24h >= 0 ? '+' : '') + coin.change24h.toFixed(2)}%
                  </span>
                </div>
                <Sparkline data={coin.spark.length ? coin.spark : [coin.price, coin.price]} color={coin.change24h >= 0 ? '#0ECB81' : '#F6465D'} width={70} height={30} />
              </div>
            ))}

            {!loading && filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                {q ? `No coins match "${q}"` : 'No coins in this category'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
