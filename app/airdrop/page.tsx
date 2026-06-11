'use client'

import { useState, useCallback } from 'react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import '@/lib/airdrop-reown'
import { motion, AnimatePresence } from 'framer-motion'
import { AirdropHero } from './AirdropHero'
import { StatsBar } from './StatsBar'
import { CampaignCard } from './CampaignCard'
import { SAMPLE_CAMPAIGNS } from './campaigns'
import type { AirdropCampaign, CampaignFilter } from './types'

const FILTERS: CampaignFilter[] = ['all', 'active', 'upcoming', 'ended']

export default function AirdropPage() {
  const [campaigns, setCampaigns] = useState<AirdropCampaign[]>(SAMPLE_CAMPAIGNS)
  const [filter, setFilter] = useState<CampaignFilter>('all')
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  const handleConnectWallet = useCallback(async () => {
    try {
      await open({ view: 'Connect' })
    } catch (error) {
      console.error('Failed to open wallet connect modal', error)
    }
  }, [open])

  const handleManageWallet = useCallback(async () => {
    try {
      await open({ view: 'Account' })
    } catch (error) {
      console.error('Failed to open wallet account modal', error)
    }
  }, [open])

  const handleClaim = useCallback(async (id: string) => {
    if (!isConnected) {
      await handleConnectWallet()
      return
    }
    if (claimingId) return

    setClaimingId(id)
    // Simulated settlement window — replace with the on-chain claim / API call.
    await new Promise((resolve) => setTimeout(resolve, 1200))

    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, claimed: true, claimProgress: Math.min(100, c.claimProgress + 5) } : c)),
    )
    setClaimingId(null)
    setClaimSuccess(id)
    setTimeout(() => setClaimSuccess(null), 3000)
  }, [claimingId, handleConnectWallet, isConnected])

  const filtered = campaigns.filter((c) => (filter === 'all' ? true : c.status === filter))

  return (
    <main style={{ padding: '14px 0 22px', minHeight: '100%' }}>
      <h1 className="sr-only">Crypto airdrops</h1>

      <AirdropHero
        isConnected={isConnected}
        address={address}
        onConnectWallet={handleConnectWallet}
        onManageWallet={handleManageWallet}
      />
      <StatsBar campaigns={campaigns} />

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter airdrops by status"
        style={{ margin: '0 16px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}
        className="no-scrollbar"
      >
        {FILTERS.map((tab) => {
          const selected = filter === tab
          return (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setFilter(tab)}
              style={{
                padding: '8px 18px', borderRadius: 99, border: '1px solid',
                borderColor: selected ? 'var(--brand-primary)' : 'var(--border)',
                background: selected ? 'rgba(242,186,14,0.12)' : 'var(--bg-card)',
                color: selected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all .15s',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          )
        })}
      </div>

      {/* Claim success toast */}
      <div aria-live="polite" role="status">
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
      </div>

      {/* Campaigns */}
      <div id="campaigns" style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            isConnected={isConnected}
            isClaiming={claimingId === campaign.id}
            onClaim={handleClaim}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No campaigns found</div>
            <div style={{ fontSize: 13 }}>Check back later for new airdrops</div>
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </main>
  )
}
