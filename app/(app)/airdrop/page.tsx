'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import AnimatedPage from '@/components/animations/AnimatedPage'
import { BottomNav } from '@/components/layout/BottomNav'
import { AltarisLogoMark } from '@/components/AltarisLogo'

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

const AIRDROP_ITEMS: AirdropItem[] = [
  {
    id: 'altaris-launch', title: 'Altaris Capital Launch Airdrop', token: 'Altaris Token', tokenSymbol: 'ALT',
    amount: 2500, value: '$250', status: 'claimable',
    eligibility: ['Connect wallet', 'Follow on X', 'Join Discord', 'Refer 1 friend'],
    description: 'Early supporter reward for the Altaris Capital platform launch. Claim your share of the genesis token distribution.',
    endsAt: '2025-06-30', totalClaimed: 18432, totalSupply: 100000, chain: 'Ethereum', color: '#F2BA0E', icon: '◆',
  },
  {
    id: 'defi-yield', title: 'DeFi Yield Booster Drop', token: 'Yield Token', tokenSymbol: 'YIELD',
    amount: 500, value: '$75', status: 'claimable',
    eligibility: ['Hold $100+ in DeFi plan', 'Active for 7+ days', 'Connect wallet'],
    description: 'Exclusive yield booster tokens for active DeFi investors on the Altaris platform.',
    endsAt: '2025-07-15', totalClaimed: 8432, totalSupply: 50000, chain: 'Arbitrum', color: '#28A0F0', icon: '📈',
  },
  {
    id: 'bitcoin-rewards', title: 'Bitcoin Halving Celebration', token: 'Wrapped BTC Rewards', tokenSymbol: 'wBTC',
    amount: 0.005, value: '$542', status: 'claimable',
    eligibility: ['Deposit $500+', 'Hold BTC in wallet', 'Complete KYC'],
    description: 'Celebrate the Bitcoin halving with exclusive wBTC rewards for platform users.',
    endsAt: '2025-07-01', totalClaimed: 2451, totalSupply: 10000, chain: 'Bitcoin', color: '#F7931A', icon: '₿',
  },
  {
    id: 'solana-summer', title: 'Solana Summer Airdrop', token: 'Solana Token', tokenSymbol: 'SOL',
    amount: 2.5, value: '$495', status: 'upcoming',
    eligibility: ['Hold SOL in wallet', 'Trade SOL on platform', 'Stake $200+'],
    description: 'Summer season SOL rewards for active traders and stakers on the platform.',
    endsAt: '2025-08-01', totalClaimed: 0, totalSupply: 25000, chain: 'Solana', color: '#9945FF', icon: '◎',
  },
  {
    id: 'ethereum-staking', title: 'Ethereum Staking Rewards', token: 'Staked ETH', tokenSymbol: 'stETH',
    amount: 0.15, value: '$547', status: 'claimable',
    eligibility: ['Stake ETH in plan', 'Hold for 14+ days', 'Connect wallet'],
    description: 'Staking rewards for Ethereum holders who participate in platform investment plans.',
    endsAt: '2025-07-30', totalClaimed: 5621, totalSupply: 20000, chain: 'Ethereum', color: '#627EEA', icon: 'Ξ',
  },
  {
    id: 'community-nft', title: 'Community OG NFT Pass', token: 'OG Pass NFT', tokenSymbol: 'OGPASS',
    amount: 1, value: '$1,200', status: 'ended',
    eligibility: ['First 1000 users', 'Platform beta tester', 'Community contributor'],
    description: 'Limited edition OG NFT pass for early community members and beta testers.',
    endsAt: '2025-04-30', totalClaimed: 1000, totalSupply: 1000, chain: 'Polygon', color: '#8247E5', icon: '👑',
  },
]

function CountDown({ target }: { target: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now())
      setTime({ d: Math.floor(diff / 86400000), h: Math.floor(diff / 3600000) % 24, m: Math.floor(diff / 60000) % 60, s: Math.floor(diff / 1000) % 60 })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [target])
  return (
    <div className="flex gap-1.5">
      {[{ v: time.d, l: 'D' }, { v: time.h, l: 'H' }, { v: time.m, l: 'M' }, { v: time.s, l: 'S' }].map(({ v, l }) => (
        <div key={l} className="text-center min-w-[28px] px-1.5 py-1 bg-black/50 rounded-md border border-white/[0.06]">
          <div className="font-black text-xs tabular-nums">{String(v).padStart(2, '0')}</div>
          <div className="text-[8px] text-[#666] font-bold">{l}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ current, total, color }: { current: number; total: number; color: string }) {
  const pct = Math.min(100, (current / total) * 100)
  return (
    <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
    </div>
  )
}

export default function InAppAirdropPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'claimable' | 'upcoming' | 'ended'>('all')
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const [connecting, setConnecting] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('altaris_claimed_airdrops')
      if (saved) setClaimedIds(JSON.parse(saved))
      const wallet = localStorage.getItem('altaris_airdrop_wallet')
      if (wallet) { setWalletConnected(true); setWalletAddress(wallet) }
    } catch {}
  }, [])

  const handleClaim = (id?: string) => {
    if (!walletConnected) {
      setConnecting(true)
      setTimeout(() => {
        const mockAddress = '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
        setWalletAddress(mockAddress)
        setWalletConnected(true)
        setConnecting(false)
        try { localStorage.setItem('altaris_airdrop_wallet', mockAddress) } catch {}
      }, 1500)
      return
    }
    if (!id) return
    const updated = [...claimedIds, id]
    setClaimedIds(updated)
    try { localStorage.setItem('altaris_claimed_airdrops', JSON.stringify(updated)) } catch {}
  }

  const filteredItems = AIRDROP_ITEMS.filter(item => {
    if (activeTab === 'all') return true
    if (claimedIds.includes(item.id)) return activeTab === 'claimable' ? false : item.status === activeTab
    return item.status === activeTab
  }).map(item => ({ ...item, status: claimedIds.includes(item.id) ? 'claimed' as const : item.status }))

  const stats = {
    totalValue: AIRDROP_ITEMS.reduce((sum, item) => sum + parseFloat(item.value.replace('$', '').replace(',', '')), 0),
    activeDrops: AIRDROP_ITEMS.filter(i => i.status === 'claimable').length,
    userClaims: claimedIds.length,
  }

  return (
    <AnimatedPage className="min-h-[100dvh]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[var(--border)]">
        <div className="max-w-[430px] mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AltarisLogoMark size={24} />
            <span className="font-extrabold text-sm tracking-widest uppercase">Airdrops</span>
          </div>
          <div className="text-right">
            {walletConnected ? (
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#0ECB81]/10 text-[#0ECB81] text-xs font-bold border border-[#0ECB81]/20">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            ) : (
              <button onClick={() => handleClaim()} className="px-4 py-1.5 bg-[var(--primary)] text-[var(--bg-dark)] rounded-lg font-extrabold text-xs">
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pb-24">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3 text-center">
            <div className="text-[#F2BA0E] font-black text-lg">${stats.totalValue.toLocaleString()}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">Total Value</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3 text-center">
            <div className="text-[#0ECB81] font-black text-lg">{stats.activeDrops}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">Available</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3 text-center">
            <div className="text-[#3B82F6] font-black text-lg">{stats.userClaims}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">Your Claims</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'all' as const, label: 'All', count: AIRDROP_ITEMS.length },
            { id: 'claimable' as const, label: 'Claimable', count: AIRDROP_ITEMS.filter(i => i.status === 'claimable').length },
            { id: 'upcoming' as const, label: 'Upcoming', count: AIRDROP_ITEMS.filter(i => i.status === 'upcoming').length },
            { id: 'ended' as const, label: 'Ended', count: AIRDROP_ITEMS.filter(i => i.status === 'ended').length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeTab === tab.id ? 'bg-[#F2BA0E]/12 text-[#F2BA0E] border-[#F2BA0E]/25' : 'bg-white/[0.02] text-[#666] border-white/[0.06]'
            }`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-[#F2BA0E]/20' : 'bg-white/[0.04]'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Airdrop Cards */}
        <div className="flex flex-col gap-3">
          {filteredItems.map(item => (
            <AirdropCard key={item.id} item={item} onClaim={handleClaim} walletConnected={walletConnected} connecting={connecting} />
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-[#444]">
              <div className="text-4xl mb-4">📭</div>
              <div className="font-bold text-base text-[#666] mb-2">No airdrops found</div>
              <div className="text-sm">Check back soon for new opportunities</div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </AnimatedPage>
  )
}

function AirdropCard({ item, onClaim, walletConnected, connecting }: { item: AirdropItem; onClaim: (id: string) => void; walletConnected: boolean; connecting: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig = {
    claimable: { label: 'Claim Now', bg: 'bg-[#0ECB81]/10', color: 'text-[#0ECB81]', border: 'border-[#0ECB81]/20' },
    claimed: { label: 'Claimed', bg: 'bg-[#3B82F6]/10', color: 'text-[#3B82F6]', border: 'border-[#3B82F6]/20' },
    ended: { label: 'Ended', bg: 'bg-[#F6465D]/8', color: 'text-[#F6465D]/60', border: 'border-[#F6465D]/10' },
    upcoming: { label: 'Soon', bg: 'bg-[#F2BA0E]/8', color: 'text-[#F2BA0E]', border: 'border-[#F2BA0E]/15' },
  }
  const sc = statusConfig[item.status]

  return (
    <div className={`bg-gradient-to-b from-[#0A0A0A] to-[#070707] rounded-2xl p-4 border ${item.status === 'claimable' ? 'border-[#F2BA0E]/20 shadow-[0_0_30px_rgba(242,186,14,0.08)]' : 'border-[var(--border)]'} relative overflow-hidden`}>
      {item.status === 'claimable' && <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${item.color}10, transparent)` }} />}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${item.color}20, ${item.color}08)`, border: `1px solid ${item.color}30` }}>
              {item.icon}
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">{item.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${sc.bg} ${sc.color} ${sc.border}`}>{sc.label}</span>
                <span className="text-[10px] text-[#555]">{item.chain}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black text-base" style={{ color: item.color }}>{item.amount.toLocaleString()} <span className="text-xs">{item.tokenSymbol}</span></div>
            <div className="text-xs text-[var(--text-muted)] font-semibold">~{item.value}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-3">{item.description}</p>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Claimed</span>
            <span className="text-[11px] font-extrabold">{item.totalClaimed.toLocaleString()} / {item.totalSupply.toLocaleString()}</span>
          </div>
          <ProgressBar current={item.totalClaimed} total={item.totalSupply} color={item.color} />
        </div>

        {/* Countdown */}
        {item.status !== 'ended' && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">ENDS IN:</span>
            <CountDown target={item.endsAt} />
          </div>
        )}

        {/* Eligibility Toggle */}
        <button onClick={() => setExpanded(!expanded)} className="w-full text-center text-xs font-semibold text-[var(--text-muted)] py-2 flex items-center justify-center gap-1.5">
          {expanded ? 'Hide' : 'Show'} Requirements
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {expanded && (
          <div className="p-3 bg-white/[0.02] rounded-xl mb-3">
            {item.eligibility.map((req, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.02] last:border-0">
                <div className="w-5 h-5 rounded-full border-2 border-[#0ECB81] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#0ECB81" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{req}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {item.status === 'claimable' && (
          <button
            onClick={() => onClaim(item.id)}
            className="w-full py-3 rounded-xl font-extrabold text-sm border-0 cursor-pointer pressable"
            style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`, color: '#000', boxShadow: `0 8px 24px ${item.color}30` }}
            disabled={connecting}
          >
            {connecting ? 'Connecting Wallet...' : `Claim ${item.amount.toLocaleString()} ${item.tokenSymbol}`}
          </button>
        )}
        {item.status === 'upcoming' && (
          <button disabled className="w-full py-3 rounded-xl font-bold text-sm border border-white/[0.06] bg-white/[0.02] text-[#555] cursor-not-allowed">
            Starts {new Date(item.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
        )}
        {item.status === 'ended' && (
          <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-[#F6465D]/5 text-[#F6465D]/60 border border-[#F6465D]/10">
            Airdrop Ended
          </div>
        )}
        {item.status === 'claimed' && (
          <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-[#3B82F6]/5 text-[#3B82F6] border border-[#3B82F6]/10">
            ✓ Claimed
          </div>
        )}
      </div>
    </div>
  )
}
