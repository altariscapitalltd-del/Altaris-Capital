'use client'

import type { AirdropCampaign } from './types'

export function StatsBar({ campaigns }: { campaigns: AirdropCampaign[] }) {
  const active = campaigns.filter((c) => c.status === 'active').length
  const upcoming = campaigns.filter((c) => c.status === 'upcoming').length
  const totalValue = campaigns.reduce(
    (sum, c) => sum + (parseFloat(c.claimAmount) || 0) * (parseFloat(c.tokenPrice.replace(/[$,]/g, '')) || 0),
    0,
  )

  const stats = [
    { label: 'Active', value: String(active), color: 'var(--success)' },
    { label: 'Upcoming', value: String(upcoming), color: 'var(--brand-secondary)' },
    { label: 'Total Value', value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--brand-primary)' },
  ]

  return (
    <dl style={{ margin: '0 16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {stats.map((stat) => (
        <div key={stat.label} style={{ padding: 14, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <dd style={{ fontSize: 20, fontWeight: 900, color: stat.color, margin: '0 0 2px' }}>{stat.value}</dd>
          <dt style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</dt>
        </div>
      ))}
    </dl>
  )
}
