'use client'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

// ── Skeleton shimmer card ──────────────────────────────────────────────────
function PlanSkeleton() {
  return (
    <div style={{ borderRadius: 18, background: 'linear-gradient(180deg,#0D0E12,#080910)', border: '1px solid rgba(255,255,255,0.05)', padding: 18, overflow: 'hidden', position: 'relative', height: 110 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,transparent 20%,rgba(201,162,39,0.05) 38%,transparent 52%)', backgroundSize: '200% 100%', animation: 'shimmer 1.8s infinite' }} />
      <div style={{ position: 'absolute', top: 18, left: 18, width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', top: 22, left: 72, right: 80, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: 40, left: 72, right: 120, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18, height: 2, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

// ── Risk dots ──────────────────────────────────────────────────────────────
function RiskDots({ level }: { level: number }) {
  const color = level <= 1 ? '#0ECB81' : level <= 2 ? '#4ADE80' : level === 3 ? '#C9A227' : level === 4 ? '#FF6B35' : '#F6465D'
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= level ? color : 'rgba(255,255,255,0.12)' }} />)}
    </div>
  )
}

// ── CoinIcon wrapper ───────────────────────────────────────────────────────
function CoinLogo({ symbol, image, size = 44 }: { symbol: string; image?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const colors: Record<string, string> = { BTC:'#F7931A', ETH:'#627EEA', USDT:'#26A17B', USDC:'#2775CA', SOL:'#14F195', BNB:'#F3BA2F', XRP:'#00AAE4', ADA:'#0033AD', DOGE:'#C2A633', XAU:'#FFD700', SPX:'#1DB954', BOND:'#64748B', TRX:'#EB0029', LTC:'#BFBBBB' }
  const bg = colors[symbol.toUpperCase()] || '#555'
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: `${bg}18`, border: `1.5px solid ${bg}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {image && !err
        ? <img src={image} alt={symbol} onError={() => setErr(true)} style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }} />
        : <span style={{ fontWeight: 900, fontSize: Math.round(size * 0.35), color: bg }}>{symbol.slice(0,3)}</span>}
    </div>
  )
}

type DbPlan = {
  id: string
  name: string
  description?: string | null
  category: string
  symbol: string
  image?: string | null
  dailyRoi: number
  duration: number
  minDeposit: number
  riskLevel: number
  badge?: string | null
  isActive: boolean
  sortOrder: number
}

const RISK_GROUPS = [
  { label: 'Conservative', max: 1, color: '#0ECB81' },
  { label: 'Balanced',     max: 2, color: '#4ADE80' },
  { label: 'Growth',       max: 3, color: '#C9A227' },
  { label: 'Aggressive',   max: 4, color: '#FF6B35' },
  { label: 'High Risk',    max: 5, color: '#F6465D' },
]

function riskLabel(level: number) { return RISK_GROUPS.find(g => level <= g.max)?.label || 'High Risk' }
function riskColor(level: number) { return RISK_GROUPS.find(g => level <= g.max)?.color || '#F6465D' }

function InvestContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'marketplace' | 'my'>((searchParams.get('tab') as any) || 'marketplace')
  const [category, setCategory] = useState('All')
  const [plans, setPlans] = useState<DbPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DbPlan | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [investing, setInvesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userInvestments, setUserInvestments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [coinImageMap, setCoinImageMap] = useState<Record<string, string>>({})

  useBodyScrollLock(sheetOpen)

  useEffect(() => {
    // Load plans + fetch coin images from market API in parallel
    Promise.all([
      fetch('/api/investments/plans').then(r => r.json()).catch(() => ({ plans: [] })),
      fetch('/api/markets/list?per_page=100').then(r => r.json()).catch(() => ({ list: [] })),
    ]).then(([plansData, mktData]) => {
      setPlans(plansData.plans || [])
      setLoading(false)
      const imgMap: Record<string, string> = {}
      ;(mktData.list || []).forEach((c: any) => {
        if (c.symbol && c.image) imgMap[String(c.symbol).toUpperCase()] = c.image
      })
      setCoinImageMap(imgMap)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'my') {
      fetch('/api/investments').then(r => r.json()).then(d => {
        setUserInvestments(d.investments || [])
        setSummary(d.summary)
      })
    }
  }, [tab])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(plans.map(p => p.category)))
    return ['All', ...cats]
  }, [plans])

  const filtered = useMemo(() => {
    if (category === 'All') return plans
    return plans.filter(p => p.category === category)
  }, [plans, category])

  function openSheet(plan: DbPlan) {
    setSelected(plan); setAmount(String(plan.minDeposit)); setMsg(null); setSheetOpen(true)
  }
  function closeSheet() {
    setSheetOpen(false)
    setTimeout(() => { setSelected(null); setAmount(''); setMsg(null) }, 280)
  }

  async function invest() {
    if (!selected || !amount || investing) return
    const amt = parseFloat(amount)
    if (!amt || amt < selected.minDeposit) { setMsg({ type: 'error', text: `Minimum is $${selected.minDeposit}` }); return }
    setInvesting(true); setMsg(null)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected.id, planName: selected.name, amount: amt, dailyRoi: selected.dailyRoi }),
      })
      const data = await res.json()
      if (!res.ok) setMsg({ type: 'error', text: data.error || 'Investment failed' })
      else { setMsg({ type: 'success', text: 'Investment activated!' }); setTimeout(() => { closeSheet(); setTab('my') }, 1400) }
    } catch { setMsg({ type: 'error', text: 'Network error' }) }
    finally { setInvesting(false) }
  }

  async function claimInvestment(invId: string) {
    setClaimingId(invId)
    try {
      const res = await fetch(`/api/investments/${invId}/withdraw`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setClaimedIds(prev => new Set(prev).add(invId))
        setMsg({ type: 'success', text: `$${data.transferred?.toFixed(2) ?? '—'} transferred to wallet` })
        fetch('/api/investments').then(r => r.json()).then(d => { setUserInvestments(d.investments || []); setSummary(d.summary) })
      } else setMsg({ type: 'error', text: data.error || 'Transfer failed' })
    } catch { setMsg({ type: 'error', text: 'Network error' }) }
    finally { setClaimingId(null) }
  }

  return (
    <div style={{ padding: '6px 16px 24px' }}>

      {/* ── Tab toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, marginBottom: 2 }}>Invest</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Grow your wealth with curated plans</div>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 3, borderRadius: 12, border: '1px solid var(--border)', gap: 2 }}>
          {(['marketplace', 'my'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', background: tab === t ? 'var(--bg-elevated)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s' }}>
              {t === 'marketplace' ? 'Market' : 'My Plans'}
            </button>
          ))}
        </div>
      </div>

      {msg && tab === 'marketplace' && <div className="msg-inline" style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}

      {tab === 'marketplace' ? (
        <div>
          {/* ── Category chips ── */}
          {categories.length > 2 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 4, scrollbarWidth: 'none' }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{ padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1px solid ${category === c ? '#C9A227' : 'var(--border)'}`, background: category === c ? 'rgba(201,162,39,0.12)' : 'var(--bg-card)', color: category === c ? '#C9A227' : 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{c}</button>
              ))}
            </div>
          )}

          {/* ── Plans grid ── */}
          <div style={{ display: 'grid', gap: 12 }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <PlanSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No plans in this category</div>
            ) : filtered.map(plan => {
              const dailyPct = (plan.dailyRoi * 100).toFixed(2)
              const annualPct = Math.round(plan.dailyRoi * 365 * 100)
              return (
                <button key={plan.id} onClick={() => openSheet(plan)} className="pressable" style={{ width: '100%', background: 'linear-gradient(180deg,#0E1014,#0A0B0E)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 16px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: plan.badge === 'Hot' ? '#F6465D' : plan.badge === 'Popular' || plan.badge === 'Most Popular' ? '#C9A227' : '#0ECB81', color: '#000', fontSize: 9, fontWeight: 900, padding: '4px 11px', borderRadius: '0 18px 0 10px', letterSpacing: '0.06em' }}>{plan.badge.toUpperCase()}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <CoinLogo symbol={plan.symbol} image={plan.image || coinImageMap[plan.symbol.toUpperCase()] || undefined} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: riskColor(plan.riskLevel), background: `${riskColor(plan.riskLevel)}18`, padding: '2px 7px', borderRadius: 4 }}>{plan.category}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.name}</div>
                      {plan.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#C9A227', letterSpacing: '-0.02em', lineHeight: 1 }}>{dailyPct}%</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2, letterSpacing: '0.06em' }}>DAILY</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 3 }}>DURATION</div><div style={{ fontWeight: 700, fontSize: 13 }}>{plan.duration}d</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 3 }}>MIN</div><div style={{ fontWeight: 700, fontSize: 13 }}>${plan.minDeposit}</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 3 }}>ANNUAL</div><div style={{ fontWeight: 700, fontSize: 13 }}>{annualPct}%</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 5 }}>RISK</div><RiskDots level={plan.riskLevel} /></div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── My Plans ── */
        (() => {
          const active = userInvestments.filter((i: any) => i.status === 'ACTIVE')
          const history = userInvestments.filter((i: any) => i.status !== 'ACTIVE')

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {msg && <div className="msg-inline" style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}

              {userInvestments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Investments Yet</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Start investing to grow your portfolio</div>
                  <button onClick={() => setTab('marketplace')} style={{ padding: '12px 28px', background: '#C9A227', color: '#000', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Browse Plans</button>
                </div>
              )}

              {active.length > 0 && summary && (
                <div style={{ background: 'linear-gradient(135deg,rgba(201,162,39,0.16),rgba(12,16,24,0.97))', border: '1px solid rgba(201,162,39,0.22)', borderRadius: 22, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', marginBottom: 10 }}>PLAN DASHBOARD</div>
                  <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>${summary.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>Capital + profit</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { l: 'Invested', v: `$${summary.totalInvested?.toFixed(2)}`, c: '#fff' },
                      { l: 'Earned', v: `+$${summary.totalProfit?.toFixed(2)}`, c: '#0ECB81' },
                      { l: 'Daily', v: `+$${summary.dailyEarning?.toFixed(2)}/d`, c: '#C9A227' },
                      { l: 'Active Plans', v: summary.activeCount, c: '#fff' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 3 }}>{l}</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {active.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 4 }}>ACTIVE PLANS</div>
                  {active.map((inv: any) => (
                    <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div><div style={{ fontWeight: 800, fontSize: 15 }}>{inv.planName}</div><div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{(inv.dailyRoi * 100).toFixed(2)}% daily · {inv.totalDurationDays}d plan</div></div>
                        <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: 'rgba(201,162,39,0.12)', color: '#C9A227', border: '1px solid rgba(201,162,39,0.25)' }}>ACTIVE</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>Invested</div>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>${inv.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div style={{ background: inv.hasStartedEarning ? 'rgba(14,203,129,0.07)' : 'rgba(201,162,39,0.07)', border: `1px solid ${inv.hasStartedEarning ? 'rgba(14,203,129,0.15)' : 'rgba(201,162,39,0.15)'}`, borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>Profit Earned</div>
                          {inv.hasStartedEarning
                            ? <div style={{ fontWeight: 800, fontSize: 18, color: '#0ECB81' }}>+${inv.profitEarned?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            : <div style={{ fontWeight: 700, fontSize: 13, color: '#C9A227' }}>Starts in {inv.hoursUntilProfit}h</div>}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 99, height: 5, overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#C9A227,#0ECB81)', width: `${inv.progressPct || 0}%`, borderRadius: 99 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>
                        <span>{Math.round(inv.progressPct || 0)}% complete</span>
                        <span>{Math.ceil(inv.daysRemaining || 0)}d remaining</span>
                      </div>
                      {(inv.status === 'COMPLETED' || (inv.endDate && new Date() >= new Date(inv.endDate))) && !claimedIds.has(inv.id) && (
                        <button onClick={() => claimInvestment(inv.id)} disabled={claimingId === inv.id}
                          style={{ marginTop: 12, width: '100%', padding: '12px', background: 'linear-gradient(135deg,#C9A227,#E4C25C)', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: claimingId === inv.id ? 'not-allowed' : 'pointer', opacity: claimingId === inv.id ? 0.7 : 1, fontFamily: 'inherit' }}>
                          {claimingId === inv.id ? 'Transferring...' : `Claim $${inv.totalValue?.toFixed(2)} to Wallet`}
                        </button>
                      )}
                      {claimedIds.has(inv.id) && <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: '#0ECB81', fontWeight: 700 }}>Transferred to wallet</div>}
                    </div>
                  ))}
                </>
              )}

              {history.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 8 }}>HISTORY</div>
                  {history.map((inv: any) => (
                    <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div><div style={{ fontWeight: 700, fontSize: 14 }}>{inv.planName}</div><div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{new Date(inv.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
                        <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: inv.status === 'COMPLETED' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', color: inv.status === 'COMPLETED' ? '#0ECB81' : '#F6465D', border: `1px solid ${inv.status === 'COMPLETED' ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)'}` }}>{inv.status}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { l: 'Invested', v: `$${inv.amount?.toFixed(2)}`, c: undefined },
                          { l: 'Profit', v: inv.status === 'COMPLETED' ? `+$${(inv.totalEarned || inv.profitEarned || 0).toFixed(2)}` : '—', c: '#0ECB81' },
                          { l: 'Total', v: inv.status === 'COMPLETED' ? `$${(inv.amount + (inv.totalEarned || 0)).toFixed(2)}` : '—', c: '#C9A227' },
                        ].map(({ l, v, c }) => (
                          <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>{l}</div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: c }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })()
      )}

      {/* ── Invest sheet ── */}
      {selected && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 120, opacity: sheetOpen ? 1 : 0, transition: 'opacity 0.22s ease' }}
          onClick={e => { if (e.target === e.currentTarget) closeSheet() }}>
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(78px + env(safe-area-inset-bottom))', margin: '0 auto', maxWidth: 480, width: 'calc(100% - 16px)', background: '#0D0E12', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '22px 22px 16px 16px', maxHeight: 'calc(100svh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: `translateY(${sheetOpen ? '0%' : '115%'})`, transition: `transform ${sheetOpen ? '0.38s cubic-bezier(0.32,0.72,0,1)' : '0.28s cubic-bezier(0.4,0,1,1)'}` }}>
            {/* Handle */}
            <div style={{ padding: '14px 24px 0', textAlign: 'center' }}>
              <div style={{ width: 38, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '0 auto 14px' }} />
            </div>
            <div style={{ overflowY: 'auto', padding: '0 24px' }}>
              {/* Plan header */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
                <CoinLogo symbol={selected.symbol} image={selected.image || undefined} size={52} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 19 }}>{selected.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{selected.category} · {selected.duration} days · {(selected.dailyRoi * 100).toFixed(2)}% daily</div>
                </div>
              </div>
              {selected.description && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.description}</div>
              )}
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
                {[
                  { l: 'Daily ROI', v: `${(selected.dailyRoi * 100).toFixed(2)}%`, c: '#C9A227' },
                  { l: 'Annual ROI', v: `${Math.round(selected.dailyRoi * 365 * 100)}%`, c: undefined },
                  { l: 'Minimum', v: `$${selected.minDeposit}`, c: undefined },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 5 }}>{l}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: c || 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Amount input */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Investment Amount (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 18 }}>$</span>
                  <input style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', padding: '14px 14px 14px 34px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', fontSize: 22, fontWeight: 800, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} type="number" value={amount} onChange={e => { setAmount(e.target.value); setMsg(null) }} />
                </div>
              </div>
              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
                {[selected.minDeposit, selected.minDeposit * 2, selected.minDeposit * 5, selected.minDeposit * 10].map(v => (
                  <button key={v} onClick={() => setAmount(String(v))} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', background: Number(amount) === v ? 'rgba(201,162,39,0.12)' : 'rgba(255,255,255,0.04)', color: Number(amount) === v ? '#C9A227' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>${v.toLocaleString()}</button>
                ))}
              </div>
              {/* Estimate */}
              {amount && parseFloat(amount) >= selected.minDeposit && (
                <div style={{ background: 'rgba(14,203,129,0.05)', border: '1px solid rgba(14,203,129,0.15)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginBottom: 10 }}>PROFIT ESTIMATE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Daily</div>
                      <div style={{ color: '#0ECB81', fontWeight: 800, fontSize: 16 }}>+${(parseFloat(amount) * selected.dailyRoi).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 3 }}>Total profit</div>
                      <div style={{ color: '#0ECB81', fontWeight: 800, fontSize: 16 }}>+${(parseFloat(amount) * selected.dailyRoi * selected.duration).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Footer CTA */}
            <div style={{ padding: '12px 24px calc(env(safe-area-inset-bottom) + 14px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {msg && <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button onClick={closeSheet} style={{ padding: '14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={invest} disabled={investing || !amount || parseFloat(amount || '0') < selected.minDeposit} style={{ padding: '14px', background: investing ? 'rgba(201,162,39,0.5)' : '#C9A227', color: '#000', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: investing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {investing ? 'Investing...' : `Invest $${parseFloat(amount || '0').toLocaleString()}`}
                </button>
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
    <Suspense fallback={<div style={{ padding: 20, color: '#fff' }}>Loading...</div>}>
      <InvestContent />
    </Suspense>
  )
}
