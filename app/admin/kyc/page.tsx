'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [filter, setFilter] = useState('PENDING_REVIEW')
  const [selected, setSelected] = useState<any | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useBodyScrollLock(Boolean(selected))

  async function load(nextFilter = filter) {
    const res = await fetch(`/api/admin/kyc?status=${nextFilter}`)
    const data = await res.json()
    setSubmissions(data.submissions || [])
  }

  useEffect(() => { load(filter) }, [filter])

  async function decide(action: 'approve' | 'reject') {
    if (!selected) return
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/admin/kyc', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selected.userId, action, reason }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMsg({ type: 'success', text: `KYC ${action}d successfully.` })
      setSelected(null)
      setReason('')
      load(filter)
    } else {
      setMsg({ type: 'error', text: data.error || 'Action failed.' })
    }
    setLoading(false)
  }

  const counts = useMemo(() => ({
    pending: submissions.filter((item) => item.status === 'PENDING_REVIEW').length,
    approved: submissions.filter((item) => item.status === 'APPROVED').length,
    rejected: submissions.filter((item) => item.status === 'REJECTED').length,
  }), [submissions])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>KYC review</h1>
          <p style={{ color: '#666', fontSize: 13 }}>Review documents, selfie uploads, and Telegram delivery state in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ALL'].map((value) => (
            <button key={value} onClick={() => setFilter(value)} style={{ borderRadius: 999, padding: '10px 14px', border: '1px solid #d7dbe2', background: filter === value ? '#111827' : '#fff', color: filter === value ? '#fff' : '#111827', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>{value.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {msg && <div style={{ marginBottom: 14, borderRadius: 14, padding: '12px 14px', background: msg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: msg.type === 'success' ? '#047857' : '#b91c1c', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {[['Pending', counts.pending], ['Approved', counts.approved], ['Rejected', counts.rejected]].map(([label, value]) => (
          <div key={String(label)} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 16 }}><div style={{ color: '#6b7280', fontSize: 12 }}>{label}</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</div></div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              {['User', 'Document', 'Submitted', 'Telegram', 'Status', 'Action'].map((heading) => <th key={heading} style={{ padding: '14px 16px', fontSize: 12, color: '#6b7280' }}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 16px' }}><div style={{ fontWeight: 800 }}>{submission.user?.name}</div><div style={{ color: '#6b7280', fontSize: 12 }}>{submission.user?.email}</div></td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{submission.documentType || 'Document'}<div style={{ color: '#6b7280', fontSize: 12 }}>{submission.documentNumber || 'No number provided'}</div></td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{new Date(submission.submittedAt).toLocaleString()}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, textTransform: 'capitalize' }}>{(submission.telegramDeliveryState || 'unknown').replace('-', ' ')}</td>
                <td style={{ padding: '14px 16px', fontWeight: 800 }}>{submission.status.replace('_', ' ')}</td>
                <td style={{ padding: '14px 16px' }}><button onClick={() => setSelected(submission)} style={{ border: 'none', background: '#111827', color: '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontWeight: 700 }}>Review</button></td>
              </tr>
            ))}
            {!submissions.length && <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No KYC submissions found for this filter.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ width: 'min(960px, 100%)', background: '#fff', borderRadius: 24, padding: 22, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{selected.user?.name}</div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{selected.user?.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: '#f3f4f6', width: 38, height: 38, borderRadius: 12, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 18, padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Document</div>
                <a href={`/api/admin/kyc/file?file=${encodeURIComponent(selected.documentPath)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: 10, color: '#2563eb', fontWeight: 700 }}>Open document</a>
                <div style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.8 }}>Type: {selected.documentType || 'Unknown'}<br />Number: {selected.documentNumber || 'N/A'}<br />Address/Country: {selected.address}<br />DOB: {selected.dateOfBirth}</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 18, padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Selfie</div>
                {selected.selfiePath ? <img src={`/api/admin/kyc/file?file=${encodeURIComponent(selected.selfiePath)}`} alt="KYC selfie" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 14, background: '#f9fafb' }} /> : <div style={{ color: '#6b7280' }}>No selfie found</div>}
              </div>
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional rejection note or internal review comment" style={{ width: '100%', marginTop: 18, minHeight: 110, borderRadius: 16, border: '1px solid #d1d5db', padding: 14, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => decide('reject')} disabled={loading} style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#be123c', borderRadius: 12, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>{loading ? 'Processing…' : 'Reject'}</button>
              <button onClick={() => decide('approve')} disabled={loading} style={{ border: 'none', background: '#111827', color: '#fff', borderRadius: 12, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>{loading ? 'Processing…' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
