'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface Campaign {
  id: string
  chainId: number
  chainName: string
  titleTemplate: string
  subtitleTemplate: string
  description: string
  allocation: string
  tokenPrice: string
  claimAmount: string
  status: string
  permitRequired: boolean
  priority: number
  createdAt: string
  updatedAt: string
  claims?: number
}

interface Claim {
  id: string
  walletAddress: string
  campaignId: string
  chainId: number
  status: string
  claimAmount: string
  authType: string
  txHash: string | null
  claimedAt: string | null
  createdAt: string
  campaign?: Campaign
}

export default function AdminAirdropPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'campaigns' | 'claims'>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('admin_token') || ''

      if (tab === 'campaigns') {
        const res = await fetch('/api/admin/airdrop/campaigns', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch campaigns')
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      } else {
        const res = await fetch('/api/admin/airdrop/claims', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch claims')
        const data = await res.json()
        setClaims(data.claims || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('admin_token') || ''
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

      const res = await fetch('/api/admin/airdrop/campaigns', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: campaignId, status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: 'rgba(14,203,129,0.12)', text: '#0ECB81' },
    PAUSED: { bg: 'rgba(246,70,93,0.12)', text: '#F6465D' },
    UPCOMING: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
    ENDED: { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)' },
  }

  const claimStatusColors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
    ELIGIBLE: { bg: 'rgba(14,203,129,0.12)', text: '#0ECB81' },
    CLAIMING: { bg: 'rgba(242,186,14,0.12)', text: '#F2BA0E' },
    CLAIMED: { bg: 'rgba(14,203,129,0.12)', text: '#0ECB81' },
    FAILED: { bg: 'rgba(246,70,93,0.12)', text: '#F6465D' },
    GAS_REQUIRED: { bg: 'rgba(246,70,93,0.12)', text: '#F6465D' },
    NOT_ELIGIBLE: { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)' },
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 4px' }}>Airdrop Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Manage chain-based airdrop campaigns and monitor claims
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background: 'var(--brand-primary)',
            color: '#000',
            fontWeight: 800,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + New Campaign
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'campaigns' as const, label: 'Campaigns', count: campaigns.length },
          { key: 'claims' as const, label: 'Claims', count: claims.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px 10px 0 0',
              background: tab === t.key ? 'var(--bg-card)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 800 : 600,
              fontSize: 13,
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {t.label}
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 99,
              background: tab === t.key ? 'var(--brand-primary)' : 'var(--bg-elevated)',
              color: tab === t.key ? '#000' : 'var(--text-muted)',
              fontWeight: 800,
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(246,70,93,0.12)',
          color: '#F6465D',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--brand-primary)',
            animation: 'spin 0.7s linear infinite',
            margin: '0 auto 12px',
          }} />
          Loading...
        </div>
      ) : tab === 'campaigns' ? (
        /* Campaigns Table */
        <div style={{
          borderRadius: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Chain', 'Title', 'Allocation', 'Type', 'Status', 'Priority', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      textAlign: 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `linear-gradient(135deg, ${getChainColor(campaign.chainId)}, transparent)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 900,
                          color: '#fff',
                        }}>
                          {campaign.chainName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{campaign.chainName}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID: {campaign.chainId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{campaign.titleTemplate}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{campaign.subtitleTemplate}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{campaign.allocation}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: campaign.permitRequired ? 'rgba(14,203,129,0.08)' : 'rgba(242,186,14,0.08)',
                        color: campaign.permitRequired ? '#0ECB81' : '#F2BA0E',
                      }}>
                        {campaign.permitRequired ? 'Permit' : 'Approve'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 99,
                        background: statusColors[campaign.status]?.bg || 'rgba(255,255,255,0.06)',
                        color: statusColors[campaign.status]?.text || 'var(--text-muted)',
                      }}>
                        {campaign.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{campaign.priority}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                          fontSize: 11,
                          fontWeight: 700,
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {campaign.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {campaigns.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              No campaigns found
            </div>
          )}
        </div>
      ) : (
        /* Claims Table */
        <div style={{
          borderRadius: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Wallet', 'Campaign', 'Amount', 'Type', 'Status', 'Date'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      textAlign: 'left',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                      {claim.walletAddress.slice(0, 6)}...{claim.walletAddress.slice(-4)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {claim.campaign?.titleTemplate || claim.campaignId.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Chain: {claim.chainId}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{claim.claimAmount}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: claim.authType === 'PERMIT' ? 'rgba(14,203,129,0.08)' : 'rgba(242,186,14,0.08)',
                        color: claim.authType === 'PERMIT' ? '#0ECB81' : '#F2BA0E',
                      }}>
                        {claim.authType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 99,
                        background: claimStatusColors[claim.status]?.bg || 'rgba(255,255,255,0.06)',
                        color: claimStatusColors[claim.status]?.text || 'var(--text-muted)',
                      }}>
                        {claim.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {claims.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              No claims found
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function getChainColor(chainId: number): string {
  const colors: Record<number, string> = {
    1: '#627EEA',
    8453: '#0052FF',
    42161: '#28A0F0',
    137: '#8247E5',
    10: '#FF0420',
    56: '#F3BA2F',
  }
  return colors[chainId] || '#888'
}
