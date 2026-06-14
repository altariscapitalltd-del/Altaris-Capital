'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { TokenLogo } from './TokenLogo'
import { statusColors, eligibilityLabels, type AirdropCampaign } from './types'

function CheckIcon({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden="true"
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

export const CampaignCard = memo(function CampaignCard({
  campaign,
  isConnected,
  isClaiming,
  onClaim,
}: {
  campaign: AirdropCampaign
  isConnected: boolean
  isClaiming: boolean
  onClaim: (id: string) => void
}) {
  const statusColor = statusColors[campaign.status]
  const isActive = campaign.status === 'active'
  const headingId = `campaign-${campaign.id}-title`

  let actionLabel = `Claim ${campaign.claimAmount}`
  if (campaign.claimed) actionLabel = 'Claimed'
  else if (isClaiming) actionLabel = 'Claiming…'
  else if (!isConnected) actionLabel = 'Connect wallet to claim'

  const actionDisabled = campaign.claimed || isClaiming

  return (
    <motion.article
      aria-labelledby={headingId}
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
          <TokenLogo src={campaign.logo} symbol={campaign.symbol} size={32} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h3 id={headingId} style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{campaign.name}</h3>
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
      <p style={{ padding: '0 16px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
        {campaign.description}
      </p>

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
      <dl style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '0 0 12px' }}>
        {[
          { label: 'Allocation', value: campaign.totalAllocation, color: 'var(--text-primary)' },
          { label: 'Price', value: campaign.tokenPrice, color: 'var(--brand-primary)' },
          { label: 'Your Claim', value: campaign.claimAmount, color: 'var(--success)' },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
            <dt style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{stat.label}</dt>
            <dd style={{ fontSize: 12, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* Progress */}
      {isActive && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Claim Progress</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{campaign.claimProgress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${campaign.name} claim progress`}
            aria-valuenow={campaign.claimProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}
          >
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
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {campaign.requirements.map((req) => (
            <li key={req} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <CheckIcon filled={campaign.claimed} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{req}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action */}
      <div style={{ padding: '0 16px 16px' }}>
        {isActive ? (
          <button
            type="button"
            onClick={() => onClaim(campaign.id)}
            disabled={actionDisabled}
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
              background: campaign.claimed ? 'var(--bg-elevated)' : 'var(--brand-primary)',
              color: campaign.claimed ? 'var(--text-muted)' : '#000',
              fontWeight: 800,
              fontSize: 14,
              cursor: actionDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: campaign.claimed ? 0.6 : 1,
              transition: 'all .15s',
            }}
            className={actionDisabled ? '' : 'pressable'}
          >
            {isClaiming && (
              <span
                aria-hidden="true"
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000',
                  animation: 'spin .7s linear infinite',
                }}
              />
            )}
            {actionLabel}
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
    </motion.article>
  )
})
