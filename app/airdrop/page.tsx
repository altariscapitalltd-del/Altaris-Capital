'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────
interface AirdropCampaign {
  id: string
  name: string
  symbol: string
  description: string
  logo: string
  banner: string
  totalAllocation: string
  tokenPrice: string
  eligibility: 'open' | 'wallet' | 'holders' | 'staked'
  status: 'active' | 'upcoming' | 'ended'
  startDate: string
  endDate: string
  claimed: boolean
  claimAmount: string
  claimProgress: number
  tags: string[]
  requirements: string[]
  network: string
  contractAddress: string
}

// ─── Sample Campaigns ────────────────────────────────────────────────────
const SAMPLE_CAMPAIGNS: AirdropCampaign[] = [
  {
    id: 'altaris-genesis',
    name: 'Altaris Genesis Drop',
    symbol: 'ALTR',
    description: 'Exclusive genesis airdrop for early Altaris Capital platform users. Unlock premium features and governance rights.',
    logo: 'https://altaris-capital.vercel.app/icons/icon-192x192.png',
    banner: '',
    totalAllocation: '50,000,000 ALTR',
    tokenPrice: '$0.15',
    eligibility: 'open',
    status: 'active',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    claimed: false,
    claimAmount: '2,500 ALTR',
    claimProgress: 68,
    tags: ['Genesis', 'Governance'],
    requirements: ['Connect wallet', 'Complete profile', 'Hold minimum $100'],
    network: 'Ethereum',
    contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
  {
    id: 'eth-staker-rewards',
    name: 'ETH Staker Rewards',
    symbol: 'stETH',
    description: 'Rewarding Ethereum stakers with bonus Lido stETH tokens for supporting network decentralization.',
    logo: 'https://cryptologos.cc/logos/lido-staked-ether-steth-logo.png',
    banner: '',
    totalAllocation: '10,000 stETH',
    tokenPrice: '$3,842.50',
    eligibility: 'holders',
    status: 'active',
    startDate: '2026-05-10',
    endDate: '2026-07-15',
    claimed: false,
    claimAmount: '0.5 stETH',
    claimProgress: 42,
    tags: ['Staking', 'ETH'],
    requirements: ['Hold ETH or stETH', 'Stake minimum 0.1 ETH', '30-day holding period'],
    network: 'Ethereum',
    contractAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  },
  {
    id: 'solana-ecosystem',
    name: 'Solana Ecosystem Boost',
    symbol: 'SOLB',
    description: 'Community airdrop for Solana ecosystem participants. Boost your DeFi yields across the Solana network.',
    logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    banner: '',
    totalAllocation: '5,000,000 SOLB',
    tokenPrice: '$0.08',
    eligibility: 'wallet',
    status: 'active',
    startDate: '2026-05-12',
    endDate: '2026-06-20',
    claimed: false,
    claimAmount: '10,000 SOLB',
    claimProgress: 55,
    tags: ['Solana', 'DeFi'],
    requirements: ['Solana wallet', 'Minimum 1 SOL balance', 'Active in last 30 days'],
    network: 'Solana',
    contractAddress: 'SOLB-token-address',
  },
  {
    id: 'defi-governance',
    name: 'DeFi Governance Token',
    symbol: 'DGOV',
    description: 'Governance token for the next generation of decentralized finance protocols. Vote on protocol upgrades and treasury allocations.',
    logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
    banner: '',
    totalAllocation: '100,000,000 DGOV',
    tokenPrice: '$0.25',
    eligibility: 'staked',
    status: 'upcoming',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    claimed: false,
    claimAmount: '5,000 DGOV',
    claimProgress: 0,
    tags: ['Governance', 'DeFi'],
    requirements: ['Stake LP tokens', 'Participate in governance', 'Hold qualifying assets'],
    network: 'Ethereum',
    contractAddress: '0xDGOV...token',
  },
  {
    id: 'btc-lightning',
    name: 'Lightning Network Rewards',
    symbol: 'LNR',
    description: 'Incentivizing Bitcoin Lightning Network adoption with instant, low-fee transactions.',
    logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    banner: '',
    totalAllocation: '1,000,000 LNR',
    tokenPrice: '$1.20',
    eligibility: 'wallet',
    status: 'upcoming',
    startDate: '2026-06-15',
    endDate: '2026-09-15',
    claimed: false,
    claimAmount: '500 LNR',
    claimProgress: 0,
    tags: ['Bitcoin', 'Lightning'],
    requirements: ['Lightning wallet', 'Minimum 5 transactions', 'Channel open for 14 days'],
    network: 'Bitcoin Lightning',
    contractAddress: 'ln-rewards-address',
  },
  {
    id: 'ai-crypto-rewards',
    name: 'AI x Crypto Rewards',
    symbol: 'AIC',
    description: 'Bridging AI and blockchain. Rewards for early adopters of AI-powered DeFi tools and agents.',
    logo: 'https://cryptologos.cc/logos/near-protocol-near-logo.png',
    banner: '',
    totalAllocation: '25,000,000 AIC',
    tokenPrice: '$0.45',
    eligibility: 'open',
    status: 'active',
    startDate: '2026-05-08',
    endDate: '2026-07-08',
    claimed: false,
    claimAmount: '1,200 AIC',
    claimProgress: 73,
    tags: ['AI', 'Innovation'],
    requirements: ['Connect any wallet', 'Complete AI survey', 'Follow on social'],
    network: 'NEAR',
    contractAddress: '0xAIC...token',
  },
]

// ─── Utilities ────────────────────────────────────────────────────────────
const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(14,203,129,0.12)', text: '#0ECB81' },
  upcoming: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
  ended: { bg: 'rgba(255,255,255,0.06)', text: '#888' },
}

const eligibilityLabels: Record<string, string> = {
  open: 'Open',
  wallet: 'Wallet Required',
  holders: 'Token Holders',
  staked: 'Stakers Only',
}

// ─── Components ───────────────────────────────────────────────────────────

const CampaignCard = memo(function CampaignCard({
  campaign,
  onClaim,
}: {
  campaign: AirdropCampaign
  onClaim: (id: string) => void
}) {
  const statusColor = statusColors[campaign.status] || statusColors.upcoming
  const isActive = campaign.status === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        borderRadius: 20,
        background: 'linear-gradient(180deg, var(--bg-card), var(--bg-elevated))',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden',
        }}>
          {campaign.logo ? (
            <img src={campaign.logo} alt={campaign.symbol} style={{ width: 32, height: 32, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 900 }}>{campaign.symbol[0]}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{campaign.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: statusColor.bg, color: statusColor.text,
            }}>
              {campaign.status.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{campaign.symbol} · {campaign.network}</div>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '0 16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
        {campaign.description}
      </div>

      {/* Tags */}
      <div style={{ padding: '0 16px', display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {campaign.tags.map((tag) => (
          <span key={tag} style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {tag}
          </span>
        ))}
        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(242,186,14,0.08)', color: 'var(--brand-primary)', border: '1px solid rgba(242,186,14,0.16)' }}>
          {eligibilityLabels[campaign.eligibility]}
        </span>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Allocation</div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>{campaign.totalAllocation}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Price</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-primary)' }}>{campaign.tokenPrice}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Your Claim</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--success)' }}>{campaign.claimAmount}</div>
        </div>
      </div>

      {/* Progress */}
      {isActive && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Claim Progress</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{campaign.claimProgress}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${campaign.claimProgress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ height: '100%', background: 'var(--brand-primary)', borderRadius: 2 }}
            />
          </div>
        </div>
      )}

      {/* Requirements */}
      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Requirements</div>
        {campaign.requirements.map((req, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: campaign.claimed ? 'var(--success)' : 'transparent' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{req}</span>
          </div>
        ))}
      </div>

      {/* Action */}
      <div style={{ padding: '0 16px 16px' }}>
        {isActive ? (
          <button
            onClick={() => onClaim(campaign.id)}
            disabled={campaign.claimed}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 14,
              border: 'none',
              background: campaign.claimed ? 'var(--bg-elevated)' : 'var(--brand-primary)',
              color: campaign.claimed ? 'var(--text-muted)' : '#000',
              fontWeight: 800,
              fontSize: 14,
              cursor: campaign.claimed ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: campaign.claimed ? 0.6 : 1,
              transition: 'all .15s',
            }}
            className={campaign.claimed ? '' : 'pressable'}
          >
            {campaign.claimed ? 'Claimed' : `Claim ${campaign.claimAmount}`}
          </button>
        ) : (
          <div style={{
            width: '100%', padding: '13px', borderRadius: 14, textAlign: 'center',
            background: 'var(--bg-elevated)', color: 'var(--text-muted)',
            fontWeight: 700, fontSize: 13,
          }}>
            Starts {new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </motion.div>
  )
})

// ─── Hero Banner ──────────────────────────────────────────────────────────
function AirdropHero({ onConnectWallet }: { onConnectWallet: () => void }) {
  return (
    <div style={{
      margin: '0 16px 20px',
      padding: '28px 22px',
      borderRadius: 24,
      background: 'linear-gradient(135deg, rgba(242,186,14,0.18) 0%, rgba(21,26,33,0.98) 40%, #0a0a0a 100%)',
      border: '1px solid rgba(242,186,14,0.2)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,186,14,0.15), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--brand-primary)', marginBottom: 10, textTransform: 'uppercase' }}>Web3 Rewards</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, marginBottom: 8, letterSpacing: '-0.03em' }}>Claim Your<br />Crypto Airdrops</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, maxWidth: 320 }}>
          Discover and claim premium token airdrops. Connect your wallet to unlock exclusive rewards across Ethereum, Solana, and more.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConnectWallet} style={{
            padding: '12px 22px', borderRadius: 14, background: 'var(--brand-primary)', color: '#000',
            fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          }} className="pressable" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="6" width="20" height="15" rx="2.5" /><path d="M2 10h20" /><circle cx="16" cy="15" r="1.5" fill="currentColor" /></svg>
            Connect Wallet
          </button>
          <button onClick={() => document.getElementById('campaigns')?.scrollIntoView({ behavior: 'smooth' })} style={{
            padding: '12px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
            fontWeight: 700, fontSize: 14, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
          }} className="pressable">
            Browse Airdrops
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────
function StatsBar({ campaigns }: { campaigns: AirdropCampaign[] }) {
  const active = campaigns.filter((c) => c.status === 'active').length
  const upcoming = campaigns.filter((c) => c.status === 'upcoming').length
  const totalValue = campaigns.reduce((sum, c) => sum + (parseFloat(c.claimAmount) || 0) * parseFloat(c.tokenPrice.replace('$', '')), 0)

  return (
    <div style={{ margin: '0 16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {[
        { label: 'Active', value: String(active), color: 'var(--success)' },
        { label: 'Upcoming', value: String(upcoming), color: 'var(--brand-secondary)' },
        { label: 'Total Value', value: `$${totalValue.toLocaleString()}`, color: 'var(--brand-primary)' },
      ].map((stat) => (
        <div key={stat.label} style={{ padding: 14, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function AirdropPage() {
  const [campaigns, setCampaigns] = useState<AirdropCampaign[]>(SAMPLE_CAMPAIGNS)
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all')
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  const handleConnectWallet = useCallback(() => {
    setWalletModalOpen(true)
  }, [])

  const handleClaim = useCallback((id: string) => {
    setWalletModalOpen(true)
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, claimed: true, claimProgress: Math.min(100, c.claimProgress + 5) } : c)))
    setClaimSuccess(id)
    setTimeout(() => setClaimSuccess(null), 3000)
  }, [])

  const filtered = campaigns.filter((c) => (filter === 'all' ? true : c.status === filter))

  return (
    <div style={{ padding: '14px 0 22px', minHeight: '100%' }}>
      <AirdropHero onConnectWallet={handleConnectWallet} />
      <StatsBar campaigns={campaigns} />

      {/* Filter Tabs */}
      <div style={{ margin: '0 16px 16px', display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
        {(['all', 'active', 'upcoming', 'ended'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '8px 18px', borderRadius: 99, border: '1px solid',
              borderColor: filter === tab ? 'var(--brand-primary)' : 'var(--border)',
              background: filter === tab ? 'rgba(242,186,14,0.12)' : 'var(--bg-card)',
              color: filter === tab ? 'var(--brand-primary)' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all .15s',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Claim success toast */}
      <AnimatePresence>
        {claimSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 'calc(var(--app-header-height, 64px) + 12px)', left: 16, right: 16, zIndex: 80,
              padding: '12px 16px', borderRadius: 14, background: 'rgba(14,203,129,0.15)',
              border: '1px solid rgba(14,203,129,0.25)', color: '#0ECB81',
              fontSize: 13, fontWeight: 700, textAlign: 'center', backdropFilter: 'blur(10px)',
            }}
          >
            Airdrop claimed successfully! Check your wallet.
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {walletModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setWalletModalOpen(false)}
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', maxWidth: 420, borderRadius: 18, background: 'linear-gradient(180deg,var(--bg-card),var(--bg-elevated))', border: '1px solid var(--border)', padding: 18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Connect Wallet</div>
                <button type="button" onClick={() => setWalletModalOpen(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>Choose a wallet to continue your claim.</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {['MetaMask', 'WalletConnect', 'Coinbase Wallet'].map((wallet) => (
                  <button key={wallet} type="button" onClick={() => setWalletModalOpen(false)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}>
                    {wallet}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaigns Grid */}
      <div id="campaigns" style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} onClaim={handleClaim} />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No campaigns found</div>
            <div style={{ fontSize: 13 }}>Check back later for new airdrops</div>
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
