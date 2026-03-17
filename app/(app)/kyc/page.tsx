'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

type KycStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'selfie', label: 'Selfie Capture' },
  { id: 'review', label: 'Review & Submit' },
]

function TickIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="m3.5 8 3 3 6-6" stroke={muted ? 'var(--text-muted)' : '#000'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
        {status === 'REJECTED' && <path d="m24 24 16 16m0-16-16 16" stroke={palette.stroke} strokeWidth="3.4" strokeLinecap="round" />}
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
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '' })
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
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
    if (!selfieFile) return
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    fd.append('selfieFile', selfieFile)

    const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setStatus('PENDING_REVIEW')
      sessionStorage.removeItem('kyc-rejected-shown')
      setMsg({ type: 'success', text: 'KYC submitted successfully. Our compliance team is reviewing your selfie.' })
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
          {status === 'PENDING_REVIEW' && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Selfie received. Reviews usually complete in 1–2 business days.</p>}
          {status === 'REJECTED' && (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your previous verification was rejected. Please submit a new selfie.</p>
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
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not verified • Submit your details and a live selfie for compliance review.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${i < step ? 'var(--brand-primary)' : i === step ? 'var(--brand-primary)' : 'var(--border)'}`, background: i < step ? 'var(--brand-primary)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {i < step ? <TickIcon /> : <span style={{ fontWeight: 700, fontSize: 12, color: i === step ? 'var(--brand-primary)' : 'var(--text-muted)' }}>{i + 1}</span>}
            </div>
            <div style={{ marginLeft: 8, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div style={{ height: 2, flex: 1, margin: '0 8px', background: i < step ? 'var(--brand-primary)' : 'var(--border)', borderRadius: 99 }} />}
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
          <div style={{ textAlign: 'center', padding: '8px 0 2px' }}>
            <div style={{ width: 190, height: 190, margin: '0 auto', borderRadius: '50%', border: '3px dashed var(--brand-primary)', background: 'var(--bg-card)', display: 'grid', placeItems: 'center' }}>
              <div>
                <div style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto 8px', background: 'rgba(242,186,14,0.15)', display: 'grid', placeItems: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="1.7"><path d="M14.5 6h-5L8 8H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3l-1.5-2Z"/><circle cx="12" cy="13" r="3.5"/></svg>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Round selfie capture</div>
              </div>
            </div>
          </div>
          <button onClick={() => selfieRef.current?.click()} className="btn-ghost" style={{ border: '1px dashed var(--border)', minHeight: 58 }}>{selfieFile ? `Selfie uploaded: ${selfieFile.name}` : 'Take/upload selfie'}</button>
          <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setStep(0)} className="btn-ghost">Back</button>
            <button disabled={!selfieFile} onClick={() => setStep(2)} className="btn-primary">Review</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            {[{ l: 'Full name', v: `${form.firstName} ${form.lastName}` }, { l: 'Date of birth', v: form.dob }, { l: 'Country', v: form.country }, { l: 'Selfie', v: selfieFile?.name || '—' }].map((row) => (
              <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '9px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{row.l}</span><span>{row.v}</span>
              </div>
            ))}
          </div>
          {msg && <div style={{ background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', padding: 10, borderRadius: 10, fontSize: 13 }}>{msg.text}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
            <button onClick={submit} disabled={submitting || !selfieFile} className="btn-primary">{submitting ? 'Submitting...' : 'Submit verification'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
