'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { AltarisLogoMark } from '@/components/AltarisLogo'

const USDC_COLOR = '#2775CA'
const USDC_MIN = 10

type Tab = 'none' | 'deposit' | 'withdraw' | 'reward'
type Range = '1D' | '7D' | '1M' | 'All'

function usd(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function age(s: string) {
  const sec = (Date.now() - new Date(s).getTime()) / 1000
  if (sec < 60)    return 'Just now'
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Bone({ h = 14, w = '100%', r = 6 }: { h?: number; w?: string | number; r?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: r, width: w }} />
}

function Spark({ values, color, w = 72, h = 28 }: { values: number[]; color: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c || values.length < 2) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr)
    const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1
    const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * w, y: h - 3 - ((v - mn) / rng) * (h - 6) }))
    ctx.clearRect(0, 0, w, h)
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
  }, [values, color, w, h])
  return <canvas ref={ref} style={{ width: w, height: h, display: 'block' }} />
}

function Chart({ data, color, h = 90 }: { data: number[]; color: string; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const cw = c.parentElement?.clientWidth || 320
    const dpr = window.devicePixelRatio || 1
    c.width = cw * dpr; c.height = h * dpr; ctx.scale(dpr, dpr)
    const vals = data.length > 1 ? data : [0, 0]
    const mn = Math.min(...vals), mx = Math.max(...vals)
    const pad = Math.max((mx - mn) * 0.12, 1)
    const lo = mn - pad, hi = mx + pad, rng = hi - lo
    const l = 0, r = cw, t = 4, b = h - 2
    const xs = vals.map((_, i) => l + (i / Math.max(vals.length - 1, 1)) * (r - l))
    const ys = vals.map(v => b - ((v - lo) / rng) * (b - t))
    ctx.clearRect(0, 0, cw, h)
    const grd = ctx.createLinearGradient(0, t, 0, b)
    grd.addColorStop(0, color + '20'); grd.addColorStop(1, color + '02')
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) { const mx2 = (xs[i-1]+xs[i])/2; ctx.bezierCurveTo(mx2,ys[i-1],mx2,ys[i],xs[i],ys[i]) }
    ctx.lineTo(xs[xs.length-1], b); ctx.lineTo(xs[0], b); ctx.closePath(); ctx.fillStyle = grd; ctx.fill()
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < xs.length; i++) { const mx2 = (xs[i-1]+xs[i])/2; ctx.bezierCurveTo(mx2,ys[i-1],mx2,ys[i],xs[i],ys[i]) }
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    const ex = xs[xs.length-1], ey = ys[ys.length-1]
    ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill()
  }, [data, color, h])
  return <canvas ref={ref} style={{ width: '100%', height: h, display: 'block' }} />
}

const TM: Record<string, { label: string; credit: boolean; color: string }> = {
  DEPOSIT:        { label: 'Deposit',        credit: true,  color: '#0ECB81' },
  WITHDRAWAL:     { label: 'Withdrawal',     credit: false, color: '#F6465D' },
  INVESTMENT:     { label: 'Investment',     credit: false, color: '#F2BA0E' },
  PROFIT:         { label: 'Profit',         credit: true,  color: '#0ECB81' },
  ROI:            { label: 'ROI Credit',     credit: true,  color: '#0ECB81' },
  BONUS:          { label: 'Bonus',          credit: true,  color: '#A78BFA' },
  REFERRAL_BONUS: { label: 'Referral Bonus', credit: true,  color: '#A78BFA' },
  ADJUSTMENT:     { label: 'Adjustment',     credit: true,  color: '#848E9C' },
}

const TX_ICONS: Record<string, string> = {
  DEPOSIT:        'M12 5v14M5 12l7 7 7-7',
  WITHDRAWAL:     'M12 19V5M5 12l7-7 7 7',
  INVESTMENT:     'M3 17l6-6 4 4 8-8M14 7h7v7',
  PROFIT:         'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z',
  ROI:            'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z',
  BONUS:          'M20 12V22H4V12M22 7H2v5h20V7zM12 22V7',
  REFERRAL_BONUS: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8',
  ADJUSTMENT:     'M4 4v5h5M20 20v-5h-5M20.49 9A9 9 0 0012 3 9 9 0 003.51 15M3.51 15A9 9 0 0012 21a9 9 0 008.49-6',
}

export default function WalletPage() {
  const [tab, setTab]           = useState<Tab>('none')
  const [range, setRange]       = useState<Range>('1D')
  const [amount, setAmount]     = useState('')
  const [wdAddr, setWdAddr]     = useState('')
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [invested, setInvested] = useState(0)
  const [txs, setTxs]           = useState<any[]>([])
  const [qr, setQr]             = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy]         = useState(false)
  const [ready, setReady]       = useState(false)
  const [copied, setCopied]     = useState(false)
  const [refCode, setRefCode]   = useState('ALTARIS01')
  const [depAddr, setDepAddr]   = useState('')
  const [walletAddr, setWalletAddr] = useState<Record<string, string>>({})

  function loadProfile() {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      const b: Record<string, number> = {}
      d.user?.balances?.forEach((x: any) => { b[x.currency] = x.amount })
      setBalances(b)
      setInvested((d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []).reduce((s: number, i: any) => s + i.amount, 0))
      setRefCode(d.user?.referralCode || 'ALTARIS01')
    }).catch(() => {})
  }
  function loadTxs() {
    fetch('/api/transactions?page=1').then(r => r.json()).then(d => setTxs(d.transactions || [])).catch(() => {})
  }

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const [p, t, a] = await Promise.allSettled([
          fetch('/api/user/profile'), fetch('/api/transactions?page=1'), fetch('/api/wallet/addresses'),
        ])
        if (dead) return
        if (p.status === 'fulfilled') {
          const d = await p.value.json().catch(() => ({}))
          const b: Record<string, number> = {}
          d.user?.balances?.forEach((x: any) => { b[x.currency] = x.amount })
          setBalances(b)
          setInvested((d.user?.investments?.filter((i: any) => i.status === 'ACTIVE') || []).reduce((s: number, i: any) => s + i.amount, 0))
          setRefCode(d.user?.referralCode || 'ALTARIS01')
        }
        if (t.status === 'fulfilled') {
          const d = await t.value.json().catch(() => ({})); setTxs(d.transactions || [])
        }
        if (a.status === 'fulfilled') {
          const d = await a.value.json().catch(() => ({}))
          const m: Record<string, string> = {}; d.addresses?.forEach((x: any) => { m[x.currency] = x.address })
          setWalletAddr(m)
        }
      } finally { if (!dead) setReady(true) }
    })()
    return () => { dead = true }
  }, [])

  useEffect(() => {
    const fn = () => { loadProfile(); loadTxs() }
    window.addEventListener('balance:refresh', fn)
    return () => window.removeEventListener('balance:refresh', fn)
  }, [])

  useEffect(() => {
    if (tab !== 'deposit') return
    let dead = false
    fetch('/api/wallet/deposit-address').then(r => r.json()).then(d => { if (!dead && d?.address) setDepAddr(d.address) }).catch(() => {})
    return () => { dead = true }
  }, [tab])

  const activeAddr = depAddr || walletAddr['USDC'] || ''
  useEffect(() => {
    if (tab !== 'deposit') { setQr(null); return }
    if (!activeAddr) return
    QRCode.toDataURL(activeAddr, { width: 512, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(null))
  }, [tab, activeAddr])

  const usdBal    = balances.USD || 0
  const portfolio = usdBal + invested
  const earned    = useMemo(() =>
    txs.filter(t => ['PROFIT','ROI','BONUS','REFERRAL_BONUS'].includes(t.type) && t.status === 'SUCCESS')
       .reduce((s: number, t: any) => s + t.amount, 0), [txs])

  const chartData = useMemo(() => {
    const hrs = range === '1D' ? 24 : range === '7D' ? 168 : range === '1M' ? 720 : Infinity
    const fil = txs.slice().sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .filter((t: any) => hrs === Infinity || Date.now() - +new Date(t.createdAt) <= hrs * 3_600_000).slice(-40)
    if (!fil.length) return Array.from({ length: 8 }, () => +usdBal.toFixed(2))
    let run = Math.max(0, usdBal)
    const out: number[] = []
    for (let i = fil.length - 1; i >= 0; i--) {
      const t = fil[i]
      run = ['DEPOSIT','PROFIT','ROI','BONUS','REFERRAL_BONUS'].includes(t.type) ? Math.max(0, run - t.amount) : run + t.amount
      out.unshift(+run.toFixed(2))
    }
    const res = out.slice(-24); while (res.length < 6) res.unshift(res[0] ?? usdBal); return res
  }, [txs, usdBal, range])

  const { diff, pct } = useMemo(() => {
    const s = chartData[0] ?? usdBal, e = chartData[chartData.length - 1] ?? usdBal
    return { diff: e - s, pct: s ? ((e - s) / s) * 100 : 0 }
  }, [chartData, usdBal])

  const isPos = diff >= 0
  const lineColor = isPos ? '#0ECB81' : '#F6465D'

  async function withdraw() {
    if (!amount || !wdAddr.trim()) { setMsg({ ok: false, text: 'Enter amount and destination address' }); return }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency: 'USD', amount: Number(amount), address: wdAddr.trim() }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ ok: false, text: d.error || 'Failed' }); return }
      setMsg({ ok: true, text: 'Withdrawal request submitted' }); setAmount(''); setWdAddr(''); loadProfile(); loadTxs()
    } catch { setMsg({ ok: false, text: 'Network error. Try again.' }) }
    finally { setBusy(false) }
  }

  function copy() {
    if (!activeAddr) return
    navigator.clipboard.writeText(activeAddr); setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  async function share() {
    if (navigator.share) try { await navigator.share({ title: 'USDC Deposit Address', text: `My USDC deposit address:\n${activeAddr}` }); return } catch {}
    copy()
  }
  async function shareRef() {
    const url = `${window.location.origin}/signup?ref=${refCode}`
    if (navigator.share) try { await navigator.share({ title: 'Join Altaris Capital', text: `Join and get a $40 bonus!\n${url}`, url }); return } catch {}
    navigator.clipboard.writeText(url); setMsg({ ok: true, text: 'Referral link copied' })
  }
  function close() { setTab('none'); setMsg(null) }

  const S = {
    page:   '#0B0E11',
    card:   '#161A1F',
    raised: '#1E2329',
    border: 'rgba(255,255,255,0.06)',
    hi:     'rgba(255,255,255,0.10)',
    text:   '#EAECEF',
    sub:    '#848E9C',
    muted:  '#474D57',
    brand:  '#F2BA0E',
    gain:   '#0ECB81',
    loss:   '#F6465D',
  } as const

  const ov: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100, background: S.page, overflowY: 'auto',
    overscrollBehavior: 'contain',
    paddingTop: 'calc(var(--app-header-height, 64px) + 16px)',
    paddingBottom: 'calc(var(--app-bottom-nav-height, 84px) + env(safe-area-inset-bottom) + 24px)',
  }

  return (
    <div style={{ background: S.page, minHeight: '100vh', paddingBottom: 'calc(var(--app-bottom-nav-height,84px) + env(safe-area-inset-bottom) + 16px)' }}>

      {/* copy toast */}
      {copied && (
        <div style={{ position: 'fixed', top: 'calc(var(--app-header-height,64px) + 10px)', left: '50%', transform: 'translateX(-50%)', zIndex: 200, pointerEvents: 'none', background: S.raised, border: `1px solid ${S.hi}`, color: S.gain, padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          Address copied
        </div>
      )}

      {/* ══ SKELETON ══ */}
      {!ready && (
        <div style={{ padding: '24px 20px', display: 'grid', gap: 8 }}>
          <Bone h={12} w={100} />
          <Bone h={42} w={200} r={8} />
          <Bone h={14} w={150} />
          <div style={{ height: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>{[0,1,2,3].map(i => <Bone key={i} h={80} r={12} />)}</div>
          <div style={{ height: 4 }} />
          <Bone h={130} r={12} />
          <Bone h={100} r={12} />
          {[0,1,2,3].map(i => <Bone key={i} h={64} r={8} />)}
        </div>
      )}

      {ready && (
        <>
          {/* ════ BALANCE HERO ════ */}
          <div style={{ padding: '28px 20px 6px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: S.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Assets Overview
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div className="num" style={{ fontSize: 40, fontWeight: 600, color: S.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  ${usd(portfolio)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span className="live-dot" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: lineColor }}>
                    {isPos ? '+' : '-'}${usd(Math.abs(diff))} ({isPos ? '+' : ''}{pct.toFixed(2)}%)
                  </span>
                  <span style={{ fontSize: 12, color: S.muted }}>today</span>
                </div>
              </div>
              <Spark values={chartData} color={lineColor} w={80} h={34} />
            </div>
          </div>

          {/* ════ 3-STAT ROW ════ */}
          <div style={{ margin: '16px 16px 8px', borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[
              { label: 'Available', val: `$${usd(usdBal)}`,   color: S.text  },
              { label: 'Invested',  val: `$${usd(invested)}`, color: S.text  },
              { label: 'Earned',    val: `+$${usd(earned)}`,  color: S.gain  },
            ].map((r, i) => (
              <div key={r.label} style={{ padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{r.label}</div>
                <div className="num" style={{ fontSize: 14, fontWeight: 600, color: r.color }}>{r.val}</div>
              </div>
            ))}
          </div>

          {/* ════ QUICK ACTIONS ════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '0 16px 8px' }}>
            {[
              { label: 'Deposit',  icon: 'M12 5v14M5 12l7 7 7-7',        primary: true,  fn: () => { setTab('deposit');  setMsg(null) } },
              { label: 'Withdraw', icon: 'M12 19V5M5 12l7-7 7 7',        primary: false, fn: () => { setTab('withdraw'); setMsg(null) } },
              { label: 'Invest',   icon: 'M3 17l6-6 4 4 8-8M14 7h7v7',  primary: false, fn: () => { window.location.href = '/invest' } },
              { label: 'Rewards',  icon: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z', primary: false, fn: () => { setTab('reward'); setMsg(null) } },
            ].map(a => (
              <button key={a.label} type="button" onClick={a.fn} className="pressable" style={{ padding: '14px 4px 12px', borderRadius: 12, border: `1px solid ${a.primary ? S.brand + '30' : S.border}`, background: a.primary ? 'rgba(242,186,14,0.06)' : S.card, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: a.primary ? S.brand : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={a.primary ? '#000' : S.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {a.icon.split('M').filter(Boolean).map((d,i) => <path key={i} d={'M'+d}/>)}
                  </svg>
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: a.primary ? S.text : S.sub }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* ════ PORTFOLIO CHART ════ */}
          <div style={{ margin: '0 16px 8px', borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 10px' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: S.text }}>Performance</span>
              <div className="portfolio-range-tabs">
                {(['1D','7D','1M','All'] as Range[]).map(r => (
                  <button key={r} type="button" onClick={() => setRange(r)} className={range === r ? 'active' : ''}>{r}</button>
                ))}
              </div>
            </div>
            <Chart data={chartData} color={lineColor} h={100} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: `1px solid ${S.border}` }}>
              {[
                { label: 'Change',  val: `${isPos?'+':'-'}$${usd(Math.abs(diff))}`, color: lineColor },
                { label: 'Return',  val: `${isPos?'+':''}${pct.toFixed(2)}%`,       color: lineColor },
                { label: 'Balance', val: `$${usd(usdBal)}`,                         color: S.text    },
              ].map((s,i) => (
                <div key={s.label} style={{ padding: '11px 16px', borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                  <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ════ RECENT ACTIVITY ════ */}
          <div style={{ margin: '0 16px 8px', borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Recent Activity</span>
              <Link href="/transactions" style={{ fontSize: 12, color: S.sub, textDecoration: 'none', fontWeight: 500 }}>All transactions</Link>
            </div>
            {txs.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: S.sub, marginBottom: 4 }}>No transactions yet</div>
                <div style={{ fontSize: 12, color: S.muted }}>Deposit USDC to get started</div>
              </div>
            ) : txs.slice(0, 6).map((t: any, i: number, arr: any[]) => {
              const m = TM[t.type] || TM.ADJUSTMENT
              const iconPath = TX_ICONS[t.type] || TX_ICONS.ADJUSTMENT
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < arr.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                  {/* colored left bar */}
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: m.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {iconPath.split('M').filter(Boolean).map((d,pi) => <path key={pi} d={'M'+d}/>)}
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: S.muted }}>{age(t.createdAt)}</span>
                      <span style={{ width: 2, height: 2, borderRadius: '50%', background: S.muted }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: t.status === 'SUCCESS' || t.status === 'COMPLETED' ? S.gain : t.status === 'PENDING' ? S.brand : S.loss }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 600, color: m.credit ? S.gain : S.text, textAlign: 'right' }}>
                    {m.credit ? '+' : '-'}${usd(t.amount)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ════ INVEST CTA ════ */}
          <Link href="/invest" className="pressable" style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 16px', padding: '16px 18px', borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(242,186,14,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={S.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 2 }}>Explore Investment Plans</div>
              <div style={{ fontSize: 11, color: S.sub }}>Daily ROI on active plans</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.muted} strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        </>
      )}

      {/* ═══════ OVERLAY: DEPOSIT ═══════ */}
      {tab === 'deposit' && (
        <div style={ov}>
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <button onClick={close} type="button" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${S.border}`, background: 'transparent', color: S.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Receive USDC</div>
                <div style={{ fontSize: 12, color: S.sub, marginTop: 1 }}>Supported on all major EVM networks</div>
              </div>
            </div>

            {/* network pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }} className="no-scrollbar">
              {['Ethereum','Base','Polygon','Arbitrum','Optimism'].map(n => (
                <div key={n} style={{ padding: '5px 11px', borderRadius: 6, background: S.raised, border: `1px solid ${S.border}`, fontSize: 11, fontWeight: 500, color: S.sub, whiteSpace: 'nowrap', flexShrink: 0 }}>{n}</div>
              ))}
            </div>

            {/* QR card */}
            <div style={{ borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, padding: 18, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${S.border}` }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: USDC_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2775CA"/><path d="M15.2 13.94c0-1.7-1.02-2.28-3.06-2.52-1.46-.2-1.75-.59-1.75-1.27 0-.68.49-1.12 1.46-1.12.88 0 1.36.29 1.6.97.05.2.2.24.34.24h.78c.2 0 .34-.15.34-.33v-.05a2.43 2.43 0 00-2.19-1.99v-1.16c0-.2-.15-.34-.39-.39h-.73c-.2 0-.34.15-.39.39v1.12c-1.46.19-2.38 1.16-2.38 2.37 0 1.6.97 2.23 3.01 2.47 1.36.24 1.8.54 1.8 1.31 0 .78-.68 1.31-1.6 1.31-1.26 0-1.7-.53-1.85-1.26-.05-.2-.2-.29-.34-.29h-.83c-.2 0-.34.15-.34.34v.05c.2 1.21.97 2.08 2.57 2.32v1.17c0 .19.15.34.39.39h.73c.2 0 .34-.15.39-.39v-1.17c1.46-.24 2.43-1.26 2.43-2.51z" fill="#fff"/></svg>
                </div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>USD Coin (USDC)</div><div style={{ fontSize: 11, color: S.sub }}>1 USDC = $1.00 · ERC-20</div></div>
                <div style={{ fontSize: 10, fontWeight: 600, color: S.gain, background: 'rgba(14,203,129,0.08)', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(14,203,129,0.15)' }}>STABLE</div>
              </div>

              <div style={{ width: 200, height: 200, margin: '0 auto 18px', borderRadius: 12, background: '#fff', padding: 8, position: 'relative' }}>
                {qr ? <img src={qr} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 22, height: 22, border: `2px solid rgba(0,0,0,0.08)`, borderTopColor: USDC_COLOR, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
                  <AltarisLogoMark size={22} />
                </div>
              </div>

              <button onClick={copy} type="button" className="pressable" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.raised, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontFamily: 'ui-monospace,monospace', fontSize: 11, color: S.sub, wordBreak: 'break-all', lineHeight: 1.55 }}>{activeAddr || 'Loading…'}</span>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: copied ? 'rgba(14,203,129,0.12)' : S.raised, border: `1px solid ${copied ? 'rgba(14,203,129,0.2)' : S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {copied ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.gain} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.sub} strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                </span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <button onClick={copy}  type="button" className="pressable" style={{ padding: '12px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.raised, color: S.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? 'Copied' : 'Copy Address'}</button>
              <button onClick={share} type="button" className="pressable" style={{ padding: '12px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.raised, color: S.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Share</button>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(242,186,14,0.05)', border: `1px solid rgba(242,186,14,0.12)`, display: 'flex', gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.brand} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p style={{ fontSize: 12, color: S.sub, lineHeight: 1.6, margin: 0 }}>Only send <strong style={{ color: S.text }}>USDC</strong> on Ethereum, Base, Polygon, Arbitrum or Optimism. Minimum: <strong style={{ color: S.text }}>${USDC_MIN} USDC</strong>.</p>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ═══════ OVERLAY: WITHDRAW ═══════ */}
      {tab === 'withdraw' && (
        <div style={ov}>
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <button onClick={close} type="button" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${S.border}`, background: 'transparent', color: S.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <div><div style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Withdraw Funds</div><div style={{ fontSize: 12, color: S.sub, marginTop: 1 }}>Processed within 24 hours</div></div>
            </div>

            <div style={{ padding: '18px', borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Available Balance</div>
              <div className="num" style={{ fontSize: 34, fontWeight: 600, color: S.text, letterSpacing: '-0.02em' }}>${usd(usdBal)}</div>
              <div style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>USD</div>
            </div>

            <div style={{ borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, padding: 16, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>Destination Address</div>
                <input className="input" value={wdAddr} onChange={e => setWdAddr(e.target.value)} placeholder="0x wallet address" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13 }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (USD)</div>
                  <button onClick={() => setAmount(String(usdBal))} style={{ fontSize: 11, fontWeight: 600, color: S.brand, background: 'rgba(242,186,14,0.08)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>MAX</button>
                </div>
                <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
              </div>
              {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.ok ? 'rgba(14,203,129,0.08)' : 'rgba(246,70,93,0.08)', border: `1px solid ${msg.ok ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)'}`, color: msg.ok ? S.gain : S.loss, fontSize: 13, fontWeight: 500 }}>{msg.text}</div>}
              <button onClick={withdraw} disabled={busy} className="pressable" style={{ padding: '14px', borderRadius: 8, background: S.brand, color: '#000', fontWeight: 700, fontSize: 14, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>{busy ? 'Processing…' : 'Request Withdrawal'}</button>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: S.muted, textAlign: 'center', lineHeight: 1.6 }}>Withdrawals are reviewed and sent as USDC within 24 hours.</p>
          </div>
        </div>
      )}

      {/* ═══════ OVERLAY: REWARDS ═══════ */}
      {tab === 'reward' && (
        <div style={ov}>
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <button onClick={close} type="button" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${S.border}`, background: 'transparent', color: S.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <div><div style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Rewards</div><div style={{ fontSize: 12, color: S.sub, marginTop: 1 }}>Earn by referring friends</div></div>
            </div>

            <div style={{ borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, padding: '20px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: S.brand, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Referral Program</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: S.text, lineHeight: 1.25, marginBottom: 8 }}>Earn $200 per qualified referral</div>
              <div style={{ fontSize: 13, color: S.sub, lineHeight: 1.6, marginBottom: 20 }}>Invite friends. When they verify and make their first deposit, you both receive a cash bonus.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={shareRef} type="button" className="pressable" style={{ padding: '12px', borderRadius: 8, background: S.brand, color: '#000', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Share My Link</button>
                <Link href="/rewards" style={{ padding: '12px', borderRadius: 8, background: S.raised, border: `1px solid ${S.border}`, color: S.text, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Dashboard</Link>
              </div>
            </div>

            <div style={{ borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, padding: '16px 18px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your Referral Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 22, fontWeight: 700, color: S.brand, letterSpacing: '0.06em' }}>{refCode}</div>
                <button onClick={shareRef} type="button" className="pressable" style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(242,186,14,0.08)', border: `1px solid rgba(242,186,14,0.16)`, color: S.brand, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Copy & Share</button>
              </div>
            </div>

            <div style={{ borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border}` }}><div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>How It Works</div></div>
              {[
                { n: '01', t: 'Share your referral link',   d: 'Send it to anyone via any channel' },
                { n: '02', t: 'They create an account',     d: 'Friend signs up through your link' },
                { n: '03', t: 'They verify and deposit',    d: 'Complete KYC and first deposit' },
                { n: '04', t: 'Both accounts get credited', d: 'You receive $200 · They receive $40' },
              ].map((s, i, arr) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 18px', borderBottom: i < arr.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.brand, minWidth: 22 }}>{s.n}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 2 }}>{s.t}</div><div style={{ fontSize: 11, color: S.sub }}>{s.d}</div></div>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: 12, background: S.card, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border}` }}><div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Tier Bonuses</div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[{ l: 'Starter', r: '1', b: '$40' }, { l: 'Rising', r: '5', b: '$700' }, { l: 'Elite', r: '20', b: '$3K' }, { l: 'VIP', r: '50', b: 'VIP' }].map((t, i, arr) => (
                  <div key={t.l} style={{ padding: '14px 8px', textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.text, marginBottom: 3 }}>{t.l}</div>
                    <div style={{ fontSize: 10, color: S.muted, marginBottom: 5 }}>{t.r} ref{t.r !== '1' ? 's' : ''}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: S.brand }}>{t.b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
