'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

type KycStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'document', label: 'ID Document' },
  { id: 'selfie', label: 'Selfie Check' },
  { id: 'review', label: 'Review & Submit' },
]

function StatusLogo({ status }: { status: KycStatus }) {
  const palette = status === 'APPROVED'
    ? { bg: 'var(--success-bg)', stroke: 'var(--success)' }
    : status === 'PENDING_REVIEW'
      ? { bg: 'var(--warning-bg)', stroke: 'var(--warning)' }
      : status === 'REJECTED'
        ? { bg: 'var(--danger-bg)', stroke: 'var(--danger)' }
        : { bg: 'rgba(124, 92, 255, 0.12)', stroke: '#8B5CF6' }

  return (
    <div style={{ width: 88, height: 88, borderRadius: '50%', background: palette.bg, display: 'grid', placeItems: 'center', marginBottom: 18 }}>
      <svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden>
        <path d="M32 6 12 14v18c0 14 9 22 20 26 11-4 20-12 20-26V14L32 6Z" stroke={palette.stroke} strokeWidth="3.2" strokeLinejoin="round" />
        <path d="M22 31.5 29 38l13-13" stroke={status === 'REJECTED' ? 'transparent' : palette.stroke} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        {status === 'REJECTED' && (
          <path d="m24 24 16 16m0-16-16 16" stroke={palette.stroke} strokeWidth="3.4" strokeLinecap="round" />
        )}
      </svg>
    </div>
  )
}

export default function KYCPage() {
  const [status, setStatus] = useState<KycStatus>('NOT_SUBMITTED')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', docType: 'passport', docNumber: '' })
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)

  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc')
      .then((r) => r.json())
      .then((d) => {
        const incoming = (d.status || 'NOT_SUBMITTED') as KycStatus
        if (incoming === 'REJECTED') {
          const alreadyShown = sessionStorage.getItem('kyc-rejected-shown') === '1'
          if (alreadyShown) setStatus('NOT_SUBMITTED')
          else {
            setStatus('REJECTED')
            sessionStorage.setItem('kyc-rejected-shown', '1')
          }
        } else {
          setStatus(incoming)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const statusTitle = useMemo(() => {
    if (status === 'APPROVED') return 'Verified'
    if (status === 'PENDING_REVIEW') return 'Pending review'
    if (status === 'REJECTED') return 'Rejected'
    return 'Not verified'
  }, [status])

  async function submit() {
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (docFile) fd.append('documentFile', docFile)
    if (selfieFile) fd.append('selfieFile', selfieFile)

    const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setStatus('PENDING_REVIEW')
      sessionStorage.removeItem('kyc-rejected-shown')
      setMsg({ type: 'success', text: 'KYC submitted successfully. Our compliance team is reviewing your documents.' })
    } else setMsg({ type: 'error', text: data.error || 'Failed to submit KYC.' })
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding: 24 }}>Loading KYC...</div>

  if (status !== 'NOT_SUBMITTED') {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, textAlign: 'center' }}>
          <StatusLogo status={status} />
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>KYC status</p>
          <h2 style={{ margin: '6px 0 10px', fontSize: 26, fontWeight: 800 }}>{statusTitle}</h2>

          {status === 'APPROVED' && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your identity has been verified. You now have full account access.</p>}
          {status === 'PENDING_REVIEW' && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Documents received. Reviews usually complete in 1–2 business days.</p>}
          {status === 'REJECTED' && (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your previous verification was rejected. Please submit a new clear document set.</p>
              <button onClick={() => setStatus('NOT_SUBMITTED')} className="btn-primary" style={{ width: '100%', marginTop: 10 }}>Start New Verification</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 32px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ padding: '12px 0 18px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Identity verification</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not verified • Complete this flow to move your account to Pending, then Verified after approval.</p>
      </div>

      <div style={{ display: 'flex', marginBottom: 26 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ margin: '0 auto 8px', width: 34, height: 34, borderRadius: '50%', border: `2px solid ${i <= step ? 'var(--brand-primary)' : 'var(--border)'}`, background: i < step ? 'var(--brand-primary)' : 'transparent', display: 'grid', placeItems: 'center' }}>
              {i < step ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3.5 8 3 3 6-6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: i === step ? 'var(--brand-primary)' : 'var(--text-muted)' }}>{i + 1}</span>
              )}
            </div>
            <span style={{ fontSize: 11, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <input className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
          <input className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
          <input className="input" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
          <select className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
            <option value="">Country of residence</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button disabled={!form.firstName || !form.lastName || !form.dob || !form.country} onClick={() => setStep(1)} className="btn-primary">Continue</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[{ id: 'passport', l: 'Passport' }, { id: 'drivers_license', l: 'License' }, { id: 'national_id', l: 'National ID' }].map((d) => (
              <button key={d.id} onClick={() => setForm((f) => ({ ...f, docType: d.id }))} style={{ borderRadius: 10, border: `1px solid ${form.docType === d.id ? 'var(--brand-primary)' : 'var(--border)'}`, padding: 10, background: form.docType === d.id ? 'rgba(242,186,14,0.08)' : 'var(--bg-card)', color: 'var(--text-primary)' }}>{d.l}</button>
            ))}
          </div>
          <input className="input" value={form.docNumber} onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))} placeholder="Document number" />
          <button onClick={() => docRef.current?.click()} className="btn-ghost" style={{ border: '1px dashed var(--border)', minHeight: 58 }}>{docFile ? `Uploaded: ${docFile.name}` : 'Upload government ID'}</button>
          <input ref={docRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setStep(0)} className="btn-ghost">Back</button>
            <button disabled={!docFile || !form.docNumber} onClick={() => setStep(2)} className="btn-primary">Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            Make sure your face is clear, no glare, and your ID is visible.
          </div>
          <button onClick={() => selfieRef.current?.click()} className="btn-ghost" style={{ border: '1px dashed var(--border)', minHeight: 58 }}>{selfieFile ? `Uploaded: ${selfieFile.name}` : 'Upload selfie with your ID'}</button>
          <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
            <button disabled={!selfieFile} onClick={() => setStep(3)} className="btn-primary">Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            {[{ l: 'Full name', v: `${form.firstName} ${form.lastName}` }, { l: 'Date of birth', v: form.dob }, { l: 'Country', v: form.country }, { l: 'Document', v: `${form.docType.replace('_', ' ')} • ${form.docNumber}` }, { l: 'ID file', v: docFile?.name || '—' }, { l: 'Selfie', v: selfieFile?.name || '—' }].map((row) => (
              <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '9px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{row.l}</span><span>{row.v}</span>
              </div>
            ))}
          </div>
          {msg && <div style={{ background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', padding: 10, borderRadius: 10, fontSize: 13 }}>{msg.text}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setStep(2)} className="btn-ghost">Back</button>
            <button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit verification'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
