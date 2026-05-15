'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'

// ── Types ──
interface AirdropItem {
  id: string
  title: string
  token: string
  tokenSymbol: string
  amount: number
  value: string
  status: 'claimable' | 'claimed' | 'ended' | 'upcoming'
  eligibility: string[]
  description: string
  endsAt: string
  totalClaimed: number
  totalSupply: number
  chain: string
  color: string
  icon: string
}

// ── Mock airdrop data ──
const AIRDROP_ITEMS: AirdropItem[] = [
  {
    id: 'altaris-launch',
    title: 'Altaris Capital Launch Airdrop',
    token: 'Altaris Token',
    tokenSymbol: 'ALT',
    amount: 2500,
    value: '$250',
    status: 'claimable',
    eligibility: ['Connect wallet', 'Follow on X', 'Join Discord', 'Refer 1 friend'],
    description: 'Early supporter reward for the Altaris Capital platform launch. Claim your share of the genesis token distribution.',
    endsAt: '2025-06-30',
    totalClaimed: 18432,
    totalSupply: 100000,
    chain: 'Ethereum',
    color: '#F2BA0E',
    icon: '◆',
  },
  {
    id: 'defi-yield',
    title: 'DeFi Yield Booster Drop',
    token: 'Yield Token',
    tokenSymbol: 'YIELD',
    amount: 500,
    value: '$75',
    status: 'claimable',
    eligibility: ['Hold $100+ in DeFi plan', 'Active for 7+ days', 'Connect wallet'],
    description: 'Exclusive yield booster tokens for active DeFi investors on the Altaris platform.',
    endsAt: '2025-07-15',
    totalClaimed: 8432,
    totalSupply: 50000,
    chain: 'Arbitrum',
    color: '#28A0F0',
    icon: '📈',
  },
  {
    id: 'bitcoin-rewards',
    title: 'Bitcoin Halving Celebration',
    token: 'Wrapped BTC Rewards',
    tokenSymbol: 'wBTC',
    amount: 0.005,
    value: '$542',
    status: 'claimable',
    eligibility: ['Deposit $500+', 'Hold BTC in wallet', 'Complete KYC'],
    description: 'Celebrate the Bitcoin halving with exclusive wBTC rewards for platform users.',
    endsAt: '2025-07-01',
    totalClaimed: 2451,
    totalSupply: 10000,
    chain: 'Bitcoin',
    color: '#F7931A',
    icon: '₿',
  },
  {
    id: 'solana-summer',
    title: 'Solana Summer Airdrop',
    token: 'Solana Token',
    tokenSymbol: 'SOL',
    amount: 2.5,
    value: '$495',
    status: 'upcoming',
    eligibility: ['Hold SOL in wallet', 'Trade SOL on platform', 'Stake $200+'],
    description: 'Summer season SOL rewards for active traders and stakers on the platform.',
    endsAt: '2025-08-01',
    totalClaimed: 0,
    totalSupply: 25000,
    chain: 'Solana',
    color: '#9945FF',
    icon: '◎',
  },
  {
    id: 'ethereum-staking',
    title: 'Ethereum Staking Rewards',
    token: 'Staked ETH',
    tokenSymbol: 'stETH',
    amount: 0.15,
    value: '$547',
    status: 'claimable',
    eligibility: ['Stake ETH in plan', 'Hold for 14+ days', 'Connect wallet'],
    description: 'Staking rewards for Ethereum holders who participate in platform investment plans.',
    endsAt: '2025-07-30',
    totalClaimed: 5621,
    totalSupply: 20000,
    chain: 'Ethereum',
    color: '#627EEA',
    icon: 'Ξ',
  },
  {
    id: 'community-nft',
    title: 'Community OG NFT Pass',
    token: 'OG Pass NFT',
    tokenSymbol: 'OGPASS',
    amount: 1,
    value: '$1,200',
    status: 'ended',
    eligibility: ['First 1000 users', 'Platform beta tester', 'Community contributor'],
    description: 'Limited edition OG NFT pass for early community members and beta testers.',
    endsAt: '2025-04-30',
    totalClaimed: 1000,
    totalSupply: 1000,
    chain: 'Polygon',
    color: '#8247E5',
    icon: '👑',
  },
]

// ── Components ──
function CountDown({ target }: { target: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now())
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor(diff / 3600000) % 24,
        m: Math.floor(diff / 60000) % 60,
        s: Math.floor(diff / 1000) % 60,
      })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [target])
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[{ v: time.d, l: 'D' }, { v: time.h, l: 'H' }, { v: time.m, l: 'M' }, { v: time.s, l: 'S' }].map(({ v, l }) => (
        <div key={l} style={{ textAlign: 'center', minWidth: 32, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontWeight: 900, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2, '0')}</div>
          <div style={{ fontSize: 8, color: '#666', fontWeight: 700 }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ current, total, color }: { current: number; total: number; color: string }) {
  const pct = Math.min(100, (current / total) * 100)
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 3, transition: 'width 1s ease' }} />
    </div>
  )
}

function AirdropCard({ item, onClaim }: { item: AirdropItem; onClaim: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig = {
    claimable: { label: 'Claim Now', bg: 'rgba(14,203,129,0.12)', color: '#0ECB81', border: 'rgba(14,203,129,0.25)' },
    claimed: { label: 'Claimed', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
    ended: { label: 'Ended', bg: 'rgba(246,70,93,0.08)', color: '#F6465D', border: 'rgba(246,70,93,0.15)' },
    upcoming: { label: 'Coming Soon', bg: 'rgba(242,186,14,0.08)', color: '#F2BA0E', border: 'rgba(242,186,14,0.2)' },
  }
  const sc = statusConfig[item.status]

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0A0A0A, #070707)',
      border: `1px solid ${item.status === 'claimable' ? item.color + '30' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 20,
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: item.status === 'claimable' ? `0 0 30px ${item.color}10` : 'none',
    }}>
      {/* Glow effect for claimable */}
      {item.status === 'claimable' && (
        <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${item.color}12, transparent 70%)`, pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${item.color}20, ${item.color}08)`,
              border: `1px solid ${item.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{item.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 800, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                <span style={{ fontSize: 10, color: '#555' }}>{item.chain}</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.amount.toLocaleString()} <span style={{ fontSize: 12 }}>{item.tokenSymbol}</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>~{item.value}</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{item.description}</div>

        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>CLAIMED</span>
            <span style={{ fontSize: 11, fontWeight: 800 }}>{item.totalClaimed.toLocaleString()} / {item.totalSupply.toLocaleString()}</span>
          </div>
          <ProgressBar current={item.totalClaimed} total={item.totalSupply} color={item.color} />
        </div>

        {/* Countdown */}
        {item.status !== 'ended' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>ENDS IN:</span>
            <CountDown target={item.endsAt} />
          </div>
        )}

        {/* Eligibility */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          {expanded ? 'Hide' : 'Show'} Eligibility Requirements
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {expanded && (
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 14 }}>
            {item.eligibility.map((req, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < item.eligibility.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #0ECB81', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{req}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        {item.status === 'claimable' && (
          <button
            onClick={() => onClaim(item.id)}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
              color: '#000', fontWeight: 900, fontSize: 14,
              border: 'none', cursor: 'pointer',
              boxShadow: `0 8px 24px ${item.color}30`,
              fontFamily: 'inherit',
            }}
            className="pressable"
          >
            Claim {item.amount.toLocaleString()} {item.tokenSymbol}
          </button>
        )}
        {item.status === 'upcoming' && (
          <button disabled style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)', color: '#555',
            fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'not-allowed', fontFamily: 'inherit',
          }}>
            Starts {new Date(item.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
        )}
        {item.status === 'ended' && (
          <button disabled style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'rgba(246,70,93,0.06)', color: '#F6465D88',
            fontWeight: 700, fontSize: 14, border: '1px solid rgba(246,70,93,0.12)',
            cursor: 'not-allowed', fontFamily: 'inherit',
          }}>
            Airdrop Ended
          </button>
        )}
        {item.status === 'claimed' && (
          <div style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'rgba(59,130,246,0.08)', color: '#3B82F6',
            fontWeight: 700, fontSize: 14, border: '1px solid rgba(59,130,246,0.15)',
            textAlign: 'center',
          }}>
            ✓ Successfully Claimed
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──
export default function AirdropPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'claimable' | 'upcoming' | 'ended'>('all')
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')

  useEffect(() => {
    // Check local storage for claimed airdrops
    try {
      const saved = localStorage.getItem('altaris_claimed_airdrops')
      if (saved) setClaimedIds(JSON.parse(saved))
      const wallet = localStorage.getItem('altaris_airdrop_wallet')
      if (wallet) { setWalletConnected(true); setWalletAddress(wallet) }
    } catch {}
  }, [])

  const handleClaim = useCallback((id: string) => {
    if (!walletConnected) {
      setShowWalletModal(true)
      return
    }
    // Simulate claim
    const updated = [...claimedIds, id]
    setClaimedIds(updated)
    try { localStorage.setItem('altaris_claimed_airdrops', JSON.stringify(updated)) } catch {}
  }, [walletConnected, claimedIds])

  const connectWallet = () => {
    setConnecting(true)
    setTimeout(() => {
      const mockAddress = '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      setWalletAddress(mockAddress)
      setWalletConnected(true)
      setConnecting(false)
      setShowWalletModal(false)
      try { localStorage.setItem('altaris_airdrop_wallet', mockAddress) } catch {}
    }, 1500)
  }

  const disconnectWallet = () => {
    setWalletConnected(false)
    setWalletAddress('')
    try { localStorage.removeItem('altaris_airdrop_wallet') } catch {}
  }

  const filteredItems = AIRDROP_ITEMS.filter(item => {
    if (activeTab === 'all') return true
    if (claimedIds.includes(item.id)) return activeTab === 'claimable' ? false : item.status === activeTab
    return item.status === activeTab
  }).map(item => ({
    ...item,
    status: claimedIds.includes(item.id) ? 'claimed' as const : item.status,
  }))

  const stats = {
    totalValue: AIRDROP_ITEMS.reduce((sum, item) => sum + parseFloat(item.value.replace('$', '').replace(',', '')), 0),
    totalParticipants: AIRDROP_ITEMS.reduce((sum, item) => sum + item.totalClaimed, 0),
    activeDrops: AIRDROP_ITEMS.filter(i => i.status === 'claimable').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff' }}>
            <AltarisLogoMark size={30} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.08em' }}>ALTARIS</div>
              <div style={{ color: '#444', fontSize: 8, letterSpacing: '0.16em', lineHeight: 1 }}>AIRDROP</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, transition: 'color 0.15s' }}>Home</Link>
            {walletConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(14,203,129,0.1)', color: '#0ECB81', fontSize: 12, fontWeight: 700, border: '1px solid rgba(14,203,129,0.2)' }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <button onClick={disconnectWallet} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }}>Disconnect</button>
              </div>
            ) : (
              <button onClick={() => setShowWalletModal(true)} style={{ padding: '9px 18px', background: '#F2BA0E', color: '#000', borderRadius: 9, fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,186,14,0.08), transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(242,186,14,0.08)', border: '1px solid rgba(242,186,14,0.2)', color: '#F2BA0E', fontSize: 12, fontWeight: 700, marginBottom: 24 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ECB81', boxShadow: '0 0 8px rgba(14,203,129,0.5)', animation: 'pulseLive 2s infinite' }} />
          Live Airdrops Available
        </div>

        <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, maxWidth: 700, margin: '0 auto 16px' }}>
          Claim Your <span style={{ background: 'linear-gradient(90deg, #F2BA0E, #FFD23A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Web3 Airdrops</span>
        </h1>
        <p style={{ color: '#555', fontSize: 'clamp(14px, 2vw, 17px)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Connect your wallet and claim exclusive token airdrops. No login required — just verify eligibility and claim instantly.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden', maxWidth: 640, margin: '0 auto' }}>
          {[
            { v: `$${stats.totalValue.toLocaleString()}+`, l: 'Total Value' },
            { v: stats.activeDrops.toString(), l: 'Active Drops' },
            { v: stats.totalParticipants.toLocaleString(), l: 'Participants' },
          ].map(({ v, l }, i) => (
            <div key={l} style={{ flex: '1 1 140px', padding: '24px 20px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 900, color: '#F2BA0E', marginBottom: 4 }}>{v}</div>
              <div style={{ color: '#444', fontSize: 12 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filter Tabs ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { id: 'all' as const, label: 'All Airdrops', count: AIRDROP_ITEMS.length },
            { id: 'claimable' as const, label: 'Claimable', count: AIRDROP_ITEMS.filter(i => i.status === 'claimable').length },
            { id: 'upcoming' as const, label: 'Upcoming', count: AIRDROP_ITEMS.filter(i => i.status === 'upcoming').length },
            { id: 'ended' as const, label: 'Ended', count: AIRDROP_ITEMS.filter(i => i.status === 'ended').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: activeTab === tab.id ? 'rgba(242,186,14,0.12)' : 'rgba(255,255,255,0.03)',
                color: activeTab === tab.id ? '#F2BA0E' : '#666',
                border: `1px solid ${activeTab === tab.id ? 'rgba(242,186,14,0.25)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab.label}
              <span style={{ padding: '2px 6px', borderRadius: 99, background: activeTab === tab.id ? 'rgba(242,186,14,0.2)' : 'rgba(255,255,255,0.06)', fontSize: 10 }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Airdrop Grid */}
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredItems.map(item => (
            <AirdropCard key={item.id} item={item} onClaim={handleClaim} />
          ))}
          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#666' }}>No airdrops found</div>
              <div style={{ fontSize: 14 }}>Check back soon for new opportunities</div>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: '60px 24px', background: '#050505', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginBottom: 40 }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'Connect Wallet', desc: 'Link your Web3 wallet securely. No signup required.', color: '#F2BA0E' },
              { step: '02', title: 'Check Eligibility', desc: 'Verify if you meet the airdrop requirements.', color: '#3B82F6' },
              { step: '03', title: 'Claim Tokens', desc: 'One-click claim. Tokens sent directly to your wallet.', color: '#0ECB81' },
              { step: '04', title: 'Track Portfolio', desc: 'Monitor your airdrops and token value in real-time.', color: '#A855F7' },
            ].map(s => (
              <div key={s.step} style={{ padding: '28px 20px', background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${s.color}15`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: s.color, margin: '0 auto 14px' }}>{s.step}</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{s.title}</div>
                <div style={{ color: '#555', fontSize: 13, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, marginBottom: 16 }}>Ready to claim?</h2>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
            Connect your wallet now and start claiming exclusive airdrops. New drops added weekly.
          </p>
          {walletConnected ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: 'rgba(14,203,129,0.1)', color: '#0ECB81', borderRadius: 12, fontWeight: 800, fontSize: 15, border: '1px solid rgba(14,203,129,0.2)' }}>
              ✓ Wallet Connected
            </div>
          ) : (
            <button onClick={() => setShowWalletModal(true)} style={{ padding: '16px 44px', background: '#F2BA0E', color: '#000', borderRadius: 14, fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 12px 40px rgba(242,186,14,0.25)' }}>
              Connect Wallet to Claim →
            </button>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', textAlign: 'center', background: '#050505' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <AltarisLogoMark size={24} />
          <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.08em' }}>ALTARIS CAPITAL</span>
        </div>
        <p style={{ color: '#333', fontSize: 12 }}>© 2025 Altaris Capital Ltd. All rights reserved.</p>
      </footer>

      {/* ── Wallet Connect Modal ── */}
      {showWalletModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => !connecting && setShowWalletModal(false)}>
          <div style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '32px 28px', maxWidth: 400, width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => !connecting && setShowWalletModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#666', fontSize: 24, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <AltarisLogoMark size={40} />
              <h3 style={{ fontSize: 20, fontWeight: 900, margin: '16px 0 8px' }}>Connect Wallet</h3>
              <p style={{ color: '#555', fontSize: 13 }}>Choose your preferred wallet to continue</p>
            </div>
            {connecting ? (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>Connecting...</div>
                <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>Approve connection in your wallet</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { name: 'MetaMask', icon: '🦊', color: '#E2761B' },
                  { name: 'WalletConnect', icon: '🔷', color: '#3B99FC' },
                  { name: 'Coinbase Wallet', icon: '🔵', color: '#0052FF' },
                  { name: 'Phantom', icon: '👻', color: '#AB9FF2' },
                ].map(wallet => (
                  <button
                    key={wallet.name}
                    onClick={connectWallet}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                      width: '100%', textAlign: 'left',
                    }}
                    className="pressable"
                  >
                    <span style={{ fontSize: 24 }}>{wallet.icon}</span>
                    <span>{wallet.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseLive { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
