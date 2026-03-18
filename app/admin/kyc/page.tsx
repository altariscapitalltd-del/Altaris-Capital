'use client'
import { useEffect, useState } from 'react'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [filter, setFilter] = useState('PENDING_REVIEW')
  const [selected, setSelected] = useState<any>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useBodyScrollLock(!!selected)

  const load = async () => {
    const res = await fetch(`/api/admin/kyc?status=${filter}`)
    const data = await res.json()
    setSubmissions(data.submissions || [])
  }

  useEffect(() => { load() }, [filter])

  async function decide(action: 'approve' | 'reject') {
    if (!selected) return
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/admin/kyc', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selected.userId, action, reason: note }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMsg({ type: 'success', text: `KYC ${action}d successfully.` })
      setSelected(null)
      setNote('')
      load()
    } else {
      setMsg({ type: 'error', text: data.error || 'Unable to complete review.' })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>KYC Review Center</h1>
          <p style={{ color: '#666', fontSize: 12 }}>Review live submissions, inspect uploaded files, and approve or reset verification status.</p>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: msg.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: msg.type === 'success' ? '#4ade80' : '#f87171', border: '1px solid rgba(255,255,255,0.08)' }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['PENDING_REVIEW', 'APPROVED', 'ALL'].map((item) => <button key={item} onClick={() => setFilter(item)} style={{ borderRadius: 999, padding: '8px 14px', border: '1px solid rgba(255,255,255,0.08)', background: filter === item ? '#F2BA0E' : '#111', color: filter === item ? '#000' : '#ddd', fontWeight: 800 }}>{item.replace('_', ' ')}</button>)}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {submissions.map((s) => <div key={s.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 18, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{s.fullName}</div>
              <div style={{ color: '#888', fontSize: 12 }}>{s.user?.email}</div>
            </div>
            <button onClick={() => setSelected(s)} style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: 'rgba(242,186,14,0.12)', color: '#F2BA0E', fontWeight: 800 }}>Open review</button>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#cbd5e1', fontSize: 12 }}>
            <span>Country: {s.country || s.address}</span>
            <span>Document: {s.documentType || '—'}</span>
            <span>Doc #: {s.documentNumber || '—'}</span>
            <span>Submitted: {new Date(s.submittedAt).toLocaleString()}</span>
          </div>
        </div>)}
      </div>

      {selected && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 20 }} onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
        <div style={{ width: 'min(1100px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#09090b', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{selected.fullName}</div>
              <div style={{ color: '#888', fontSize: 12 }}>{selected.user?.email}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#111', color: '#fff' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#111' }}>
                {selected.documentPath?.endsWith('.pdf') ? <iframe src={`/api/admin/kyc/files/${selected.documentPath}`} style={{ width: '100%', height: 400, border: 'none' }} /> : <img src={`/api/admin/kyc/files/${selected.documentPath}`} alt="document" style={{ width: '100%', height: 400, objectFit: 'contain', background: '#000' }} />}
              </div>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#111' }}>
                <img src={`/api/admin/kyc/files/${selected.selfiePath}`} alt="selfie" style={{ width: '100%', height: 320, objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ background: '#111', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  ['Full name', selected.fullName],
                  ['Date of birth', selected.dateOfBirth],
                  ['Country', selected.country || selected.address],
                  ['Document type', selected.documentType],
                  ['Document number', selected.documentNumber],
                ].map(([label, value]) => <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#888' }}>{label}</span><span style={{ fontWeight: 700 }}>{value}</span></div>)}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional review note" style={{ minHeight: 120, borderRadius: 14, background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: 14 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button disabled={loading} onClick={() => decide('reject')} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.10)', color: '#f87171', fontWeight: 800 }}>Reject & reset</button>
                <button disabled={loading} onClick={() => decide('approve')} style={{ padding: 14, borderRadius: 14, border: 'none', background: '#F2BA0E', color: '#000', fontWeight: 900 }}>Approve verification</button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
