'use client'
import { useEffect, useMemo, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

function Sparkline({ data, color, width=80, height=32 }: { data:number[], color:string, width?:number, height?:number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio||1; canvas.width=width*dpr; canvas.height=height*dpr; ctx.scale(dpr,dpr)
    const min=Math.min(...data),max=Math.max(...data),range=max-min||1
    const xs=data.map((_,i)=>(i/(data.length-1))*width); const ys=data.map(v=>height-((v-min)/range)*(height-4)-2)
    const grad=ctx.createLinearGradient(0,0,0,height); grad.addColorStop(0,color+'30'); grad.addColorStop(1,color+'00')
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.lineTo(xs[xs.length-1],height); ctx.lineTo(xs[0],height); ctx.closePath(); ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i])
    ctx.strokeStyle=color; ctx.lineWidth=1.8; ctx.lineJoin='round'; ctx.stroke()
  },[data,color,width,height])
  return <canvas ref={canvasRef} style={{width,height,display:'block'}}/>
}

function RiskBar({ level }: { level: number }) {
  const colors = ['#0ECB81','#0ECB81','#F2BA0E','#FF6B35','#F6465D']
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{ width:10, height:4, borderRadius:2, background: i<=level ? colors[level-1] : 'var(--bg-elevated)' }}/>
      ))}
    </div>
  )
}

type PlanType = {
  id: string
  name: string
  class: string
  icon: string
  iconBg: string
  daily: number
  roi: string
  dur: number
  min: number
  risk: number
  investors: number
  spots: number | null
  badge: string | null
  spark: number[]
  image?: string
  change24h?: number
}

function InvestContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'marketplace' | 'my'>( (searchParams.get('tab') as any) || 'marketplace')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<PlanType | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type:'success'|'error', text:string } | null>(null)
  const [userInvestments, setUserInvestments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [liveAssets, setLiveAssets] = useState<any[]>([])
  const [liveHot, setLiveHot] = useState<any[]>([])
  const [fetchingLive, setFetchingLive] = useState(true)

  useBodyScrollLock(sheetOpen)

  const categories = ['All', 'Crypto', 'DeFi', 'Stocks', 'Real Estate', 'Bonds', 'Fixed Income', 'Commodities', 'Forex', 'ETF', 'Hedge']

  useEffect(() => {
    setFetchingLive(true)
    fetch(`/api/markets/live?category=${category}`)
      .then(r => r.json())
      .then(data => {
        const mapped = (data.assets || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          class: a.category,
          icon: a.symbol,
          iconBg: '#111',
          daily: parseFloat(a.dailyReturn),
          roi: `${a.annualReturn}%`,
          dur: a.category === 'Crypto' ? 14 : a.category === 'Stocks' ? 90 : 180,
          min: a.minInvestment,
          risk: a.riskLevel,
          investors: Math.floor(Math.random() * 10000) + 500,
          spots: null,
          badge: a.change24h > 5 ? 'Hot' : null,
          spark: a.spark && a.spark.length > 0 ? a.spark : Array.from({length: 20}, () => Math.random() * 100),
          image: a.image,
          change24h: a.change24h
        }))
        setLiveAssets(mapped)
        if (category === 'All') {
          setLiveHot(mapped.filter((a: any) => Math.abs(a.change24h) > 3).slice(0, 10))
        }
        setFetchingLive(false)
      })
      .catch(() => setFetchingLive(false))
  }, [category])

  useEffect(() => {
    if (tab === 'my') {
      fetch('/api/user/investments').then(r => r.json()).then(d => {
        setUserInvestments(d.investments || [])
        setSummary(d.summary)
      })
    }
  }, [tab])

  function openInvestSheet(plan: PlanType) {
    setSelected(plan)
    setAmount(String(plan.min))
    setSheetOpen(true)
  }

  function closeInvestSheet() {
    setSheetOpen(false)
    setTimeout(() => { setSelected(null); setAmount(''); setMsg(null) }, 250)
  }

  async function invest() {
    if (!selected || !amount || loading) return
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected.id, amount: parseFloat(amount) })
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Investment failed' }) }
      else {
        setMsg({ type: 'success', text: 'Investment successful! Redirecting...' })
        setTimeout(() => { closeInvestSheet(); setTab('my') }, 1500)
      }
    } catch { setMsg({ type: 'error', text: 'Network error' }) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '6px 16px 22px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Invest</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Grow your wealth with expert plans</div>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button onClick={() => setTab('marketplace')} style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', background: tab === 'marketplace' ? 'var(--bg-elevated)' : 'transparent', color: tab === 'marketplace' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all .2s' }}>Market</button>
          <button onClick={() => setTab('my')} style={{ padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', background: tab === 'my' ? 'var(--bg-elevated)' : 'transparent', color: tab === 'my' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all .2s' }}>My Plans</button>
        </div>
      </div>

      {tab === 'marketplace' ? (
        <div>
          {/* ── Categories ── */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, marginBottom: 4, scrollbarWidth: 'none' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: category === c ? 'var(--brand-primary)' : 'var(--bg-card)', color: category === c ? '#000' : 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all .2s' }}>{c}</button>
            ))}
          </div>

          {/* ── HOT Section ── */}
          {category === 'All' && liveHot.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>HOT TRENDING</div>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
                {liveHot.map(plan => (
                  <div key={plan.id} onClick={() => openInvestSheet(plan)} style={{ minWidth: 160, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, cursor: 'pointer' }} className="pressable">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${plan.iconBg}1A`, border: `1px solid ${plan.iconBg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={plan.image} alt={plan.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--brand-primary)' }}>{plan.daily}%</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>DAILY</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.name}</div>
                    <Sparkline data={plan.spark} color={plan.change24h >= 0 ? '#0ECB81' : '#F6465D'} width={132} height={32} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Plans List ── */}
          <div style={{ display: 'grid', gap: 12 }}>
            {fetchingLive ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading live market data...</div>
            ) : (
              liveAssets.map(plan => (
                <div key={plan.id} onClick={() => openInvestSheet(plan)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden' }} className="pressable">
                  {plan.badge && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--brand-primary)', color: '#000', fontSize: 9, fontWeight: 900, padding: '3px 10px', borderRadius: '0 0 0 10px', textTransform: 'uppercase' }}>{plan.badge}</div>}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${plan.iconBg}1A`, border: `1px solid ${plan.iconBg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={plan.image} alt={plan.name} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', background: 'rgba(14,203,129,0.1)', padding: '1px 6px', borderRadius: 4 }}>{plan.class}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.name}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-primary)', lineHeight: 1 }}>{plan.daily}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>DAILY</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, alignItems: 'flex-end' }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>Duration</div><div style={{ fontWeight: 700, fontSize: 13 }}>{plan.dur}d</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>Min</div><div style={{ fontWeight: 700, fontSize: 13 }}>${plan.min}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>Annual ROI</div><div style={{ fontWeight: 700, fontSize: 13 }}>{plan.roi}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 4 }}>Risk Level</div><RiskBar level={plan.risk} /></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── My Plans Tab ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {userInvestments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Active Investments</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Start investing to grow your portfolio</div>
              <button onClick={() => setTab('marketplace')} style={{ padding: '12px 28px', background: 'var(--brand-primary)', color: '#000', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Browse Plans</button>
            </div>
          ) : (
            <>
              {summary && (
                <div style={{ background: 'linear-gradient(135deg,rgba(242,186,14,0.12),rgba(14,203,129,0.08))', border: '1px solid rgba(242,186,14,0.2)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>PORTFOLIO OVERVIEW</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Total Invested</div><div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-primary)' }}>${summary.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Total Value</div><div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-primary)' }}>${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Profit Earned</div><div style={{ fontWeight: 800, fontSize: 16, color: '#0ECB81' }}>+${summary.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Daily Earning</div><div style={{ fontWeight: 800, fontSize: 16, color: '#F2BA0E' }}>+${summary.dailyEarning.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day</div></div>
                  </div>
                </div>
              )}
              {userInvestments.map((inv: any) => (
                <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div><div style={{ fontWeight: 800, fontSize: 15 }}>{inv.planName}</div><div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{(inv.dailyRoi * 100).toFixed(2)}% daily ROI · {inv.totalDurationDays}d plan</div></div>
                    <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: inv.status === 'COMPLETED' ? 'rgba(14,203,129,0.1)' : inv.status === 'ACTIVE' ? 'rgba(242,186,14,0.1)' : 'rgba(246,70,93,0.1)', color: inv.status === 'COMPLETED' ? '#0ECB81' : inv.status === 'ACTIVE' ? '#F2BA0E' : '#F6465D', border: `1px solid ${inv.status === 'COMPLETED' ? 'rgba(14,203,129,0.2)' : inv.status === 'ACTIVE' ? 'rgba(242,186,14,0.2)' : 'rgba(246,70,93,0.2)'}` }}>{inv.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Invested</div><div style={{ fontWeight: 800, fontSize: 17 }}>${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                    <div style={{ background: inv.hasStartedEarning ? 'rgba(14,203,129,0.07)' : 'rgba(242,186,14,0.07)', border: `1px solid ${inv.hasStartedEarning ? 'rgba(14,203,129,0.15)' : 'rgba(242,186,14,0.15)'}`, borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Profit Earned</div>{inv.hasStartedEarning ? <div style={{ fontWeight: 800, fontSize: 17, color: '#0ECB81' }}>+${inv.profitEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div> : <div style={{ fontWeight: 700, fontSize: 13, color: '#F2BA0E' }}>Starts in {inv.hoursUntilProfit}h</div>}</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 6 }}><div style={{ height: '100%', background: `linear-gradient(90deg,#F2BA0E,${inv.hasStartedEarning ? '#0ECB81' : '#F2BA0E'})`, width: `${inv.progressPct || 0}%`, borderRadius: 99, transition: 'width .5s' }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}><span>{Math.round(inv.progressPct || 0)}% complete</span><span>{inv.status === 'COMPLETED' ? 'Completed' : `${Math.ceil(inv.daysRemaining || 0)}d remaining`}</span></div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Invest Modal ── */}
      {selected && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 120, transition: 'opacity .25s ease', opacity: sheetOpen ? 1 : 0 }} onClick={e => { if (e.target === e.currentTarget) closeInvestSheet() }}>
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(78px + env(safe-area-inset-bottom))', margin: '0 auto', transform: `translateY(${sheetOpen ? '0%' : '110%'})`, transition: 'transform .25s ease', background: 'var(--bg-card)', borderRadius: '20px 20px 16px 16px', width: 'calc(100% - 16px)', maxWidth: 480, border: '1px solid var(--border)', maxHeight: 'calc(100svh - 110px - env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px 0' }}><div style={{ width: 40, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, margin: '0 auto 14px' }} /></div>
            <div style={{ padding: '0 24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${selected.iconBg}1A`, border: `1px solid ${selected.iconBg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><img src={selected.image} alt={selected.name} style={{ width: 28, height: 28, objectFit: 'contain' }} /></div>
                <div><div style={{ fontWeight: 800, fontSize: 18 }}>{selected.name}</div><div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{selected.class} · {selected.dur} days · {selected.daily}% daily</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[{ l: 'Daily ROI', v: `${selected.daily}%`, c: 'var(--brand-primary)' }, { l: 'Annual ROI', v: selected.roi }, { l: 'Min', v: `$${selected.min}` }].map(({ l, v, c }) => (
                  <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12, textAlign: 'center' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>{l}</div><div style={{ fontWeight: 800, fontSize: 16, color: c || 'var(--text-primary)' }}>{v}</div></div>
                ))}
              </div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 7 }}>Investment Amount (USD)</label>
              <div style={{ position: 'relative', marginBottom: 14 }}><span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 18 }}>$</span><input style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '14px 14px 14px 34px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 22, fontWeight: 800, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="number" value={amount} onChange={e => { setAmount(e.target.value); setMsg(null) }} /></div>
              <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>{[selected.min, selected.min * 2, selected.min * 5, selected.min * 10].map(v => (<button key={v} onClick={() => setAmount(String(v))} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>${v.toLocaleString()}</button>))}</div>
              {amount && parseFloat(amount) >= selected.min && (
                <div style={{ background: 'rgba(14,203,129,0.05)', border: '1px solid rgba(14,203,129,0.15)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8, fontWeight: 600 }}>PROFIT ESTIMATE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Daily Profit</div><div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 16, marginTop: 2 }}>+${(parseFloat(amount) * selected.daily / 100).toFixed(2)}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Total Return</div><div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 16, marginTop: 2 }}>+${(parseFloat(amount) * selected.daily / 100 * selected.dur).toFixed(2)}</div></div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 24px calc(env(safe-area-inset-bottom) + 14px)', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {msg && <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 14, fontSize: 13, fontWeight: 600, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button onClick={closeInvestSheet} style={{ padding: '14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={invest} disabled={loading || !amount || parseFloat(amount) < selected.min} style={{ padding: '14px', background: '#F2BA0E', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Investing...' : `Invest $${parseFloat(amount || '0').toLocaleString()}`}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export default function InvestPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20, color: '#fff' }}>Loading marketplace...</div>}>
      <InvestContent />
    </Suspense>
  )
}
