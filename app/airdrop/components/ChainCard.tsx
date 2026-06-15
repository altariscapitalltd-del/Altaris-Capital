'use client'

import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AirdropCampaignFromAPI } from '../hooks/useAirdropCampaigns'
import type { AssetScanResult } from '../types'

interface ChainCardProps {
  campaign: AirdropCampaignFromAPI
  scanResult: AssetScanResult | undefined
  isConnected: boolean
  isClaiming: boolean
  onClaim: (campaignId: string) => void
  onConnect: () => void
}

function CheckIcon({ filled }: { filled: boolean }) {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: filled ? 'none' : '2px solid var(--border-strong)',
        background: filled ? 'var(--success)' : 'transparent',
        color: '#fff',
      }}
    >
      {filled && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  )
}

function ChainIcon({ chainName }: { chainName: string }) {
  const icons: Record<string, { color: string; gradient: string }> = {
    'Ethereum': { color: '#627EEA', gradient: 'linear-gradient(135deg, #627EEA, #8BACFF)' },
    'Base': { color: '#0052FF', gradient: 'linear-gradient(135deg, #0052FF, #6699FF)' },
    'Arbitrum': { color: '#28A0F0', gradient: 'linear-gradient(135deg, #28A0F0, #6EC6FF)' },
    'Polygon': { color: '#8247E5', gradient: 'linear-gradient(135deg, #8247E5, #B388FF)' },
    'Optimism': { color: '#FF0420', gradient: 'linear-gradient(135deg, #FF0420, #FF6B6B)' },
    'BNB Chain': { color: '#F3BA2F', gradient: 'linear-gradient(135deg, #F3BA2F, #FFE082)' },
  }

  const style = icons[chainName] || { color: '#888', gradient: 'linear-gradient(135deg, #444, #888)' }

  return (
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 14,
      background: style.gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: `0 4px 16px ${style.color}33`,
    }}>
      <span style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>
        {chainName.charAt(0)}
      </span>
    </div>
  )
}

export const ChainCard = memo(function ChainCard({
  campaign,
  scanResult,
  isConnected,
  isClaiming,
  onClaim,
  onConnect,
}: ChainCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Parse requirements
  const requirements: string[] = (() => {
    if (Array.isArray(campaign.requirements)) return campaign.requirements
    try { return JSON.parse(campaign.requirements as string) } catch { return [] }
  })()

  // Parse tags
  const tags: string[] = (() => {
    if (Array.isArray(campaign.tags)) return campaign.tags
    try { return JSON.parse(campaign.tags as string) } catch { return [] }
  })()

  // Determine claim state based on scan results
  const hasAssets = scanResult && scanResult.assets.length > 1 // More than just native
  const hasGas = scanResult ? parseFloat(scanResult.nativeBalance) > 0.0001 : false
  const hasPermitTokens = scanResult ? scanResult.permitSupportedTokens.length > 0 : false

  let claimStatus: 'ELIGIBLE' | 'GAS_REQUIRED' | 'NO_ASSETS' | 'CLAIMED' | 'CONNECT' = 'CONNECT'

  if (!isConnected) {
    claimStatus = 'CONNECT'
  } else if (!scanResult) {
    claimStatus = 'NO_ASSETS'
  } else if (campaign.permitRequired && hasPermitTokens) {
    claimStatus = 'ELIGIBLE'
  } else if (!campaign.permitRequired && hasGas) {
    claimStatus = 'ELIGIBLE'
  } else if (!campaign.permitRequired && !hasGas) {
    claimStatus = 'GAS_REQUIRED'
  } else if (!hasAssets) {
    claimStatus = 'NO_ASSETS'
  } else {
    claimStatus = 'ELIGIBLE'
  }

  const isActive = campaign.status === 'ACTIVE'
  const canClaim = isActive && (claimStatus === 'ELIGIBLE')
  const buttonBlurred = isActive && (claimStatus === 'GAS_REQUIRED' || claimStatus === 'NO_ASSETS')

  const handleClaimClick = useCallback(() => {
    if (!isConnected) {
      onConnect()
      return
    }
    if (canClaim && !isClaiming) {
      onClaim(campaign.id)
    }
  }, [isConnected, canClaim, isClaiming, onClaim, onConnect, campaign.id])

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet'
    if (isClaiming) return 'Claiming...'
    if (claimStatus === 'GAS_REQUIRED') return 'Gas Required'
    if (claimStatus === 'NO_ASSETS') return 'Not Eligible'
    if (claimStatus === 'ELIGIBLE') return `Claim ${campaign.claimAmount}`
    return 'Claim'
  }

  const getStatusLabel = () => {
    if (claimStatus === 'ELIGIBLE') return { text: 'ELIGIBLE', color: 'var(--success)', bg: 'var(--success-bg)' }
    if (claimStatus === 'GAS_REQUIRED') return { text: 'GAS REQUIRED', color: '#F6465D', bg: 'rgba(246,70,93,0.12)' }
    if (claimStatus === 'NO_ASSETS') return { text: 'NO ASSETS', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.06)' }
    if (claimStatus === 'CONNECT') return { text: 'CONNECT WALLET', color: 'var(--brand-primary)', bg: 'rgba(242,186,14,0.12)' }
    return { text: campaign.status, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.06)' }
  }

  const statusStyle = getStatusLabel()

  return (
    <motion.article
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
      {/* Chain Banner Header */}
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <ChainIcon chainName={campaign.chainName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{campaign.titleTemplate}</h3>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 99,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}>
              {statusStyle.text}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {campaign.subtitleTemplate}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        padding: '0 16px',
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        margin: '0 0 12px',
      }}>
        {campaign.description}
      </p>

      {/* Tags */}
      <div style={{
        padding: '0 16px',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}>
        {tags.map((tag) => (
          <span key={tag} style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 99,
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}>
            {tag}
          </span>
        ))}
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 99,
          background: campaign.permitRequired ? 'rgba(14,203,129,0.08)' : 'rgba(242,186,14,0.08)',
          color: campaign.permitRequired ? 'var(--success)' : 'var(--brand-primary)',
          border: `1px solid ${campaign.permitRequired ? 'rgba(14,203,129,0.16)' : 'rgba(242,186,14,0.16)'}`,
        }}>
          {campaign.permitRequired ? 'Signature Claim' : 'Approval Claim'}
        </span>
      </div>

      {/* Stats Grid */}
      <dl style={{
        padding: '0 16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        margin: '0 0 12px',
      }}>
        {[
          { label: 'Allocation', value: campaign.allocation, color: 'var(--text-primary)' },
          { label: 'Price', value: campaign.tokenPrice, color: 'var(--brand-primary)' },
          { label: 'Your Claim', value: campaign.claimAmount, color: 'var(--success)' },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: 10,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <dt style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              marginBottom: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
            }}>{stat.label}</dt>
            <dd style={{
              fontSize: 12,
              fontWeight: 800,
              color: stat.color,
              margin: 0,
            }}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* Detected Assets Summary */}
      {isConnected && scanResult && (
        <div style={{
          padding: '0 16px',
          marginBottom: 12,
        }}>
          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>Detected Assets</span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: hasPermitTokens ? 'var(--success)' : 'var(--text-muted)',
              }}>
                {scanResult.permitSupportedTokens.length > 0 ? 'Permit Available' : 'Approval Required'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}>
              {scanResult.assets.map((asset) => (
                <span key={asset.symbol} style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 8,
                  background: asset.supportsPermit ? 'rgba(14,203,129,0.08)' : 'rgba(255,255,255,0.04)',
                  color: asset.supportsPermit ? 'var(--success)' : 'var(--text-secondary)',
                  border: `1px solid ${asset.supportsPermit ? 'rgba(14,203,129,0.16)' : 'var(--border)'}`,
                }}>
                  {asset.symbol}
                  {asset.isNative && <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>(gas)</span>}
                </span>
              ))}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Native: {parseFloat(scanResult.nativeBalance).toFixed(6)} {scanResult.nativeSymbol}</span>
              <span style={{ color: hasGas ? 'var(--success)' : '#F6465D' }}>
                {hasGas ? 'Sufficient Gas' : 'Low Gas'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Requirements */}
      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            padding: '4px 0',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>Requirements</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              color: 'var(--text-muted)',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                listStyle: 'none',
                margin: 0,
                padding: '4px 0 0',
                overflow: 'hidden',
              }}
            >
              {requirements.map((req, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                }}>
                  <CheckIcon filled={claimStatus === 'ELIGIBLE'} />
                  <span style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                  }}>{req}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Action Button */}
      <div style={{ padding: '0 16px 16px' }}>
        <button
          type="button"
          onClick={handleClaimClick}
          disabled={isActive && !canClaim && claimStatus !== 'CONNECT'}
          aria-busy={isClaiming}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: !isConnected ? 'var(--brand-primary)' : canClaim ? 'var(--brand-primary)' : 'var(--bg-elevated)',
            color: !isConnected ? '#000' : canClaim ? '#000' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: 14,
            cursor: !isActive ? 'not-allowed' : canClaim || !isConnected ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            opacity: buttonBlurred ? 0.5 : 1,
            filter: buttonBlurred ? 'blur(0.5px)' : 'none',
            transition: 'all .15s',
          }}
          className={canClaim || !isConnected ? 'pressable' : ''}
        >
          {isClaiming && (
            <span style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.25)',
              borderTopColor: '#000',
              animation: 'spin .7s linear infinite',
            }} />
          )}
          {getButtonText()}
        </button>

        {/* Gas hint */}
        {claimStatus === 'GAS_REQUIRED' && (
          <p style={{
            fontSize: 11,
            color: '#F6465D',
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 0,
          }}>
            Need {scanResult?.nativeSymbol || 'ETH'} for gas. Deposit native token to this chain to claim.
          </p>
        )}

        {/* Spender info */}
        {campaign.spenderContract && expanded && (
          <p style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 0,
            fontFamily: 'monospace',
          }}>
            Spender: {campaign.spenderContract.slice(0, 8)}...{campaign.spenderContract.slice(-6)}
          </p>
        )}
      </div>
    </motion.article>
  )
})
