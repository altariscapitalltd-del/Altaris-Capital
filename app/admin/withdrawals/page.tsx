'use client'
import { useEffect, useState } from 'react'

type Withdrawal = { 
  id: string; 
  amount: number; 
  currency: string; 
  status: string; 
  createdAt: string; 
  note: string;
  user: { id: string; name: string; email: string } 
}

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/withdrawals')
      .then((r) => r.json())
      .then((d) => {
        setRows(d.withdrawals || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAction = async (txId: string, action: 'APPROVE' | 'REJECT') => {
    const note = prompt(`Enter a note for this ${action.toLowerCase()} (optional):`)
    if (note === null) return

    setProcessing(txId)
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, action, note })
      })
      if (res.ok) {
        alert(`Withdrawal ${action.toLowerCase()}d successfully`)
        load()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (e) {
      alert('Failed to process withdrawal')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Withdrawal Requests</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Review and process pending withdrawal requests from users.</p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading requests...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
            No withdrawal requests found.
          </div>
        ) : (
          rows.map((w) => (
            <div key={w.id} style={{ 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: 16, 
              padding: 20, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              opacity: processing === w.id ? 0.6 : 1
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{w.user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>{w.user.email}</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Requested on {new Date(w.createdAt).toLocaleString()}
                </div>
                {w.note && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--warning)', fontStyle: 'italic' }}>
                    Note: {w.note}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 24 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-primary)' }}>
                    ${w.amount.toLocaleString()} {w.currency}
                  </div>
                  <div style={{ 
                    fontSize: 11, 
                    fontWeight: 800, 
                    color: w.status === 'PENDING' ? '#F2BA0E' : w.status === 'SUCCESS' ? '#0ECB81' : '#F6465D',
                    marginTop: 4
                  }}>
                    {w.status}
                  </div>
                </div>

                {w.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      disabled={!!processing}
                      onClick={() => handleAction(w.id, 'APPROVE')}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#0ECB81', 
                        color: '#000', 
                        border: 'none', 
                        borderRadius: 8, 
                        fontWeight: 800, 
                        fontSize: 13, 
                        cursor: 'pointer' 
                      }}
                    >
                      Approve
                    </button>
                    <button 
                      disabled={!!processing}
                      onClick={() => handleAction(w.id, 'REJECT')}
                      style={{ 
                        padding: '10px 20px', 
                        background: 'rgba(246,70,93,0.1)', 
                        color: '#F6465D', 
                        border: '1px solid rgba(246,70,93,0.2)', 
                        borderRadius: 8, 
                        fontWeight: 800, 
                        fontSize: 13, 
                        cursor: 'pointer' 
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
