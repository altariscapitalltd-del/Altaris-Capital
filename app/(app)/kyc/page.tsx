'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '@/lib/countries'

const statusLabel: Record<string, string> = {
  NOT_SUBMITTED: 'Not verified',
  PENDING_REVIEW: 'Pending',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
}

function ShieldBadge({ status }: { status: string }) {
  const tones: Record<string, { bg: string; color: string; label: string }> = {
    NOT_SUBMITTED: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', label: 'Not verified' },
    PENDING_REVIEW: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Pending' },
    APPROVED: { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Verified' },
    REJECTED: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Rejected' },
  }
  const tone = tones[status] || tones.NOT_SUBMITTED
  return <span style={{ padding: '7px 12px', borderRadius: 999, background: tone.bg, color: tone.color, fontSize: 12, fontWeight: 800 }}>{tone.label}</span>
}

function VerifiedIllustration() {
  return <svg width="84" height="84" viewBox="0 0 84 84" fill="none"><rect x="9" y="11" width="66" height="62" rx="18" fill="rgba(14,203,129,0.14)" stroke="rgba(14,203,129,0.5)"/><path d="M42 24l15 6v10c0 11-6.5 19.4-15 23-8.5-3.6-15-12-15-23V30l15-6z" fill="#0ECB81" fillOpacity="0.18" stroke="#0ECB81" strokeWidth="2.5"/><path d="M35.5 42.5l4.7 4.7L49 38.4" stroke="#0ECB81" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function PendingIllustration() {
  return <svg width="84" height="84" viewBox="0 0 84 84" fill="none"><rect x="9" y="11" width="66" height="62" rx="18" fill="rgba(242,186,14,0.14)" stroke="rgba(242,186,14,0.45)"/><path d="M42 23v19" stroke="#F2BA0E" strokeWidth="4" strokeLinecap="round"/><circle cx="42" cy="50" r="3" fill="#F2BA0E"/><path d="M27 31h30" stroke="#F2BA0E" strokeWidth="2.6" strokeLinecap="round" opacity=".55"/></svg>
}

function RejectedIllustration() {
  return <svg width="84" height="84" viewBox="0 0 84 84" fill="none"><rect x="9" y="11" width="66" height="62" rx="18" fill="rgba(246,70,93,0.14)" stroke="rgba(246,70,93,0.45)"/><circle cx="42" cy="42" r="16" stroke="#F6465D" strokeWidth="3"/><path d="M36 36l12 12M48 36L36 48" stroke="#F6465D" strokeWidth="3" strokeLinecap="round"/></svg>
}

function DocumentCardIcon() {
  return <svg width="54" height="54" viewBox="0 0 54 54" fill="none"><rect x="9" y="5" width="36" height="44" rx="10" fill="rgba(242,186,14,0.12)" stroke="rgba(242,186,14,0.52)" strokeWidth="2"/><path d="M19 19h17M19 25h17M19 31h10" stroke="#F2BA0E" strokeWidth="2.5" strokeLinecap="round"/><path d="M33 5v12h12" stroke="rgba(242,186,14,0.52)" strokeWidth="2"/></svg>
}

function CameraCardIcon() {
  return <svg width="54" height="54" viewBox="0 0 54 54" fill="none"><rect x="7" y="14" width="40" height="27" rx="10" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.52)" strokeWidth="2"/><path d="M18 14l3-5h12l3 5" stroke="rgba(59,130,246,0.52)" strokeWidth="2.2" strokeLinecap="round"/><circle cx="27" cy="27.5" r="8" stroke="#60A5FA" strokeWidth="2.5"/><circle cx="27" cy="27.5" r="3" fill="#60A5FA"/></svg>
}

export default function KYCPage() {
  const [status, setStatus] = useState<string>('NOT_SUBMITTED')
  const [serverKyc, setServerKyc] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', country: '', address: '', docType: 'passport', docNumber: '' })
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/user/kyc').then((r) => r.json()).then((d) => {
      setStatus(d.status || 'NOT_SUBMITTED')
      setServerKyc(d.kyc || null)
      setLoading(false)
    })
  }, [])

  const completion = useMemo(() => {
    const checks = [Boolean(form.firstName && form.lastName && form.dob && form.country && form.address), Boolean(form.docType && form.docNumber && docFile), Boolean(selfieFile)]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [form, docFile, selfieFile])

  async function submit() {
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (docFile) fd.append('documentFile', docFile)
    if (selfieFile) fd.append('selfieFile', selfieFile)
    const res = await fetch('/api/user/kyc', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setStatus('PENDING_REVIEW')
      setMsg({ type: 'success', text: 'Your verification package has been submitted successfully.' })
    } else setMsg({ type: 'error', text: data.error || 'KYC submission failed.' })
    setSubmitting(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div style={{ width: 34, height: 34, border: '3px solid rgba(242,186,14,0.2)', borderTopColor: '#F2BA0E', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div>

  if (status === 'APPROVED' || status === 'PENDING_REVIEW' || status === 'REJECTED') {
    const icon = status === 'APPROVED' ? <VerifiedIllustration /> : status === 'PENDING_REVIEW' ? <PendingIllustration /> : <RejectedIllustration />
    const title = status === 'APPROVED' ? 'Identity verified' : status === 'PENDING_REVIEW' ? 'Verification in review' : 'Verification rejected'
    const copy = status === 'APPROVED'
      ? 'Your identity has been verified and your account is fully unlocked.'
      : status === 'PENDING_REVIEW'
        ? 'Our compliance team is reviewing your submission. You will be notified as soon as a decision is made.'
        : serverKyc?.rejectionReason || 'We could not verify your submission. Update the details and submit again.'

    return (
      <div style={{ padding: '18px 16px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>KYC Verification</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Professional identity review for withdrawals and account security</div>
          </div>
          <ShieldBadge status={status} />
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 24, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>{icon}</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: '0 auto', maxWidth: 420 }}>{copy}</div>
          {status === 'REJECTED' && <button onClick={() => { setStatus('NOT_SUBMITTED'); setStep(0) }} className="btn-primary" style={{ marginTop: 18, minWidth: 220 }}>Submit a new verification</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '18px 16px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 5 }}>KYC Verification</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>Secure your account with a clean, bank-grade verification flow.</p>
        </div>
        <ShieldBadge status={status} />
      </div>

      <div style={{ background: 'linear-gradient(160deg, rgba(242,186,14,0.16), rgba(11,14,17,0.95) 44%)', border: '1px solid rgba(242,186,14,0.25)', borderRadius: 22, padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Verification progress</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Complete the short flow to unlock deposits, withdrawals, and referral qualification.</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 24 }}>{completion}%</div>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: `${completion}%`, height: '100%', background: 'linear-gradient(90deg, #F2BA0E, #FFD86B)' }} /></div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, opacity: step === 0 ? 1 : 0.9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><div style={{ fontWeight: 800 }}>1. Personal details</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Required</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input className="input" placeholder="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            <input className="input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <input className="input" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
            <select className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}><option value="">Country</option>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <input className="input" placeholder="Residential address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} style={{ marginTop: 12 }} />
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setStep(1)} disabled={!form.firstName || !form.lastName || !form.dob || !form.country || !form.address}>Continue</button>
        </section>

        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, opacity: step >= 1 ? 1 : 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><div style={{ fontWeight: 800 }}>2. Government document</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Front or full page</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
            {[['passport', 'Passport'], ['drivers_license', 'Driver License'], ['national_id', 'National ID']].map(([id, label]) => <button key={id} onClick={() => setForm((f) => ({ ...f, docType: id }))} style={{ border: `1px solid ${form.docType === id ? 'rgba(242,186,14,0.5)' : 'var(--border)'}`, background: form.docType === id ? 'rgba(242,186,14,0.12)' : 'transparent', color: form.docType === id ? 'var(--brand-primary)' : 'var(--text-secondary)', borderRadius: 12, padding: '12px 10px', fontWeight: 700, cursor: 'pointer' }}>{label}</button>)}
          </div>
          <input className="input" placeholder="Document number" value={form.docNumber} onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))} />
          <div onClick={() => docRef.current?.click()} style={{ marginTop: 12, border: '1.5px dashed var(--border)', borderRadius: 18, padding: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: docFile ? 'rgba(14,203,129,0.08)' : 'transparent' }}>
            <DocumentCardIcon />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, marginBottom: 5 }}>{docFile ? docFile.name : 'Upload your document'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Use a clear image or PDF. Accepted: JPG, PNG, PDF.</div>
            </div>
          </div>
          <input ref={docRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}><button className="btn-ghost" onClick={() => setStep(0)}>Back</button><button className="btn-primary" onClick={() => setStep(2)} disabled={!form.docNumber || !docFile}>Continue</button></div>
        </section>

        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, opacity: step >= 2 ? 1 : 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><div style={{ fontWeight: 800 }}>3. Selfie capture</div><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Face only</div></div>
          <div onClick={() => selfieRef.current?.click()} style={{ border: '1.5px dashed var(--border)', borderRadius: 18, padding: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: selfieFile ? 'rgba(14,203,129,0.08)' : 'transparent' }}>
            <CameraCardIcon />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, marginBottom: 5 }}>{selfieFile ? selfieFile.name : 'Take or upload a selfie'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Keep your face centered and visible. No document-holding requirement.</div>
            </div>
          </div>
          <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Review before submit</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>{form.firstName} {form.lastName} · {form.country || 'Country'} · {form.docType.replace('_', ' ')} · {form.docNumber || 'Doc no.'}</div>
          </div>
          {msg && <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 12, background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 13 }}>{msg.text}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}><button className="btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn-primary" onClick={submit} disabled={!selfieFile || submitting}>{submitting ? 'Submitting…' : 'Submit verification'}</button></div>
        </section>
      </div>
    </div>
  )
}
