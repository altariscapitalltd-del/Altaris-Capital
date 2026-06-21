'use client'
import { useEffect, useState, useMemo, memo } from 'react'
import Link from 'next/link'
import { Gift } from 'lucide-react'

// Export hook for reuse (avoids multiple matchMedia listeners in parent)
export function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const upd = () => setMobile(mq.matches)
    upd()
    mq.addEventListener?.('change', upd)
    return () => mq.removeEventListener?.('change', upd)
  }, [])
  return mobile
}

// ─── Promo banner (rotating offers) ──────────────────────────────────────
export const PromoBanner = memo(function PromoBanner({
  user, canClaimBonus, claimBonus,
}: { user: any; canClaimBonus: boolean; claimBonus: () => void }) {
  const [idx, setIdx] = useState(0)
  const items = useMemo(() => ([
    { pill: 'Welcome Offer', title: 'Claim Your $40 Welcome Bonus', approved: 'KYC verified! Claim your reward instantly.', default: 'Complete KYC verification → Get $40 free' },
    { pill: 'Referral Reward', title: 'Invite Friends, Earn up to 30%', approved: 'Share your link and earn rebates on every trade.', default: 'Unlock referral rewards after KYC approval.' },
    { pill: 'Daily Claim', title: 'Daily Check-In Bonus', approved: 'Tap claim once a day to stack extra yield.', default: 'Verify once, claim every day without friction.' },
    { pill: 'Seasonal Offer', title: 'Seasonal Yield Boost +5%', approved: 'Limited-time APY boost on select plans.', default: 'Finish KYC to join the seasonal campaign.' },
  ] as const), [])

  const show = user?.kycStatus !== 'APPROVED' || canClaimBonus

  useEffect(() => {
    if (!show) return
    const t = setInterval(() => setIdx(v => (v + 1) % items.length), 16_000)
    return () => clearInterval(t)
  }, [show, items.length])

  if (!show) return null
  const item = items[idx % items.length]

  return (
    <div style={{ margin: '12px 16px 0' }}>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(242,186,14,0.25)', background: 'radial-gradient(circle at 0% 0%,rgba(242,186,14,0.18),transparent 55%), radial-gradient(circle at 100% 100%,rgba(59,130,246,0.12),transparent 55%)' }}>
        <div style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,rgba(0,0,0,0.2),rgba(0,0,0,0.8))', border: '1px solid rgba(242,186,14,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Gift size={15} strokeWidth={2} color="#000" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(242,186,14,0.35)', color: '#C9A227' }}>{item.pill}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Limited offer</span>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{item.title}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: 7 }}>
              {user?.kycStatus === 'APPROVED' ? item.approved : item.default}
            </p>
            {user?.kycStatus === 'APPROVED'
              ? <button onClick={claimBonus} className="btn-primary" style={{ width: '100%', padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12 }}>Claim $40 Bonus</button>
              : <Link href="/kyc" style={{ display: 'block', textDecoration: 'none' }}><button className="btn-secondary" style={{ width: '100%', padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12 }}>Complete KYC</button></Link>
            }
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── Crypto list & movers ─────────────────────────────────────────────────
export const BybitSection = memo(function BybitSection({
  coins, ready,
}: { coins: any[]; ready: boolean }) {
  const [tab, setTab] = useState<'events' | 'news'>('events')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener?.('change', upd)
    return () => mq.removeEventListener?.('change', upd)
  }, [])

  // FIX: stable slice — limit to 2 on mobile, 4 on desktop
  const list = useMemo(() => coins.slice(0, isMobile ? 2 : 4), [coins, isMobile])

  if (!ready) {
    return (
      <div style={{ marginTop: 18, padding: '0 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>Crypto</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: '12px 14px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', animation: 'pulse 2s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 6, animation: 'pulse 2s infinite' }} />
                <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 4, width: '60%', animation: 'pulse 2s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (list.length === 0) return null

  const EVENTS = [
    { title: 'Refer Friends — Get $30', date: '2025-03-10' },
    { title: 'Seasonal Yield Boost +5%', date: '2025-03-08' },
    { title: 'VIP Tier 1 Benefits Update', date: '2025-03-05' },
  ]
  const NEWS = [
    { title: 'Altaris Capital Q1 2025 Report', date: '2025-03-11' },
    { title: 'New DeFi Plans Launched', date: '2025-03-09' },
    { title: 'KYC Verification Guide', date: '2025-03-04' },
  ]

  return (
    <div style={{ marginTop: 18, padding: '0 16px' }}>
      {/* Crypto list */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>Crypto</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {list.map((coin, index) => (
            <Link key={coin.sym} href={`/markets/${coin.sym.toLowerCase()}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: index < list.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{coin.sym.slice(0, 3)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{coin.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>24h</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>${Number(coin.price) >= 1 ? Number(coin.price).toLocaleString('en-US', { maximumFractionDigits: 2 }) : Number(coin.price).toFixed(4)}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: coin.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {coin.change >= 0 ? '+' : ''}{Number(coin.change).toFixed(2)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top movers grid */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>Top movers</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {list.map(coin => (
            <Link key={`${coin.sym}-top`} href={`/markets/${coin.sym.toLowerCase()}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }} className="pressable">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{coin.sym}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: coin.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {coin.change >= 0 ? '+' : ''}{Number(coin.change).toFixed(2)}%
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  ${Number(coin.price) >= 1 ? Number(coin.price).toLocaleString('en-US', { maximumFractionDigits: 0 }) : Number(coin.price).toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Events / News tabs */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setTab('events')} style={{ flex: 1, padding: 12, border: 'none', background: tab === 'events' ? 'var(--bg-elevated)' : 'transparent', color: tab === 'events' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Latest Events</button>
          <button onClick={() => setTab('news')} style={{ flex: 1, padding: 12, border: 'none', background: tab === 'news' ? 'var(--bg-elevated)' : 'transparent', color: tab === 'news' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>News</button>
        </div>
        <div style={{ padding: 12 }}>
          {(tab === 'events' ? EVENTS : NEWS).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                {tab === 'events' ? '📅' : '📰'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{item.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{item.date}</div>
              </div>
            </div>
          ))}
          <Link href="/support" style={{ display: 'block', textAlign: 'center', marginTop: 8, color: 'var(--brand-primary)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>More</Link>
        </div>
      </div>
    </div>
  )
})
