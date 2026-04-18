'use client'
import { useEffect, useState } from 'react'

type Tx = {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  note?: string
  createdAt: string
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string; isCredit: boolean }> = {
  DEPOSIT:    { icon: '⬇', color: '#0ECB81', label: 'Deposit',        isCredit: true  },
  WITHDRAWAL: { icon: '⬆', color: '#F6465D', label: 'Withdrawal',     isCredit: false },
  INVESTMENT: { icon: '📈', color: '#F2BA0E', label: 'Investment',     isCredit: false },
  ROI:        { icon: '💰', color: '#0ECB81', label: 'ROI Credit',     isCredit: true  },
  BONUS:      { icon: '🎁', color: '#F2BA0E', label: 'Bonus',          isCredit: true  },
  REFERRAL:   { icon: '👥', color: '#A78BFA', label: 'Referral Bonus', isCredit: true  },
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS:   '#0ECB81',
  COMPLETED: '#0ECB81',
  PENDING:   '#F2BA0E',
  FAILED:    '#F6465D',
  CANCELLED: '#F6465D',
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(d => {
        // Filter out ADJUSTMENT — internal admin entries never shown to users
        const visible = (d.transactions || []).filter((t: Tx) => t.type !== 'ADJUSTMENT')
        setTxs(visible)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const FILTERS = ['ALL', 'DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'ROI', 'BONUS', 'REFERRAL']
  const filtered = txs.filter(t => filter === 'ALL' || t.type === filter)
  const paged = filtered.slice(0, page * 20)

  // Summary stats
  const totalIn  = txs.filter(t => TYPE_CONFIG[t.type]?.isCredit).reduce((s, t) => s + t.amount, 0)
  const totalOut = txs.filter(t => !TYPE_CONFIG[t.type]?.isCredit).reduce((s, t) => s + t.amount, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Transaction History</h1>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'rgba(14,203,129,0.06)', border: '1px solid rgba(14,203,129,0.14)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0ECB81', letterSpacing: '0.06em', marginBottom: 4 }}>TOTAL IN</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0ECB81' }}>
              +${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: 'rgba(246,70,93,0.06)', border: '1px solid rgba(246,70,93,0.14)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#F6465D', letterSpacing: '0.06em', marginBottom: 4 }}>TOTAL OUT</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F6465D' }}>
              -${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 16 }} className="no-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'active' : ''}`} style={{ fontSize: 12 }}>
              {f === 'ALL' ? 'All' : TYPE_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {paged.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No transactions yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Your transaction history will appear here</div>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {paged.map((tx, i) => {
            const cfg = TYPE_CONFIG[tx.type] || { icon: '•', color: 'var(--text-muted)', label: tx.type, isCredit: false }
            const date = new Date(tx.createdAt)
            const prevDate = i > 0 ? new Date(paged[i - 1].createdAt) : null
            const isNewDay = !prevDate || prevDate.toDateString() !== date.toDateString()
            const statusColor = STATUS_COLOR[tx.status] || 'var(--text-muted)'

            return (
              <div key={tx.id}>
                {isNewDay && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, padding: '12px 0 6px', letterSpacing: '0.04em' }}>
                    {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
                  {/* Icon */}
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${cfg.color}25` }}>
                    {cfg.icon}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{cfg.label}</div>
                    {tx.note && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.note}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ color: statusColor, fontWeight: 700 }}>• {tx.status}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: cfg.isCredit ? '#0ECB81' : '#F6465D' }}>
                      {cfg.isCredit ? '+' : '-'}{tx.currency} {Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                      {tx.currency === 'USD' ? '' : `≈ $${Math.abs(tx.amount).toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length > paged.length && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ width: '100%', marginTop: 16, padding: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Load More ({filtered.length - paged.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
